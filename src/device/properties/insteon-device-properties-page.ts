import { mdiDotsVertical } from "@mdi/js";
import type { ActionDetail } from "@material/mwc-list";
import { css, CSSResultGroup, html, LitElement, TemplateResult, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant, Route } from "../../../homeassistant-frontend/src/types";
import "../../../homeassistant-frontend/src/components/ha-icon-button";
import "../../../homeassistant-frontend/src/components/ha-service-description";
import "./insteon-properties-data-table";
import {
  Insteon,
  InsteonDevice,
  InsteonProperty,
  fetchInsteonDevice,
  fetchInsteonProperties,
  changeProperty,
  writeProperties,
  loadProperties,
  resetProperties,
} from "../../data/insteon";
import { HASSDomEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { showInsteonPropertyDialog } from "./show-dialog-insteon-property";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import type { HaFormSchema } from "../../../homeassistant-frontend/src/components/ha-form/types";
import { RowClickedEvent } from "../../../homeassistant-frontend/src/components/data-table/ha-data-table";
import "../../../homeassistant-frontend/src/layouts/hass-tabs-subpage";
import { insteonDeviceTabs } from "../insteon-device-router";
import { navigate } from "../../../homeassistant-frontend/src/common/navigate";
import "../../../homeassistant-frontend/src/components/ha-button-menu";

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

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.deviceId && this.hass) {
      fetchInsteonDevice(this.hass, this.deviceId).then(
        (device) => {
          this._device = device;
          this._getProperties();
        },
        () => {
          this._noDeviceError();
        }
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
        .backCallback=${async () => this._handleBackTapped()}
      >
        ${
          this.narrow
            ? html`
                <!-- <span slot="header"> -->
                <div slot="header" class="header fullwidth">
                  <div slot="header" class="narrow-header-left">${this._device?.name}</div>
                  <div slot="header" class="narrow-header-right">
                    <ha-button-menu
                      corner="BOTTOM_START"
                      @action=${this._handleMenuAction}
                      activatable
                    >
                      <ha-icon-button
                        slot="trigger"
                        .label=${this.hass.localize("ui.common.menu")}
                        .path=${mdiDotsVertical}
                      ></ha-icon-button>

                      <mwc-list-item>
                        ${this.insteon!.localize("properties.actions." + this._showHideAdvanced)}
                      </mwc-list-item>
                      <mwc-list-item>
                        ${this.insteon!.localize("common.actions.load")}
                      </mwc-list-item>
                      <mwc-list-item .disabled=${!this._dirty()}>
                        ${this.insteon!.localize("common.actions.write")}
                      </mwc-list-item>
                      <mwc-list-item .disabled=${!this._dirty()}>
                        ${this.insteon!.localize("common.actions.reset")}
                      </mwc-list-item>
                    </ha-button-menu>
                  </div>
                </div>
                <!-- </span> -->
              `
            : ""
        }
        <div class="container">
          ${
            !this.narrow
              ? html`
                  <div class="page-header fullwidth">
                    <div class="device-name">
                      <h1>${this._device?.name}</h1>
                    </div>
                    <div class="logo header-right">
                      <img
                        src="https://brands.home-assistant.io/insteon/logo.png"
                        referrerpolicy="no-referrer"
                        @load=${this._onImageLoad}
                        @error=${this._onImageError}
                      />
                    </div>
                  </div>
                  <div class="page-header fullwidth">
                    <div class="header-right">
                      <div slot="header" class="actions header-right">
                        <mwc-button @click=${this._onLoadPropertiesClick}>
                          ${this.insteon!.localize("common.actions.load")}
                        </mwc-button>
                        <mwc-button
                          .disabled=${!this._dirty()}
                          @click=${this._onWritePropertiesClick}
                        >
                          ${this.insteon!.localize("common.actions.write")}
                        </mwc-button>
                        <mwc-button
                          .disabled=${!this._dirty()}
                          @click=${this._onResetPropertiesClick}
                        >
                          ${this.insteon!.localize("common.actions.reset")}
                        </mwc-button>
                        <ha-button-menu
                          corner="BOTTOM_START"
                          @action=${this._handleMenuAction}
                          activatable
                        >
                          <ha-icon-button
                            slot="trigger"
                            .label=${this.hass.localize("ui.common.menu")}
                            .path=${mdiDotsVertical}
                          ></ha-icon-button>

                          <mwc-list-item>
                            ${this.insteon!.localize(
                              "properties.actions." + this._showHideAdvanced
                            )}
                          </mwc-list-item>
                        </ha-button-menu>
                      </div>
                    </div>
                  </div>
                `
              : ""
          }
          </div>
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

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _onLoadPropertiesClick() {
    await showConfirmationDialog(this, {
      text: this.insteon!.localize("common.warn.load"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
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
        confirmText: this.hass!.localize("ui.common.ok"),
      });
    }
    this._showWait = false;
  }

  private async _onWritePropertiesClick() {
    await showConfirmationDialog(this, {
      text: this.insteon!.localize("common.warn.write"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
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
        confirmText: this.hass!.localize("ui.common.ok"),
      });
    }
    this._getProperties();
    this._showWait = false;
  }

  private async _getProperties() {
    const propertiesInfo = await fetchInsteonProperties(
      this.hass,
      this._device!.address,
      this._showAdvanced
    );
    // eslint-disable-next-line no-console
    console.info("Properties: " + propertiesInfo.properties.length);
    this._properties = propertiesInfo.properties;
    this._schema = this._translateSchema(propertiesInfo.schema);
  }

  private async _onResetPropertiesClick() {
    resetProperties(this.hass, this._device!.address);
    this._getProperties();
  }

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
    changeProperty(this.hass, this._device!.address, name, value);
    this._getProperties();
  }

  private async _handleBackTapped(): Promise<void> {
    if (this._dirty()) {
      await showConfirmationDialog(this, {
        text: this.hass!.localize("ui.panel.config.common.editor.confirm_unsaved"),
        confirmText: this.hass!.localize("ui.common.yes"),
        dismissText: this.hass!.localize("ui.common.no"),
        confirm: () => this._goBack(),
      });
    } else {
      navigate("/insteon/devices");
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._onShowHideAdvancedClicked();
        break;
      case 1:
        await this._onLoadPropertiesClick();
        break;
      case 2:
        await this._onWritePropertiesClick();
        break;
      case 3:
        await this._onResetPropertiesClick();
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

  private _goBack(): void {
    resetProperties(this.hass, this._device!.address);
    navigate("/insteon/devices");
  }

  private _noDeviceError(): void {
    showAlertDialog(this, {
      text: this.insteon!.localize("common.error.device_not_found"),
    });
    this._goBack();
  }

  private _translateSchema(schema: { [key: string]: HaFormSchema }) {
    const new_schema: { [key: string]: HaFormSchema | HaFormSchema[] } = { ...schema };
    Object.entries(new_schema as { [key: string]: HaFormSchema }).forEach(([prop, prop_schema]) => {
      if (!prop_schema.description) {
        prop_schema.description = {};
      }
      prop_schema.description[prop] = this.insteon!.localize("properties.descriptions." + prop);
      if (prop_schema.type === "multi_select") {
        Object.entries(prop_schema.options).forEach(([option, value]) => {
          if (isNaN(+value)) {
            prop_schema.options[option] = this.insteon!.localize(
              "properties.form_options." + value
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
              "properties.form_options." + value
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
    return css`
      :host {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }

      :host([narrow]) {
        --properties-table-height: 86vh;
      }

      :host(:not([narrow])) {
        --properties-table-height: 80vh;
      }

      .header {
        display: flex;
        justify-content: space-between;
      }

      .container {
        display: flex;
        flex-wrap: wrap;
        margin: 0px;
      }

      insteon-properties-data-table {
        width: 100%;
        height: var(--properties-table-height);
        display: block;
        --data-table-border-width: 0;
      }

      h1 {
        margin: 0;
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        opacity: var(--dark-primary-opacity);
      }

      .page-header {
        padding: 8px;
        margin-left: 32px;
        margin-right: 32px;
        display: flex;
        justify-content: space-between;
      }

      .fullwidth {
        padding: 8px;
        box-sizing: border-box;
        width: 100%;
        flex-grow: 1;
      }

      .header-right {
        align-self: center;
        display: flex;
      }

      .header-right img {
        height: 30px;
      }

      .header-right:first-child {
        width: 100%;
        justify-content: flex-end;
      }

      .actions mwc-button {
        margin: 8px;
      }

      :host([narrow]) .container {
        margin-top: 0;
      }

      .narrow-header-left {
        padding: 8px;
        width: 90%;
      }
      .narrow-header-right {
        align-self: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-properties-page": InsteonDevicePropertiesPage;
  }
}
