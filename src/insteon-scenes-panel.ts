import { mdiPlus, mdiLightbulbGroup, mdiLightbulbGroupOff } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "@ha/components/data-table/ha-data-table";
import "@ha/layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "@ha/types";
import type { Insteon } from "./data/insteon";
import type { EntityRegistryEntry } from "@ha/data/entity_registry";
import { fetchEntityRegistry } from "@ha/data/entity_registry";
import type { InsteonScene, InsteonScenes } from "./data/scene";
import { fetchInsteonScenes, insteonSceneGroup } from "./data/scene";
import { navigate } from "@ha/common/navigate";
import type { HASSDomEvent } from "@ha/common/dom/fire_event";
import { insteonMainTabs } from "./insteon-router";
import { outputName } from "./device/output-name";
import "@ha/components/ha-fab";

declare global {
  // for fire event
  interface HASSDomEvents {
    "selection-changed": SelectionChangedEvent;
    "row-click": RowClickedEvent;
    "sorting-changed": SortingChangedEvent;
    "scene-trigger": InsteonSceneTriggeredEvent;
  }
}

interface SceneRowData extends InsteonScene {
  record?: InsteonScene;
  controller_names?: string;
  area?: string;
  num_devices?: number;
  ha_scene?: boolean;
  ha_script?: boolean;
  actions?: string;
}

export interface InsteonSceneTriggeredEvent {
  scene: {
    group: number;
  };
}

@customElement("insteon-scenes-panel")
export class InsteonScenesPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Object }) private _scenes: InsteonScenes = {};

  @state() private _sceneEntities: EntityRegistryEntry[] = [];

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    fetchInsteonScenes(this.hass).then((scenes) => {
      this._scenes = scenes;
    });
    fetchEntityRegistry(this.hass.connection).then((entities) => {
      this._sceneEntities = entities.filter((entity) => insteonSceneGroup(entity) !== undefined);
    });
  }

  private _columns = memoizeOne(
    (): DataTableColumnContainer => ({
      group: {
        title: this.insteon.localize("scenes.fields.group"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: true,
      },
      name: {
        title: this.insteon.localize("scenes.fields.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: true,
      },
      area: {
        title: this.insteon.localize("scenes.fields.area"),
        sortable: true,
        filterable: true,
        showNarrow: false,
      },
      num_devices: {
        title: this.insteon.localize("scenes.fields.num_devices"),
        sortable: true,
        filterable: true,
        direction: "asc",
        showNarrow: true,
      },
      controller_names: {
        title: this.insteon.localize("scenes.fields.controllers"),
        sortable: true,
        filterable: true,
        showNarrow: false,
      },
      actions: {
        title: this.insteon.localize("scenes.fields.actions"),
        type: "flex",
        template: (scene) => html`
          <ha-icon-button
            .disabled=${scene.pending}
            .scene=${scene}
            .hass=${this.hass}
            .label=${this.insteon.localize("scenes.scene.activate")}
            .path=${mdiLightbulbGroup}
            @click=${this._activateScene}
          ></ha-icon-button>
          <ha-icon-button
            .disabled=${scene.pending}
            .scene=${scene}
            .hass=${this.hass}
            .label=${this.insteon.localize("scenes.scene.deactivate")}
            .path=${mdiLightbulbGroupOff}
            @click=${this._deactivateScene}
          ></ha-icon-button>
        `,
        showNarrow: true,
      },
    }),
  );

  private async _activateScene(ev): Promise<void> {
    ev.stopPropagation();
    const scene = ev.currentTarget.scene as InsteonScene;
    const hass = ev.currentTarget.hass as HomeAssistant;
    // eslint-disable-next-line no-console
    console.info("Scene activate clicked received: " + scene.group);
    hass.callService("insteon", "scene_on", { group: scene.group });
  }

  private async _deactivateScene(ev): Promise<void> {
    ev.stopPropagation();
    const hass = ev.currentTarget.hass as HomeAssistant;
    const scene = ev.currentTarget.scene as InsteonScene;
    // eslint-disable-next-line no-console
    console.info("Scene activate clicked received: " + scene.group);
    hass.callService("insteon", "scene_off", { group: scene.group });
  }

  private _records = memoizeOne(
    (
      scenes: InsteonScenes,
      devices: HomeAssistant["devices"] | undefined,
      sceneEntities: EntityRegistryEntry[],
      areas: HomeAssistant["areas"] | undefined,
    ): DataTableRowData[] => {
      if (Object.keys(scenes).length === 0) {
        return [];
      }
      const outputScenes: SceneRowData[] = [];
      for (const [_, scene] of Object.entries(scenes)) {
        const areaId = sceneEntities.find(
          (entity) => insteonSceneGroup(entity) === scene.group,
        )?.area_id;
        const scene_data = {
          ...scene,
          area: areaId ? areas?.[areaId]?.name : undefined,
          num_devices: Object.keys(scene.devices).length,
          controller_names: scene.controllers?.length
            ? scene.controllers
                .map((controller) =>
                  outputName(
                    devices ?? {},
                    controller.address,
                    controller.group,
                    this.insteon.localize,
                  ),
                )
                .join(", ")
            : this.insteon.localize("scenes.scene.controllers.app_only"),
          ha_scene: true, // to be replace later
          ha_script: false, // to be replace later
          actions: "",
        };
        outputScenes.push(scene_data);
      }
      return outputScenes;
    },
  );

  protected render(): TemplateResult | void {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${insteonMainTabs}
        .route=${this.route}
        id="group"
        .data=${this._records(
          this._scenes,
          this.hass.devices,
          this._sceneEntities,
          this.hass.areas,
        )}
        .columns=${this._columns()}
        @row-click=${this._handleRowClicked}
        clickable
        .localizeFunc=${this.hass.localize}
        .mainPage=${true}
        .hasFab=${true}
      >
        <ha-fab
          slot="fab"
          .label=${this.insteon.localize("scenes.add_scene")}
          extended
          @click=${this._addScene}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _addScene(): Promise<void> {
    navigate("/insteon/scene/");
  }

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>): Promise<void> {
    const id = ev.detail.id;
    // eslint-disable-next-line no-console
    console.info("Row clicked received: " + id);
    navigate("/insteon/scene/" + id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-scenes-panel": InsteonScenesPanel;
  }
}
