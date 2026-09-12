import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiDotsVertical } from "@mdi/js";
import memoizeOne from "memoize-one";
import type { ActionDetail } from "@material/mwc-list";
import type { HomeAssistant, Route } from "@ha/types";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import "@ha/components/ha-alert";
import "@ha/components/ha-button";
import "@ha/components/ha-button-menu";
import "@ha/components/ha-card";
import "@ha/components/ha-expansion-panel";
import "@ha/components/ha-icon-button";
import "@ha/components/ha-icon-next";
import "@ha/components/ha-list-item";
import "@ha/components/ha-md-list";
import "@ha/components/ha-md-list-item";
import "@ha/components/ha-spinner";
import "@ha/layouts/hass-tabs-subpage";
import { navigate } from "@ha/common/navigate";
import { showAlertDialog, showConfirmationDialog } from "@ha/dialogs/generic/show-dialog-box";
import { haStyle } from "@ha/resources/styles";
import { insteonDeviceTabs } from "./insteon-device-router";
import "./insteon-device-header";
import "./insteon-device-plate";
import { buttonLabel, buttonTitle, plateGroups, plateLayout } from "./plate-layout";
import type { Insteon, InsteonDevice } from "../data/insteon";
import type { ALDBRecord, AldbNotification } from "../data/device";
import {
  addDefaultLinks,
  fetchInsteonALDB,
  fetchInsteonDevice,
  fetchInsteonProperties,
  loadALDB,
  subscribeAldbLoading,
} from "../data/device";
import type { InsteonScene } from "../data/scene";
import { fetchInsteonScenes } from "../data/scene";
import { paneState } from "./pane-state";
import type { AttributedLinks, ButtonLinks, LinkRow, RowDetail } from "./link-rows";
import {
  attributeRecords,
  buttonNotifiesModem,
  hasModemResponderLink,
  hasPendingRecords,
  rowDetail,
} from "./link-rows";
import {
  catSubcatFromModel,
  insteonDeviceByAddress,
  MODEM_CAT,
  modemAddress,
} from "./registry-lookup";
import { modemLinkNeeds, stateGroups } from "./reporting-groups";
import { nextGroup } from "./roving";
import { confirmDeleteDevice } from "./delete-device";

type CardKind = "buttons" | "single" | "fallback" | "none";
type Section = "controls" | "controlled_by";

const WATCH_TIMEOUT = 20 * 60 * 1000;

@customElement("insteon-device-overview-page")
class InsteonDeviceOverviewPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Object }) public route?: Route;

  @property() public deviceId?: string;

  @state() private _device?: InsteonDevice;

  @state() private _aldb?: ALDBRecord[];

  @state() private _aldbError = false;

  @state() private _aldbLoading = false;

  @state() private _selectedGroup?: number;

  @state() private _loadGroup?: number;

  @state() private _scenes: InsteonScene[] = [];

  private _unsubscribe?: Promise<() => Promise<void>>;

  private _watchTimeout?: number;

  private _attributed = memoizeOne(
    (
      records: ALDBRecord[],
      groups: number[],
      modem?: string,
      loadButton?: number,
    ): AttributedLinks => attributeRecords(records, groups, modem, loadButton),
  );

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (changed.has("deviceId") && this.deviceId && this.hass) {
      this._load();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopWatching();
  }

  private async _load() {
    const token = this.deviceId;
    this._device = undefined;
    this._aldb = undefined;
    this._aldbError = false;
    this._aldbLoading = false;
    this._loadGroup = undefined;
    this._stopWatching();
    let device: InsteonDevice;
    try {
      device = await fetchInsteonDevice(this.hass, this.deviceId!);
    } catch (_err) {
      if (this.deviceId !== token) {
        return;
      }
      showAlertDialog(this, { text: this.insteon.localize("common.error.device_not_found") });
      navigate("/insteon/devices");
      return;
    }
    if (this.deviceId !== token) {
      return;
    }
    this._device = device;
    if (device.aldb_status === "loading") {
      this._aldbLoading = true;
      this._watch();
      this._confirmStillLoading(token);
    }
    this._selectedGroup = stateGroups(device)[0];
    this._resolveLoadGroup(device, token);
    this._fetchScenes(token);
    await this._fetchRecords(token);
  }

  private async _fetchRecords(token = this.deviceId) {
    if (!this._device) {
      return;
    }
    this._aldbError = false;
    let aldb: ALDBRecord[];
    try {
      aldb = await fetchInsteonALDB(this.hass, this._device.address);
    } catch (_err) {
      if (this.deviceId !== token) {
        return;
      }
      this._aldb = undefined;
      this._aldbError = true;
      return;
    }
    if (this.deviceId !== token) {
      return;
    }
    this._aldb = aldb;
  }

  private async _fetchScenes(token = this.deviceId) {
    let scenes: InsteonScene[];
    try {
      scenes = Object.values(await fetchInsteonScenes(this.hass));
    } catch (_err) {
      if (this.deviceId !== token) {
        return;
      }
      this._scenes = [];
      return;
    }
    if (this.deviceId !== token) {
      return;
    }
    this._scenes = scenes;
  }

  private async _resolveLoadGroup(device: InsteonDevice, token = this.deviceId) {
    const layout = plateLayout(device.cat, device.subcat);
    if (layout === "keypad_6" || layout === "keypad_8") {
      this._loadGroup = 1;
      return;
    }
    if (layout !== "keypad_i3_4") {
      return;
    }
    try {
      const info = await fetchInsteonProperties(this.hass, device.address, false);
      if (this.deviceId !== token) {
        return;
      }
      const prop = info.properties.find((p) => p.name === "load_button");
      if (prop && typeof prop.value === "number") {
        this._loadGroup = prop.value;
      }
    } catch (_err) {
      if (this.deviceId !== token) {
        return;
      }
      this._loadGroup = undefined;
    }
  }

  private _cardKind(device: InsteonDevice): CardKind {
    const groups = stateGroups(device);
    if (groups.length === 0) {
      return "none";
    }
    if (plateLayout(device.cat, device.subcat) === "none") {
      return "fallback";
    }
    return groups.length > 1 ? "buttons" : "single";
  }

  private _modem(): string | undefined {
    const devices = this.hass.devices ?? {};
    const entry = this.deviceId ? devices[this.deviceId] : undefined;
    return modemAddress(devices, entry);
  }

  private _sceneName(group: number): string | undefined {
    return this._scenes.find((scene) => scene.group === group)?.name;
  }

  private _watch() {
    this._stopWatching();
    if (!this._device) {
      return;
    }
    this._unsubscribe = subscribeAldbLoading(this.hass, this._device.address, (message) =>
      this._onNotify(message),
    );
    this._watchTimeout = window.setTimeout(() => this._giveUpWatching(), WATCH_TIMEOUT);
  }

  private _stopWatching() {
    if (this._watchTimeout !== undefined) {
      clearTimeout(this._watchTimeout);
      this._watchTimeout = undefined;
    }
    if (this._unsubscribe) {
      this._unsubscribe.then((unsub) => unsub()).catch(() => undefined);
      this._unsubscribe = undefined;
    }
  }

  private async _giveUpWatching() {
    this._stopWatching();
    await this._refreshDevice();
    if (this._device?.aldb_status === "loading") {
      this._watch();
      return;
    }
    this._aldbLoading = false;
    await this._fetchRecords();
  }

  private async _confirmStillLoading(token?: string) {
    const subscription = this._unsubscribe;
    if (!subscription) {
      return;
    }
    try {
      await subscription;
    } catch (_err) {
      return;
    }
    if (this.deviceId !== token || this._unsubscribe !== subscription) {
      return;
    }
    await this._refreshDevice();
    if (this.deviceId !== token || this._unsubscribe !== subscription) {
      return;
    }
    if (this._device?.aldb_status !== "loading") {
      this._stopWatching();
      this._aldbLoading = false;
      await this._fetchRecords(token);
    }
  }

  private async _onNotify(message: AldbNotification) {
    if (!this._unsubscribe) {
      return;
    }
    if (message.type !== "status_changed") {
      return;
    }
    this._aldbLoading = message.is_loading === true;
    if (this._aldbLoading) {
      return;
    }
    this._stopWatching();
    await this._refreshDevice();
    await this._fetchRecords();
  }

  private async _refreshDevice() {
    if (!this.deviceId) {
      return;
    }
    try {
      this._device = await fetchInsteonDevice(this.hass, this.deviceId);
    } catch (_err) {
      this._aldbError = true;
    }
  }

  private async _readFromDevice() {
    const ok = await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.load"),
      confirmText: this.insteon.localize("common.yes"),
      dismissText: this.insteon.localize("common.no"),
    });
    if (!ok) {
      return;
    }
    await this._runAldbAction(() => loadALDB(this.hass, this._device!.address));
  }

  private async _addDefaultLinks() {
    const ok = await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.add_default_links"),
      confirmText: this.insteon.localize("common.yes"),
      dismissText: this.insteon.localize("common.no"),
    });
    if (!ok) {
      return;
    }
    await this._runAldbAction(() => addDefaultLinks(this.hass, this._device!.address));
  }

  private async _runAldbAction(action: () => Promise<void>) {
    if (this._device!.is_battery) {
      await showAlertDialog(this, { text: this.insteon.localize("common.warn.wake_up") });
    }
    this._aldbLoading = true;
    this._watch();
    try {
      await action();
      await this._refreshDevice();
      if (this._device?.aldb_status !== "loading") {
        this._aldbLoading = false;
        this._stopWatching();
        await this._fetchRecords();
      }
    } catch (_err) {
      this._aldbLoading = false;
      this._stopWatching();
      showAlertDialog(this, {
        text: this.insteon.localize("common.error.load"),
        confirmText: this.insteon.localize("common.close"),
      });
    }
  }

  private _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._readFromDevice();
        break;
      case 1:
        navigate("/config/devices/device/" + this.deviceId);
        break;
      case 2:
        confirmDeleteDevice(this, this.hass, this.insteon, this._device!);
        break;
      default:
        break;
    }
  }

  private _selectGroup(group: number) {
    this._selectedGroup = group;
  }

  private _handleButtonSelected(ev: CustomEvent<{ group: number }>) {
    this._selectGroup(ev.detail.group);
  }

  private _paneState(device: InsteonDevice) {
    return paneState({
      status: device.aldb_status,
      records: this._aldb,
      error: this._aldbError,
      loading: this._aldbLoading,
    });
  }

  private _handleBackTapped = () => {
    navigate("/insteon/devices");
  };

  protected render(): TemplateResult {
    const menu = this._device ? this._renderMenu() : nothing;
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
        .localizeFunc=${this.insteon.localize}
        .backCallback=${this._handleBackTapped}
      >
        ${this.narrow
          ? html`<insteon-device-header
              slot="header"
              narrow
              .hass=${this.hass}
              .insteon=${this.insteon}
              .device=${this._device}
              >${menu}</insteon-device-header
            >`
          : nothing}
        <div class="container">
          ${!this.narrow
            ? html`<insteon-device-header
                .hass=${this.hass}
                .insteon=${this.insteon}
                .device=${this._device}
                >${menu}</insteon-device-header
              >`
            : nothing}
          ${this._renderCard()}
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _renderMenu(): TemplateResult {
    return html`
      <ha-button-menu corner="BOTTOM_START" @action=${this._handleMenuAction} activatable>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-list-item>${this.insteon.localize("common.actions.load")}</ha-list-item>
        <ha-list-item>${this.insteon.localize("device.actions.open_in_ha")}</ha-list-item>
        <ha-list-item class="warning"
          >${this.insteon.localize("device.actions.delete")}</ha-list-item
        >
      </ha-button-menu>
    `;
  }

  private _renderCard(): TemplateResult {
    const device = this._device;
    if (!device) {
      return html`
        <ha-card outlined>
          <div class="card-content center"><ha-spinner></ha-spinner></div>
        </ha-card>
      `;
    }
    const kind = this._cardKind(device);
    const header = this.insteon.localize(
      kind === "buttons" ? "device.overview.fields.buttons" : "device.overview.connections",
    );
    return html`
      <ha-card outlined .header=${header}>
        <div class="card-content">
          ${kind === "buttons"
            ? html`<p class="hint">${this.insteon.localize("device.overview.select_hint")}</p>`
            : nothing}
          ${kind === "none" ? this._renderNoButtons(device) : this._renderButtons(device, kind)}
        </div>
      </ha-card>
    `;
  }

  private _plateLabel(device: InsteonDevice): string {
    return [device.description, device.model].filter(Boolean).join(" ") || device.address;
  }

  private _buttonNames(device: InsteonDevice): Record<number, string> {
    const layout = plateLayout(device.cat, device.subcat);
    const names: Record<number, string> = {};
    plateGroups(layout).forEach((group) => {
      names[group] = buttonTitle(layout, group, this.insteon.localize);
    });
    return names;
  }

  private _loadCaption(device: InsteonDevice): string | undefined {
    const layout = plateLayout(device.cat, device.subcat);
    if (
      this._loadGroup === undefined ||
      this._selectedGroup === this._loadGroup ||
      !layout.startsWith("keypad")
    ) {
      return undefined;
    }
    return this.insteon.localize("device.overview.pane.load_caption", {
      label: buttonLabel(layout, this._loadGroup) ?? String(this._loadGroup),
    });
  }

  private _renderButtons(device: InsteonDevice, kind: CardKind): TemplateResult {
    const selector =
      kind === "fallback"
        ? this._renderTiles(device)
        : html`
            <insteon-device-plate
              class=${kind}
              .cat=${device.cat}
              .subcat=${device.subcat}
              .selected=${this._selectedGroup}
              .names=${this._buttonNames(device)}
              .label=${this._plateLabel(device)}
              .loadCaption=${this._loadCaption(device)}
              @insteon-button-selected=${this._handleButtonSelected}
            ></insteon-device-plate>
          `;
    return html`<div class="plate-and-pane">${selector}${this._renderPane(device, kind)}</div>`;
  }

  private _renderTiles(device: InsteonDevice): TemplateResult {
    const groups = stateGroups(device);
    const buttons = device.buttons || {};
    const focus =
      this._selectedGroup !== undefined && groups.includes(this._selectedGroup)
        ? this._selectedGroup
        : groups[0];
    return html`
      <div class="tiles" role="tablist" aria-label=${this._plateLabel(device)}>
        ${groups.map(
          (group) => html`
            <button
              class="tile ${group === this._selectedGroup ? "selected" : ""}"
              role="tab"
              aria-selected=${group === this._selectedGroup ? "true" : "false"}
              aria-controls="pane"
              tabindex=${group === focus ? "0" : "-1"}
              @click=${() => this._selectGroup(group)}
              @keydown=${(ev: KeyboardEvent) => this._tileKeydown(ev, groups, group)}
            >
              <span class="tile-group">${group}</span>
              <span class="tile-name">${(buttons[group] || "").replace(/_/g, " ")}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _tileKeydown(ev: KeyboardEvent, groups: number[], group: number) {
    const next = nextGroup(ev.key, groups, group);
    if (next === undefined) {
      return;
    }
    ev.preventDefault();
    this._selectGroup(next);
    this.updateComplete.then(() => {
      const tiles = this.shadowRoot?.querySelectorAll<HTMLButtonElement>(".tile");
      tiles?.[groups.indexOf(next)]?.focus();
    });
  }

  private _paneSub(device: InsteonDevice, group: number): string {
    const parts = [this.insteon.localize("device.overview.pane.group", { group })];
    const layout = plateLayout(device.cat, device.subcat);
    if (layout.startsWith("keypad") && this._loadGroup !== undefined) {
      parts.push(
        this.insteon.localize(
          group === this._loadGroup
            ? "device.overview.pane.load_button"
            : "device.overview.pane.scene_button",
        ),
      );
    }
    return parts.join(" · ");
  }

  // aria-controls cannot reach across the plate's shadow root, so the pane announces itself.
  private _renderPane(device: InsteonDevice, kind: CardKind): TemplateResult {
    const group = this._selectedGroup;
    const layout = plateLayout(device.cat, device.subcat);
    const title = group === undefined ? "" : buttonTitle(layout, group, this.insteon.localize);
    return html`
      <div
        class="pane"
        id="pane"
        role="region"
        aria-live="polite"
        aria-label=${title || this.insteon.localize("device.overview.connections")}
      >
        ${(kind === "buttons" || kind === "fallback") && group !== undefined
          ? html`
              <div class="pane-title">${title}</div>
              <div class="pane-sub">${this._paneSub(device, group)}</div>
            `
          : nothing}
        ${group === undefined ? nothing : this._renderLinks(device, group)}
      </div>
    `;
  }

  private _renderState(device: InsteonDevice): TemplateResult | undefined {
    const state = this._paneState(device);
    const { localize } = this.insteon;
    if (state === "loading") {
      return html`
        <div class="state">
          <ha-spinner size="small"></ha-spinner>
          <span>${localize("aldb.is_loading")}</span>
        </div>
      `;
    }
    if (state === "error") {
      return html`
        <ha-alert alert-type="error">
          ${localize("device.overview.records_error")}
          <ha-button slot="action" appearance="plain" @click=${() => this._fetchRecords()}>
            ${localize("device.overview.retry")}
          </ha-button>
        </ha-alert>
      `;
    }
    if (state === "not_loaded") {
      return html`
        <ha-alert alert-type="warning">
          ${localize("aldb.no_data")}
          <ha-button slot="action" appearance="plain" @click=${this._readFromDevice}>
            ${localize("common.actions.load")}
          </ha-button>
        </ha-alert>
      `;
    }
    if (state === "partial") {
      return html`
        <ha-alert alert-type="warning">
          ${localize("aldb.status." + device.aldb_status)}
          <ha-button slot="action" appearance="plain" @click=${this._readFromDevice}>
            ${localize("common.actions.load")}
          </ha-button>
        </ha-alert>
      `;
    }
    return undefined;
  }

  private _renderPending(records: ALDBRecord[]): TemplateResult | typeof nothing {
    if (!hasPendingRecords(records)) {
      return nothing;
    }
    return html`
      <ha-alert alert-type="warning">
        ${this.insteon.localize("device.overview.pane.pending")}
      </ha-alert>
    `;
  }

  private _renderLinks(device: InsteonDevice, group: number): TemplateResult {
    const state = this._renderState(device);
    if (state && this._paneState(device) !== "partial") {
      return state;
    }
    const records = this._aldb!;
    const modem = this._modem();
    const links = this._attributed(records, stateGroups(device), modem, this._loadGroup);
    const own = links.byButton.get(group) ?? { controls: [], controlledBy: [] };
    const { localize } = this.insteon;
    const loaded = this._paneState(device) === "loaded";
    const needs = modemLinkNeeds(device);
    return html`
      ${state ?? nothing} ${this._renderPending(records)}
      ${loaded &&
      modem &&
      device.cat !== MODEM_CAT &&
      needs.responder &&
      !hasModemResponderLink(records, modem)
        ? html`
            <ha-alert alert-type="warning">
              ${localize("device.overview.pane.ha_no_control_link")}
              <ha-button slot="action" appearance="plain" @click=${this._addDefaultLinks}>
                ${localize("common.actions.add_default_links")}
              </ha-button>
            </ha-alert>
          `
        : nothing}
      ${loaded &&
      modem &&
      device.cat !== MODEM_CAT &&
      needs.controllers.includes(group) &&
      !buttonNotifiesModem(records, modem, group)
        ? html`
            <ha-alert alert-type="warning">
              ${localize("device.overview.pane.button_not_notified")}
              <ha-button slot="action" appearance="plain" @click=${this._addDefaultLinks}>
                ${localize("common.actions.add_default_links")}
              </ha-button>
            </ha-alert>
          `
        : nothing}
      ${this._renderSections(links, own)}
    `;
  }

  private _renderSections(links: AttributedLinks, own: ButtonLinks): TemplateResult {
    const inert = own.controlledBy.filter(
      (row) => this._rowDetail(row, "controlled_by").detail.kind === "not_a_button",
    );
    const controlledBy = own.controlledBy.filter((row) => !inert.includes(row));
    return html`
      ${this._section("controls", own.controls)} ${this._section("controlled_by", controlledBy)}
      ${this._renderOther([...links.other, ...inert])}
    `;
  }

  private _section(key: Section, rows: LinkRow[]): TemplateResult {
    return html`
      <div class="section">
        <div class="label">${this.insteon.localize("device.overview.pane." + key)}</div>
        ${rows.length === 0
          ? html`<div class="empty">${this.insteon.localize("device.overview.pane.no_links")}</div>`
          : html`<ha-md-list>${rows.map((row) => this._row(row, key))}</ha-md-list>`}
      </div>
    `;
  }

  private _rowDetail(
    row: LinkRow,
    section: Section,
  ): { entry?: DeviceRegistryEntry; detail: RowDetail } {
    const devices = this.hass.devices ?? {};
    const entry = row.isModem ? undefined : insteonDeviceByAddress(devices, row.target);
    const pair = entry ? catSubcatFromModel(entry.model) : undefined;
    const layout = pair ? plateLayout(pair[0], pair[1]) : undefined;
    return { entry, detail: rowDetail(row, section, layout) };
  }

  private _row(row: LinkRow, section: Section): TemplateResult {
    const { entry, detail } = this._rowDetail(row, section);
    const path = this._rowPath(row, detail, entry?.id);
    const name = row.isModem
      ? this.insteon.localize("device.overview.pane.home_assistant")
      : row.name;
    const detailText = [
      row.pending ? this.insteon.localize("device.overview.pane.pending_row") : undefined,
      this._detailText(detail),
    ]
      .filter((part) => part)
      .join(" · ");
    return html`
      <ha-md-list-item
        type=${path ? "button" : "text"}
        @click=${path ? () => navigate(path) : undefined}
      >
        <span slot="headline">${name}</span>
        ${detailText ? html`<span slot="supporting-text">${detailText}</span>` : nothing}
        ${path ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
      </ha-md-list-item>
    `;
  }

  private _rowPath(row: LinkRow, detail: RowDetail, entryId?: string): string | undefined {
    if (detail.kind === "scene") {
      return "/insteon/scene/" + row.group;
    }
    if (!row.isModem && entryId) {
      return "/insteon/device/overview/" + entryId;
    }
    return undefined;
  }

  private _detailText(detail: RowDetail): string | undefined {
    const { localize } = this.insteon;
    switch (detail.kind) {
      case "ha_notified":
        return localize("device.overview.pane.ha_notified");
      case "ha_controls":
        return localize("device.overview.pane.ha_controls");
      case "scene": {
        const name = this._sceneName(detail.group);
        return name
          ? localize("device.overview.pane.scene_named", { group: detail.group, name })
          : localize("device.overview.pane.scene", { group: detail.group });
      }
      case "button":
        return buttonTitle(detail.layout, detail.group, localize);
      case "not_a_button":
        return localize("device.overview.pane.not_a_button", { group: detail.group });
      default:
        return undefined;
    }
  }

  private _renderOther(rows: LinkRow[]): TemplateResult | typeof nothing {
    if (rows.length === 0) {
      return nothing;
    }
    const { localize } = this.insteon;
    return html`
      <ha-expansion-panel
        outlined
        .header=${localize("device.overview.pane.other_links", { count: rows.length })}
      >
        <p class="hint">${localize("device.overview.pane.other_links_hint")}</p>
        <ha-md-list>
          ${rows.map(
            (row) => html`
              <ha-md-list-item type="text">
                <span slot="headline">
                  ${localize(
                    row.isController
                      ? "device.overview.pane.controls_row"
                      : "device.overview.pane.controlled_by_row",
                    {
                      name: row.isModem
                        ? localize("device.overview.pane.home_assistant")
                        : row.name,
                    },
                  )}
                </span>
                <span slot="supporting-text">
                  ${localize("device.overview.pane.not_a_button", { group: row.group })}
                </span>
              </ha-md-list-item>
            `,
          )}
        </ha-md-list>
      </ha-expansion-panel>
    `;
  }

  private _renderNoButtons(device: InsteonDevice): TemplateResult {
    const state = this._renderState(device);
    if (state && this._paneState(device) !== "partial") {
      return html`<div class="pane">${state}</div>`;
    }
    const records = this._aldb!;
    if (device.cat === MODEM_CAT) {
      return this._renderModem(records, state);
    }
    const { localize } = this.insteon;
    if (!records.some((rec) => rec.in_use)) {
      return html`
        <div class="pane">
          ${state ?? nothing} ${this._renderPending(records)}
          <div class="empty">${localize("device.overview.no_links_stored")}</div>
        </div>
      `;
    }
    const links = this._attributed(records, [1], this._modem(), this._loadGroup);
    const own = links.byButton.get(1)!;
    return html`
      <div class="pane">
        ${state ?? nothing} ${this._renderPending(records)} ${this._renderSections(links, own)}
      </div>
    `;
  }

  private _renderModem(records: ALDBRecord[], state: TemplateResult | undefined): TemplateResult {
    const { localize } = this.insteon;
    const controlled = new Set(
      records
        .filter((rec) => rec.in_use && rec.is_controller && rec.group === 0)
        .map((rec) => rec.target),
    ).size;
    const scenes = [...this._scenes].sort((a, b) => a.group - b.group);
    return html`
      <div class="pane">
        ${state ?? nothing} ${this._renderPending(records)}
        <div class="section">
          <div class="label">${localize("device.overview.modem_scenes")}</div>
          ${scenes.length === 0
            ? html`<div class="empty">${localize("device.overview.pane.no_links")}</div>`
            : html`
                <ha-md-list>
                  ${scenes.map(
                    (scene) => html`
                      <ha-md-list-item
                        type="button"
                        @click=${() => navigate("/insteon/scene/" + scene.group)}
                      >
                        <span slot="headline">${scene.name}</span>
                        <span slot="supporting-text">
                          ${localize("device.overview.scene_devices", {
                            group: scene.group,
                            count: Object.keys(scene.devices).length,
                          })}
                        </span>
                        <ha-icon-next slot="end"></ha-icon-next>
                      </ha-md-list-item>
                    `,
                  )}
                </ha-md-list>
              `}
        </div>
        <p class="hint">${localize("device.overview.modem_devices", { count: controlled })}</p>
        <p class="hint">${localize("device.overview.see_aldb")}</p>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --app-header-background-color: var(--sidebar-background-color);
          --app-header-text-color: var(--sidebar-text-color);
          --app-header-border-bottom: 1px solid var(--divider-color);
        }

        .container {
          display: flex;
          flex-direction: column;
          margin: 8px auto 0;
          max-width: 1000px;
        }

        :host([narrow]) .container {
          margin: 8px 8px 0;
        }

        ha-card {
          margin: 16px 8px 8px;
          --ha-card-header-font-size: 20px;
        }

        .card-content.center {
          display: flex;
          justify-content: center;
          padding: 32px;
        }

        .hint {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--secondary-text-color);
        }

        .plate-and-pane {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        :host([narrow]) .plate-and-pane {
          justify-content: center;
        }

        insteon-device-plate.buttons {
          --plate-scale: 1.25;
        }

        :host([narrow]) insteon-device-plate.buttons,
        insteon-device-plate.single {
          --plate-scale: 1;
        }

        .pane {
          flex: 1 1 260px;
          min-width: 240px;
        }

        .pane-title {
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .pane-sub {
          font-size: 13px;
          color: var(--secondary-text-color);
          margin-bottom: 12px;
        }

        .section {
          margin-bottom: 14px;
        }

        .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }

        .empty {
          font-size: 13px;
          color: var(--secondary-text-color);
        }

        .state {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: var(--secondary-text-color);
        }

        ha-alert {
          display: block;
          margin-bottom: 12px;
        }

        ha-alert ha-button {
          white-space: nowrap;
        }

        ha-md-list {
          --md-list-container-color: transparent;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
          gap: 6px;
          padding: 0;
        }

        ha-md-list-item {
          --md-list-item-top-space: 6px;
          --md-list-item-bottom-space: 6px;
          --md-list-item-leading-space: 10px;
          --md-list-item-trailing-space: 10px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
        }

        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 8px;
          --expansion-panel-content-padding: 0 8px;
        }

        .tiles {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
        }

        .tile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: none;
          color: var(--primary-text-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .tile.selected,
        .tile:focus-visible {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color);
          outline: none;
        }

        .tile-group {
          font-family: var(--ha-font-family-code, monospace);
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-overview-page": InsteonDeviceOverviewPage;
  }
}
