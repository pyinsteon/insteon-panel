import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiContentSave, mdiDelete, mdiDotsVertical } from "@mdi/js";
import "@ha/components/ha-list-item";
import "@ha/components/ha-button-menu";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { afterNextRender } from "@ha/common/util/render-status";
import { computeDomain } from "@ha/common/entity/compute_domain";
import { computeStateName } from "@ha/common/entity/compute_state_name";
import { computeRTL } from "@ha/common/util/compute_rtl";
import "@ha/components/device/ha-device-picker";
import "@ha/layouts/hass-subpage";
import "@ha/components/ha-card";
import "@ha/components/ha-fab";
import "@ha/components/ha-icon-button";
import "@ha/components/ha-svg-icon";
import "@ha/components/ha-textfield";
import "@ha/components/ha-checkbox";
import "@ha/components/ha-formfield";
import "@ha/components/ha-form/ha-form";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import "@ha/components/ha-alert";
import "@ha/components/ha-button";
import "@ha/components/ha-spinner";
import "@ha/components/ha-selector/ha-selector-select";
import "@ha/components/ha-area-picker";
import { computeDeviceName } from "@ha/common/entity/compute_device_name";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { fetchDeviceRegistry } from "@ha/data/device_registry";
import type { EntityRegistryEntry } from "@ha/data/entity_registry";
import type { SelectSelector } from "@ha/data/selector";
import {
  fetchEntityRegistry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "@ha/data/entity_registry";
import { showConfirmationDialog, showAlertDialog } from "@ha/dialogs/generic/show-dialog-box";
import { KeyboardShortcutMixin } from "@ha/mixins/keyboard-shortcut-mixin";
import { haStyle } from "@ha/resources/styles";
import type { HomeAssistant, Route } from "@ha/types";
import "@ha/panels/config/ha-config-section";
import type { Insteon, InsteonDevice } from "../data/insteon";
import { fetchInsteonDevice, rampRateSchema } from "../data/device";
import { insteonAddress, normalizeAddress } from "../device/registry-lookup";
import { deviceButtonTitle } from "../device/plate-layout";
import type { InsteonScene, InsteonSceneDeviceData, InsteonSceneLinkData } from "../data/scene";
import {
  fetchInsteonScene,
  saveInsteonScene,
  deleteInsteonScene,
  insteonSceneGroup,
} from "../data/scene";
import type { HaDevicePickerDeviceFilterFunc } from "@ha/components/device/ha-device-picker";
import { navigate } from "@ha/common/navigate";

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

// How a responder entity is set in a scene: dimmers use a level and ramp rate,
// the others select one of a few fixed data1 values.
type SceneControlKind = "dimmer" | "on_off" | "fan" | "lock";

interface InsteonSceneEntity {
  entity_id: string;
  name: string;
  kind: SceneControlKind;
  is_in_scene: boolean;
  data1: number;
  data2: number;
  data3: number;
}

interface SceneEntityFormData {
  on_level?: number;
  ramp_rate?: string;
  speed?: string;
  state?: string;
}

interface InsteonSceneDevice {
  address: string;
  device_id: string;
  name: string | null | undefined;
  area?: string;
  entities: InsteonSceneEntity[];
}

interface InsteonToHaDeviceMap {
  device: DeviceRegistryEntry;
  entities: { [group: number]: EntityRegistryEntry };
}

const INCLUDED_DOMAINS = ["switch", "fan", "light", "lock"];

const DEFAULT_RAMP_RATE = 28;

// Ramp rate 0 is a valid 9 minute ramp that the device properties form does not offer.
const RAMP_RATE_OPTIONS: [string, string][] = [...rampRateSchema.options, ["0", "540"]] as [
  string,
  string,
][];

const FAN_SPEEDS = { off: 0x00, low: 0x40, medium: 0xc0, high: 0xff };

const controlKind = (entityId: string): SceneControlKind => {
  switch (computeDomain(entityId)) {
    case "light":
      return "dimmer";
    case "fan":
      return "fan";
    case "lock":
      return "lock";
    default:
      return "on_off";
  }
};

const fanSpeed = (data1: number): number =>
  data1 === 0
    ? FAN_SPEEDS.off
    : data1 < 0x80
      ? FAN_SPEEDS.low
      : data1 < 0xff
        ? FAN_SPEEDS.medium
        : FAN_SPEEDS.high;

const toPercent = (data1: number): number => Math.round((data1 * 100) / 255);

@customElement("insteon-scene-editor")
export class InsteonSceneEditor extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Object }) public route!: Route;

  @property() public sceneId: string | null = null;

  @state() public _scene?: InsteonScene;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state() private _sceneEntities: EntityRegistryEntry[] = [];

  // The area chosen in the editor, applied to the scene's switch when saving.
  @state() private _areaId?: string | null;

  private _insteonToHaDeviceMap: { [address: string]: InsteonToHaDeviceMap } = {};

  private _haToinsteonDeviceMap: { [deviceId: string]: string } = {};

  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  @state() private _saving = false;

  @state() private _deleting = false;

  @state() private _controllerDevices: InsteonDevice[] = [];

  @state() private _controllersLoading = true;

  @state() private _controllersSupported = false;

  @state() private _deviceControlled = false;

  @state() private _controllerDeviceId = "";

  private _controllerDevicesById: Record<string, InsteonDevice> = {};

  @state() private _controllerGroup = "";

  protected firstUpdated(_changedProperties: Map<string | number | symbol, unknown>): void {
    super.firstUpdated(_changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }

    if (!this._scene && this.sceneId) {
      this._loadScene();
    } else {
      this._initNewScene();
    }

    this._getDeviceRegistryEntries();
    this._getEntityRegistryEntries();

    // Copied from ha-panel-config to retain consistancy
    this.style.setProperty("--app-header-background-color", "var(--sidebar-background-color)");
    this.style.setProperty("--app-header-text-color", "var(--sidebar-text-color)");
    this.style.setProperty("--app-header-border-bottom", "1px solid var(--divider-color)");
    this.style.setProperty("--ha-card-border-radius", "var(--ha-config-card-border-radius, 8px)");
  }

  // Map registry entries before rendering so new devices and entities show immediately.
  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hass || !this.insteon) {
      return;
    }

    if (changedProps.has("_deviceRegistryEntries") || changedProps.has("_entityRegistryEntries")) {
      this._mapDeviceEntities();
    }
    if (
      changedProps.has("_scene") ||
      changedProps.has("_deviceRegistryEntries") ||
      changedProps.has("_entityRegistryEntries")
    ) {
      this._normalizeOutputs();
    }
  }

  // Links made with set buttons store output 0 on single-output devices.
  private _normalizeOutputs(): boolean {
    let changed = false;
    for (const [address, links] of Object.entries(this._scene?.devices || {})) {
      const groups = Object.keys(this._insteonToHaDeviceMap[address]?.entities || {});
      if (groups.length !== 1) {
        continue;
      }
      for (const link of links) {
        if (link.data3 === 0) {
          link.data3 = +groups[0];
          changed = true;
        }
      }
    }
    return changed;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    if (!this._scene) {
      return this._errors
        ? html`<ha-alert alert-type="error">${this._errors}</ha-alert>`
        : html`<ha-spinner active></ha-spinner>`;
    }
    const name = this._scene
      ? this._scene.name
      : this.insteon.localize("scenes.scene.default_name");

    const devices = this._setSceneDevices();
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${name}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-list-item
            .disabled=${!this.sceneId}
            aria-label=${this.insteon.localize("scenes.scene.delete")}
            class=${classMap({ warning: Boolean(this.sceneId) })}
            graphic="icon"
          >
            ${this.insteon.localize("scenes.scene.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.sceneId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </ha-list-item>
        </ha-button-menu>
        ${this._errors ? html`<ha-alert alert-type="error">${this._errors}</ha-alert>` : ""}
        ${!this.narrow ? html` <span slot="header">${name}</span> ` : ""}
        <div
          id="root"
          class=${classMap({
            rtl: computeRTL(this.hass),
          })}
        >
          ${this._saving
            ? html`<ha-config-section vertical .isWide=${this.isWide}>
                <div class="saving" role="status">
                  <ha-spinner size="large"></ha-spinner>
                  <span
                    >${this.insteon.localize(
                      this._deleting ? "scenes.scene.deleting" : "scenes.scene.saving",
                    )}</span
                  >
                </div>
              </ha-config-section>`
            : this._showEditorArea(name, devices)}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.insteon.localize("scenes.scene.save")}
          extended
          .disabled=${this._saving || (this._deviceControlled && this._controllersLoading)}
          @click=${this._saveScene}
          class=${classMap({ dirty: this._dirty, saving: this._saving })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private async _getDeviceRegistryEntries(): Promise<void> {
    try {
      const allDevices = await fetchDeviceRegistry(this.hass.connection);
      this._deviceRegistryEntries = allDevices.filter(
        (device) =>
          device.config_entries &&
          device.config_entries.includes(this.insteon.config_entry.entry_id),
      );
      const entries = this._deviceRegistryEntries.filter((entry) =>
        /^[0-9A-F]{6}$/.test(normalizeAddress(insteonAddress(entry) || "")),
      );
      const devices = await Promise.all(
        entries.map((entry) => fetchInsteonDevice(this.hass, entry.id)),
      );
      this._controllersSupported = devices.some((device) => device.controller_groups !== undefined);
      const isController = (device: InsteonDevice) =>
        device.cat !== 0x03 && (device.controller_groups?.length || 0) > 0;
      this._controllerDevicesById = Object.fromEntries(
        entries
          .map((entry, index): [string, InsteonDevice] => [entry.id, devices[index]])
          .filter(([, device]) => isController(device)),
      );
      this._controllerDevices = Object.values(this._controllerDevicesById);
    } catch (error: unknown) {
      this._showError(error);
    } finally {
      this._controllersLoading = false;
    }
  }

  private async _getEntityRegistryEntries(): Promise<void> {
    try {
      const allEntities = await fetchEntityRegistry(this.hass.connection);
      this._sceneEntities = allEntities.filter((entity) => insteonSceneGroup(entity) !== undefined);
      this._entityRegistryEntries = allEntities.filter(
        (entity) =>
          entity.entity_category === null &&
          entity.config_entry_id === this.insteon.config_entry.entry_id &&
          INCLUDED_DOMAINS.includes(computeDomain(entity.entity_id)) &&
          insteonSceneGroup(entity) === undefined,
      );
    } catch (error: unknown) {
      this._showError(error);
    }
  }

  // The scene and device sections are siblings, as in Home Assistant's scene editor, so
  // their cards are the same width.
  private _showEditorArea(name, devices) {
    return html`<ha-config-section vertical .isWide=${this.isWide}>
        <div slot="introduction">${this.insteon.localize("scenes.scene.introduction")}</div>
        <ha-card outlined>
          <div class="card-content">
            <ha-textfield
              .value=${name}
              .name=${"name"}
              @change=${this._nameChanged}
              .label=${this.insteon.localize("scenes.scene.name")}
            ></ha-textfield>
            <ha-area-picker
              .hass=${this.hass}
              .value=${this._sceneArea()}
              .label=${this.insteon.localize("scenes.scene.area")}
              @value-changed=${this._areaChanged}
            ></ha-area-picker>
          </div>
        </ha-card>

        ${this._showControllers()}
      </ha-config-section>

      <ha-config-section vertical .isWide=${this.isWide}>
        <div slot="header">${this.insteon.localize("scenes.scene.devices.header")}</div>
        <div slot="introduction">${this.insteon.localize("scenes.scene.devices.introduction")}</div>

        ${devices.map((device) => this._renderSceneDevice(device))}

        <ha-card outlined .header=${this.insteon.localize("scenes.scene.devices.add")}>
          <div class="card-content">
            <ha-device-picker
              class="responder-picker"
              @value-changed=${this._devicePicked}
              .hass=${this.hass}
              .includeDomains=${INCLUDED_DOMAINS}
              .deviceFilter=${this._responderFilter}
              .excludeDevices=${devices.map((device) => device.device_id)}
            ></ha-device-picker>
          </div>
        </ha-card>
      </ha-config-section>`;
  }

  private _renderSceneDevice(device: InsteonSceneDevice): TemplateResult {
    // Devices with one output, like plug-in modules and switches, are always in the scene.
    const selectable = device.entities.length > 1;
    return html`
      <ha-card outlined class="scene-device">
        <h1 class="card-header">
          <div>
            ${device.name} ${device.area ? html`<div class="secondary">${device.area}</div>` : ""}
          </div>
          <ha-icon-button
            .path=${mdiDelete}
            .label=${this.insteon.localize("scenes.scene.devices.remove")}
            .device_address=${device.address}
            @click=${this._deleteDevice}
          ></ha-icon-button>
        </h1>
        <div class="card-content">
          ${device.entities.map(
            (entity) => html`
              <div class="entity">
                ${selectable
                  ? html`<ha-formfield .label=${entity.name}>
                      <ha-checkbox
                        .checked=${entity.is_in_scene}
                        @change=${this._toggleSelection}
                        .device_address=${device.address}
                        .group=${entity.data3}
                      ></ha-checkbox>
                    </ha-formfield>`
                  : ""}
                ${!selectable || entity.is_in_scene
                  ? html`<ha-form
                      class=${classMap({ indented: selectable })}
                      .hass=${this.hass}
                      .schema=${this._entitySchema(entity.kind)}
                      .data=${this._entityFormData(entity)}
                      .computeLabel=${this._computeLabel}
                      @value-changed=${(ev: CustomEvent<{ value: SceneEntityFormData }>) =>
                        this._entityFormChanged(device.address, entity, ev.detail.value)}
                    ></ha-form>`
                  : ""}
              </div>
            `,
          )}
        </div>
      </ha-card>
    `;
  }

  private _schemas: Partial<Record<SceneControlKind, HaFormSchema[]>> = {};

  private _entitySchema(kind: SceneControlKind): HaFormSchema[] {
    if (!this._schemas[kind]) {
      const option = (key: string, value: number) => ({
        value: String(value),
        label: this.insteon.localize(`scenes.scene.devices.states.${key}`),
      });
      const toggle = (name: string, options: { value: string; label: string }[]) => [
        { name, required: true, selector: { button_toggle: { options } } },
      ];
      this._schemas[kind] =
        kind === "dimmer"
          ? [
              {
                name: "on_level",
                selector: {
                  number: { min: 0, max: 100, step: 1, mode: "slider", unit_of_measurement: "%" },
                },
              },
              {
                name: "ramp_rate",
                required: true,
                selector: {
                  select: {
                    mode: "dropdown",
                    options: RAMP_RATE_OPTIONS.map(([value, seconds]) => ({
                      value,
                      label: this.insteon.localize("scenes.scene.devices.seconds", { seconds }),
                    })),
                  },
                },
              },
            ]
          : kind === "fan"
            ? toggle(
                "speed",
                Object.entries(FAN_SPEEDS).map(([key, value]) => option(key, value)),
              )
            : kind === "lock"
              ? toggle("state", [option("unlocked", 0), option("locked", 255)])
              : toggle("state", [option("off", 0), option("on", 255)]);
    }
    return this._schemas[kind]!;
  }

  private _entityFormData(entity: InsteonSceneEntity): SceneEntityFormData {
    switch (entity.kind) {
      case "dimmer":
        return { on_level: toPercent(entity.data1), ramp_rate: String(entity.data2) };
      case "fan":
        return { speed: String(fanSpeed(entity.data1)) };
      default:
        return { state: entity.data1 > 0 ? "255" : "0" };
    }
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    this.insteon.localize(`scenes.scene.devices.${schema.name}`);

  private _entityFormChanged(
    address: string,
    entity: InsteonSceneEntity,
    value: SceneEntityFormData,
  ): void {
    if (entity.kind === "dimmer") {
      if (value.ramp_rate !== String(entity.data2)) {
        this._rampRateChanged(address, entity, value.ramp_rate);
      }
      this._levelChanged(address, entity, value.on_level);
      return;
    }
    const data1 = value.speed ?? value.state;
    if (data1 !== undefined) {
      this._updateLink(address, entity, { data1: +data1 });
    }
  }

  private _levelChanged(address: string, entity: InsteonSceneEntity, percent?: number): void {
    if (percent === undefined || Number.isNaN(percent)) {
      return;
    }
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    // Keep the stored level when it already rounds to the displayed percentage.
    if (entity.is_in_scene && toPercent(entity.data1) === clamped) {
      return;
    }
    this._updateLink(address, entity, { data1: Math.round((clamped * 255) / 100) });
  }

  private _rampRateChanged(address: string, entity: InsteonSceneEntity, value?: string): void {
    if (value === undefined || value === "" || (entity.is_in_scene && +value === entity.data2)) {
      return;
    }
    this._updateLink(address, entity, { data2: +value });
  }

  private _updateLink(
    address: string,
    entity: InsteonSceneEntity,
    data: Partial<Pick<InsteonSceneDeviceData, "data1" | "data2">>,
  ): void {
    const links = this._scene!.devices[address];
    let link = links.find((candidate) => candidate.data3 === entity.data3);
    if (!link) {
      this._selectEntity(true, links, entity.data3, entity.kind);
      link = links.find((candidate) => candidate.data3 === entity.data3)!;
    }
    Object.assign(link, data);
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  private _areaName(address: string): string | undefined {
    const wanted = normalizeAddress(address);
    const areaId = this._deviceRegistryEntries.find(
      (entry) => normalizeAddress(insteonAddress(entry) || "") === wanted,
    )?.area_id;
    return areaId ? this.hass.areas?.[areaId]?.name : undefined;
  }

  private _controllerFilter: HaDevicePickerDeviceFilterFunc = (device) =>
    device.id in this._controllerDevicesById;

  private _responderFilter: HaDevicePickerDeviceFilterFunc = (device) =>
    device.id in this._haToinsteonDeviceMap && !device.model?.includes("(0x03");

  private _showControllers(): TemplateResult {
    if (this._controllersLoading) {
      return html`<ha-spinner active></ha-spinner>`;
    }
    if (!this._controllersSupported) {
      return html`<ha-alert
        >${this.insteon.localize("scenes.scene.controllers.upgrade")}</ha-alert
      >`;
    }
    const controllers = this._scene?.controllers || [];
    const selected = this._controllerDevicesById[this._controllerDeviceId];
    const groupOptions = (selected?.controller_groups || []).map((group) => ({
      value: String(group),
      label: deviceButtonTitle(selected?.cat, selected?.subcat, group, this.insteon.localize),
    }));
    const hasBatteryController = controllers.some((controller) =>
      this._controllerDevices.some(
        (device) =>
          normalizeAddress(device.address) === normalizeAddress(controller.address) &&
          device.is_battery,
      ),
    );
    return html`
      <ha-card outlined .header=${this.insteon.localize("scenes.scene.controllers.header")}>
        <div class="card-content">
          <ha-selector-select
            .hass=${this.hass}
            .label=${this.insteon.localize("scenes.scene.controllers.type")}
            .value=${this._deviceControlled ? "device" : "app"}
            .selector=${{
              select: {
                mode: "dropdown",
                options: [
                  {
                    value: "app",
                    label: this.insteon.localize("scenes.scene.controllers.app_only"),
                  },
                  {
                    value: "device",
                    label: this.insteon.localize("scenes.scene.controllers.device_controlled"),
                  },
                ],
              },
            } satisfies SelectSelector}
            @value-changed=${this._sceneTypeChanged}
          ></ha-selector-select>
          <p>${this.insteon.localize("scenes.scene.controllers.introduction")}</p>
          ${this._scene?.pending
            ? html`<ha-alert alert-type="warning"
                >${this.insteon.localize("scenes.scene.controllers.pending")}</ha-alert
              >`
            : ""}
          ${this._deviceControlled
            ? html`
                <ha-alert>${this.insteon.localize("scenes.scene.controllers.local_load")}</ha-alert>
                ${controllers.map((controller) => {
                  const device = this._controllerDevices.find(
                    (candidate) =>
                      normalizeAddress(candidate.address) === normalizeAddress(controller.address),
                  );
                  const area = this._areaName(controller.address);
                  return html`
                    <div class="controller-row">
                      <div>
                        <div>
                          ${device?.name || controller.address} -
                          ${deviceButtonTitle(
                            device?.cat,
                            device?.subcat,
                            controller.group,
                            this.insteon.localize,
                          )}
                        </div>
                        ${area ? html`<div class="secondary">${area}</div>` : ""}
                      </div>
                      <ha-icon-button
                        .path=${mdiDelete}
                        .label=${this.insteon.localize("scenes.scene.controllers.remove")}
                        @click=${() => this._removeController(controller.address, controller.group)}
                      ></ha-icon-button>
                    </div>
                  `;
                })}
                <ha-device-picker
                  class="controller-picker"
                  .hass=${this.hass}
                  .label=${this.insteon.localize("scenes.scene.controllers.device")}
                  .value=${this._controllerDeviceId}
                  .deviceFilter=${this._controllerFilter}
                  @value-changed=${this._controllerDeviceChanged}
                ></ha-device-picker>
                <ha-selector-select
                  .hass=${this.hass}
                  .label=${this.insteon.localize("scenes.scene.controllers.button")}
                  .value=${this._controllerGroup}
                  .required=${false}
                  .disabled=${!selected}
                  .selector=${{
                    select: { mode: "dropdown", options: groupOptions },
                  } satisfies SelectSelector}
                  @value-changed=${this._controllerGroupChanged}
                ></ha-selector-select>
                ${selected?.is_battery || hasBatteryController
                  ? html`<ha-alert alert-type="warning"
                      >${this.insteon.localize("scenes.scene.controllers.wake")}</ha-alert
                    >`
                  : ""}
                <ha-button
                  .disabled=${!selected || !this._controllerGroup}
                  @click=${this._addController}
                  >${this.insteon.localize("scenes.scene.controllers.add")}</ha-button
                >
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  // ha-select emits an undefined value when it is cleared or its options change.
  private _sceneTypeChanged(ev: CustomEvent<{ value?: string }>): void {
    if (ev.detail.value === undefined) {
      return;
    }
    this._deviceControlled = ev.detail.value === "device";
    this._dirty = true;
  }

  private _controllerDeviceChanged(ev: CustomEvent<{ value?: string }>): void {
    if ((ev.detail.value ?? "") === this._controllerDeviceId) {
      return;
    }
    this._controllerDeviceId = ev.detail.value ?? "";
    this._controllerGroup = "";
  }

  private _controllerGroupChanged(ev: CustomEvent<{ value?: string }>): void {
    this._controllerGroup = ev.detail.value ?? "";
  }

  private _addController(): void {
    const group = Number(this._controllerGroup);
    const device = this._controllerDevicesById[this._controllerDeviceId];
    if (!device?.controller_groups?.includes(group) || !this._scene) {
      this._errors = this.insteon.localize("scenes.scene.controllers.invalid");
      return;
    }
    const controllers = this._scene.controllers || [];
    if (
      controllers.some(
        (controller) =>
          normalizeAddress(controller.address) === normalizeAddress(device.address) &&
          controller.group === group,
      )
    ) {
      this._errors = this.insteon.localize("scenes.scene.controllers.duplicate");
      return;
    }
    this._scene = {
      ...this._scene,
      controllers: [...controllers, { address: device.address, group }],
    };
    this._dirty = true;
    this._errors = undefined;
    this._controllerDeviceId = "";
    this._controllerGroup = "";
  }

  private _removeController(address: string, group: number): void {
    this._scene = {
      ...this._scene!,
      controllers: (this._scene?.controllers || []).filter(
        (controller) => controller.address !== address || controller.group !== group,
      ),
    };
    this._dirty = true;
  }

  private _showError(error: unknown): void {
    this._errors =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : this.insteon.localize("common.error.scene_write");
  }

  private _setSceneDevices(): InsteonSceneDevice[] {
    const outputDevices: InsteonSceneDevice[] = [];
    if (!this._scene) {
      return [];
    }
    for (const [address, links] of Object.entries(this._scene.devices)) {
      const haDevice = this._insteonToHaDeviceMap[address] || undefined;
      const deviceEntities = haDevice ? haDevice.entities : {};
      const theseEntities: InsteonSceneEntity[] = [];
      let thisDevice: InsteonSceneDevice | undefined;

      for (const [group, entity] of Object.entries(deviceEntities)) {
        const insteonEntityData: InsteonSceneDeviceData | undefined = links.find(
          (link) => link.data3 === +group,
        );
        const kind = controlKind(entity.entity_id);
        const defaults = this._defaultLink(kind);
        const data1 = insteonEntityData?.data1 ?? defaults.data1;
        const data2 = insteonEntityData?.data2 ?? defaults.data2;
        const data3 = insteonEntityData?.data3 || +group;
        const is_in_scene = !!insteonEntityData;
        const stateObj = this.hass.states[entity.entity_id];
        theseEntities.push({
          kind,
          entity_id: entity.entity_id,
          name: stateObj
            ? computeStateName(stateObj)
            : entity.name
              ? entity.name
              : entity.original_name!,
          is_in_scene: is_in_scene,
          data1: data1,
          data2: data2,
          data3: +data3,
        });
        thisDevice = {
          address: address,
          device_id: haDevice.device.id,
          name: computeDeviceName(haDevice.device),
          area: this._areaName(address),
          entities: theseEntities,
        };
      }
      if (thisDevice) {
        outputDevices.push(thisDevice);
      }
    }
    return outputDevices;
  }

  private _initNewScene() {
    this._dirty = false;
    this._scene = {
      name: this.insteon.localize("scenes.scene.default_name"),
      devices: {},
      group: -1,
      controllers: [],
    };
  }

  private _mapDeviceEntities() {
    this._insteonToHaDeviceMap = {};
    this._haToinsteonDeviceMap = {};
    this._deviceRegistryEntries.map((haDevice) => {
      const address: string = haDevice.identifiers[0][1];
      const entities: { [group: number]: EntityRegistryEntry } = {};
      this._entityRegistryEntries
        .filter((entity) => entity.device_id === haDevice.id)
        .map((entity) => {
          let group = +entity.unique_id.split("_")[1];
          if (Number.isNaN(group)) {
            group = 1;
          }
          entities[group] = entity;
        });
      this._insteonToHaDeviceMap[address] = {
        device: haDevice,
        entities: entities,
      };
      this._haToinsteonDeviceMap[haDevice.id] = address;
    });
    for (const entity of this._entityRegistryEntries) {
      if (!entity.device_id) {
        continue;
      }
      if (!(entity.device_id in this._deviceEntityLookup)) {
        this._deviceEntityLookup[entity.device_id] = [];
      }
      if (!this._deviceEntityLookup[entity.device_id].includes(entity.entity_id)) {
        this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
      }
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._deleteTapped();
        break;
    }
  }

  private async _loadScene() {
    try {
      this._scene = await fetchInsteonScene(this.hass, +this.sceneId!);
      this._deviceControlled = (this._scene.controllers?.length || 0) > 0;
      this._dirty = !!this._scene.pending;
    } catch (error: unknown) {
      this._showError(error);
    }
  }

  private _pickDevice(deviceId: string) {
    const haDevice = this._deviceRegistryEntries.find((haCurrDevice) => {
      return haCurrDevice.id === deviceId;
    });
    const address = haDevice?.identifiers[0][1];
    if (!address) {
      return;
    }
    if (this._scene!.devices.hasOwnProperty(address)) {
      return;
    }
    const updated_scene: InsteonScene = { ...this._scene! };
    const links: InsteonSceneDeviceData[] = [];
    const entities = Object.entries(this._insteonToHaDeviceMap[address]?.entities || {});
    if (entities.length === 1) {
      const [group, entity] = entities[0];
      this._selectEntity(true, links, +group, controlKind(entity.entity_id));
    }
    updated_scene.devices[address] = links;
    this._scene = { ...updated_scene };
    this._dirty = true;
  }

  private _devicePicked(ev: CustomEvent<{ value?: string }>) {
    const deviceId = ev.detail.value;
    (ev.target as HTMLElement & { value?: string }).value = "";
    if (deviceId) {
      this._pickDevice(deviceId);
    }
  }

  private _deleteDevice(ev: Event) {
    const address = (ev.target as any).device_address;
    const updated_scene: InsteonScene = { ...this._scene! };
    if (updated_scene.devices.hasOwnProperty(address)) {
      delete updated_scene.devices[address];
    }
    this._scene = { ...updated_scene };
    this._dirty = true;
  }

  private _toggleSelection(ev: Event) {
    const address = (ev.target as any).device_address;
    const checked = (ev.target as any).checked;
    const group = (ev.target as any).group;
    const device = this._scene!.devices[address];
    const entity = this._insteonToHaDeviceMap[address]?.entities[+group];
    this._selectEntity(checked, device, group, entity ? controlKind(entity.entity_id) : "on_off");
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  // New responders turn on, and dimmers use the standard 0.5 s ramp rate.
  private _defaultLink(kind: SceneControlKind): { data1: number; data2: number } {
    return { data1: 255, data2: kind === "dimmer" ? DEFAULT_RAMP_RATE : 0 };
  }

  private _selectEntity(
    checked: boolean,
    device: InsteonSceneDeviceData[],
    group: number,
    kind: SceneControlKind,
  ) {
    if (checked) {
      const existing_link = device.find((link) => link.data3 === +group);
      if (existing_link) {
        return;
      }
      const link: InsteonSceneDeviceData = {
        ...this._defaultLink(kind),
        data3: +group,
        has_controller: false,
        has_responder: false,
      };
      device.push(link);
    } else {
      const existing_link = device.findIndex((link) => link.data3 === +group);
      if (existing_link !== -1) {
        device.splice(existing_link, 1);
      }
    }
    this._dirty = true;
  }

  private _nameChanged(ev: Event) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = (ev as CustomEvent).detail?.value ?? target.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this._scene![name] || "") === newVal) {
      return;
    }
    if (!newVal) {
      delete this._scene![name];
      this._scene = { ...this._scene! };
    } else {
      this._scene = { ...this._scene!, [name]: newVal };
    }
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  private _backTapped = async (): Promise<void> => {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      this._goBack();
    }
  };

  private _goBack(): void {
    afterNextRender(() => history.back());
  }

  private async confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      const action = showConfirmationDialog(this, {
        title: this.insteon!.localize("common.unsaved.title"),
        text: this.insteon!.localize("scenes.unsaved.message"),
        confirmText: this.insteon!.localize("common.leave"),
        dismissText: this.insteon!.localize("common.stay"),
        destructive: true,
      });
      history.back();
      return action;
    }
    return true;
  }

  private _deleteTapped(): void {
    showConfirmationDialog(this, {
      title: this.insteon!.localize("scenes.delete_scene.title"),
      text: this.insteon!.localize("scenes.delete_scene.message"),
      confirmText: this.insteon!.localize("common.delete"),
      dismissText: this.insteon!.localize("common.cancel"),
      destructive: true,
      confirm: () => this._delete(),
    });
    history.back();
  }

  private async _delete(): Promise<void> {
    this._saving = true;
    this._deleting = true;
    const sceneId: number = +this.sceneId!;
    try {
      const result = await deleteInsteonScene(this.hass, sceneId);
      if (!result.result) {
        this._errors = this.insteon.localize("scenes.scene.controllers.pending");
        return;
      }
      this._goBack();
    } catch (error: unknown) {
      this._showError(error);
    } finally {
      this._saving = false;
      this._deleting = false;
    }
  }

  private async _saveScene(): Promise<void> {
    if (this._saving) {
      return;
    }
    if (this._deviceControlled && !this._scene?.controllers?.length) {
      this._errors = this.insteon.localize("scenes.scene.controllers.required");
      return;
    }
    if (!this._checkDeviceEntitySelections()) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.scene_device_no_entities"),
        confirmText: this.insteon!.localize("common.close"),
      });
      history.back();
      return;
    }
    this._saving = true;
    const links: InsteonSceneLinkData[] = [];
    Object.keys(this._scene!.devices).forEach((address) => {
      const link_data = this._scene!.devices[address];
      link_data.forEach((link_info) => {
        const link = {
          address: address,
          data1: link_info.data1,
          data2: link_info.data2,
          data3: link_info.data3,
        };
        links.push(link);
      });
    });
    this._errors = undefined;
    try {
      const result = await saveInsteonScene(
        this.hass,
        this._scene!.group,
        links,
        this._scene!.name,
        this._controllersSupported
          ? this._deviceControlled
            ? this._scene!.controllers
            : []
          : undefined,
      );
      this._scene = { ...this._scene!, group: result.scene_id, pending: !result.result };
      // A failed new-scene write still reserves its modem group for retry.
      if (!this.sceneId) {
        this.sceneId = String(result.scene_id);
        navigate(`/insteon/scene/${result.scene_id}`, { replace: true });
      }
      if (!result.result) {
        this._dirty = true;
        this._errors = this.insteon.localize("scenes.scene.controllers.pending");
        return;
      }
      if (!this._deviceControlled) {
        this._scene = { ...this._scene, controllers: [] };
      }
      if (!(await this._saveArea(result.scene_id))) {
        this._dirty = true;
        this._errors = this.insteon.localize("scenes.scene.area_failed");
        return;
      }
      this._dirty = false;
      if (this._deviceControlled) {
        // Show controller buttons that the hardware scene added as responders.
        await this._loadScene();
      }
    } catch (error: unknown) {
      this._dirty = true;
      this._showError(error);
    } finally {
      this._saving = false;
    }
  }

  private _sceneEntity(group: number): EntityRegistryEntry | undefined {
    return this._sceneEntities.find((entity) => insteonSceneGroup(entity) === group);
  }

  private _sceneArea(): string | undefined {
    if (this._areaId !== undefined) {
      return this._areaId ?? undefined;
    }
    return this._sceneEntity(this._scene!.group)?.area_id ?? undefined;
  }

  private _areaChanged(ev: CustomEvent<{ value?: string }>): void {
    const areaId = ev.detail.value || null;
    if (areaId === (this._sceneArea() ?? null)) {
      return;
    }
    this._areaId = areaId;
    this._dirty = true;
  }

  // Set the area of the scene's switch, which is added when a new scene is saved.
  private async _saveArea(group: number): Promise<boolean> {
    if (this._areaId === undefined) {
      return true;
    }
    const entity = this._sceneEntity(group) ?? (await this._waitForSceneEntity(group));
    if (!entity) {
      return false;
    }
    const { entity_entry } = await updateEntityRegistryEntry(this.hass, entity.entity_id, {
      area_id: this._areaId,
    });
    this._sceneEntities = [
      ...this._sceneEntities.filter((candidate) => candidate.entity_id !== entity.entity_id),
      entity_entry,
    ];
    this._areaId = undefined;
    return true;
  }

  private _waitForSceneEntity(group: number): Promise<EntityRegistryEntry | undefined> {
    return new Promise((resolve) => {
      let found: EntityRegistryEntry | undefined;
      let done = false;
      let unsubscribe: UnsubscribeFunc | undefined;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        clearTimeout(timeout);
        unsubscribe?.();
        resolve(found);
      };
      const timeout = setTimeout(finish, 10000);
      // The registry can be reported before subscribeEntityRegistry returns.
      unsubscribe = subscribeEntityRegistry(this.hass.connection, (entities) => {
        found = entities.find((entity) => insteonSceneGroup(entity) === group);
        if (found) {
          finish();
        }
      });
      if (done) {
        unsubscribe();
      }
    });
  }

  private _checkDeviceEntitySelections(): boolean {
    for (const [_, links] of Object.entries(this._scene!.devices)) {
      if (links.length === 0) {
        return false;
      }
    }
    return true;
  }

  protected handleKeyboardSave() {
    this._saveScene();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        .saving {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 50vh;
          text-align: center;
        }
        .controller-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        ha-selector-select {
          display: block;
          margin-bottom: 16px;
        }
        ha-config-section:last-child {
          padding-bottom: 20px;
        }
        .triggers,
        .script {
          margin-top: -16px;
        }
        .triggers ha-card,
        .script ha-card {
          margin-top: 16px;
        }
        .add-card ha-button {
          display: block;
          text-align: center;
        }
        .card-menu {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
          color: var(--primary-text-color);
        }
        .rtl .card-menu {
          right: auto;
          left: 0;
        }
        .card-menu paper-item {
          cursor: pointer;
        }
        ha-card ha-icon-button {
          color: var(--secondary-text-color);
        }
        .secondary {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m, 14px);
          font-weight: normal;
          line-height: normal;
        }
        .scene-device .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .scene-device .entity + .entity {
          margin-top: 8px;
        }
        ha-form.indented {
          display: block;
          margin-inline-start: 40px;
          margin-bottom: 8px;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
        }
        ha-fab.saving {
          opacity: var(--light-disabled-opacity);
        }
        ha-entity-picker,
        ha-area-picker {
          display: block;
          margin-top: 8px;
        }
        ha-textfield {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-scene-editor": InsteonSceneEditor;
  }
}
