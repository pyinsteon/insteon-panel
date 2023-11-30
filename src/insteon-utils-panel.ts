import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../homeassistant-frontend/src/layouts/hass-tabs-subpage";
import { haStyle } from "../homeassistant-frontend/src/resources/styles";
import { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import { Insteon } from "./data/insteon";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import { HASSDomEvent } from "../homeassistant-frontend/src/common/dom/fire_event";
import { insteonMainTabs } from "./insteon-router";
import "../homeassistant-frontend/src/components/ha-fab";
import "./insteon-utils-card";
import { mdiWrench, mdiCog, mdiDevices } from "@mdi/js";
import "@ha/components/ha-svg-icon";
import {
  fetchInsteonConfig,
  fetchModemConfigSchema,
  InsteonModemConfig,
  InsteonX10Device,
  InsteonDeviceOverride,
  InsteonPLMConfig,
  updateModemConfig,
} from "./data/config";
import { showConfigModemDialog } from "./config/show-dialog-config-modem"
import { showAlertDialog } from "@ha/dialogs/generic/show-dialog-box";
import { HaFormDataContainer } from "@ha/components/ha-form/types";

function _modemIsPlm(config: any): config is InsteonPLMConfig {
  return "device" in config;
}

@customElement("insteon-utils-panel")
export class InsteonUtilsPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: String }) public action = "";

  @state() private _modem_config?: InsteonModemConfig;

  @state() private _x10_devices?: InsteonX10Device[];

  @state() private _device_overrides?: InsteonDeviceOverride[];

  @state() private _modem_type_text?: string;

  public async firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    if (!this.hass || !this.insteon) {
      return;
    }
    fetchInsteonConfig(this.hass).then((config) => {
      this._modem_config = config.modem_config;
      this._x10_devices = config.x10_config;
      this._device_overrides = config.override_config;
      if (_modemIsPlm(this._modem_config)) {
        this._modem_type_text = this.insteon.localize("utils.config_modem.modem_type.plm")
      } else {
        if (this._modem_config.hub_version == 2) {
          this._modem_type_text = this.insteon.localize("utils.config_modem.modem_type.hubv2")
        } else {
          this._modem_type_text = this.insteon.localize("utils.config_modem.modem_type.hubv1")
        }
      }
    });
  }

  protected render(): TemplateResult | void {

    if (!this.hass || !this.insteon) {
      return html``;
    }

    const x10_count = this._x10_devices?.length
    const x10_action = x10_count
      ? this.insteon.localize("utils.config_x10_devices.title") + ": " + x10_count
      : undefined

    const override_count = this._device_overrides?.length
    const override_action = override_count
      ? this.insteon.localize("utils.config_device_overrides.title") + ": " + override_count
      : undefined

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${insteonMainTabs}
        .route=${this.route}
        id="group"
        clickable
        .localizeFunc=${this.insteon.localize}
        .mainPage=${true}
        .hasFab=${true}
      >
        <div class="container">
          <insteon-utils-card
            .hass=${this.hass}
            .title=${this.insteon.localize("utils.config_modem.caption")}
            .action_text=${this._modem_type_text}
            @click=${this._showModemConfigDialog}
          >
            <ha-svg-icon slot="icon" .path=${mdiWrench}></ha-svg-icon>
          </insteon-utils-card>
          <insteon-utils-card
            .hass=${this.hass}
            .title=${this.insteon.localize("utils.config_device_overrides.caption")}
            .action_url=${"/insteon/devices"}
            .action_text=${override_action}
          >
            <ha-svg-icon slot="icon" .path=${mdiCog}></ha-svg-icon>
          </insteon-utils-card>
          <insteon-utils-card
            .hass=${this.hass}
            .title=${this.insteon.localize("utils.config_x10_devices.caption")}
            .action_url=${"/insteon/x10_devices"}
            .action_text=${x10_action}
          >
            <ha-svg-icon slot="icon" .path=${mdiDevices}></ha-svg-icon>
          </insteon-utils-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private async _showModemConfigDialog(error: string | undefined = undefined) {
    const schema = await fetchModemConfigSchema(this.hass)
    showConfigModemDialog(this, {
      hass: this.hass,
      insteon: this.insteon,
      title: this.insteon.localize("utils.config_modem.caption"),
      schema: schema,
      data: this._modem_config,
      errors: error,
      callback: this._handleModemConfigChange,
    });
  }

  private async _handleModemConfigChange(): Promise<void> {
    await showAlertDialog(this, {
      title: "Success",
      text: "The modem connection has been reconfigured."
    });
    history.back();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host([narrow]) hass-tabs-subpage {
          --main-title-margin: 0;
        }
        ha-button-menu {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
        }
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          grid-gap: 8px 8px;
          padding: 8px 16px 16px;
        }
        .container:last-of-type {
          margin-bottom: 64px;
        }
        .empty-message {
          margin: auto;
          text-align: center;
          grid-column-start: 1;
          grid-column-end: -1;
        }
        .empty-message h1 {
          margin-bottom: 0;
        }
        search-input {
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
          --text-field-overflow: visible;
        }
        search-input.header {
          display: block;
          color: var(--secondary-text-color);
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
          --mdc-ripple-color: transparant;
        }
        .search {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          align-items: center;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .search search-input {
          display: block;
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
        }
        .filters {
          --mdc-text-field-fill-color: var(--input-fill-color);
          --mdc-text-field-idle-line-color: var(--input-idle-line-color);
          --mdc-shape-small: 4px;
          --text-field-overflow: initial;
          display: flex;
          justify-content: flex-end;
          color: var(--primary-text-color);
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding-top: 2px;
          padding-bottom: 2px;
          padding-right: 2px;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: 2px;
          font-size: 14px;
          width: max-content;
          cursor: initial;
          direction: var(--direction);
        }
        .active-filters mwc-button {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
        }
        .active-filters::before {
          background-color: var(--primary-color);
          opacity: 0.12;
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          content: "";
        }
        .badge {
          min-width: 20px;
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: 400;
          background-color: var(--primary-color);
          line-height: 20px;
          text-align: center;
          padding: 0px 4px;
          color: var(--text-primary-color);
          position: absolute;
          right: 0px;
          top: 4px;
          font-size: 0.65em;
        }
        .menu-badge-container {
          position: relative;
        }
        h1 {
          margin: 8px 0 0 16px;
        }
        ha-button-menu {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-utils-panel": InsteonUtilsPanel;
  }
}
