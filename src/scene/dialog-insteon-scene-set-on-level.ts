import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../homeassistant-frontend/src/components/ha-code-editor";
import { createCloseHeading } from "../../homeassistant-frontend/src/components/ha-dialog";
import { haStyleDialog } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import { Insteon } from "../data/insteon";
import { rampRateSchema } from "../data/device";
import "../../homeassistant-frontend/src/components/ha-slider";
import "../../homeassistant-frontend/src/components/ha-selector/ha-selector-select";
import { InsteonSetOnLevelDialogParams } from "./show-dialog-insteon-scene-set-on-level";
import memoizeOne from "memoize-one";

import type { SelectSelector } from "../../homeassistant-frontend/src/data/selector";

@customElement("dialog-insteon-scene-set-on-level")
class DialogInsteonSetOnLevel extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public insteon?: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  private _title?: string;

  @state() private _callback?: (
    address: string,
    group: number,
    value: number,
    ramp_rate: number
  ) => Promise<void>;

  @state() private _opened = false;

  @state() private _value = 0;

  @state() private _ramp_rate = 0;

  private _address = "";

  private _group = 0;

  public async showDialog(
    params: InsteonSetOnLevelDialogParams
  ): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
    this._value = params.value;
    this._ramp_rate = params.ramp_rate;
    this._address = params.address;
    this._group = params.group;
  }

  private _selectSchema = memoizeOne(
    (options): SelectSelector => ({
      select: {
        options: options.map((option) => ({
          value: option[0],
          label: option[1],
        })),
      },
    })
  );

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
          <ha-slider
            pin
            ignore-bar-touch
            .value=${this._value}
            .min=${0}
            .max=${255}
            .disabled=${false}
            @change=${this._valueChanged}
          ></ha-slider>

          <ha-selector-select
            .hass=${this.hass}
            .value=${"" + this._ramp_rate}
            .label=${this.insteon?.localize("scenes.scene.devices.ramp_rate")}
            .schema=${rampRateSchema}
            .selector=${this._selectSchema(rampRateSchema.options)}
            @value-changed=${this._rampRateChanged}
          ></ha-selector-select>
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

  private async _submit(): Promise<void> {
    // eslint-disable-next-line no-console
    console.info("Should be calling callback");
    this._close();
    await this._callback!(
      this._address,
      this._group,
      this._value,
      this._ramp_rate
    );
  }

  private _close(): void {
    this._opened = false;
  }

  private _valueChanged(ev: CustomEvent) {
    this._value = (ev.target as any).value;
  }

  private _rampRateChanged(ev: CustomEvent) {
    this._ramp_rate = +ev.detail?.value;
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
    "dialog-insteon-scene-set-on-level": DialogInsteonSetOnLevel;
  }
}
