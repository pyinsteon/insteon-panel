import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "@ha/types";
import type { Insteon, InsteonDevice } from "../data/insteon";

const hex = (value: number): string => "0x" + value.toString(16).padStart(2, "0").toUpperCase();

const statusKind = (status: string): "ok" | "warn" | "bad" => {
  if (status === "loaded") {
    return "ok";
  }
  if (status === "loading" || status === "partial") {
    return "warn";
  }
  return "bad";
};

@customElement("insteon-device-header")
export class InsteonDeviceHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ attribute: false }) public device?: InsteonDevice;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  protected render(): TemplateResult {
    if (this.narrow) {
      return html`
        <div class="bar">
          <span class="bar-name">${this.device?.name}</span>
          <slot></slot>
        </div>
      `;
    }
    return html`
      <div class="identity">
        <h1>${this.device?.name}</h1>
        ${this.device ? this._identity(this.device) : nothing}
      </div>
      <div class="side"><slot></slot></div>
    `;
  }

  private _identity(device: InsteonDevice): TemplateResult {
    const { localize } = this.insteon;
    const model = [device.description, device.model].filter(Boolean).join(" ");
    const details: [string, string][] = [];
    if (
      device.cat !== undefined &&
      device.cat !== null &&
      device.subcat !== undefined &&
      device.subcat !== null
    ) {
      details.push([
        localize("device.overview.fields.category"),
        `${hex(device.cat)} / ${hex(device.subcat)}`,
      ]);
    }
    if (device.engine_version) {
      details.push([
        localize("device.overview.fields.engine_version"),
        device.engine_version.toUpperCase(),
      ]);
    }
    if (device.firmware) {
      details.push([localize("device.overview.fields.firmware"), String(device.firmware)]);
    }
    return html`
      <div class="model">
        ${model ? html`<span>${model}</span> <span class="sep">·</span> ` : nothing}
        <span class="address">${device.address}</span>
      </div>
      <div class="chips">
        <span class="chip ${statusKind(device.aldb_status)}">
          ${localize("device.overview.fields.aldb_status")}:
          ${localize("aldb.status." + device.aldb_status)}
        </span>
        ${device.firmware === 0
          ? html`<span class="chip warn">${localize("device.overview.not_identified")}</span>`
          : nothing}
        ${device.is_battery
          ? html`<span class="chip">${localize("device.overview.battery_device")}</span>`
          : nothing}
      </div>
      ${details.length
        ? html`<dl class="details">
            ${details.map(
              ([label, value]) =>
                html`<dt>${label}</dt>
                  <dd>${value}</dd>`,
            )}
          </dl>`
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        box-sizing: border-box;
        width: 100%;
        padding: 8px;
      }

      :host([narrow]) {
        display: block;
        max-width: none;
        padding: 0;
      }

      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .bar-name {
        padding: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .identity {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
      }

      h1 {
        margin: 0;
        font-size: var(--ha-font-size-2xl, 24px);
        font-weight: var(--ha-font-weight-normal, 400);
        line-height: var(--ha-line-height-condensed, 1.2);
        color: var(--primary-text-color);
      }

      .model {
        font-size: 14px;
        color: var(--secondary-text-color);
      }

      .sep {
        margin: 0 6px;
      }

      .address {
        font-family: var(--ha-font-family-code, monospace);
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .chip {
        border-radius: 999px;
        padding: 3px 12px;
        font-size: 13px;
        line-height: 1.4;
        background-color: var(--secondary-background-color);
        color: var(--secondary-text-color);
        border: 1px solid var(--divider-color);
      }

      .chip.ok {
        background-color: var(--ha-color-fill-success-quiet-resting);
        color: var(--ha-color-on-success-normal);
        border-color: var(--ha-color-border-success-normal);
      }

      .chip.warn {
        background-color: var(--ha-color-fill-warning-quiet-resting);
        color: var(--ha-color-on-warning-normal);
        border-color: var(--ha-color-border-warning-normal);
      }

      .chip.bad {
        background-color: var(--ha-color-fill-danger-quiet-resting);
        color: var(--ha-color-on-danger-normal);
        border-color: var(--ha-color-border-danger-normal);
      }

      .details {
        display: grid;
        grid-template-columns: max-content auto;
        gap: 2px 12px;
        margin: 0;
        font-size: 13px;
      }

      .details dt {
        color: var(--secondary-text-color);
      }

      .details dd {
        margin: 0;
        color: var(--primary-text-color);
      }

      .side {
        flex-shrink: 0;
        margin-inline-end: -8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-header": InsteonDeviceHeader;
  }
}
