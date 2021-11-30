// import { mdiPuzzle } from "@mdi/js";
// import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "./data-table/insteon-data-table";
import "../homeassistant-frontend/src/components/ha-card";
import "../homeassistant-frontend/src/layouts/hass-subpage";
// import { PageNavigation } from "../homeassistant-frontend/src/layouts/hass-tabs-subpage";
// import "../homeassistant-frontend/src/components/ha-button-menu";
import { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import {
  fetchDeviceRegistry,
  DeviceRegistryEntry,
} from "../homeassistant-frontend/src/data/device_registry";
import {
  EntityRegistryEntry,
  fetchEntityRegistry,
} from "../homeassistant-frontend/src/data/entity_registry";
import { Insteon } from "./data/insteon";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import { HASSDomEvent } from "../homeassistant-frontend/src/common/dom/fire_event";
import { RowClickedEvent } from "./data-table/insteon-data-table";

export interface DeviceEntityLookup {
  [deviceId: string]: EntityRegistryEntry[];
}

@customElement("insteon-devices-panel")
export class InsteonDevicesPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public insteon!: Insteon;

  @property() public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property() private _devices: DeviceRegistryEntry[] = [];

  @property() private _entities: EntityRegistryEntry[] = [];

  // @state() private _showDisabled = false;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getDevices();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
  }

  private _getDevices() {
    if (!this.insteon || !this.hass) {
      return;
    }
    fetchDeviceRegistry(this.hass.connection).then((devices) => {
      fetchEntityRegistry(this.hass.connection).then((entities) => {
        this._entities = entities;
        this._devices = devices.filter(
          (device) =>
            device.config_entries && device.config_entries[0] == this.insteon.config_entry.entry_id
        );
      });
    });
  }

  private _columns = {
    name: {
      title: "Device",
      sortable: true,
      filterable: true,
      direction: "asc",
      grows: true,
    },
    model: {
      title: "Model",
      sortable: true,
      filterable: true,
      direction: "asc",
      width: "20%",
    },
    area: {
      title: "Area",
      sortable: true,
      filterable: true,
      direction: "asc",
      width: "20%",
    },
  };

  private _insteonDevices = memoizeOne((devices: DeviceRegistryEntry[]) => {
    /*
    if (!this._devices || !this._entities) {
      return [];
    }
    */
    const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
    for (const device of this._devices) {
      deviceLookup[device.id] = device;
    }
    const deviceEntityLookup: DeviceEntityLookup = {};
    for (const entity of this._entities) {
      if (!entity.device_id) {
        continue;
      }
      if (!(entity.device_id in deviceEntityLookup)) {
        deviceEntityLookup[entity.device_id] = [];
      }
      deviceEntityLookup[entity.device_id].push(entity);
    }

    // eslint-disable-next-line no-console
    console.info("Insteon GUID: " + this.insteon.config_entry.entry_id);

    return devices.map((device) => {
      return {
        ...device,
        id: device.id,
        name: device.name, // computeDeviceName(device, this.hass, deviceEntityLookup[device.id]),
        model: device.model || "<unknown>",
        guid: device.config_entries[0],
      };
    });
  });

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage .hass=${this.hass} header="Insteon Devices" .narrow=${this.narrow}>
        <insteon-data-table
          .hass=${this.hass}
          .data=${this._insteonDevices(this._devices)}
          .columns=${this._columns}
          @row-click=${this._handleRowClicked}
        ></insteon-data-table>
      </hass-subpage>
    `;
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>): Promise<void> {
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
