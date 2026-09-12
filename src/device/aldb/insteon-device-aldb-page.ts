import { mdiPlus, mdiDotsVertical } from "@mdi/js";
import type { ActionDetail } from "@material/mwc-list";
import memoizeOne from "memoize-one";
import "@ha/components/ha-icon-button";
import "@ha/components/ha-spinner";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "@ha/components/ha-fab";
import "@ha/components/ha-button";
import "@ha/components/ha-list-item";
import type { Insteon, InsteonDevice } from "../../data/insteon";
import type { ALDBRecord, AldbNotification } from "../../data/device";
import {
  fetchInsteonDevice,
  fetchInsteonALDB,
  changeALDBRecord,
  createALDBRecord,
  writeALDB,
  loadALDB,
  resetALDB,
  addDefaultLinks,
  aldbChangeRecordSchema,
  aldbNewRecordSchema,
  subscribeAldbLoading,
} from "../../data/device";
import "@ha/layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "@ha/types";
import { insteonDeviceTabs } from "../insteon-device-router";
import "../insteon-device-header";
import { confirmDeleteDevice } from "../delete-device";
import "./insteon-aldb-data-table";
import type { HASSDomEvent } from "@ha/common/dom/fire_event";
import type { RowClickedEvent } from "@ha/components/data-table/ha-data-table";
import { showConfirmationDialog, showAlertDialog } from "@ha/dialogs/generic/show-dialog-box";
import { showInsteonALDBRecordDialog } from "./show-dialog-insteon-aldb-record";
import { navigate } from "@ha/common/navigate";
import "@ha/components/ha-button-menu";
import { fileDownload } from "@ha/util/file_download";

import { haStyle } from "@ha/resources/styles";

export interface ExportableRecord {
  mem_addr: number;
  in_use: boolean;
  is_controller: boolean;
  is_highwater: boolean;
  group: number;
  target: string;
  data1: number;
  data2: number;
  data3: number;
}

@customElement("insteon-device-aldb-page")
class InsteonDeviceALDBPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Object }) public route?: Route;

  @property() private deviceId?: string;

  @state() private _device?: InsteonDevice;

  @state() private _records?: ALDBRecord[];

  @state() private _allRecords?: ALDBRecord[] = [];

  @state() private _showHideUnused = "show";

  @state() private _showUnused = false;

  @state() private _isLoading = false;

  private _subscribed?: Promise<() => Promise<void>>;

  private _refreshDevicesTimeoutHandle?: number;

  private _showUnusedAvailable = false;

  protected firstUpdated(changedProps: PropertyValues) {
    // eslint-disable-next-line no-console
    console.info("Device GUID: " + this.deviceId + " in aldb");
    super.firstUpdated(changedProps);
    if (this.deviceId && this.hass) {
      this._showUnusedAvailable = Boolean(this.hass.userData?.showAdvanced);
      fetchInsteonDevice(this.hass, this.deviceId).then(
        (device) => {
          this._device = device;
          this._getRecords();
        },
        () => {
          this._noDeviceError();
        },
      );
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  protected _dirty() {
    return this._records?.reduce((dirty, rec) => dirty || rec.dirty, false);
  }

  private _filterRecords(records: ALDBRecord[]): ALDBRecord[] {
    return records.filter(
      (record) => record.in_use || (this._showUnused && this._showUnusedAvailable) || record.dirty,
    );
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
        .localizeFunc=${this.insteon.localize}
        .backCallback=${() => this._handleBackTapped()}
      >
        ${this.narrow
          ? html`<insteon-device-header
              slot="header"
              narrow
              .hass=${this.hass}
              .insteon=${this.insteon}
              .device=${this._device}
              >${this._generateActionMenu()}</insteon-device-header
            >`
          : ""}
        <div class="container">
          ${!this.narrow
            ? html`<insteon-device-header
                .hass=${this.hass}
                .insteon=${this.insteon}
                .device=${this._device}
                >${this._generateActionMenu()}</insteon-device-header
              >`
            : ""}
          <insteon-aldb-data-table
            .insteon=${this.insteon}
            .hass=${this.hass}
            .narrow=${this.narrow!}
            .records=${this._records!}
            @row-click=${this._handleRowClicked}
            .isLoading=${this._isLoading}
          ></insteon-aldb-data-table>
        </div>
        <ha-fab
          slot="fab"
          .title="${this.insteon.localize("aldb.actions.create")}"
          .label="${this.insteon.localize("aldb.actions.create")}"
          @click=${this._createRecord}
          .extended=${!this.narrow}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  private _generateActionMenu() {
    return html`
      <ha-button-menu corner="BOTTOM_START" @action=${this._handleMenuAction} activatable>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-list-item> ${this.insteon!.localize("common.actions.load")} </ha-list-item>
        <ha-list-item>${this.insteon.localize("device.actions.open_in_ha")}</ha-list-item>
        <ha-list-item> ${this.insteon!.localize("aldb.actions.add_default_links")} </ha-list-item>
        <ha-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.write")}
        </ha-list-item>
        <ha-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.reset")}
        </ha-list-item>
        <ha-list-item> ${this.insteon.localize("aldb.actions.download")} </ha-list-item>

        <ha-list-item
          aria-label=${this.insteon.localize("device.actions.delete")}
          class=${classMap({ warning: true })}
        >
          ${this.insteon.localize("device.actions.delete")}
        </ha-list-item>

        ${this._showUnusedAvailable
          ? html` <ha-list-item>
              ${this.insteon!.localize("aldb.actions." + this._showHideUnused)}
            </ha-list-item>`
          : ""}
      </ha-button-menu>
    `;
  }

  private _getRecords(): void {
    if (!this._device) {
      this._records = [];
      return;
    }
    fetchInsteonALDB(this.hass, this._device?.address).then((records) => {
      this._allRecords = records;
      this._records = this._filterRecords(this._allRecords);
    });
  }

  private _createRecord(): void {
    const record: ALDBRecord = {
      mem_addr: 0,
      in_use: true,
      is_controller: true,
      highwater: false,
      group: 0,
      target: "",
      target_name: "",
      data1: 0,
      data2: 0,
      data3: 0,
      dirty: true,
    };
    showInsteonALDBRecordDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      schema: aldbNewRecordSchema(this.insteon),
      record: record,
      title: this.insteon.localize("aldb.actions.new"),
      require_change: true,
      callback: async (rec) => this._handleRecordCreate(rec),
    });
  }

  private async _onLoadALDBClick() {
    await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.load"),
      confirmText: this.insteon!.localize("common.yes"),
      dismissText: this.insteon!.localize("common.no"),
      confirm: async () => this._load(),
    });
  }

  private async _load() {
    if (this._device!.is_battery) {
      await showAlertDialog(this, {
        text: this.insteon.localize("common.warn.wake_up"),
      });
    }
    this._subscribe();
    loadALDB(this.hass, this._device!.address);
    this._isLoading = true;
    this._records = [];
  }

  private async _onShowHideUnusedClicked() {
    this._showUnused = !this._showUnused;
    if (this._showUnused) {
      this._showHideUnused = "hide";
    } else {
      this._showHideUnused = "show";
    }
    this._records = this._filterRecords(this._allRecords!);
  }

  private async _onWriteALDBClick() {
    await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.write"),
      confirmText: this.insteon!.localize("common.yes"),
      dismissText: this.insteon!.localize("common.no"),
      confirm: async () => this._write(),
    });
  }

  private async _write() {
    if (this._device!.is_battery) {
      await showAlertDialog(this, {
        text: this.insteon.localize("common.warn.wake_up"),
      });
    }
    this._subscribe();
    writeALDB(this.hass, this._device!.address);
    this._isLoading = true;
    this._records = [];
  }

  private async _onResetALDBClick() {
    resetALDB(this.hass, this._device!.address);
    this._getRecords();
  }

  private async _onAddDefaultLinksClicked() {
    await showConfirmationDialog(this, {
      text: this.insteon!.localize("common.warn.add_default_links"),
      confirm: async () => this._addDefaultLinks(),
    });
  }

  private async _addDefaultLinks() {
    if (this._device!.is_battery) {
      await showAlertDialog(this, {
        text: this.insteon.localize("common.warn.wake_up"),
      });
    }
    this._subscribe();
    addDefaultLinks(this.hass, this._device!.address);
    this._records = [];
  }

  private async _handleRecordChange(record: ALDBRecord) {
    changeALDBRecord(this.hass, this._device!.address, record);
    this._getRecords();
  }

  private async _handleRecordCreate(record: ALDBRecord) {
    createALDBRecord(this.hass, this._device!.address, record);
    this._getRecords();
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const record = this._records!.find((rec) => rec.mem_addr === +id);
    showInsteonALDBRecordDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      schema: aldbChangeRecordSchema(this.insteon),
      record: record!,
      title: this.insteon.localize("aldb.actions.change"),
      require_change: true,
      callback: async (rec) => this._handleRecordChange(rec),
    });
    history.back();
  }

  private async _handleBackTapped(): Promise<void> {
    if (this._dirty()) {
      await showConfirmationDialog(this, {
        title: this.insteon!.localize("common.unsaved.title"),
        text: this.insteon!.localize("common.unsaved.message"),
        confirmText: this.insteon!.localize("common.leave"),
        dismissText: this.insteon!.localize("common.stay"),
        destructive: true,
        confirm: this._goBack,
      });
    } else {
      navigate("/insteon/devices");
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._onLoadALDBClick();
        break;
      case 1:
        navigate("/config/devices/device/" + this.deviceId);
        break;
      case 2:
        await this._onAddDefaultLinksClicked();
        break;
      case 3:
        await this._onWriteALDBClick();
        break;
      case 4:
        await this._onResetALDBClick();
        break;
      case 5:
        await this._download();
        break;
      case 6:
        confirmDeleteDevice(this, this.hass, this.insteon, this._device!);
        break;
      case 7:
        await this._onShowHideUnusedClicked();
        break;
    }
  }

  private _goBack = async (): Promise<void> => {
    await resetALDB(this.hass, this._device!.address);
    navigate("/insteon/devices");
  };

  private _handleMessage(message: AldbNotification): void {
    if (message.type === "record_loaded") {
      this._getRecords();
    }
    if (message.type === "status_changed") {
      fetchInsteonDevice(this.hass, this.deviceId!).then((device) => {
        this._device = device;
      });
      this._isLoading = message.is_loading ?? false;
      if (!message.is_loading) {
        this._unsubscribe();
      }
    }
  }

  private _unsubscribe(): void {
    if (this._refreshDevicesTimeoutHandle) {
      clearTimeout(this._refreshDevicesTimeoutHandle);
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = subscribeAldbLoading(this.hass, this._device!.address, (message) =>
      this._handleMessage(message),
    );
    this._refreshDevicesTimeoutHandle = window.setTimeout(() => this._unsubscribe(), 1200000);
  }

  private _noDeviceError(): void {
    showAlertDialog(this, {
      text: this.insteon.localize("common.error.device_not_found"),
    });
    this._goBack();
    this._goBack();
  }

  private _download() {
    const filename = this._device?.address + " ALDB.json";
    fileDownload(
      `data:text/plain;charset=utf-8,${encodeURIComponent(
        JSON.stringify({ aldb: this._exportable_records(this._records) }, null, 2),
      )}`,
      filename,
    );
  }

  private _exportable_records = memoizeOne(
    (records: ALDBRecord[] | undefined): ExportableRecord[] => {
      if (!records) {
        return [];
      }

      return records.map((rec) => ({
        mem_addr: rec.mem_addr,
        in_use: rec.in_use,
        is_controller: rec.is_controller,
        is_highwater: rec.highwater,
        group: rec.group,
        target: rec.target,
        data1: rec.data1,
        data2: rec.data2,
        data3: rec.data3,
      }));
    },
  );

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
          box-sizing: border-box;
          height: 100%;
          margin: 0 auto;
          padding-top: 8px;
          max-width: 1000px;
        }

        insteon-aldb-data-table {
          flex: 1 1 auto;
          min-height: 0;
          margin-top: 16px;
          width: 100%;
          display: block;
          --data-table-border-width: 0;
          --data-table-background-color: var(--primary-background-color);
        }

        .actions ha-button {
          margin: 8px;
        }

        :host([narrow]) .container {
          padding-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-aldb-page": InsteonDeviceALDBPage;
  }
}
