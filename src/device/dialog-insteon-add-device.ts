import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../homeassistant-frontend/src/components/ha-code-editor";
import { createCloseHeading } from "../../homeassistant-frontend/src/components/ha-dialog";
import { haStyleDialog } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import { Insteon, addDeviceSchema } from "../data/insteon";
import { check_address } from "../tools/check_address";
import "../../homeassistant-frontend/src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../homeassistant-frontend/src/components/ha-form/types";
import { InsteonAddDeviceDialogParams } from "./show-dialog-insteon-add-device";

@customElement("dialog-insteon-add-device")
class DialogInsteonAddDevice extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _callback?: (address: string, multiple: boolean) => Promise<void>;

  @state() private _errors?: { [key: string]: string };

  @state() private _formData = { multiple: false, address: "" };

  @state() private _opened = false;

  public async showDialog(params: InsteonAddDeviceDialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._callback = params.callback;
    this._title = params.title;
    this._errors = {};
    this._opened = true;
    this._formData = { multiple: false, address: "" };
  }

  private _schema(multiple: boolean): HaFormSchema[] {
    return addDeviceSchema(multiple);
  }

  protected render(): TemplateResult {
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
            .schema=${this._schema(this._formData.multiple)}
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
    return (schema) => localize("device.fields." + schema.name) || schema.name;
  }

  private async _submit(): Promise<void> {
    if (this._checkData()) {
      // eslint-disable-next-line no-console
      console.info("Should be calling callback");
      this._close();
      const address = this._formData.address == "" ? undefined : this._formData.address;
      await this._callback!(address, this._formData.multiple);
    } else {
      this._errors!.base = this.insteon!.localize("common.error.base");
    }
  }

  private _close(): void {
    this._opened = false;
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
  }

  private _checkData(): boolean {
    if (this._formData.address == "" || check_address(this._formData.address)) return true;

    this._errors = {};
    this._errors.address = this.insteon!.localize("common.error.address");
    return false;
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
    "dialog-insteon-add-device": DialogInsteonAddDevice;
  }
}
