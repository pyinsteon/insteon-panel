import { mdiPlus, mdiDelete } from "@mdi/js";
import { LitElement, html, TemplateResult } from "lit";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { DataTableRowData } from "@ha/components/data-table/ha-data-table";
import "@ha/components/data-table/ha-data-table";
import "@ha/components/ha-fab";
import "@ha/components/ha-card";
import "@ha/components/ha-button-menu";
import "@ha/layouts/hass-tabs-subpage-data-table";
import { HomeAssistant } from "@ha/types";
import {
  subscribeDeviceRegistry,
  DeviceRegistryEntry,
} from "@ha/data/device_registry";
import { Insteon } from "../data/insteon";
import {
  InsteonDeviceOverride,
  fetchInsteonConfig,
  removeDeviceOverride,
} from "../data/config";
import { navigate } from "@ha/common/navigate";
import "@ha/components/ha-fab";
import { showConfirmationDialog } from "@ha/dialogs/generic/show-dialog-box";
import { showAddDeviceOverrideDialog } from "./show-dialog-add-device-override";
import { toAddressId } from "tools/address-utils";


interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  address: string;
  description: string;
  model: string;
}

@customElement("device-overrides-panel")
export class DeviceOverridesPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Array }) private _devices: DeviceRegistryEntry[] = [];

  @state() private _device_overrides: InsteonDeviceOverride[] = [];

  private _unsubs?: UnsubscribeFunc[];

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    if (!this.hass || !this.insteon) {
      navigate("/insteon");
    }
    this._getOverrides();
    if (!this._unsubs) {
      this._getDevices();
    }
  }

  private async _getOverrides() {
    await fetchInsteonConfig(this.hass).then((config) => {
      this._device_overrides = config.override_config!;
    });
  }

  private _getDevices() {
    if (!this.insteon || !this.hass) {
      return;
    }
    this._unsubs = [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries.filter(
          (device) =>
            device.config_entries &&
            device.config_entries.includes(this.insteon.config_entry.entry_id),
        );
      }),
    ];
  }

  private _columns = memoizeOne((narrow: boolean) =>
    narrow
      ? {
          name: {
            title: this.insteon.localize("devices.fields.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          address: {
            title: this.insteon.localize("devices.fields.address"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "5hv",
          },
        }
      : {
          name: {
            title: this.insteon.localize("devices.fields.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          address: {
            title: this.insteon.localize("devices.fields.address"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "20%",
          },
          description: {
            title: this.insteon.localize("devices.fields.description"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "15%",
          },
          model: {
            title: this.insteon.localize("devices.fields.model"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "15%",
          },
          actions: {
            title: this.insteon.localize("devices.fields.actions"),
            type: "icon-button",
            template: (_toggle, override) => html`
              <ha-icon-button
                .override=${override}
                .hass=${this.hass}
                .insteon=${this.insteon}
                .action=${() =>
                  this._deleteOverride(this.hass, override.address)}
                .label=${this.insteon.localize(
                  "utils.config_device_overrides.actions.delete",
                )}
                .path=${mdiDelete}
                @click=${this._confirmDeleteOverride}
              ></ha-icon-button>
            `,
            width: "150px",
          },
        },
  );

  private _insteonDevices = memoizeOne(
    (overrides: InsteonDeviceOverride[], devices: DeviceRegistryEntry[]) => {
      if (!overrides || !devices) {
        return [];
      }
      const overrideDevices: DeviceRowData[] = overrides.map((override) => {
        const address = toAddressId(override.address);
        const device = devices.find(
          (d) => (d.name ? toAddressId(device.name?.substring(device.name.length - 8)) : "") == address,
        );
        const deviceRowdata: DeviceRowData = {
          id: device.id,
          name: device.name_by_user || device.name || "No device name",
          address: device.name?.substring(device.name.length - 8) || "",
          description: device.name?.substring(0, device.name.length - 8) || "",
          model: device.model || "",
        };
        return deviceRowdata;
      });
      return overrideDevices;
    },
  );

  protected render(): TemplateResult | void {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .data=${this._insteonDevices(this._device_overrides, this._devices)}
        .columns=${this._columns(this.narrow)}
        .localizeFunc=${this.insteon.localize}
        .mainPage=${false}
        .hasFab=${true}
        .tabs=${[
          {
            translationKey: "utils.config_device_overrides.caption",
            path: `/insteon`,
          },
        ]}
      >
        <ha-fab
          slot="fab"
          .label=${this.insteon.localize(
            "utils.config_device_overrides.add_override",
          )}
          extended
          @click=${this._addOverride}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _confirmDeleteOverride(ev): Promise<void> {
    ev.stopPropagation();
    const override = ev.currentTarget.override;
    const insteon = ev.currentTarget.insteon as Insteon;
    const action = ev.currentTarget.action;
    showConfirmationDialog(this, {
      text: html`${insteon.localize(
          "utils.config_device_overrides.actions.confirm_delete",
        )}<br />
        ${override.name}`,
      confirm: async () => await action(),
    });
  }

  private async _deleteOverride(
    hass: HomeAssistant,
    address: string,
  ): Promise<void> {
    console.info("Delete override clicked received: " + address);
    await removeDeviceOverride(hass, address);
    await this._getOverrides();
  }

  private async _addOverride() {
    await showAddDeviceOverrideDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      title: this.insteon.localize(
        "utils.config_device_overrides.add_override",
      ),
    });
    await this._getOverrides();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "device-overrides-panel": DeviceOverridesPanel;
  }
}
