import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiContentSave, mdiDelete, mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { afterNextRender } from "../../homeassistant-frontend/src/common/util/render-status";
import { computeDomain } from "../../homeassistant-frontend/src/common/entity/compute_domain";
import { computeStateName } from "../../homeassistant-frontend/src/common/entity/compute_state_name";
import { computeRTL } from "../../homeassistant-frontend/src/common/util/compute_rtl";
import "../device/insteon-device-picker";
import "../../homeassistant-frontend/src/layouts/hass-subpage";
import "../../homeassistant-frontend/src/components/ha-area-picker";
import "../../homeassistant-frontend/src/components/ha-card";
import "../../homeassistant-frontend/src/components/ha-fab";
import "../../homeassistant-frontend/src/components/ha-icon-button";
import "../../homeassistant-frontend/src/components/ha-icon-picker";
import "../../homeassistant-frontend/src/components/ha-svg-icon";
import "../../homeassistant-frontend/src/components/ha-textfield";
import "../../homeassistant-frontend/src/components/ha-checkbox";
import "../../homeassistant-frontend/src/components/ha-switch";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../homeassistant-frontend/src/data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../homeassistant-frontend/src/data/entity_registry";
import {
  getSceneEditorInitData,
  SCENE_IGNORED_DOMAINS,
} from "../../homeassistant-frontend/src/data/scene";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import { KeyboardShortcutMixin } from "../../homeassistant-frontend/src/mixins/keyboard-shortcut-mixin";
import { SubscribeMixin } from "../../homeassistant-frontend/src/mixins/subscribe-mixin";
import { haStyle } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant, Route } from "../../homeassistant-frontend/src/types";
import "../../homeassistant-frontend/src/panels/config/ha-config-section";
import {
  Insteon,
  InsteonScene,
  InsteonSceneDeviceData,
  fetchInsteonScene,
  sceneDataSchema,
  saveInsteonScene,
  deleteInsteonScene,
  InsteonSceneLinkData,
} from "../data/insteon";
import "../../homeassistant-frontend/src/components/ha-form/ha-form";
import { showInsteonSetOnLevelDialog } from "./show-dialog-insteon-scene-set-on-level";
import { navigate } from "../../homeassistant-frontend/src/common/navigate";

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

interface InsteonSceneEntity {
  entity_id: string;
  name: string;
  is_in_scene: boolean;
  data1: number;
  data2: number;
  data3: number;
}

interface InsteonSceneDevice {
  address: string;
  device_id: string;
  name: string | null | undefined;
  entities: InsteonSceneEntity[];
}

interface InsteonToHaDeviceMap {
  device: DeviceRegistryEntry;
  entities: { [group: number]: EntityRegistryEntry };
}

const DIMMABLE_DOMAINS = ["light", "fan"];

@customElement("insteon-scene-editor")
export class InsteonSceneEditor extends SubscribeMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public route!: Route;

  @property() public sceneId: string | null = null;

  @state() public _scene?: InsteonScene;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  private _insteonToHaDeviceMap: { [address: string]: InsteonToHaDeviceMap } =
    {};

  private _haToinsteonDeviceMap: { [deviceId: string]: string } = {};

  private _unsubscribeEvents?: () => void;

  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  @state() private _saving = false;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribeEvents) {
      this._unsubscribeEvents();
      this._unsubscribeEvents = undefined;
    }
  }

  public hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries.filter(
          (entity) =>
            entity.config_entry_id == this.insteon.config_entry.entry_id &&
            !SCENE_IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))
        );
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries.filter(
          (device) =>
            device.config_entries &&
            device.config_entries.includes(this.insteon.config_entry.entry_id)
        );
      }),
    ];
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._scene) {
      return html``;
    }
    const name = this._scene
      ? this._scene.name
      : this.insteon.localize("scenes.scene.default_name");

    const devices = this._setSceneDevices();
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${name}
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleMenuAction}
          activatable
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <mwc-list-item
            .disabled=${!this.sceneId}
            aria-label=${this.insteon.localize("scenes.scene.delete")}
            class=${classMap({ warning: Boolean(this.sceneId) })}
            graphic="icon"
          >
            ${this.insteon.localize("scenes.scene.delete")}
            <ha-svg-icon
              class=${classMap({ warning: Boolean(this.sceneId) })}
              slot="graphic"
              .path=${mdiDelete}
            >
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>
        ${this._errors ? html` <div class="errors">${this._errors}</div> ` : ""}
        ${!this.narrow ? html` <span slot="header">${name}</span> ` : ""}
        <div
          id="root"
          class=${classMap({
            rtl: computeRTL(this.hass),
          })}
        >
          <ha-config-section vertical .isWide=${this.isWide}>
            ${this._saving
              ? html`<div>
                  <ha-circular-progress
                    active
                    alt="Loading"
                  ></ha-circular-progress>
                </div>`
              : this._showEditorArea(name, devices)}
          </ha-config-section>
        </div>
        <ha-fab
          slot="fab"
          .label=${this.insteon.localize("scenes.scene.save")}
          extended
          .disabled=${this._saving}
          @click=${this._saveScene}
          class=${classMap({ dirty: this._dirty, saving: this._saving })}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _showEditorArea(name, devices) {
    return html`<div slot="introduction">
        ${this.insteon.localize("scenes.scene.introduction")}
      </div>
      <ha-card outlined>
        <div class="card-content">
          <ha-textfield
            .value=${name}
            .name=${"name"}
            @change=${this._nameChanged}
            .label=${this.insteon.localize("scenes.scene.name")}
          ></ha-textfield>
        </div>
      </ha-card>

      <ha-config-section vertical .isWide=${this.isWide}>
        <div slot="header">
          ${this.insteon.localize("scenes.scene.devices.header")}
        </div>
        <div slot="introduction">
          ${this.insteon.localize("scenes.scene.devices.introduction")}
        </div>

        ${devices.map(
          (device) =>
            html`
              <ha-card outlined>
                <h1 class="card-header">
                  ${device.name}
                  <ha-icon-button
                    .path=${mdiDelete}
                    .label=${this.hass.localize(
                      "ui.panel.config.scene.editor.devices.delete"
                    )}
                    .device_address=${device.address}
                    @click=${this._deleteDevice}
                  ></ha-icon-button>
                </h1>
                ${!device.entities
                  ? html` <ha-form .schema=${sceneDataSchema}></ha-form> `
                  : device.entities.map(
                      (entity) =>
                        html`
                          <paper-icon-item class="device-entity">
                            <ha-checkbox
                              .checked=${entity.is_in_scene}
                              @change=${this._toggleSelection}
                              .device_address=${device.address}
                              .group=${entity.data3}
                            ></ha-checkbox>
                            <paper-item-body
                              @click=${this._showSetOnLevel}
                              .device_address=${device.address}
                              .group=${entity.data3}
                            >
                              ${entity.name}
                            </paper-item-body>
                            <ha-switch
                              .checked=${entity.data1 > 0}
                              @change=${this._toggleOnLevel}
                              .device_address=${device.address}
                              .group=${entity.data3}
                            ></ha-switch>
                          </paper-icon-item>
                        `
                    )};
              </ha-card>
            `
        )}

        <ha-card
          outlined
          .header=${this.insteon.localize("scenes.scene.devices.add")}
        >
          <div class="card-content">
            <insteon-device-picker
              @value-changed=${this._devicePicked}
              .hass=${this.hass}
              .insteon=${this.insteon}
              .label=${this.insteon.localize("scenes.scene.devices.add")}
              .excludedDomains=${SCENE_IGNORED_DOMAINS}
            ></insteon-device-picker>
          </div>
        </ha-card>
      </ha-config-section>`;
  }

  private _setSceneDevices(): InsteonSceneDevice[] {
    const outputDevices: InsteonSceneDevice[] = [];
    if (!this._scene) {
      return [];
    }
    for (const [address, links] of Object.entries(this._scene.devices)) {
      const haDevice = this._insteonToHaDeviceMap[address] || undefined;
      const deviceEntities = haDevice.entities || {};
      const theseEntities: InsteonSceneEntity[] = [];
      let thisDevice: InsteonSceneDevice | undefined = undefined;

      for (const [group, entity] of Object.entries(deviceEntities)) {
        const insteonEntityData: InsteonSceneDeviceData | undefined =
          links.find((link) => link.data3 == +group);
        const data1 = insteonEntityData?.data1 || 0;
        const data2 = insteonEntityData?.data2 || 28;
        const data3 = insteonEntityData?.data3 || group;
        const is_in_scene = insteonEntityData ? true : false;
        theseEntities.push({
          entity_id: entity.entity_id,
          name:
            computeStateName(this.hass.states[entity.entity_id]) ||
            "Device button " + group,
          is_in_scene: is_in_scene,
          data1: data1,
          data2: data2,
          data3: +data3,
        });
        thisDevice = {
          address: address,
          device_id: haDevice.device.id,
          name: computeDeviceName(
            haDevice.device,
            this.hass,
            this._deviceEntityLookup[haDevice.device.id]
          ),
          entities: theseEntities,
        };
      }
      if (thisDevice) {
        outputDevices.push(thisDevice);
      }
    }
    return outputDevices;
  }

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    super.firstUpdated(_changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    this.hassSubscribe();

    if (!this._scene && this.sceneId) {
      this._loadScene();
    } else {
      this._initNewScene();
    }

    //Copied from ha-panel-config to retain consistancy
    this.style.setProperty(
      "--app-header-background-color",
      "var(--sidebar-background-color)"
    );
    this.style.setProperty(
      "--app-header-text-color",
      "var(--sidebar-text-color)"
    );
    this.style.setProperty(
      "--app-header-border-bottom",
      "1px solid var(--divider-color)"
    );
    this.style.setProperty(
      "--ha-card-border-radius",
      "var(--ha-config-card-border-radius, 8px)"
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this.hass || !this.insteon) {
      return;
    }

    if (
      changedProps.has("_deviceRegistryEntries") ||
      changedProps.has("_entityRegistryEntries")
    ) {
      this._mapDeviceEntities();
    }
  }

  private _initNewScene() {
    this._dirty = false;
    const initData = getSceneEditorInitData();
    this._scene = {
      name: this.insteon.localize("scenes.scene.default_name"),
      devices: {},
      group: -1,
    };
    // if (initData?.areaId) {
    //   this._updatedAreaId = initData.areaId;
    // }
    this._dirty =
      initData !== undefined &&
      (initData.areaId !== undefined || initData.config !== undefined);
  }

  private _mapDeviceEntities() {
    this._insteonToHaDeviceMap = {};
    this._haToinsteonDeviceMap = {};
    this._deviceRegistryEntries.map((haDevice) => {
      const address: string = haDevice.identifiers[0][1];
      const entities: { [group: number]: EntityRegistryEntry } = {};
      this._entityRegistryEntries
        .filter((entity) => entity.device_id == haDevice.id)
        .map((entity) => {
          const stateobj = this.hass.states[entity.entity_id];
          const group = stateobj.attributes.insteon_group;
          entities[group] = entity;
        });
      this._insteonToHaDeviceMap[address] = {
        device: haDevice,
        entities: entities,
      };
      this._haToinsteonDeviceMap[haDevice.id] = address;
    });
    for (const entity of this._entityRegistryEntries) {
      if (
        !entity.device_id ||
        SCENE_IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))
      ) {
        continue;
      }
      if (!(entity.device_id in this._deviceEntityLookup)) {
        this._deviceEntityLookup[entity.device_id] = [];
      }
      if (
        !this._deviceEntityLookup[entity.device_id].includes(entity.entity_id)
      ) {
        this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
      }
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._deleteTapped();
        break;
    }
  }

  private _showSetOnLevel(ev: Event) {
    ev.stopPropagation();
    const address = (ev.currentTarget as any).device_address;
    const group = (ev.currentTarget as any).group;
    const device = this._scene!.devices[address];
    let link = device.find((curr_link) => curr_link.data3 == +group);
    if (!link) {
      this._selectEntity(true, device, group);
      link = device.find((curr_link) => curr_link.data3 == +group);
    }
    const haDevice = this._insteonToHaDeviceMap[address];
    const deviceEntities = haDevice.entities || {};
    const entity = deviceEntities[+group];
    if (DIMMABLE_DOMAINS.includes(computeDomain(entity.entity_id))) {
      this._setOnLevel(
        address,
        group,
        link!.data1,
        link!.data2 == 0 ? 28 : link!.data2
      );
    }
  }

  private async _setOnLevel(
    address: string,
    group: number,
    on_level: number,
    ramp_rate: number
  ): Promise<void> {
    showInsteonSetOnLevelDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      title: this.insteon.localize("device.actions.add"),
      address: address,
      group: group,
      value: on_level,
      ramp_rate: ramp_rate,
      callback: async (address_out, group_out, on_level_out, ramp_rate_out) =>
        this._handleSetOnLevel(
          address_out,
          group_out,
          on_level_out,
          ramp_rate_out
        ),
    });
    history.back();
  }

  private _handleSetOnLevel(
    address: string,
    group: number,
    on_level: number,
    ramp_rate: number
  ) {
    const device = this._scene!.devices[address];
    const existing_link = device.find((link) => link.data3 == +group);
    if (existing_link!.data1 != on_level) {
      existing_link!.data1 = on_level;
      this._dirty = true;
    }
    if (existing_link!.data2 != ramp_rate) {
      existing_link!.data2 = ramp_rate;
      this._dirty = true;
    }
    if (this._dirty) {
      this._scene = { ...this._scene! };
    }
  }

  private async _loadScene() {
    // let config: SceneConfig;
    this._scene = await fetchInsteonScene(this.hass, +this.sceneId!);
    for (const address in Object.keys(this._scene.devices)) {
      const ha_device = this._deviceRegistryEntries.find(
        (haDevice) => haDevice.identifiers[0][1] === address
      );
      const device_id = ha_device?.id || undefined;
      if (device_id) {
        this._pickDevice(device_id);
      }
    }
    this._dirty = false;
  }

  private _pickDevice(deviceId: string) {
    const haDevice = this._deviceRegistryEntries.find((haCurrDevice) => {
      return haCurrDevice.id == deviceId;
    });
    const address = haDevice?.identifiers[0][1];
    if (!address) {
      return;
    }
    if (this._scene!.devices.hasOwnProperty(address)) {
      return;
    }
    const updated_scene: InsteonScene = { ...this._scene! };
    updated_scene.devices[address] = [];
    this._scene = { ...updated_scene };
    this._dirty = true;
  }

  private _devicePicked(ev: CustomEvent) {
    const deviceId = ev.detail.value;
    (ev.target as any).value = "";
    this._pickDevice(deviceId);
  }

  private _deleteDevice(ev: Event) {
    const address = (ev.target as any).device_address;
    const updated_scene: InsteonScene = { ...this._scene! };
    if (updated_scene.devices.hasOwnProperty(address)) {
      delete updated_scene.devices[address];
    }
    this._scene = { ...updated_scene };
    this._dirty = true;
  }

  private _toggleSelection(ev: Event) {
    const address = (ev.target as any).device_address;
    const checked = (ev.target as any).checked;
    const group = (ev.target as any).group;
    const device = this._scene!.devices[address];
    this._selectEntity(checked, device, group);
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  private _selectEntity(
    checked: boolean,
    device: InsteonSceneDeviceData[],
    group: number
  ) {
    if (checked) {
      const existing_link = device.find((link) => link.data3 == +group);
      if (existing_link) {
        return;
      }
      const link: InsteonSceneDeviceData = {
        data1: 0,
        data2: 0,
        data3: group,
        has_controller: false,
        has_responder: false,
      };
      device.push(link);
    } else {
      const existing_link = device.findIndex((link) => link.data3 == +group);
      if (existing_link !== -1) {
        device.splice(existing_link, 1);
      }
    }
    this._dirty = true;
  }

  private _toggleOnLevel(ev: Event) {
    const address = (ev.target as any).device_address;
    const checked = (ev.target as any).checked;
    const group = (ev.target as any).group;
    const device = this._scene!.devices[address];
    let existing_link = device.find((link) => link.data3 == +group);
    if (!existing_link) {
      this._selectEntity(true, device, +group);
      existing_link = device.find((link) => link.data3 == +group);
    }
    if (checked) {
      existing_link!.data1 = 255;
      const haDevice = this._insteonToHaDeviceMap[address] || undefined;
      const deviceEntities = haDevice.entities || {};
      const entity = deviceEntities[+group];
      if (DIMMABLE_DOMAINS.includes(computeDomain(entity.entity_id))) {
        existing_link!.data2 = 28;
      }
    } else {
      existing_link!.data1 = 0;
      existing_link!.data2 = 0;
    }
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  private _nameChanged(ev: Event) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = (ev as CustomEvent).detail?.value ?? target.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this._scene![name] || "") === newVal) {
      return;
    }
    if (!newVal) {
      delete this._scene![name];
      this._scene = { ...this._scene! };
    } else {
      this._scene = { ...this._scene!, [name]: newVal };
    }
    this._scene = { ...this._scene! };
    this._dirty = true;
  }

  private _backTapped = async (): Promise<void> => {
    const result = await this.confirmUnsavedChanged();
    if (result) {
      this._goBack();
    }
  };

  private _goBack(): void {
    afterNextRender(() => history.back());
  }

  private async confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      const action = showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.scene.editor.unsaved_confirm_text"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        destructive: true,
      });
      history.back();
      return action;
    }
    return true;
  }

  private _deleteTapped(): void {
    showConfirmationDialog(this, {
      text: this.hass!.localize("ui.panel.config.scene.picker.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
    history.back();
  }

  private async _delete(): Promise<void> {
    this._saving = true;
    const sceneId: number = +this.sceneId!;
    const result = await deleteInsteonScene(this.hass, sceneId!);
    this._saving = false;
    if (!result.result) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.scene_write"),
        confirmText: this.hass!.localize("ui.common.close"),
      });
      history.back();
    }
    history.back();
  }

  private async _saveScene(): Promise<void> {
    if (!this._checkDeviceEntitySelections()) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.scene_device_no_entities"),
        confirmText: this.hass!.localize("ui.common.close"),
      });
      history.back();
      return;
    }
    this._saving = true;
    const links: InsteonSceneLinkData[] = [];
    Object.keys(this._scene!.devices).forEach((address) => {
      const link_data = this._scene!.devices[address];
      link_data.forEach((link_info) => {
        const link = {
          address: address,
          data1: link_info.data1,
          data2: link_info.data2,
          data3: link_info.data3,
        };
        links.push(link);
      });
    });
    const result = await saveInsteonScene(
      this.hass,
      this._scene!.group,
      links,
      this._scene!.name
    );
    this._saving = false;
    this._dirty = false;
    if (!result.result) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.scene_write"),
        confirmText: this.hass!.localize("ui.common.close"),
      });
      history.back();
    } else {
      if (!this.sceneId) {
        navigate(`/insteon/scene/${result.scene_id}`, { replace: true });
      }
    }
  }

  private _checkDeviceEntitySelections(): boolean {
    for (const [_, links] of Object.entries(this._scene!.devices)) {
      if (links.length == 0) {
        return false;
      }
    }
    return true;
  }

  protected handleKeyboardSave() {
    this._saveScene();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        .errors {
          padding: 20px;
          font-weight: bold;
          color: var(--error-color);
        }
        ha-config-section:last-child {
          padding-bottom: 20px;
        }
        .triggers,
        .script {
          margin-top: -16px;
        }
        .triggers ha-card,
        .script ha-card {
          margin-top: 16px;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        .card-menu {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
          color: var(--primary-text-color);
        }
        .rtl .card-menu {
          right: auto;
          left: 0;
        }
        .card-menu paper-item {
          cursor: pointer;
        }
        paper-icon-item {
          padding: 8px 16px;
        }
        ha-card ha-icon-button {
          color: var(--secondary-text-color);
        }
        .card-header > ha-icon-button {
          float: right;
          position: relative;
          top: -8px;
        }
        .device-entity {
          cursor: pointer;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
        }
        ha-fab.saving {
          opacity: var(--light-disabled-opacity);
        }
        ha-icon-picker,
        ha-area-picker,
        ha-entity-picker {
          display: block;
          margin-top: 8px;
        }
        ha-textfield {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-scene-editor": InsteonSceneEditor;
  }
}
