import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import "@ha/components/ha-alert"
import { haStyleDialog } from "@ha/resources/styles";
import { HomeAssistant } from "@ha/types";
import { Insteon } from "../data/insteon";
import "@ha/components/ha-form/ha-form";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import { checkAddress } from "../tools/address-utils"
import { showConfirmationDialog } from "@ha/dialogs/generic/show-dialog-box";
import { removeInsteonDevice } from "../data/device"
import { insteonDeleteDeviceDialogParams } from "./show-dialog-delete-device"

const AddressSchema: HaFormSchema[] = [
  {
    name: "address",
    type: "string",
    required: true
  }
]

@customElement("dialog-delete-device")
class DialogDeleteDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _callback?: (address: string) => Promise<void>;

  @state() private _formData = { address: undefined };

  @state() private _error = "";

  @state() private _opened = false;

  public async showDialog(params: insteonDeleteDeviceDialogParams): Promise<void> {
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
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass, this._title!)}
      >
        <div class="form">
          ${this._error ? html`<ha-alert>${this._error}</ha-alert>`: ""}
          <ha-form
            .data=${this._formData}
            .schema=${AddressSchema}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div class="buttons">
          <mwc-button @click=${this._dismiss} slot="secondaryAction">
            ${this.hass.localize("ui.dialogs.generic.cancel")}
          </mwc-button>
          <mwc-button @click=${this._submit} slot="primaryAction">
            ${this.hass.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    this._close();
  }

  private async _submit(): Promise<void> {
    if (!checkAddress(this._formData.address!)) {
      this._error = this.insteon.localize("common.error.address")
      return;
    }
    const address = this._formData.address!
    this._opened = false;
    await this._confirmDeleteScope(address)
    if (this._callback) {
      this._callback(address);
    }
  }

  private async _confirmDeleteScope(address: string) {
    const confirm = await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.delete"),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      warning: true,
    });
    if (!confirm) {
      return;
    }
    const remove_all_refs = await showConfirmationDialog(this, {
      title: this.insteon.localize("device.remove_all_refs.title"),
      text: html`
        ${this.insteon.localize("device.remove_all_refs.description")}<br><br>
        ${this.insteon.localize("device.remove_all_refs.confirm_description")}<br>
        ${this.insteon.localize("device.remove_all_refs.dismiss_description")}`,
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      warning: true,
      destructive: true,
    });
    await removeInsteonDevice(this.hass, address, remove_all_refs);
  }

  private _close(): void {
    this._formData = { address: undefined };
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
    "dialog-delete-device": DialogDeleteDevice;
  }
}
