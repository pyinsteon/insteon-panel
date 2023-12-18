import { mdiPlus, mdiLightbulbGroup, mdiLightbulbGroupOff } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "@ha/components/data-table/ha-data-table";
import {
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "@ha/components/data-table/ha-data-table";
import "@ha/layouts/hass-tabs-subpage-data-table";
import { haStyle } from "@ha/resources/styles";
import { HomeAssistant, Route } from "@ha/types";
import { Insteon } from "./data/insteon";
import { InsteonScene, InsteonScenes, fetchInsteonScenes } from "./data/scene";
import { navigate } from "@ha/common/navigate";
import { HASSDomEvent } from "@ha/common/dom/fire_event";
import { insteonMainTabs } from "./insteon-router";
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

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    fetchInsteonScenes(this.hass).then((scenes) => {
      this._scenes = scenes;
    });
  }

  private _columns = memoizeOne((narrow: boolean) =>
    narrow
      ? {
          group: {
            title: this.insteon.localize("scenes.fields.group"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "10%",
          },
          name: {
            title: this.insteon.localize("scenes.fields.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          num_devices: {
            title: this.insteon.localize("scenes.fields.num_devices"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "10%",
          },
        }
      : {
          group: {
            title: this.insteon.localize("scenes.fields.group"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "10%",
          },
          name: {
            title: this.insteon.localize("scenes.fields.name"),
            sortable: true,
            filterable: true,
            direction: "asc",
            grows: true,
          },
          num_devices: {
            title: this.insteon.localize("scenes.fields.num_devices"),
            sortable: true,
            filterable: true,
            direction: "asc",
            width: "10%",
          },
          actions: {
            title: this.insteon.localize("scenes.fields.actions"),
            type: "icon-button",
            template: (_toggle, scene) => html`
              <ha-icon-button
                .scene=${scene}
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.scene.picker.activate_scene",
                )}
                .path=${mdiLightbulbGroup}
                @click=${this._activateScene}
              ></ha-icon-button>
              <ha-icon-button
                .scene=${scene}
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.scene.picker.activate_scene",
                )}
                .path=${mdiLightbulbGroupOff}
                @click=${this._deactivateScene}
              ></ha-icon-button>
            `,
            width: "150px",
          },
        },
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

  private _records = memoizeOne((scenes: InsteonScenes): DataTableRowData[] => {
    if (Object.keys(scenes).length == 0) {
      return [];
    }
    const outputScenes: SceneRowData[] = [];
    for (const [_, scene] of Object.entries(scenes)) {
      const scene_data = {
        ...scene,
        num_devices: Object.keys(scene.devices).length,
        ha_scene: true, // to be replace later
        ha_script: false, // to be replace later
        actions: "",
      };
      outputScenes.push(scene_data);
    }
    return outputScenes;
  });

  protected render(): TemplateResult | void {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${insteonMainTabs}
        .route=${this.route}
        id="group"
        .data=${this._records(this._scenes)}
        .columns=${this._columns(this.narrow)}
        @row-click=${this._handleRowClicked}
        clickable
        .localizeFunc=${this.insteon.localize}
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

  private async _handleRowClicked(
    ev: HASSDomEvent<RowClickedEvent>,
  ): Promise<void> {
    const id = ev.detail.id;
    // eslint-disable-next-line no-console
    console.info("Row clicked received: " + id);
    navigate("/insteon/scene/" + id);
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
    "insteon-scenes-panel": InsteonScenesPanel;
  }
}
