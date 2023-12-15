
import {
  LitElement,
  PropertyValues, TemplateResult
} from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "@ha/types";
import { navigate } from "@ha/common/navigate";
import { fetchDeviceRegistry } from "@ha/data/device_registry";
import { Insteon } from "../data/insteon"
import { toAddressId } from "tools/address-utils";


@customElement("insteon-device-redirect")
class InsteonDeviceRedirect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property() private deviceId?: string;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId && this.hass) {
      if (this.deviceId.length == 6) {
        this._getHaDeviceId()
      } else {
        navigate("/insteon/device/properties/" + this.deviceId)
      }
    }
  }

  protected render(): TemplateResult | void {

  }

  private async _getHaDeviceId() {
    const allDevices = await fetchDeviceRegistry(this.hass.connection);
    const insteonDevices = allDevices.filter(
      (device) =>
        device.config_entries &&
        device.config_entries.includes(this.insteon.config_entry.entry_id),
    );
    const haDevice = insteonDevices.filter(
      (device) => (device.name ? toAddressId(device.name?.substring(device.name.length - 8)) : "") == this.deviceId
    );

    navigate("/insteon/device/properties/" + haDevice[0].id)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-redirect": InsteonDeviceRedirect;
  }
}
