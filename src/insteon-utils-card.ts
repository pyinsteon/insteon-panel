import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/mwc-ripple";
import type { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import "@ha/components/ha-card";
import "@ha/components/ha-button";
import "@ha/components/ha-svg-icon";
import "@ha/components/ha-icon-next";
import { haStyle } from "@ha/resources/styles";
import type { HomeAssistant } from "@ha/types";

@customElement("insteon-utils-card")
export class InsteonUtilsCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public title!: string;

  @property({ attribute: false }) public action_text?: string;

  @property({ attribute: false }) public icon!: string;

  @property({ attribute: false }) public action_url?: string;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="ripple-anchor"
        @focus=${this.handleRippleFocus}
        @blur=${this.handleRippleBlur}
        @mouseenter=${this.handleRippleMouseEnter}
        @mouseleave=${this.handleRippleMouseLeave}
        @mousedown=${this.handleRippleActivate}
        @mouseup=${this.handleRippleDeactivate}
        @touchstart=${this.handleRippleActivate}
        @touchend=${this.handleRippleDeactivate}
        @touchcancel=${this.handleRippleDeactivate}
        >
        ${this.action_url
        ? html`<a href=${this.action_url}>
            ${this._generateCard()}
          </a>`
        : this._generateCard()}
      </div>
    `;
  }

  private _generateCard() {
    return html`
    <ha-card outlined>
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
        <div class="header">
          <slot name="icon"></slot>
          <div class="info">${this.title}</div>
          <ha-icon-next
            class="header-button"
          ></ha-icon-next>
        </div>

        ${this.action_text
        ? html`
        <div class="card-actions">
            <ha-button>
              ${this.action_text}
            </ha-button>
        </div>`
        : ""}
    </ha-card>
    `
  }

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  protected handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  protected handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          overflow: hidden;
          --state-color: var(--divider-color, #e0e0e0);
          --ha-card-border-color: var(--state-color);
          --state-message-color: var(--state-color);
        }
        .header {
          display: flex;
          align-items: center;
          position: relative;
          padding-top: 16px;
          padding-bottom: 16px;
          padding-inline-start: 16px;
          padding-inline-end: 8px;
          direction: var(--direction);
          box-sizing: border-box;
          min-width: 0;
        }
        .header .info {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          align-self: center;
          min-width: 0;
          padding-left: 10px;
        }
        .header .icon {
          padding-left: 0px;
          padding-right: 0px;
        }
        ha-icon-next {
          color: var(--secondary-text-color);
        }
        .ripple-anchor {
          height: 100%;
          flex-grow: 1;
          position: relative;
        }
        .card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-left: 10px;
        }
        :host(.highlight) ha-card {
          --state-color: var(--primary-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .content {
          flex: 1;
          --mdc-list-side-padding-right: 20px;
          --mdc-list-side-padding-left: 24px;
          --mdc-list-item-graphic-margin: 24px;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-utils-card": InsteonUtilsCard;
  }
}
