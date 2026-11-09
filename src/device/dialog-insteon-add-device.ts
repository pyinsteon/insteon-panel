import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import "@ha/components/ha-button";
import { haStyleDialog } from "@ha/resources/styles";
import type { HomeAssistant } from "@ha/types";
import type { Insteon } from "../data/insteon";
import { addDeviceSchema } from "../data/device";
import { checkAddress } from "../tools/address-utils";
import "@ha/components/ha-form/ha-form";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import type { InsteonAddDeviceDialogParams } from "./show-dialog-insteon-add-device";

@customElement("dialog-insteon-add-device")
class DialogInsteonAddDevice extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _callback?: (
    device_address: string | undefined,
    multiple: boolean,
    add_x10: boolean,
  ) => Promise<void>;

  @state() private _errors?: { [key: string]: string };

  @state() private _formData = { multiple: false, add_x10: false, device_address: "" };

  @state() private _opened = false;

  public async showDialog(params: InsteonAddDeviceDialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._callback = params.callback;
    this._title = params.title;
    this._errors = {};
    this._opened = true;
    this._formData = { multiple: false, add_x10: false, device_address: "" };
  }

  private _schema(multiple: boolean, add_x10: boolean): HaFormSchema[] {
    return addDeviceSchema(multiple, add_x10);
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
            .schema=${this._schema(this._formData.multiple, this._formData.add_x10)}
            .error=${this._errors}
            @value-changed=${this._valueChanged}
            .computeLabel=${this._computeLabel(this.insteon?.localize)}
          ></ha-form>
        </div>
        <ha-button @click=${this._dismiss} slot="primaryAction" appearance="plain">
          ${this.insteon!.localize("common.cancel")}
        </ha-button>
        <ha-button @click=${this._submit} slot="primaryAction">
          ${this.insteon!.localize("common.ok")}
        </ha-button>
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
      const device_address =
        this._formData.device_address === "" ? undefined : this._formData.device_address;
      await this._callback!(device_address, this._formData.multiple, this._formData.add_x10);
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
    if (this._formData.device_address === "" || checkAddress(this._formData.device_address))
      return true;

    this._errors = {};
    this._errors.device_address = this.insteon!.localize("common.error.address");
    return false;
  }

  static get styles(): CSSResultGroup[] {
    return [haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-insteon-add-device": DialogInsteonAddDevice;
  }
}
