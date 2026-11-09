import { mdiPlus } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "@ha/components/data-table/ha-data-table";
import "@ha/components/ha-fab";
import "@ha/components/ha-card";
import "@ha/components/ha-button-menu";
import "@ha/layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "@ha/types";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { subscribeDeviceRegistry } from "@ha/data/device_registry";
import type { Insteon } from "./data/insteon";
import { navigate } from "@ha/common/navigate";
import type { HASSDomEvent } from "@ha/common/dom/fire_event";
import type { AreaRegistryEntry } from "@ha/data/area_registry";
import { subscribeAreaRegistry } from "@ha/data/area_registry";
import { showInsteonAddDeviceDialog } from "./device/show-dialog-insteon-add-device";
import { showInsteonAddingDeviceDialog } from "./device/show-dialog-adding-device";
import { showDeviceAddX10Dialog } from "./device/show-dialog-device-add-x10";
import { insteonMainTabs } from "./insteon-router";
import { showAlertDialog } from "@ha/dialogs/generic/show-dialog-box";

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
            device.config_entries.includes(this.insteon.config_entry.entry_id),
        );
      }),
    ];
  }

  private _columns = memoizeOne(
    (): DataTableColumnContainer => ({
      name: {
        title: this.insteon.localize("devices.fields.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: true,
      },
      address: {
        title: this.insteon.localize("devices.fields.address"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: true,
      },
      description: {
        title: this.insteon.localize("devices.fields.description"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: false,
      },
      model: {
        title: this.insteon.localize("devices.fields.model"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: false,
      },
      area: {
        title: this.insteon.localize("devices.fields.area"),
        sortable: true,
        filterable: true,
        groupable: true,
        direction: "asc",
        showNarrow: false,
      },
    }),
  );

  private _insteonDevices = memoizeOne((devices: DeviceRegistryEntry[]) => {
    const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
    for (const area of this._areas) {
      areaLookup[area.area_id] = area;
    }

    const insteonDevices: DeviceRowData[] = devices.map((device) => {
      const identifier = device.identifiers.find((ident) => ident[0] === "insteon");
      const address = identifier ? identifier[1] : "";
      const name = device.name || "";
      const description = name.endsWith(address)
        ? name.substring(0, name.length - address.length).trim()
        : name;
      const deviceRowdata: DeviceRowData = {
        id: device.id,
        name: device.name_by_user || device.name || "No device name",
        address,
        description,
        model: device.model || "",
        area: device.area_id ? areaLookup[device.area_id].name : "",
      };
      return deviceRowdata;
    });
    return insteonDevices;
  });

  protected render(): TemplateResult | void {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${insteonMainTabs}
        .route=${this.route}
        .data=${this._insteonDevices(this._devices)}
        .columns=${this._columns()}
        @row-click=${this._handleRowClicked}
        clickable
        .localizeFunc=${this.hass.localize}
        .mainPage=${true}
        .hasFab=${true}
      >
        <ha-fab
          slot="fab"
          .label=${this.insteon.localize("devices.add_device")}
          extended
          @click=${this._addDevice}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _addDevice(): Promise<void> {
    showInsteonAddDeviceDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      title: this.insteon.localize("device.actions.add"),
      callback: async (address, multiple, add_x10) =>
        this._handleDeviceAdd(address!, multiple, add_x10),
    });
  }

  private async _handleDeviceAdd(address: string, multiple: boolean, add_x10: boolean) {
    if (add_x10) {
      showDeviceAddX10Dialog(this, {
        hass: this.hass,
        insteon: this.insteon,
        title: this.insteon.localize("device.add_x10.caption"),
        callback: async () => this._handleX10DeviceAdd(),
      });
      return;
    }
    showInsteonAddingDeviceDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      multiple: multiple,
      address: address,
      title: this.insteon.localize("devices.adding_device"),
    });
  }

  private async _handleX10DeviceAdd() {
    showAlertDialog(this, {
      title: this.insteon.localize("device.add_x10.caption"),
      text: this.insteon.localize("device.add_x10.success"),
    });
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>): Promise<void> {
    // console.info("Row clicked received");
    const id = ev.detail.id;
    navigate("/insteon/device/overview/" + id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-devices-panel": InsteonDevicesPanel;
  }
}
