import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
// import "@material/mwc-fab";
import { mdiPlus, mdiDotsVertical } from "@mdi/js";
// import "@material/mwc-button";
import "../../../homeassistant-frontend/src/components/ha-icon-button";
import "../../../homeassistant-frontend/src/components/ha-circular-progress";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../homeassistant-frontend/src/components/ha-fab";
import { Insteon, InsteonDevice } from "../../data/insteon";
import {
  fetchInsteonDevice,
  ALDBRecord,
  fetchInsteonALDB,
  changeALDBRecord,
  createALDBRecord,
  writeALDB,
  loadALDB,
  resetALDB,
  addDefaultLinks,
  aldbChangeRecordSchema,
  aldbNewRecordSchema,
  removeInsteonDevice,
} from "../../data/device";
import "../../../homeassistant-frontend/src/layouts/hass-tabs-subpage";
import {
  HomeAssistant,
  Route,
} from "../../../homeassistant-frontend/src/types";
import { insteonDeviceTabs } from "../insteon-device-router";
import "./insteon-aldb-data-table";
import { HASSDomEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { RowClickedEvent } from "../../../homeassistant-frontend/src/components/data-table/ha-data-table";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import { showInsteonALDBRecordDialog } from "./show-dialog-insteon-aldb-record";
import { navigate } from "../../../homeassistant-frontend/src/common/navigate";
import "../../../homeassistant-frontend/src/components/ha-button-menu";

import { haStyle } from "@ha/resources/styles";

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
      this._showUnusedAvailable = Boolean(this.hass.userData?.showAdvanced)
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

  private _filterRecords(
    records: ALDBRecord[]
  ): ALDBRecord[] {
    return records.filter((record) => record.in_use || (this._showUnused && this._showUnusedAvailable) || record.dirty);
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
        hasFab
      >
        ${this.narrow
        ? html`
            <div slot="header" class="header fullwidth">
              <div slot="header" class="narrow-header-left">
                ${this._device?.name}
              </div>
              <div slot="header" class="narrow-header-right">
                  ${this._generateActionMenu()}
              </div>
            </div>
            `
          : ""}
        <div class="container">
          ${!this.narrow
            ? html`
                <div class="page-header fullwidth">
                  <table>
                    <tr>
                      <td>
                        <div class="device-name">
                          <h1>${this._device?.name}</h1>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="aldb-status">
                          ALDB Status:
                          ${this._device
                            ? this.insteon!.localize(
                                "aldb.status." + this._device?.aldb_status,
                              )
                            : ""}
                        </div>
                        </td>
                    </tr>
                  </table>
                  <div class="logo header-right">
                    <img
                      src="https://brands.home-assistant.io/insteon/logo.png"
                      referrerpolicy="no-referrer"
                      @load=${this._onImageLoad}
                      @error=${this._onImageError}
                    />
                        ${this._generateActionMenu()}
                  </div>
                </div>
              `
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
      <ha-button-menu
        corner="BOTTOM_START"
        @action=${this._handleMenuAction}
        activatable
        >
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <mwc-list-item>
          ${this.insteon!.localize("common.actions.load")}
        </mwc-list-item>
        <mwc-list-item>
          ${this.insteon!.localize("aldb.actions.add_default_links")}
        </mwc-list-item>
        <mwc-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.write")}
        </mwc-list-item>
        <mwc-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.reset")}
        </mwc-list-item>

        <mwc-list-item
          aria-label=${this.insteon.localize("device.actions.delete")}
          class=${classMap({ warning: true })}
        >
          ${this.insteon.localize("device.actions.delete")}
        </mwc-list-item>

        ${this._showUnusedAvailable
          ? html`
            <mwc-list-item>
              ${this.insteon!.localize("aldb.actions." + this._showHideUnused)}
            </mwc-list-item>`
          : ""
        }
      </ha-button-menu>
    `
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
      callback: async (rec) => this._handleRecordCreate(rec),
    });
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _onLoadALDBClick() {
    await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.load"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
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
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
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

  private async _onDeleteDevice() {
    await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.delete"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: async () => this._checkScope(),
      warning: true,
    });
  }

  private async _delete(remove_all_refs: boolean) {
    await removeInsteonDevice(this.hass, this._device!.address, remove_all_refs);
    navigate("/insteon")
  }

  private async _checkScope() {
    if (this._device!.address.includes("X10")) {
      this._delete(false)
      return
    }
    const remove_all_refs = await showConfirmationDialog(this, {
      title: this.insteon.localize("device.remove_all_refs.title"),
      text: html`
        ${this.insteon.localize("device.remove_all_refs.description")}<br><br>
        ${this.insteon.localize("device.remove_all_refs.confirm_description")}<br>
        ${this.insteon.localize("device.remove_all_refs.dismiss_description")}`,
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      warning: true,
      destructive: true,
    });
    this._delete(remove_all_refs);
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
      callback: async (rec) => this._handleRecordChange(rec),
    });
    history.back();
  }

  private async _handleBackTapped(): Promise<void> {
    if (this._dirty()) {
      await showConfirmationDialog(this, {
        text: this.insteon.localize("common.warn.unsaved"),
        confirmText: this.hass!.localize("ui.common.yes"),
        dismissText: this.hass!.localize("ui.common.no"),
        confirm: () => this._goBack(),
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
        await this._onAddDefaultLinksClicked();
        break;
      case 2:
        await this._onWriteALDBClick();
        break;
      case 3:
        await this._onResetALDBClick();
        break;
      case 4:
        await this._onDeleteDevice();
        break;
      case 5:
        await this._onShowHideUnusedClicked();
        break;
    }
  }

  private _goBack(): void {
    resetALDB(this.hass, this._device!.address);
    navigate("/insteon/devices");
  }

  private _handleMessage(message: any): void {
    if (message.type === "record_loaded") {
      this._getRecords();
    }
    if (message.type === "status_changed") {
      fetchInsteonDevice(this.hass, this.deviceId!).then((device) => {
        this._device = device;
      });
      this._isLoading = message.is_loading;
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
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "insteon/aldb/notify",
        device_address: this._device?.address,
      },
    );
    this._refreshDevicesTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      1200000,
    );
  }

  private _noDeviceError(): void {
    showAlertDialog(this, {
      text: this.insteon.localize("common.error.device_not_found"),
    });
    this._goBack();
    this._goBack();
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

        :host([narrow]) {
          --aldb-table-height: 86vh;
        }

        :host(:not([narrow])) {
          --aldb-table-height: 90vh;
        }

        .header {
          display: flex;
          justify-content: space-between;
        }

        .container {
          display: flex;
          flex-wrap: wrap;
          margin: 0px;
        }

        insteon-aldb-data-table {
          width: 100%;
          height: var(--aldb-table-height);
          display: block;
          --data-table-border-width: 0;
        }
        .device-name {
          display: block;
          align-items: left;
          padding-left: 0px;
          padding-inline-start: 0px;
          direction: var(--direction);
          font-size: 24px;
          position: relative;
          width: 100%;
          height: 50%;
        }
        .aldb-status {
          position: relative;
          display: block;
        }
        h1 {
          margin: 0;
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
          opacity: var(--dark-primary-opacity);
        }

        .page-header {
          padding: 8px;
          margin-left: 32px;
          margin-right: 32px;
          display: flex;
          justify-content: space-between;
        }

        .fullwidth {
          padding: 8px;
          box-sizing: border-box;
          width: 100%;
          flex-grow: 1;
        }

        .header-right {
          align-self: right;
          display: flex;
        }

        .header-right img {
          height: 30px;
        }

        .header-right:first-child {
          width: 100%;
          justify-content: flex-end;
        }

        .actions mwc-button {
          margin: 8px;
        }

        :host([narrow]) .container {
          margin-top: 0;
        }

        .narrow-header-left {
          padding: 8px;
          width: 90%;
        }
        .narrow-header-right {
          align-self: right;
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
