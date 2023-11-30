import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../homeassistant-frontend/src/components/ha-code-editor";
import { createCloseHeading } from "../../homeassistant-frontend/src/components/ha-dialog";
import { haStyleDialog } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import { Insteon } from "../data/insteon";
import { addX10Device } from "data/config";
import "../../homeassistant-frontend/src/components/ha-form/ha-form";
import type { HaFormSchema, HaFormDataContainer } from "../../homeassistant-frontend/src/components/ha-form/types";
import { insteonConfigAddX10DialogParams } from "./show-dialog-config-add-x10";

@customElement("dialog-config-add-x10")
class DialogInsteonConfigAddX10 extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _schema?: HaFormSchema[];

  @state() private _callback?: (formData: HaFormDataContainer) => Promise<void>;

  @state() private _errors: { [key: string]: string } = { base: "" };

  @state() private _formData = {};

  @state() private _opened = false;

  public async showDialog(params: insteonConfigAddX10DialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._schema = params.schema;
    this._formData = params.data;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
  }

  protected render(): TemplateResult {
    console.info("Rendering config-add-x10 dialog")
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass!, this._title!)}
      >
        <div class="form">
          <ha-form
            .data=${this._formData}
            .schema=${this._schema}
            .error=${this._errors}
            @value-changed=${this._valueChanged}
            .computeLabel=${this._computeLabel(this.insteon?.localize)}
          ></ha-form>
        </div>
        <div class="buttons">
          <mwc-button @click=${this._dismiss} slot="secondaryAction">
            ${this.hass!.localize("ui.dialogs.generic.cancel")}
          </mwc-button>
          <mwc-button @click=${this._submit} slot="primaryAction">
            ${this.hass!.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    this._close();
  }

  private _computeLabel(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) => localize("utils.config_x10_devices.fields." + schema.name) || schema.name;
  }

  private async _submit(): Promise<void> {
    const result = await addX10Device(this.hass!, this._formData);
    if (result.status == "success") {
      this._close();
      await this._callback!(this._formData);
      return
    }
    if (result.status == "update_failed") {
      this._errors.base = this.insteon!.localize("common.error.update_failed");
    } else {
      this._errors.base = this.insteon!.localize("utils.config_x10_devices.error.duplicate_device");
    }

  }

  private _close(): void {
    this._opened = false;
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
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
    "dialog-config-add-x10": DialogInsteonConfigAddX10;
  }
}
