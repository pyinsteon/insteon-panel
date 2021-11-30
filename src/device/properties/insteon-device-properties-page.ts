// import "@material/mwc-button";
// import "@polymer/paper-input/paper-textarea";
import { css, CSSResultGroup, html, LitElement, TemplateResult, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant, Route } from "../../../homeassistant-frontend/src/types";
import "../../../homeassistant-frontend/src/components/ha-icon-button";
import "../../../homeassistant-frontend/src/components/ha-service-description";
import "./insteon-properties-data-table";
import {
  Insteon,
  InsteonDevice,
  Property,
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
import { RowClickedEvent } from "../../data-table/insteon-data-table";
import "../../../homeassistant-frontend/src/layouts/hass-tabs-subpage";
import { insteonDeviceTabs } from "../insteon-device-router";
import { navigate } from "../../../homeassistant-frontend/src/common/navigate";

@customElement("insteon-device-properties-page")
class InsteonDevicePropertiesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow?: boolean;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Object }) public route?: Route;

  @property() private deviceId?: string;

  @state() private _device?: InsteonDevice;

  @state() private _properties: Property[] = [];

  @state() private _schema?: { [key: string]: HaFormSchema };

  @state() private _showWait = false;

  protected firstUpdated(changedProps: PropertyValues) {
    // eslint-disable-next-line no-console
    console.info("Device GUID: " + this.deviceId + " in properties");
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
    // eslint-disable-next-line no-console
    console.info("In properties render");
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow!}
        .route=${this.route!}
        .tabs=${insteonDeviceTabs}
        .localizeFunc=${this.insteon.localize}
        .backCallback=${async () => this._handleBackTapped()}
      >
        ${this.narrow ? html` <span slot="header"> ${this._device?.name} </span> ` : ""}
        <div class="container">
          <div slot="header" class="header fullwidth">
            ${this.narrow
              ? ""
              : html`
                  <div>
                    <h1>${this._device?.name}</h1>
                  </div>
                  <div class="header-right">
                    <img
                      src="https://brands.home-assistant.io/insteon/logo.png"
                      referrerpolicy="no-referrer"
                      @load=${this._onImageLoad}
                      @error=${this._onImageError}
                    />
                  </div>
                `}
          </div>
          <div slot="header" class="header fullwidth">
            <div class="header-right">
              <mwc-button @click=${this._onLoadPropertiesClick}>
                ${this.insteon!.localize("common.actions.load")}
              </mwc-button>
              <mwc-button .disabled=${!this._dirty()} @click=${this._onWritePropertiesClick}>
                ${this.insteon!.localize("common.actions.write")}
              </mwc-button>
              <mwc-button .disabled=${!this._dirty()} @click=${this._onResetPropertiesClick}>
                ${this.insteon!.localize("common.actions.reset")}
              </mwc-button>
            </div>
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
    this._showWait = true;
    await writeProperties(this.hass, this._device!.address);
    this._getProperties();
    this._showWait = false;
  }

  private async _getProperties() {
    const propertiesInfo = await fetchInsteonProperties(this.hass, this._device!.address);
    /*
    fetchInsteonProperties(this.hass, this._device!.address).then((propertiesInfo) => {
      this._schema = this._translateSchema(propertiesInfo.schema);
      this._properties = propertiesInfo.properties;
    });
    */
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
    showInsteonPropertyDialog(this, {
      schema: this._schema![record!.name],
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
    Object.entries(schema).forEach(([prop, prop_schema]) => {
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

      insteon-properties-data-table {
        width: 100%;
        height: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) insteon-properties-data-table {
        height: 78vh;
        display: block;
      }
      .table-header {
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        padding: 0 16px;
        display: flex;
        align-items: center;
      }
      .container {
        display: flex;
        flex-wrap: wrap;
        margin: auto;
        max-width: 1000px;
        margin-top: 32px;
        margin-bottom: 32px;
        height: 100px;
      }

      .tab-bar {
        color: black;
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

      .header {
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
      }

      .header-right img {
        height: 30px;
      }

      .header-right {
        display: flex;
      }

      .header-right:first-child {
        width: 100%;
        justify-content: flex-end;
      }

      .header-right > *:not(:first-child) {
        margin-left: 16px;
      }

      :host([narrow]) .container {
        margin-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-properties-page": InsteonDevicePropertiesPage;
  }
}
