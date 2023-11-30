import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
// import "@material/mwc-fab";
import { mdiPlus, mdiDotsVertical, mdiTrashCan } from "@mdi/js";
// import "@material/mwc-button";
import "@ha/components/ha-icon-button";
import "@ha/components/ha-circular-progress";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-fab";
import { Insteon } from "../data/insteon";
import { InsteonX10Device, X10DeviceRecord } from "../data/config"
import "@ha/layouts/hass-subpage";
import {
  HomeAssistant,
} from "@ha/types";
import "./x10-devices-data-table";
import { HASSDomEvent } from "@ha/common/dom/fire_event";
import { RowClickedEvent } from "@ha/components/data-table/ha-data-table";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "@ha/dialogs/generic/show-dialog-box";
import { navigate } from "@ha/common/navigate";
import "@ha/components/ha-button-menu";
import { haStyle } from "@ha/resources/styles";


@customElement("x10-devices-page")
class X10DevicesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide?: boolean;

  @property() private deviceId?: string;

  @state() private _device?: X10DeviceRecord;

  @state() private _records?: X10DeviceRecord[];

  @state() private _allRecords?: X10DeviceRecord[] = [];

  @state() private _isLoading = false;

  private _subscribed?: Promise<() => Promise<void>>;

  private _refreshDevicesTimeoutHandle?: number;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId && this.hass) {
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }


  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .localizeFunc=${this.insteon.localize}
        .backPath=${"/insteon/utils"}
        hasFab
      >
      <div class="container">
          <x10-devices-data-table
            .insteon=${this.insteon}
            .hass=${this.hass}
            .narrow=${this.narrow!}
            .records=${this._records!}
            @row-click=${this._handleRowClicked}
            .isLoading=${this._isLoading}
          ></ix10-devices-data-table>
        </div>
        <ha-fab
          slot="fab"
          .title="${this.insteon.localize("utils.config_x10_devices.actions.create")}"
          .label="${this.insteon.localize("utils.config_x10_devices.actions.create")}"
          @click=${this._createRecord}
          .extended=${!this.narrow}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _createRecord(): void {
  }

  private async _handleRecordCreate(record: InsteonX10Device) {
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    history.back();
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
          --aldb-table-height: 76vh;
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

        x10-devices-data-table {
          width: 100%;
          height: var(--aldb-table-height);
          display: block;
          --data-table-border-width: 0;
        }
        .device-name {
          display: flex;
          align-items: left;
          padding-left: 0px;
          padding-inline-start: 0px;
          direction: var(--direction);
          font-size: 24px;
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
          align-self: center;
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
    "x10-devices-page": X10DevicesPage;
  }
}
