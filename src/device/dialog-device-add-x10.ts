import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import memoizeOne from "memoize-one";
import "@material/mwc-button";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import { haStyleDialog } from "@ha/resources/styles";
import { HomeAssistant } from "@ha/types";
import { Insteon, InsteonX10Device} from "../data/insteon";
import { X10DeviceSchema } from "data/config";
import { addX10Device } from "data/device"
import { HaFormData } from "@ha/components/ha-form"
import "@ha/components/ha-form/ha-form";
import "@ha/components/ha-alert"
import { insteonDeviceAddX10DialogParams } from "./show-dialog-device-add-x10";


@customElement("dialog-device-add-x10")
class DialogInsteonDeviceAddX10 extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _callback?: () => Promise<void>;

  @state() private _error: string | undefined = undefined;

  @state() private _formData?: InsteonX10Device;

  @state() private _opened = false;

  public async showDialog(params: insteonDeviceAddX10DialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    const schema = X10DeviceSchema(this._formData?.platform)
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass!, this._title!)}
      >
        ${this._error ? html`<ha-alert alertType="error">${this._error}</ha-alert>` : ""}
        <div class="form">
          <ha-form
            .data=${this._haFormData()}
            .schema=${schema}
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

  private _haFormData(): HaFormData {
    return {...this._formData}
  }

  private _dismiss(): void {
    this._close();
  }

  private _computeLabel(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) => localize("device.add_x10.fields." + schema.name) || schema.name;
  }

  private async _submit(): Promise<void> {
    const x10_device: InsteonX10Device = {
      ...this._formData!
    }
    if (x10_device.dim_steps == null) {
      x10_device.dim_steps = 0;
    }
    try {
      await addX10Device(this.hass!, x10_device);
      this._close();
      await this._callback!();
    } catch {
        this._error  = this.insteon!.localize("device.add_x10.error.duplicate_device");
    }
  }

  private _close(): void {
    this._opened = false;
    this._error = undefined;
    this._formData = undefined;
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
    if (this._formData?.platform == "light") {
      if (!this._formData.dim_steps) {
        this._formData.dim_steps = 22;
      }
    } else {
      this._formData!.dim_steps = 0;
    }
    if (this._formData?.dim_steps && [0, 1].includes(this._formData!.dim_steps)) {
      this._formData.dim_steps = 1;
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
    "dialog-device-add-x10": DialogInsteonDeviceAddX10;
  }
}
