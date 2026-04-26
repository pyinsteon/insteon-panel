import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import { haStyleDialog } from "@ha/resources/styles";
import type { HomeAssistant } from "@ha/types";
import type { Insteon } from "../data/insteon";
import { updateModemConfig, addPlmManualConfig, modemIsPlm } from "data/config";
import "@ha/components/ha-form/ha-form";
import "@ha/components/ha-button";
import type { HaFormSchema, HaFormSelectSchema } from "@ha/components/ha-form/types";
import type { insteonConfigModemDialogParams } from "./show-dialog-config-modem";
import "@ha/components/ha-alert";
import "@ha/components/ha-spinner";

@customElement("dialog-config-modem")
class DialogInsteonConfigModem extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _schema?: HaFormSchema[];

  @state() private _callback?: (success: boolean) => Promise<void>;

  @state() private _error: string | undefined = undefined;

  @state() private _formData = {};

  @state() private _opened = false;

  @state() private _hasChanged = false;

  @state() private _saving = false;

  private _initConfig = {};

  public async showDialog(params: insteonConfigModemDialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._schema = params.schema;
    this._formData = params.data;
    if (modemIsPlm(this._formData)) {
      const ports = this._schema.find((o) => o.name === "device") as HaFormSelectSchema;
      if (ports && ports.options && ports.options.length === 0) {
        this._formData.manual_config = true;
        this._formData.plm_manual_config = this._formData.device;
      } else {
        this._formData.manual_config = false;
        this._formData.plm_manual_config = undefined;
      }
    }
    this._initConfig = params.data;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
    this._error = undefined;
    this._saving = false;
    this._hasChanged = false;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    let form_schema: HaFormSchema[] = [...this._schema!];
    if (modemIsPlm(this._formData)) {
      form_schema = addPlmManualConfig(this._formData.manual_config!, this._schema!);
    }
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass!, this._title!)}
      >
        ${this._error ? html`<ha-alert alertType="error">${this._error}</ha-alert>` : ""}
        <div class="form">
          <ha-form
            .data=${this._formData}
            .schema=${form_schema}
            @value-changed=${this._valueChanged}
            .computeLabel=${this._computeLabel(this.insteon?.localize)}
          ></ha-form>
        </div>
        ${this._saving
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-spinner active></ha-spinner>
              </div>
            `
          : html`
          <ha-button @click=${this._submit} .disabled=${!this._hasChanged} slot="primaryAction">
            ${this.insteon!.localize("common.ok")}
          </ha-button>
      </ha-dialog>`}
      </ha-dialog>
    `;
  }

  private _computeLabel(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) => localize("utils.config_modem.fields." + schema.name) || schema.name;
  }

  private async _submit(): Promise<void> {
    try {
      this._saving = true;
      let config = { ...this._formData };
      if (modemIsPlm(config)) {
        if (config.manual_config) {
          config = { device: config.plm_manual_config! };
        } else {
          config = { device: config.device };
        }
      }
      await updateModemConfig(this.hass!, config);
      if (this._callback) {
        this._callback(true);
      }
      this._opened = false;
      this._formData = [];
    } catch {
      this._error = this.insteon!.localize("common.error.connect_error");
    } finally {
      this._saving = false;
    }
  }

  private _close(): void {
    this._opened = false;
    this._formData = {};
    this._initConfig = {};
    this._error = undefined;
    this._saving = false;
    this._hasChanged = false;
    history.back();
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
    this._hasChanged = false;

    for (const key in this._formData) {
      if (this._formData[key] !== this._initConfig[key]) {
        this._hasChanged = true;
        break;
      }
    }
  }

  static get styles(): CSSResultGroup[] {
    return [
      haStyleDialog,
      css`
        table {
          width: 100%;
        }
        ha-combo-box {
          width: 20px;
        }
        .title {
          width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-config-modem": DialogInsteonConfigModem;
  }
}
