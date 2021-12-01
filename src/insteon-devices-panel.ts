import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "./data-table/insteon-data-table";
import "../homeassistant-frontend/src/components/ha-card";
import "../homeassistant-frontend/src/layouts/hass-subpage";
import { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import {
  subscribeDeviceRegistry,
  DeviceRegistryEntry,
} from "../homeassistant-frontend/src/data/device_registry";
import { Insteon } from "./data/insteon";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import { HASSDomEvent } from "../homeassistant-frontend/src/common/dom/fire_event";
import {
  RowClickedEvent,
  DataTableRowData,
} from "./data-table/insteon-data-table";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../homeassistant-frontend/src/data/area_registry";

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

  @state() private _showDisabled = false;

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
            device.config_entries[0] == this.insteon.config_entry.entry_id
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
            width: "10%",
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
            width: "10%",
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
        address: device.name?.substr(device.name.length - 8, 8) || "",
        description: device.name?.substr(0, device.name.length - 8) || "",
        model: device.model || "",
        area: device.area_id ? areaLookup[device.area_id].name : "",
      };
      return deviceRowdata;
    });
    if (!this._showDisabled) {
      return insteonDevices.filter((device) => device.disabled_by);
    }
    return insteonDevices;
  });

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage
        .hass=${this.hass}
        header="Insteon Devices"
        .narrow=${this.narrow}
      >
        <insteon-data-table
          .hass=${this.hass}
          .data=${this._insteonDevices(this._devices)}
          .columns=${this._columns(this.narrow)}
          @row-click=${this._handleRowClicked}
        ></insteon-data-table>
      </hass-subpage>
    `;
  }

  private async _handleRowClicked(
    ev: HASSDomEvent<RowClickedEvent>
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.info("Row clicked received");
    const id = ev.detail.id;
    navigate("/insteon/device/properties/" + id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-devices-panel": InsteonDevicesPanel;
  }
}
