import { mdiPlus } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../homeassistant-frontend/src/components/data-table/ha-data-table";
import "../homeassistant-frontend/src/components/ha-fab";
import {
  DataTableRowData,
  RowClickedEvent,
} from "../homeassistant-frontend/src/components/data-table/ha-data-table";
import "../homeassistant-frontend/src/components/ha-card";
import "../homeassistant-frontend/src/components/ha-button-menu";
// import "../homeassistant-frontend/src/layouts/hass-subpage";
import "../homeassistant-frontend/src/layouts/ha-app-layout";
import { haStyle } from "../homeassistant-frontend/src/resources/styles";
import { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import {
  subscribeDeviceRegistry,
  DeviceRegistryEntry,
} from "../homeassistant-frontend/src/data/device_registry";
import { Insteon } from "./data/insteon";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import { HASSDomEvent } from "../homeassistant-frontend/src/common/dom/fire_event";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../homeassistant-frontend/src/data/area_registry";
import { showInsteonAddDeviceDialog } from "./device/show-dialog-insteon-add-device";
import { showInsteonAddingDeviceDialog } from "./device/show-dialog-adding-device";

interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  address: string;
  description: string;
  model: string;
  area: string;
}

@customElement("insteon-devices-panel")
export class InsteonDevicesPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Array }) private _devices: DeviceRegistryEntry[] = [];

  private _areas: AreaRegistryEntry[] = [];

  private _unsubs?: UnsubscribeFunc[];

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    if (!this._unsubs) {
      this._getDevices();
    }
  }

  public updated(changedProperties) {
    super.updated(changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    if (!this._unsubs) {
      this._getDevices();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubs) {
      while (this._unsubs.length) {
        this._unsubs.pop()!();
      }
      this._unsubs = undefined;
    }
  }

  private _getDevices() {
    if (!this.insteon || !this.hass) {
      return;
    }

    this._unsubs = [
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries.filter(
          (device) =>
            device.config_entries &&
            device.config_entries.includes(this.insteon.config_entry.entry_id)
        );
      }),
    ];
  }

  private _columns = memoizeOne((narrow: boolean) =>
    narrow
      ? {
          name: {
            title: "Device",
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          address: {
            title: "Address",
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "5hv",
          },
        }
      : {
          name: {
            title: "Device",
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          address: {
            title: "Address",
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "20%",
          },
          description: {
            title: "Description",
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "15%",
          },
          model: {
            title: "Model",
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "15%",
          },
          area: {
            title: "Area",
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "15%",
          },
        }
  );

  private _insteonDevices = memoizeOne((devices: DeviceRegistryEntry[]) => {
    const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
    for (const area of this._areas) {
      areaLookup[area.area_id] = area;
    }

    const insteonDevices: DeviceRowData[] = devices.map((device) => {
      const deviceRowdata: DeviceRowData = {
        id: device.id,
        name: device.name_by_user || device.name || "No device name",
        address: device.name?.substring(device.name.length - 8) || "",
        description: device.name?.substring(0, device.name.length - 8) || "",
        model: device.model || "",
        area: device.area_id ? areaLookup[device.area_id].name : "",
      };
      return deviceRowdata;
    });
    return insteonDevices;
  });

  protected render(): TemplateResult | void {
    return html`
      <ha-app-layout hasFab>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
            <div main-title>Insteon Configuration</div>
          </app-toolbar>
        </app-header>
        <ha-data-table
          .hass=${this.hass}
          .data=${this._insteonDevices(this._devices)}
          .columns=${this._columns(this.narrow)}
          @row-click=${this._handleRowClicked}
        ></ha-data-table>
        <div id="fab">
          <ha-fab
            slot="fab"
            .title=${this.insteon.localize("device.actions.add")}
            .label=${this.insteon.localize("device.actions.add")}
            @click=${this._addDevice}
            .extended=${!this.narrow}
          >
            <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </div>
      </ha-app-layout>
    `;
  }

  private async _addDevice(): Promise<void> {
    showInsteonAddDeviceDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      title: this.insteon.localize("device.actions.add"),
      callback: async (address, multiple) => this._handleDeviceAdd(address, multiple),
    });
  }

  private async _handleDeviceAdd(address: string, multiple: boolean) {
    showInsteonAddingDeviceDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      multiple: multiple,
      address: address,
      title: "Adding Insteon Device",
    });
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>): Promise<void> {
    // eslint-disable-next-line no-console
    // console.info("Row clicked received");
    const id = ev.detail.id;
    navigate("/insteon/device/properties/" + id);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-data-table {
          width: 100%;
          height: 100%;
          --data-table-border-width: 0;
        }
        :host(:not([narrow])) ha-data-table {
          height: calc(100vh - 1px - var(--header-height));
          display: block;
        }
        :host([narrow]) hass-tabs-subpage {
          --main-title-margin: 0;
        }
        .table-header {
          display: flex;
          align-items: center;
          --mdc-shape-small: 0;
          height: 56px;
        }
        .search-toolbar {
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
        }
        search-input {
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
          --text-field-overflow: visible;
          z-index: 5;
        }
        .table-header search-input {
          display: block;
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
        }
        .search-toolbar search-input {
          display: block;
          width: 100%;
          color: var(--secondary-text-color);
          --mdc-ripple-color: transparant;
        }
        #fab {
          position: fixed;
          right: calc(16px + env(safe-area-inset-right));
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 1;
        }
        :host([narrow]) #fab.tabs {
          bottom: calc(84px + env(safe-area-inset-bottom));
        }
        #fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        :host([rtl]) #fab {
          right: auto;
          left: calc(16px + env(safe-area-inset-left));
        }
        :host([rtl][is-wide]) #fab {
          bottom: 24px;
          left: 24px;
          right: auto;
        }
      `,
      haStyle,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-devices-panel": InsteonDevicesPanel;
  }
}
