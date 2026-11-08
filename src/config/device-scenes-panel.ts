import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "@ha/components/data-table/ha-data-table";
import "@ha/layouts/hass-tabs-subpage-data-table";
import "@ha/components/ha-button";
import "@ha/components/ha-dialog";
import "@ha/components/ha-spinner";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { fetchDeviceRegistry } from "@ha/data/device_registry";
import { navigate } from "@ha/common/navigate";
import { showAlertDialog, showPromptDialog } from "@ha/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "@ha/types";
import type { Insteon } from "../data/insteon";
import type { InsteonDeviceScene } from "../data/scene";
import { fetchInsteonDeviceScenes, importInsteonDeviceScene } from "../data/scene";
import { insteonDeviceByAddress } from "../device/registry-lookup";
import { outputName } from "../device/output-name";

interface DeviceSceneRow extends DataTableRowData {
  id: string;
  controllers: string;
  area: string;
  responders: string;
  status: string;
  scene: InsteonDeviceScene;
}

@customElement("device-scenes-panel")
export class DeviceScenesPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @state() private _scenes?: InsteonDeviceScene[];

  @state() private _devices: Record<string, DeviceRegistryEntry> = {};

  @state() private _importing = false;

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this._load();
  }

  private async _load(): Promise<void> {
    try {
      const [devices, scenes] = await Promise.all([
        fetchDeviceRegistry(this.hass.connection),
        fetchInsteonDeviceScenes(this.hass),
      ]);
      this._devices = Object.fromEntries(devices.map((device) => [device.id, device]));
      this._scenes = scenes;
    } catch (err: unknown) {
      this._scenes = [];
      this._showError(err);
    }
  }

  private _output(address: string, group: number): string {
    return outputName(this._devices, address, group, this.insteon.localize);
  }

  private _area(address: string): string | undefined {
    const areaId = insteonDeviceByAddress(this._devices, address)?.area_id;
    return areaId ? this.hass.areas?.[areaId]?.name : undefined;
  }

  private _rows = memoizeOne(
    (
      scenes: InsteonDeviceScene[] | undefined,
      _devices: Record<string, DeviceRegistryEntry>,
      _areas: HomeAssistant["areas"] | undefined,
    ) =>
      (scenes ?? []).map(
        (scene): DeviceSceneRow => ({
          id: scene.controllers.map((item) => `${item.address}:${item.group}`).join(","),
          controllers: scene.controllers
            .map((item) => this._output(item.address, item.group))
            .join(", "),
          area: [
            ...new Set(
              scene.controllers
                .map((item) => this._area(item.address))
                .filter((area): area is string => !!area),
            ),
          ].join(", "),
          responders: scene.links
            .map(
              (link) =>
                `${this._output(link.address, link.data3)} (${Math.round((link.data1 * 100) / 255)}%)`,
            )
            .join(", "),
          status: scene.importable
            ? this.insteon.localize("utils.device_scenes.ready")
            : scene.issues.join("; "),
          scene,
        }),
      ),
  );

  private _columns = memoizeOne(
    (importing: boolean): DataTableColumnContainer<DeviceSceneRow> => ({
      controllers: {
        title: this.insteon.localize("utils.device_scenes.fields.controllers"),
        sortable: true,
        filterable: true,
        flex: 2,
        showNarrow: true,
      },
      area: {
        title: this.insteon.localize("utils.device_scenes.fields.area"),
        sortable: true,
        filterable: true,
        groupable: true,
        flex: 1,
        showNarrow: true,
      },
      responders: {
        title: this.insteon.localize("utils.device_scenes.fields.responders"),
        filterable: true,
        flex: 3,
      },
      status: {
        title: this.insteon.localize("utils.device_scenes.fields.status"),
        sortable: true,
        flex: 2,
      },
      actions: {
        title: "",
        showNarrow: true,
        template: (row) => html`
          <ha-button
            .disabled=${importing || !row.scene.importable}
            @click=${() => this._import(row)}
            >${this.insteon.localize("utils.device_scenes.import")}</ha-button
          >
        `,
      },
    }),
  );

  private async _import(row: DeviceSceneRow): Promise<void> {
    const controller = row.scene.controllers[0];
    const name = await showPromptDialog(this, {
      title: this.insteon.localize("utils.device_scenes.import_title"),
      text: this.insteon.localize("utils.device_scenes.import_text"),
      inputLabel: this.insteon.localize("utils.device_scenes.name"),
      defaultValue: this._output(controller.address, controller.group),
      confirmText: this.insteon.localize("utils.device_scenes.import"),
      dismissText: this.insteon.localize("common.cancel"),
    });
    if (!name) {
      return;
    }
    this._importing = true;
    try {
      const result = await importInsteonDeviceScene(this.hass, row.scene.controllers, name);
      // A partial import is retried from the scene editor, which shows its pending state.
      navigate(`/insteon/scene/${result.scene_id}`);
    } catch (err: unknown) {
      this._showError(err);
      await this._load();
    } finally {
      this._importing = false;
    }
  }

  private _showError(err: unknown): void {
    showAlertDialog(this, {
      title: this.insteon.localize("utils.device_scenes.failed"),
      text:
        typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : undefined,
    });
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .data=${this._rows(this._scenes, this._devices, this.hass.areas)}
        .columns=${this._columns(this._importing)}
        .localizeFunc=${this.hass.localize}
        .mainPage=${false}
        .hasFab=${false}
        .tabs=${[
          {
            translationKey: "utils.device_scenes.caption",
            path: `/insteon`,
          },
        ]}
        .noDataText=${this.insteon.localize("utils.device_scenes.no_data")}
        backPath="/insteon/utils"
      >
      </hass-tabs-subpage-data-table>
      ${this._importing
        ? html`<ha-dialog
            open
            scrimClickAction=""
            escapeKeyAction=""
            .heading=${this.insteon.localize("utils.device_scenes.importing_title")}
          >
            <div class="progress" role="status">
              <ha-spinner size="large"></ha-spinner>
              <span>${this.insteon.localize("utils.device_scenes.importing_text")}</span>
            </div>
          </ha-dialog>`
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .progress {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "device-scenes-panel": DeviceScenesPanel;
  }
}
