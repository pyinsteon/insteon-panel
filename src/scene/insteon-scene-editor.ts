import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiContentDuplicate, mdiContentSave, mdiDelete, mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { HassEvent } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../homeassistant-frontend/src/common/dom/fire_event";
import { computeDomain } from "../../homeassistant-frontend/src/common/entity/compute_domain";
import { computeStateName } from "../../homeassistant-frontend/src/common/entity/compute_state_name";
import { navigate } from "../../homeassistant-frontend/src/common/navigate";
import { computeRTL } from "../../homeassistant-frontend/src/common/util/compute_rtl";
import "../device/insteon-device-picker";
import "../../homeassistant-frontend/src/components/entity/ha-entities-picker";
import "../../homeassistant-frontend/src/components/ha-area-picker";
import "../../homeassistant-frontend/src/components/ha-card";
import "../../homeassistant-frontend/src/components/ha-fab";
import "../../homeassistant-frontend/src/components/ha-icon-button";
import "../../homeassistant-frontend/src/components/ha-icon-picker";
import "../../homeassistant-frontend/src/components/ha-svg-icon";
import "../../homeassistant-frontend/src/components/ha-textfield";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../homeassistant-frontend/src/data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../homeassistant-frontend/src/data/entity_registry";
import {
  activateScene,
  applyScene,
  deleteScene,
  getSceneConfig,
  getSceneEditorInitData,
  saveScene,
  SceneConfig,
  SceneEntities,
  SceneEntity,
  SCENE_IGNORED_DOMAINS,
  showSceneEditor,
} from "../../homeassistant-frontend/src/data/scene";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import { KeyboardShortcutMixin } from "../../homeassistant-frontend/src/mixins/keyboard-shortcut-mixin";
import { SubscribeMixin } from "../../homeassistant-frontend/src/mixins/subscribe-mixin";
import { haStyle } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant, Route } from "../../homeassistant-frontend/src/types";
import { showToast } from "../../homeassistant-frontend/src/util/toast";
import "../../homeassistant-frontend/src/panels/config/ha-config-section";
import { insteonMainTabs } from "../insteon-router";
import {
  Insteon,
  InsteonScene,
  InsteonSceneDeviceData,
  fetchInsteonScene,
  fetchInsteonEntities,
  sceneDataSchema,
  InsteonDeviceEntities,
} from "../data/insteon";
import "../../homeassistant-frontend/src/components/ha-form/ha-form";
import { Entity } from "../../homeassistant-frontend/src/fake_data/entity";

interface DeviceEntities {
  id: string;
  name: string;
  entities: InsteonSceneDeviceData[];
}

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
  name: string | null | undefined;
  device_cat: number;
  entities: InsteonSceneEntity[];
}

@customElement("insteon-scene-editor")
export class InsteonSceneEditor extends SubscribeMixin(KeyboardShortcutMixin(LitElement)) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public route!: Route;

  @property() public sceneId: string | null = null;

  @state() public _scene: InsteonScene | null = null;

  @state() private _dirty = false;

  @state() private _errors?: string;

  @state() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state() private _entityRegistryEntries: EntityRegistryEntry[] = [];

  private _insteonEntities?: InsteonDeviceEntities;

  private _unsubscribeEvents?: () => void;

  @state() private _deviceEntityLookup: DeviceEntitiesLookup = {};

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
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries.filter(
          (device) =>
            device.config_entries &&
            device.config_entries.includes(this.insteon.config_entry.entry_id) // &&
          // !device.model?.includes("(0x03")
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
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .tabs=${insteonMainTabs}
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
        ${this.narrow ? html` <span slot="header">${name}</span> ` : ""}
        <div
          id="root"
          class=${classMap({
            rtl: computeRTL(this.hass),
          })}
        >
          <ha-config-section vertical .isWide=${this.isWide}>
            ${!this.narrow ? html` <span slot="header">${name}</span> ` : ""}
            <div slot="introduction">${this.insteon.localize("scenes.scene.introduction")}</div>
            <ha-card outlined>
              <div class="card-content">
                <ha-textfield
                  .value=${name}
                  .name=${"name"}
                  @change=${this._valueChanged}
                  .label=${this.insteon.localize("scenes.scene.name")}
                ></ha-textfield>
              </div>
            </ha-card>
          </ha-config-section>

          <ha-config-section vertical .isWide=${this.isWide}>
            <div slot="header">${this.insteon.localize("scenes.scene.devices.header")}</div>
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
                        .label=${this.hass.localize("ui.panel.config.scene.editor.devices.delete")}
                        .device=${device.address}
                        @click=${this._deleteDevice}
                      ></ha-icon-button>
                    </h1>
                    ${!device.entities
                      ? html` <ha-form .schema=${sceneDataSchema}></ha-form> `
                      : html`` // !entityStateObj
                    }
                    ${device.entities.map((entity) =>
                      html`
                          <paper-icon-item
                            .entityId=${entity.entity_id}
                            @click=${this._showMoreInfo}
                            class="device-entity"
                          >
                            <paper-item-body> ${entity.name} </paper-item-body>
                          </paper-icon-item>
                        `)};
                  </ha-card>
                `
            )}

            <ha-card outlined .header=${this.insteon.localize("scenes.scene.devices.add")}>
              <div class="card-content">
                <insteon-device-picker
                  @value-changed=${this._devicePicked}
                  .hass=${this.hass}
                  .insteon=${this.insteon}
                  .label=${this.insteon.localize("scenes.scene.devices.add")}
                ></insteon-device-picker>
              </div>
            </ha-card>
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
      </hass-tabs-subpage>
    `;
  }

  private _setSceneDevices(): InsteonSceneDevice[] {
    const outputDevices: InsteonSceneDevice[] = [];
    this._scene?.devices.map((device) => {
      const haDevice = this._deviceRegistryEntries.find((haCurrDevice) => {
        return haCurrDevice.identifiers[0][0] == device.address;
      });
      const deviceEntities = this._insteonEntities ? this._insteonEntities[device.address] : {};
      const theseEntities: InsteonSceneEntity[] = [];
      Object.keys(deviceEntities).forEach((group) => {
        const entity: EntityRegistryEntry =
          this._entityRegistryEntries[deviceEntities[group].entity_id];
        const insteonEntityData: InsteonSceneDeviceData | undefined = this._scene?.devices.find(
          (curr_device) => {
            return curr_device.data3 == +group;
          }
        );
        const data1 = insteonEntityData?.data1 || 255;
        const data2 = insteonEntityData?.data2 || 28;
        const data3 = insteonEntityData?.data3 || group;
        theseEntities.push({
          entity_id: entity.entity_id,
          name: entity.name || "None",
          is_in_scene: true,
          data1: data1,
          data2: data2,
          data3: +data3,
        });
      });
      const thisDevice: InsteonSceneDevice = {
        address: device.address,
        name: haDevice?.name_by_user || haDevice?.name || "Insteon Device " + device.address,
        device_cat: device.device_cat!,
        entities: theseEntities,
      };
      outputDevices.push(thisDevice);
    });
    return outputDevices;
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this.hass || !this.insteon) {
      return;
    }

    super.updated(changedProps);

    if (!this._scene && this.sceneId && this.hass) {
      this._loadScene();
    }

    if (changedProps.has("sceneId") && !this.sceneId && this.hass) {
      this._initNewScene();
    }

    if (changedProps.has("_entityRegistryEntries")) {
      this._loadEntityRegistryEntries();
    }
  }

  private _initNewScene() {
    this._dirty = false;
    const initData = getSceneEditorInitData();
    this._config = {
      name: this.insteon.localize("scenes.scene.default_name"),
      entities: {},
      ...initData?.config,
    };
    this._initEntities(this._config);
    if (initData?.areaId) {
      this._updatedAreaId = initData.areaId;
    }
    this._dirty =
      initData !== undefined && (initData.areaId !== undefined || initData.config !== undefined);
  }

  private _loadEntityRegistryEntries() {
    for (const entity of this._entityRegistryEntries) {
      if (!entity.device_id || SCENE_IGNORED_DOMAINS.includes(computeDomain(entity.entity_id))) {
        continue;
      }
      if (!(entity.device_id in this._deviceEntityLookup)) {
        this._deviceEntityLookup[entity.device_id] = [];
      }
      if (!this._deviceEntityLookup[entity.device_id].includes(entity.entity_id)) {
        this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
      }
      // if (this._entities.includes(entity.entity_id) && !this._devices.includes(entity.device_id)) {
      //   this._devices = [...this._devices, entity.device_id];
      // }
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._deleteTapped();
        break;
    }
  }

  private _showMoreInfo(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private async _loadScene() {
    // let config: SceneConfig;
    this._scene = await fetchInsteonScene(this.hass, +this.sceneId!);
    this._insteonEntities = await fetchInsteonEntities(this.hass);

    this._scene.devices.map((device) => {
      const ha_device = this._deviceRegistryEntries.find(
        (haDevice) => haDevice.identifiers[0][1] === device.address
      );
      device.ha_id = ha_device?.id || undefined;
      if (device.ha_id) {
        this._pickDevice(device.ha_id);
      }
      const findEntityId = this._insteonEntities[device.address][device.data3].entity_id;
      const entity = this._entityRegistryEntries.find(
        (haEntity) => haEntity.entity_id === findEntityId
      );
      device.entityName = entity?.name || entity?.original_name;
      device.entityId = entity?.entity_id;
    });
    // this._setScene();
    this._dirty = false;
  }

  private _initEntities(config: SceneConfig) {
    this._entities = Object.keys(config.entities);
    this._entities.forEach((entity) => this._storeState(entity));

    const filteredEntityReg = this._entityRegistryEntries.filter((entityReg) =>
      this._entities.includes(entityReg.entity_id)
    );

    for (const entityReg of filteredEntityReg) {
      if (!entityReg.device_id) {
        continue;
      }
      if (!this._devices.includes(entityReg.device_id)) {
        this._devices = [...this._devices, entityReg.device_id];
      }
    }
  }

  private _pickDevice(device_id: string) {
    if (this._devices.includes(device_id)) {
      return;
    }
    this._devices = [...this._devices, device_id];
    const deviceEntities = this._deviceEntityLookup[device_id];
    if (!deviceEntities) {
      return;
    }
    this._entities = [...this._entities, ...deviceEntities];
    deviceEntities.forEach((entityId) => {
      this._storeState(entityId);
    });
    this._dirty = true;
  }

  private _devicePicked(ev: CustomEvent) {
    const device = ev.detail.value;
    (ev.target as any).value = "";
    this._pickDevice(device);
  }

  private _deleteDevice(ev: Event) {
    const deviceId = (ev.target as any).device;
    this._devices = this._devices.filter((device) => device !== deviceId);
    const deviceEntities = this._deviceEntityLookup[deviceId];
    if (!deviceEntities) {
      return;
    }
    this._entities = this._entities.filter((entityId) => !deviceEntities.includes(entityId));
    this._dirty = true;
  }

  private _valueChanged(ev: Event) {
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
    if ((this._config![name] || "") === newVal) {
      return;
    }
    if (!newVal) {
      delete this._config![name];
      this._config = { ...this._config! };
    } else {
      this._config = { ...this._config!, [name]: newVal };
    }
    this._dirty = true;
  }

  private _backTapped = (): void => {
    if (this._dirty) {
      showConfirmationDialog(this, {
        text: this.hass!.localize("ui.panel.config.scene.editor.unsaved_confirm"),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        confirm: () => this._goBack(),
      });
    } else {
      this._goBack();
    }
  };

  private _goBack(): void {
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private _deleteTapped(): void {
    showConfirmationDialog(this, {
      text: this.hass!.localize("ui.panel.config.scene.picker.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(),
    });
  }

  private async _delete(): Promise<void> {
    await deleteScene(this.hass, this.sceneId!);
    applyScene(this.hass, this._storedStates);
    history.back();
  }

  private async _saveScene(): Promise<void> {
    const id = !this.sceneId ? "" + Date.now() : this.sceneId!;
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
