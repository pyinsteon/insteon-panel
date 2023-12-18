import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import { haStyleDialog } from "@ha/resources/styles";
import { HomeAssistant } from "@ha/types";
import { Insteon } from "../data/insteon";
import {
  addDeviceOverride,
  DeviceOverrideSchema,
  InsteonDeviceOverride,
} from "data/config";
import "@ha/components/ha-form/ha-form";
import "@ha/components/ha-button";
import { AddDeviceOverrideDialogParams } from "./show-dialog-add-device-override";
import "@ha/components/ha-alert";
import "@ha/components/ha-circular-progress";
import { checkAddress, checkHexNumber } from "../tools/address-utils";

@customElement("dialog-add-device-override")
class DialogAddDeviceOverride extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _callback?: (success: boolean) => Promise<void>;

  @state() private _error?: string;

  @state() private _formData?: InsteonDeviceOverride;

  @state() private _saving = false;

  @state() private _opened = false;

  public async showDialog(
    params: AddDeviceOverrideDialogParams,
  ): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._formData = undefined;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
    this._error = undefined;
    this._saving = false;
  }

  protected render(): TemplateResult {
    console.info("Rendering config-modem dialog");
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass!, String(this._title))}
      >
        ${this._error
          ? html`<ha-alert alertType="error">${this._error}</ha-alert>`
          : ""}
        <div class="form">
          <ha-form
            .data=${this._formData}
            .schema=${DeviceOverrideSchema}
            @value-changed=${this._valueChanged}
            .computeLabel=${this._computeLabel(this.insteon?.localize)}
          ></ha-form>
        </div>
        ${this._saving
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : html`
        <div class="buttons">
          <mwc-button @click=${this._submit} slot="primaryAction">
            ${this.hass!.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>`}
      </ha-dialog>
    `;
  }

  private _computeLabel(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize("utils.config_device_overrides.fields." + schema.name) ||
      schema.name;
  }

  private async _submit(): Promise<void> {
    try {
      this._saving = true;
      if (!(this._formData?.address && this._formData.cat && this._formData.subcat)) {
        this._error = this.insteon?.localize("common.error.")
      }
      let override = {
        address: String(this._formData?.address),
        cat: String(this._formData?.cat),
        subcat: String(this._formData?.subcat),
      };
      if (this._checkData(override)) {
        await addDeviceOverride(this.hass!, override);
        if (this._callback) {
          this._callback(true);
        }
        this._opened = false;
      }
    } catch {
      this._error = this.insteon!.localize("common.error.connect_error");
    } finally {
      this._saving = false;
    }
  }

  private _checkData(config: InsteonDeviceOverride) {
    if (!checkAddress(config.address)) {
      this._error = this.insteon?.localize(
        "utils.config_device_overrides.errors.invalid_address",
      );
      return false;
    }
    if (!checkHexNumber(String(config.cat))) {
      this._error = this.insteon?.localize(
        "utils.config_device_overrides.errors.invalid_cat",
      );
      return false;
    }
    if (!checkHexNumber(String(config.subcat))) {
      this._error = this.insteon?.localize(
        "utils.config_device_overrides.errors.invalid_subcat",
      );
      return false;
    }
    return true;
  }

  private _close(): void {
    this._opened = false;
    this._formData = undefined;
    this._error = undefined;
    this._saving = false;
    history.back();
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
    "dialog-add-device-override": DialogAddDeviceOverride;
  }
}
