import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import { createCloseHeading } from "@ha/components/ha-dialog";
import { haStyleDialog } from "@ha/resources/styles";
import { HomeAssistant } from "@ha/types";
import {
  Insteon,
} from "../data/insteon";
import {
  cancelAddInsteonDevice,
  deviceAddedMessage,
} from "../data/device";
import "@ha/components/ha-form/ha-form";
import { InsteonAddingDeviceDialogParams } from "./show-dialog-adding-device";

@customElement("dialog-insteon-adding-device")
class DialogInsteonAddingDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _title?: string;

  @state() private _opened = false;

  @state() private _devicesAddedText = "";

  @state() private _subscribed?: Promise<() => Promise<void>>;

  private _devicesAdded?: [string];

  private _address = "";

  private _multiple = false;

  private _refreshLinkingTimeoutHandle?: number;

  public async showDialog(
    params: InsteonAddingDeviceDialogParams
  ): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._address = params.address;
    this._multiple = params.multiple;
    this._title = params.title;
    this._opened = true;
    this._subscribe();
    this._devicesAddedText = "";
    this._devicesAdded = undefined;
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
        <div class="instructions">${this._showInstructions()}</div>
        <br />
        <div class="devices">${this._devicesAddedText}</div>
        <div class="buttons">
          <mwc-button @click=${this._checkCancel} slot="primaryAction">
            ${this._buttonText(this._subscribed)}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _showInstructions() {
    if (this.insteon && !this._subscribed)
      return this.insteon.localize("device.add.complete");
    if (this._address) return this._addressText(this._address);
    if (this._multiple) return this.insteon!.localize("device.add.multiple");
    return this.insteon!.localize("device.add.single");
  }

  private _buttonText(active): string {
    if (active) return this.insteon.localize("device.actions.stop");
    return this.hass!.localize("ui.dialogs.generic.ok");
  }

  private _showAddedDevices(): string {
    if (!this._devicesAdded) return "";

    let content = "";
    this._devicesAdded.forEach((addr) => {
      let device_text = this.insteon?.localize("device.add.added");
      device_text = device_text?.replace("--address--", addr);
      content = html`${content}<br />${device_text}`;
    });
    return content;
  }

  private _addressText(address: string): string {
    let add_text = this.insteon.localize("device.add.address");
    add_text = add_text.replace("--address--", address.toUpperCase());
    return add_text;
  }

  private _handleMessage(message: deviceAddedMessage): void {
    if (message.type === "device_added") {
      // eslint-disable-next-line no-console
      console.info("Added device: " + message.address);
      if (!this._devicesAdded) {
        this._devicesAdded = [message.address];
      } else {
        this._devicesAdded.push(message.address);
      }
      this._devicesAddedText = this._showAddedDevices();
    }
    if (message.type === "linking_stopped") {
      this._unsubscribe();
    }
  }

  private _unsubscribe(): void {
    if (this._refreshLinkingTimeoutHandle) {
      clearTimeout(this._refreshLinkingTimeoutHandle);
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "insteon/device/add",
        multiple: this._multiple,
        device_address: this._address,
      }
    );
    this._refreshLinkingTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      (3 * 60 + 15) * 1000
    );
  }

  private _checkCancel(): void {
    if (this._subscribed) {
      cancelAddInsteonDevice(this.hass);
      this._unsubscribe();
    }
    this._close();
  }

  private _close(): void {
    this._opened = false;
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
    "dialog-insteon-adding-device": DialogInsteonAddingDevice;
  }
}
