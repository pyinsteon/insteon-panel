import "@material/mwc-list/mwc-list-item";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../homeassistant-frontend/src/common/dom/fire_event";
import { stringCompare } from "../../homeassistant-frontend/src/common/string/compare";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../homeassistant-frontend/src/data/area_registry";
import {
  computeDeviceName,
  DeviceEntityLookup,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../homeassistant-frontend/src/data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../homeassistant-frontend/src/data/entity_registry";
import { SubscribeMixin } from "../../homeassistant-frontend/src/mixins/subscribe-mixin";
import { PolymerChangedEvent } from "../../homeassistant-frontend/src/polymer-types";
import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import "../../homeassistant-frontend/src/components/ha-combo-box";
import type { HaComboBox } from "../../homeassistant-frontend/src/components/ha-combo-box";
import { Insteon } from "../data/insteon";
import { computeDomain } from "../../homeassistant-frontend/src/common/entity/compute_domain";

interface Device {
  name: string;
  area: string;
  id: string;
}

export type HaDevicePickerDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

const rowRenderer: ComboBoxLitRenderer<Device> = (item) => html`<mwc-list-item
  .twoline=${!!item.area}
>
  <span>${item.name}</span>
  <span slot="secondary">${item.area}</span>
</mwc-list-item>`;

@customElement("insteon-device-picker")
export class InsteonDevicePicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public devices?: DeviceRegistryEntry[];

  @property() public areas?: AreaRegistryEntry[];

  @property() public entities?: EntityRegistryEntry[];

  @property({ type: Array, attribute: "includedDomains" })
  public includedDomains?: string[];

  @property({ type: Array, attribute: "excludedDomains" })
  public excludedDomains?: string[];

  /**
   * Show the modem in the list of devices.
   * @type {Array}
   * @attr include-modem
   */
  @property({
    type: Boolean,
    attribute: "exclude-modem",
  })
  public excludeModem?: boolean = false;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _init = false;

  private _getDevices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      areas: AreaRegistryEntry[],
      entities: EntityRegistryEntry[]
    ): Device[] => {
      if (!devices.length) {
        return [
          {
            id: "no_devices",
            area: "",
            name: this.hass.localize("ui.components.device-picker.no_devices"),
          },
        ];
      }

      const deviceEntityLookup: DeviceEntityLookup = {};

      const filtered_included_entities = entities.filter(
        (entity) =>
          !this.includedDomains ||
          this.includedDomains.includes(computeDomain(entity.entity_id))
      );

      const filtered_entities = filtered_included_entities.filter(
        (entity) =>
          !this.excludedDomains ||
          !this.excludedDomains.includes(computeDomain(entity.entity_id))
      );

      for (const entity of filtered_entities) {
        if (!entity.device_id) {
          continue;
        }
        if (!(entity.device_id in deviceEntityLookup)) {
          deviceEntityLookup[entity.device_id] = [];
        }
        deviceEntityLookup[entity.device_id].push(entity);
      }

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      for (const area of areas) {
        areaLookup[area.area_id] = area;
      }

      const outputDevices = devices
        .filter((device) => deviceEntityLookup.hasOwnProperty(device.id))
        .map((device) => ({
          id: device.id,
          name: computeDeviceName(
            device,
            this.hass,
            deviceEntityLookup[device.id]
          ),
          area:
            device.area_id && areaLookup[device.area_id]
              ? areaLookup[device.area_id].name
              : this.hass.localize("ui.components.device-picker.no_area"),
        }));
      if (!outputDevices.length) {
        return [
          {
            id: "no_devices",
            area: "",
            name: this.hass.localize("ui.components.device-picker.no_match"),
          },
        ];
      }
      if (outputDevices.length === 1) {
        return outputDevices;
      }
      return outputDevices.sort((a, b) =>
        stringCompare(a.name || "", b.name || "")
      );
    }
  );

  public open() {
    this.comboBox?.open();
  }

  public focus() {
    this.comboBox?.focus();
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this.devices = devices.filter(
          (device) =>
            device.config_entries &&
            device.config_entries.includes(
              this.insteon.config_entry.entry_id
            ) &&
            (!this.excludeModem || !device.model?.includes("(0x03"))
        );
      }),
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this.areas = areas;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this.entities = entities;
      }),
    ];
  }

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.devices && this.areas && this.entities) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      (this.comboBox as any).items = this._getDevices(
        this.devices!,
        this.areas!,
        this.entities!
      );
    }
  }

  protected render(): TemplateResult {
    if (!this.devices || !this.areas || !this.entities) {
      return html``;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.device-picker.device")
          : this.label}
        .value=${this._value}
        .helper=${this.helper}
        .renderer=${rowRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        item-value-path="id"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._deviceChanged}
      ></ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _deviceChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === "no_devices") {
      newValue = "";
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-picker": InsteonDevicePicker;
  }
}
