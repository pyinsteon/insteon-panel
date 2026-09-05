import { mdiDotsVertical } from "@mdi/js";
import type { ActionDetail } from "@material/mwc-list";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant, Route } from "@ha/types";
import "@ha/components/ha-icon-button";
import "@ha/components/ha-button";
import "@ha/components/ha-list-item";
import type { HASSDomEvent } from "@ha/common/dom/fire_event";
import { showConfirmationDialog, showAlertDialog } from "@ha/dialogs/generic/show-dialog-box";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import type { RowClickedEvent } from "@ha/components/data-table/ha-data-table";
import "@ha/layouts/hass-tabs-subpage";
import { navigate } from "@ha/common/navigate";
import "@ha/components/ha-button-menu";
import { haStyle } from "@ha/resources/styles";
import "./insteon-properties-data-table";
import { showInsteonPropertyDialog } from "./show-dialog-insteon-property";
import { insteonDeviceTabs } from "../insteon-device-router";
import "../insteon-device-header";
import { confirmDeleteDevice } from "../delete-device";
import type { Insteon, InsteonDevice } from "../../data/insteon";
import type { InsteonProperty } from "../../data/device";
import {
  fetchInsteonDevice,
  fetchInsteonProperties,
  changeProperty,
  writeProperties,
  loadProperties,
  resetProperties,
} from "../../data/device";

@customElement("insteon-device-properties-page")
class InsteonDevicePropertiesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Object }) public route?: Route;

  @property() private deviceId?: string;

  @state() private _device?: InsteonDevice;

  @state() private _properties: InsteonProperty[] = [];

  @state() private _schema?: { [key: string]: HaFormSchema };

  @state() private _showWait = false;

  @state() private _showAdvanced = false;

  private _showHideAdvanced = "show";

  private _advancedAvailable = false;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId && this.hass) {
      this._advancedAvailable = Boolean(this.hass.userData?.showAdvanced);
      fetchInsteonDevice(this.hass, this.deviceId).then(
        (device) => {
          this._device = device;
          this._getProperties();
        },
        () => {
          this._noDeviceError();
        },
      );
    }
  }

  protected _dirty() {
    return this._properties?.reduce((modified, prop) => modified || prop.modified, false);
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
        .localizeFunc=${this.insteon.localize}
        .backCallback=${this._handleBackTapped}
      >
        ${this.narrow
          ? html`<insteon-device-header
              slot="header"
              narrow
              .hass=${this.hass}
              .insteon=${this.insteon}
              .device=${this._device}
              >${this._generateActionMenu()}</insteon-device-header
            >`
          : ""}
        <div class="container">
          ${!this.narrow
            ? html`<insteon-device-header
                .hass=${this.hass}
                .insteon=${this.insteon}
                .device=${this._device}
                >${this._generateActionMenu()}</insteon-device-header
              >`
            : ""}
          <insteon-properties-data-table
            .hass=${this.hass}
            .insteon=${this.insteon}
            .narrow=${this.narrow!}
            .records=${this._properties}
            .schema=${this._schema!}
            noDataText=${this.insteon!.localize("properties.no_data")}
            @row-click=${this._handleRowClicked}
            .showWait=${this._showWait}
          ></insteon-properties-data-table>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _generateActionMenu() {
    return html`
      <ha-button-menu corner="BOTTOM_START" @action=${this._handleMenuAction} activatable>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>

        <ha-list-item> ${this.insteon!.localize("common.actions.load")} </ha-list-item>
        <ha-list-item>${this.insteon.localize("device.actions.open_in_ha")}</ha-list-item>

        <ha-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.write")}
        </ha-list-item>

        <ha-list-item .disabled=${!this._dirty()}>
          ${this.insteon!.localize("common.actions.reset")}
        </ha-list-item>

        <ha-list-item
          aria-label=${this.insteon.localize("device.actions.delete")}
          class=${classMap({ warning: true })}
        >
          ${this.insteon.localize("device.actions.delete")}
        </ha-list-item>

        ${this._advancedAvailable
          ? html`<ha-list-item>
              ${this.insteon!.localize("properties.actions." + this._showHideAdvanced)}
            </ha-list-item>`
          : ""}
      </ha-button-menu>
    `;
  }

  private async _onLoadPropertiesClick() {
    await showConfirmationDialog(this, {
      text: this.insteon!.localize("common.warn.load"),
      confirmText: this.insteon!.localize("common.yes"),
      dismissText: this.insteon!.localize("common.no"),
      confirm: async () => this._load(),
    });
  }

  private async _load() {
    if (this._device!.is_battery) {
      await showAlertDialog(this, {
        text: this.insteon.localize("common.warn.wake_up"),
      });
    }
    this._showWait = true;
    try {
      await loadProperties(this.hass, this._device!.address);
    } catch (err) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.load"),
        confirmText: this.insteon!.localize("common.close"),
      });
    }
    this._showWait = false;
  }

  private async _onWritePropertiesClick() {
    await showConfirmationDialog(this, {
      text: this.insteon!.localize("common.warn.write"),
      confirmText: this.insteon!.localize("common.yes"),
      dismissText: this.insteon!.localize("common.no"),
      confirm: async () => this._write(),
    });
  }

  private async _write() {
    if (this._device!.is_battery) {
      await showAlertDialog(this, {
        text: this.insteon.localize("common.warn.wake_up"),
      });
    }
    this._showWait = true;
    try {
      await writeProperties(this.hass, this._device!.address);
    } catch (err) {
      showAlertDialog(this, {
        text: this.insteon!.localize("common.error.write"),
        confirmText: this.insteon!.localize("common.close"),
      });
    }
    this._getProperties();
    this._showWait = false;
  }

  private async _getProperties() {
    const propertiesInfo = await fetchInsteonProperties(
      this.hass,
      this._device!.address,
      this._showAdvanced,
    );
    // eslint-disable-next-line no-console
    console.info("Properties: " + propertiesInfo.properties.length);
    this._properties = propertiesInfo.properties;
    this._schema = this._translateSchema(propertiesInfo.schema);
  }

  private _onResetPropertiesClick = async () => {
    await resetProperties(this.hass, this._device!.address);
    this._getProperties();
  };

  private async _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const record = this._properties!.find((rec) => rec.name === id);
    const schema = this._schema![record!.name];

    showInsteonPropertyDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      schema: [schema!],
      record: record!,
      title: this.insteon!.localize("properties.actions.change"),
      callback: async (name, value) => this._handlePropertyChange(name, value),
    });
    history.back();
  }

  private async _handlePropertyChange(name: string, value: any) {
    await changeProperty(this.hass, this._device!.address, name, value);
    this._getProperties();
  }

  private _handleBackTapped = async () => {
    if (this._dirty()) {
      await showConfirmationDialog(this, {
        title: this.insteon!.localize("common.unsaved.title"),
        text: this.insteon!.localize("common.unsaved.message"),
        confirmText: this.insteon!.localize("common.leave"),
        dismissText: this.insteon!.localize("common.stay"),
        destructive: true,
        confirm: this._goBack,
      });
    } else {
      navigate("/insteon/devices");
    }
  };

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._onLoadPropertiesClick();
        break;
      case 1:
        navigate("/config/devices/device/" + this.deviceId);
        break;
      case 2:
        await this._onWritePropertiesClick();
        break;
      case 3:
        await this._onResetPropertiesClick();
        break;
      case 4:
        confirmDeleteDevice(this, this.hass, this.insteon, this._device!);
        break;
      case 5:
        await this._onShowHideAdvancedClicked();
        break;
    }
  }

  private async _onShowHideAdvancedClicked() {
    this._showAdvanced = !this._showAdvanced;
    if (this._showAdvanced) {
      this._showHideAdvanced = "hide";
    } else {
      this._showHideAdvanced = "show";
    }
    this._getProperties();
  }

  private _goBack = async (): Promise<void> => {
    await resetProperties(this.hass, this._device!.address);
    navigate("/insteon/devices");
  };

  private _noDeviceError(): void {
    showAlertDialog(this, {
      text: this.insteon!.localize("common.error.device_not_found"),
    });
    this._goBack();
  }

  private _translateSchema(schema: { [key: string]: HaFormSchema }) {
    const new_schema: { [key: string]: HaFormSchema | HaFormSchema[] } = {
      ...schema,
    };
    Object.entries(new_schema as { [key: string]: HaFormSchema }).forEach(([prop, prop_schema]) => {
      if (!prop_schema.description) {
        prop_schema.description = {};
      }
      prop_schema.description[prop] = this.insteon!.localize("properties.descriptions." + prop);
      if (prop_schema.type === "multi_select") {
        Object.entries(prop_schema.options).forEach(([option, value]) => {
          if (isNaN(+value)) {
            prop_schema.options[option] = this.insteon!.localize(
              "properties.form_options." + value,
            );
          } else {
            prop_schema.options[option] = value;
          }
        });
      }
      if (prop_schema.type === "select") {
        Object.entries(prop_schema.options).forEach(([item, [_key, value]]) => {
          if (isNaN(+value)) {
            prop_schema.options[item][1] = this.insteon!.localize(
              "properties.form_options." + value,
            );
          } else {
            prop_schema.options[item][1] = value;
          }
        });
      }
    });
    return schema;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --app-header-background-color: var(--sidebar-background-color);
          --app-header-text-color: var(--sidebar-text-color);
          --app-header-border-bottom: 1px solid var(--divider-color);
        }

        .container {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          height: 100%;
          margin: 0 auto;
          padding-top: 8px;
          max-width: 1000px;
        }

        insteon-properties-data-table {
          flex: 1 1 auto;
          min-height: 0;
          margin-top: 16px;
          width: 100%;
          display: block;
          --data-table-border-width: 0;
          --data-table-background-color: var(--primary-background-color);
        }

        .actions ha-button {
          margin: 8px;
        }

        :host([narrow]) .container {
          padding-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-properties-page": InsteonDevicePropertiesPage;
  }
}
