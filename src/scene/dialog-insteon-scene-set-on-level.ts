import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@ha/components/ha-code-editor";
import "@ha/components/ha-button";
import { createCloseHeading } from "@ha/components/ha-dialog";
import { haStyleDialog } from "@ha/resources/styles";
import type { HomeAssistant } from "@ha/types";
import type { Insteon } from "../data/insteon";
import { rampRateSchema } from "../data/device";
import "@ha/components/ha-slider";
import "@ha/components/ha-selector/ha-selector-select";
import type { InsteonSetOnLevelDialogParams } from "./show-dialog-insteon-scene-set-on-level";
import memoizeOne from "memoize-one";

import type { SelectSelector } from "@ha/data/selector";

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
    ramp_rate: number,
  ) => Promise<void>;

  @state() private _opened = false;

  @state() private _value = 0;

  @state() private _ramp_rate = 0;

  private _address = "";

  private _group = 0;

  public async showDialog(params: InsteonSetOnLevelDialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._callback = params.callback;
    this._title = params.title;
    this._opened = true;
    this._value = this._convertToSliderValue(params.value);
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
    }),
  );

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }

    const formatter = new Intl.NumberFormat("en-US", { style: "percent" });
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
            .max=${1}
            .step=${0.01}
            .disabled=${false}
            .label=${this.insteon?.localize("scenes.scene.devices.on_level")}
            .valueFormatter=${formatter.format}
            @change=${this._valueChanged}
          ></ha-slider>
          <br />
          <ha-selector-select
            .hass=${this.hass}
            .value=${"" + this._ramp_rate}
            .label=${this.insteon?.localize("scenes.scene.devices.ramp_rate")}
            .schema=${rampRateSchema}
            .selector=${this._selectSchema(rampRateSchema.options)}
            @value-changed=${this._rampRateChanged}
          ></ha-selector-select>
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

  private async _submit(): Promise<void> {
    // eslint-disable-next-line no-console
    console.info("Should be calling callback");
    this._close();
    await this._callback!(
      this._address,
      this._group,
      this._convertFromSliderValue(this._value),
      this._ramp_rate,
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

  private _convertToSliderValue(value: number): number {
    const converted = value / 255;
    return Number.parseFloat(converted.toFixed(2));
  }

  private _convertFromSliderValue(value: number): number {
    return Math.round(value * 255);
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
