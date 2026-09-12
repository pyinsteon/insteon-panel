import type { CSSResultGroup, SVGTemplateResult, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "@ha/common/dom/fire_event";
import type { PlateLayout } from "./plate-layout";
import { plateGroups, plateLayout } from "./plate-layout";
import { nextGroup } from "./roving";

declare global {
  interface HASSDomEvents {
    "insteon-button-selected": { group: number };
  }
}

const led = (cx: number, cy: number, r: number, cls = ""): SVGTemplateResult =>
  svg`<circle class="led ${cls}" cx=${cx} cy=${cy} r=${r}></circle>`;

const tab = (x: number, y: number, w: number, h: number, cls = ""): SVGTemplateResult =>
  svg`<rect class="tab ${cls}" x=${x} y=${y} width=${w} height=${h} rx=${h / 2}></rect>`;

const print = (x: number, y: number, text: string, size: number, cls = ""): SVGTemplateResult =>
  svg`<text class="print ${cls}" x=${x} y=${y} font-size=${size}>${text}</text>`;

const slots = (cx: number, y: number, gap: number, tall: number, short: number, w = 4) =>
  svg`
    <rect class="slot" x=${cx - gap / 2 - w / 2} y=${y} width=${w} height=${tall} rx="1"></rect>
    <rect class="slot" x=${cx + gap / 2 - w / 2} y=${y + (tall - short) / 2} width=${w} height=${short} rx="1"></rect>
  `;

const ground = (cx: number, y: number, w: number, h: number): SVGTemplateResult =>
  svg`<path class="slot" d="M${cx - w / 2} ${y} h${w} v${h - w / 2} a${w / 2} ${w / 2} 0 0 1 -${w} 0 z"></path>`;

const hit = (y: number, h: number): SVGTemplateResult =>
  svg`<rect class="hit" x="0.5" y=${y} width="79" height=${h} rx="2"></rect>`;

const BAR_LED_Y = [11, 18, 26.3, 34.6, 42.9, 51.2, 59.5, 67.8, 78.6];

const KPL_ROWS = [6, 40.75, 75.5, 110.25];
const KPL_COLS = [6, 40.5];
const KPL_KEY = { w: 33.5, h: 33.75 };

const kplFace = (x: number, y: number, w: number): SVGTemplateResult =>
  svg`<rect class="face" x=${x} y=${y} width=${w} height=${KPL_KEY.h} rx="1.5"></rect>`;

const sceneKey = (x: number, y: number, letter: string): SVGTemplateResult => svg`
  ${kplFace(x, y, KPL_KEY.w)}
  ${print(x + KPL_KEY.w / 2, y + 24, letter, 6.5)}
`;

@customElement("insteon-device-plate")
export class InsteonDevicePlate extends LitElement {
  @property({ type: Number }) public cat?: number | null;

  @property({ type: Number }) public subcat?: number | null;

  @property({ type: Number }) public selected?: number;

  @property({ attribute: false }) public names: Record<number, string> = {};

  @property() public loadCaption?: string;

  @property() public label?: string;

  private get _layout(): PlateLayout {
    return plateLayout(this.cat, this.subcat);
  }

  private get _groups(): number[] {
    return plateGroups(this._layout);
  }

  private get _focusGroup(): number | undefined {
    const groups = this._groups;
    if (groups.length < 2) {
      return undefined;
    }
    return this.selected !== undefined && groups.includes(this.selected)
      ? this.selected
      : groups[0];
  }

  protected render(): TemplateResult | typeof nothing {
    const renderers: Partial<Record<PlateLayout, () => TemplateResult>> = {
      paddle_bar: () => this._wall(this._paddleBar()),
      paddle_pair: () => this._wall(this._paddlePair()),
      paddle_i3: () => this._wall(this._paddleI3()),
      keypad_i3_4: () => this._wall(this._keypadI3()),
      keypad_6: () => this._wall(this._keypad6()),
      keypad_8: () => this._wall(this._keypad8()),
      dial_i3: () => this._wall(this._dial()),
      outlet_dual: () => this._wall(this._outletDual()),
      outlet_i3: () => this._wall(this._outletI3()),
      outlet_dimmer: () => this._wall(this._outletLinc(true)),
      outlet_relay: () => this._wall(this._outletLinc(false)),
      toggle: () => this._wall(this._toggle()),
      inline: () => this._body(80, 120, this._inline()),
      plugin: () => this._body(86, 127, this._plugin()),
      micro: () => this._body(100, 100, this._micro()),
      fanlinc: () => this._body(80, 176, this._fanlinc()),
    };
    const draw = renderers[this._layout];
    return draw ? draw() : nothing;
  }

  private get _role(): "tablist" | "img" {
    return this._groups.length > 1 ? "tablist" : "img";
  }

  private _wall(content: SVGTemplateResult): TemplateResult {
    return html`
      <div class="plate">
        <svg
          class="insert"
          viewBox="0 0 80 160"
          role=${this._role}
          aria-label=${ifDefined(this.label)}
        >
          ${content}
        </svg>
      </div>
      ${this.loadCaption ? html`<div class="caption">${this.loadCaption}</div>` : nothing}
    `;
  }

  private _body(w: number, h: number, content: SVGTemplateResult): TemplateResult {
    return html`
      <svg
        class="body"
        viewBox="0 0 ${w} ${h}"
        style="width: calc(${w}px * var(--plate-scale, 1))"
        role=${this._role}
        aria-label=${ifDefined(this.label)}
      >
        ${content}
      </svg>
      ${this.loadCaption ? html`<div class="caption">${this.loadCaption}</div>` : nothing}
    `;
  }

  private _select(group: number) {
    fireEvent(this, "insteon-button-selected", { group });
  }

  private _key(group: number, shape: SVGTemplateResult, cls = ""): SVGTemplateResult {
    if (this._groups.length < 2) {
      return svg`<g class="key ${cls}" data-group=${group}>${shape}</g>`;
    }
    const selected = this.selected === group;
    const name = this.names[group] ?? String(group);
    return svg`
      <g
        class="key ${cls} ${selected ? "selected" : ""}"
        data-group=${group}
        role="tab"
        tabindex=${this._focusGroup === group ? "0" : "-1"}
        aria-selected=${selected ? "true" : "false"}
        aria-label=${name}
        @click=${() => this._select(group)}
        @keydown=${(ev: KeyboardEvent) => this._onKeydown(ev, group)}
      >
        ${shape}
      </g>
    `;
  }

  private _onKeydown(ev: KeyboardEvent, group: number) {
    const next = nextGroup(ev.key, this._groups, group);
    if (next === undefined) {
      return;
    }
    ev.preventDefault();
    this._select(next);
    this.updateComplete.then(() => {
      this.shadowRoot?.querySelector<SVGGElement>(`.key[data-group="${next}"]`)?.focus();
    });
  }

  private _switchlinc(indicators: SVGTemplateResult): SVGTemplateResult {
    const dark = this.subcat === 0x24;
    return svg`
      <rect class="bezel" x="0.5" y="0.5" width="79" height="159" rx="2"></rect>
      ${indicators}
      ${this._key(
        1,
        svg`
          <rect class="face" x="8" y="8" width="64" height="143" rx="3"></rect>
          <rect class="lower" x="8" y="79.5" width="64" height="71.5" rx="3"></rect>
        `,
      )}
      ${tab(34, 152, 12, 5, dark ? "dark" : "")}
    `;
  }

  private _paddleBar(): SVGTemplateResult {
    return this._switchlinc(svg`${BAR_LED_Y.map((y) => led(4, y, 2))}`);
  }

  private _paddlePair(): SVGTemplateResult {
    return this._switchlinc(svg`${led(4, 10, 2)}${led(4, 78, 2)}`);
  }

  private _paddleI3(): SVGTemplateResult {
    return svg`
      <defs>
        <linearGradient id="i3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f4f4f4"></stop>
          <stop offset="1" stop-color="#fbfbfb"></stop>
        </linearGradient>
      </defs>
      ${this._key(
        1,
        svg`<rect class="face i3" x="0.5" y="0.5" width="79" height="159" rx="3"></rect>`,
      )}
      ${led(8, 78.4, 1.2)}
      <rect class="slot lip" x="26.5" y="154.5" width="27" height="2.5" rx="1.25"></rect>
    `;
  }

  private _keypadI3(): SVGTemplateResult {
    const rows = [0, 1, 2, 3];
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="159" rx="3"></rect>
      ${rows.map((i) =>
        this._key(
          i + 1,
          svg`<rect class="face row" x="1.5" y=${i * 40 + 1.5} width="77" height="38"></rect>`,
        ),
      )}
      ${[40, 80, 120].map((y) => svg`<line class="hair" x1="1" y1=${y} x2="79" y2=${y}></line>`)}
      ${rows.map((i) => led(70.4, i * 40 + 9.2, 1))}
      <rect class="slot lip" x="27" y="155.5" width="26" height="2.5" rx="1.25"></rect>
    `;
  }

  private _kplFrame(keys: SVGTemplateResult): SVGTemplateResult {
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="149" rx="3"></rect>
      ${keys}
      ${tab(31, 152.5, 18, 2.5)}
    `;
  }

  private _keypad6(): SVGTemplateResult {
    const letters = ["A", "B", "C", "D"];
    return this._kplFrame(svg`
      ${this._key(
        1,
        svg`
          ${kplFace(6, KPL_ROWS[0], 68)}
          ${print(40, KPL_ROWS[0] + 21, "ON", 6)}
          ${kplFace(6, KPL_ROWS[3], 68)}
          ${print(40, KPL_ROWS[3] + 21, "OFF", 6)}
        `,
      )}
      ${letters.map((letter, i) =>
        this._key(i + 3, sceneKey(KPL_COLS[i % 2], KPL_ROWS[1 + Math.floor(i / 2)], letter)),
      )}
    `);
  }

  private _keypad8(): SVGTemplateResult {
    const letters = ["B", "C", "D", "E", "F", "G", "H"];
    return this._kplFrame(svg`
      ${this._key(
        1,
        svg`
          ${kplFace(6, 6, KPL_KEY.w)}
          ${print(22.75, 24, "MAIN", 6, "bold")}
        `,
      )}
      ${letters.map((letter, i) => {
        const slot = i + 1;
        return this._key(
          i + 2,
          sceneKey(KPL_COLS[slot % 2], KPL_ROWS[Math.floor(slot / 2)], letter),
        );
      })}
    `);
  }

  private _dial(): SVGTemplateResult {
    return svg`
      <defs>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="3"></feGaussianBlur>
        </filter>
        <radialGradient id="knob" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#ffffff"></stop>
          <stop offset="1" stop-color="#e9e9e9"></stop>
        </radialGradient>
      </defs>
      <rect class="frame" x="0.5" y="0.5" width="79" height="159" rx="3"></rect>
      <ellipse class="shadow" cx="40" cy="94" rx="30" ry="11"></ellipse>
      ${this._key(1, svg`<circle class="face knob" cx="40" cy="80" r="34.8"></circle>`)}
    `;
  }

  private _outletFace(
    upper: SVGTemplateResult,
    lower: SVGTemplateResult,
    controls: SVGTemplateResult,
  ): SVGTemplateResult {
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="159" rx="2"></rect>
      ${this._key(1, svg`${hit(0.5, 60)}${upper}`)}
      ${controls}
      ${this._key(2, svg`${hit(100, 59.5)}${lower}`)}
    `;
  }

  private _outletDual(): SVGTemplateResult {
    return this._outletFace(
      svg`${slots(40, 6.4, 32.8, 18, 16.3)}${ground(40, 49.6, 11.5, 12.5)}`,
      svg`${slots(40, 118, 32.8, 18, 16.3)}${ground(40, 141, 11.5, 12.5)}`,
      svg`
        <rect class="btn" x="28" y="63.2" width="24" height="8" rx="4"></rect>
        <rect class="btn" x="28" y="84" width="24" height="8" rx="4"></rect>
        ${led(14.4, 67.2, 2.3)}
        ${led(14.4, 88, 2.3)}
      `,
    );
  }

  private _outletI3(): SVGTemplateResult {
    return this._outletFace(
      svg`${slots(40, 6, 32.8, 20, 16.5, 5)}${ground(40, 49, 11, 12)}`,
      svg`${slots(40, 120, 32.8, 20, 16.5, 5)}${ground(40, 143, 11, 12)}`,
      svg`
        <circle class="btn" cx="40" cy="67.2" r="6.4"></circle>
        <circle class="btn" cx="40" cy="91.2" r="6.4"></circle>
        ${led(24.8, 67.2, 0.8)}
        ${led(24.8, 91.2, 0.8)}
      `,
    );
  }

  private _outletLinc(dimmer: boolean): SVGTemplateResult {
    const controls = dimmer
      ? svg`
          <path class="keyed" d="M14 4 h52 v30 l-26 8 l-26 -8 z"></path>
          <rect class="btn" x="9.6" y="67.2" width="14.4" height="28.8" rx="7.2"></rect>
          ${led(56, 83.2, 2.4)}
        `
      : svg`
          ${ground(40, 38, 11, 12)}
          ${led(40, 72, 1.8)}
          <rect class="btn" x="31" y="80" width="18" height="8" rx="4"></rect>
        `;
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="159" rx="2"></rect>
      ${this._key(1, svg`${hit(0.5, 60)}${slots(40, 8, 34, 20, 17)}`)}
      ${controls}
      <g class="dim">${slots(40, 112, 34, 20, 17)}${ground(40, 138, 11, 12)}</g>
    `;
  }

  private _toggle(): SVGTemplateResult {
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="159" rx="2"></rect>
      <rect class="opening" x="32" y="48" width="16" height="46" rx="1"></rect>
      ${this._key(
        1,
        svg`
          <rect class="hit no-edge" x="32" y="48" width="16" height="46" rx="2"></rect>
          <rect class="face lever" x="34" y="44" width="12" height="30" rx="3"></rect>
        `,
      )}
      ${led(40, 104, 1.5)}
      ${tab(24, 102.5, 8, 3)}
    `;
  }

  private _inline(): SVGTemplateResult {
    const squares: [number, number][] = [
      [46, 29],
      [15, 74],
      [46, 74],
    ];
    return svg`
      ${this._key(1, svg`<rect class="face" x="0.5" y="0.5" width="79" height="119" rx="3"></rect>`)}
      <circle class="btn" cx="26" cy="40" r="9"></circle>
      ${led(26, 40, 1.5)}
      ${led(8, 40, 1)}
      ${squares.map(
        ([x, y]) => svg`<rect class="btn" x=${x} y=${y} width="22" height="22" rx="3"></rect>`,
      )}
    `;
  }

  private _plugin(): SVGTemplateResult {
    return svg`
      ${this._key(1, svg`<rect class="face" x="0.5" y="0.5" width="79" height="126" rx="4"></rect>`)}
      ${slots(40, 18, 24, 14, 12)}
      ${ground(40, 40, 10, 11)}
      <rect class="led strip" x="11.3" y="3" width="1.4" height="6.4" rx="0.7"></rect>
      <rect class="btn" x="80" y="48" width="5" height="30" rx="2"></rect>
    `;
  }

  private _micro(): SVGTemplateResult {
    const rows = [20, 29, 38];
    return svg`
      ${this._key(
        1,
        svg`<polygon class="face" points="12,0.5 88,0.5 99.5,12 99.5,88 88,99.5 12,99.5 0.5,88 0.5,12"></polygon>`,
      )}
      ${led(15, 11, 1.55)}
      <path class="glyph" d="M9 17 v24 M9 20 h10 M9 29 h10 M9 38 h10"></path>
      ${rows.map((y) => svg`<circle class="btn" cx="14" cy=${y} r="1.6"></circle>`)}
      ${[23, 39, 61, 77].map((y) => svg`<circle class="term" cx="91" cy=${y} r="3.3"></circle>`)}
    `;
  }

  private _fanlinc(): SVGTemplateResult {
    const vents = [...Array(18)].map((_, i) => `M12 ${60 + i * 6} h56`).join(" ");
    return svg`
      <rect class="frame" x="0.5" y="0.5" width="79" height="175" rx="3"></rect>
      ${led(29.6, 8.8, 1.5)}
      ${led(51.2, 8.8, 1.5)}
      <path class="hair vents" d=${vents}></path>
      ${this._key(1, hit(20, 76))}
      ${this._key(2, hit(98, 77))}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        --plate-face: #f7f7f7;
        --key-face: #fdfdfd;
        --key-hover: #f0f0f0;
        --key-edge: #8c8c8c;
        --hairline: #d6d6d6;
        --slot: #4a4a4a;
        --print: #666666;
        --led-ring: #8c8c8c;
        --tab: #ffffff;
        --tab-dark: #222222;
      }

      .plate {
        background: var(--plate-face);
        border: 1px solid var(--divider-color, #d9d9d9);
        border-radius: 3px;
        padding: calc(20px * var(--plate-scale, 1)) calc(21px * var(--plate-scale, 1));
      }

      .insert {
        display: block;
        width: calc(80px * var(--plate-scale, 1));
        height: calc(160px * var(--plate-scale, 1));
      }

      .body {
        display: block;
      }

      .caption {
        font-size: 12px;
        color: var(--secondary-text-color, #6b6b6b);
      }

      .bezel,
      .frame {
        fill: var(--key-face);
        stroke: var(--key-edge);
        stroke-width: 1;
      }

      .face {
        fill: var(--key-face);
        stroke: var(--key-edge);
        stroke-width: 1;
      }

      .lower {
        fill: rgba(0, 0, 0, 0.03);
        stroke: none;
        pointer-events: none;
      }

      .key[role="tab"] {
        cursor: pointer;
        outline: none;
      }

      .key[role="tab"]:hover .face {
        fill: var(--key-hover);
      }

      .key.selected .face,
      .key:focus-visible .face {
        stroke: var(--primary-color);
        stroke-width: 2.5;
      }

      .led {
        fill: none;
        stroke: var(--led-ring);
        stroke-width: 0.8;
        pointer-events: none;
      }

      .tab {
        fill: var(--tab);
        stroke: var(--key-edge);
        stroke-width: 0.6;
      }

      .tab.dark {
        fill: var(--tab-dark);
        stroke: none;
      }

      .slot {
        fill: var(--slot);
        pointer-events: none;
      }

      .print {
        fill: var(--print);
        font-family: var(--ha-font-family-body, sans-serif);
        text-anchor: middle;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .print.bold {
        font-weight: 700;
      }

      .face.row {
        stroke: none;
      }

      .key.selected .face.row,
      .key:focus-visible .face.row {
        stroke: var(--primary-color);
        stroke-width: 2.5;
      }

      .shadow {
        fill: rgba(0, 0, 0, 0.18);
        filter: url(#soft);
        pointer-events: none;
      }

      .face.knob {
        fill: url(#knob);
        stroke: var(--hairline);
      }

      .face.i3 {
        fill: url(#i3);
        stroke: var(--hairline);
      }

      .key[role="tab"]:hover .face.i3 {
        fill: var(--key-hover);
      }

      .hit {
        fill: transparent;
        stroke: var(--key-edge);
        stroke-width: 0.6;
      }

      .hit.no-edge {
        stroke: none;
      }

      .key[role="tab"]:hover .hit {
        stroke-width: 1;
      }

      .key.selected .hit,
      .key:focus-visible .hit {
        stroke: var(--primary-color);
        stroke-width: 2.5;
      }

      .btn {
        fill: var(--key-face);
        stroke: var(--key-edge);
        stroke-width: 0.8;
        pointer-events: none;
      }

      .keyed {
        fill: none;
        stroke: var(--print);
        stroke-width: 0.6;
        stroke-dasharray: 1.5 1;
        pointer-events: none;
      }

      .dim {
        opacity: 0.55;
      }

      .opening {
        fill: var(--slot);
      }

      .face.lever {
        stroke: var(--key-edge);
      }

      .led.strip {
        fill: var(--led-ring);
        stroke: none;
      }

      .glyph {
        fill: none;
        stroke: var(--slot);
        stroke-width: 1.2;
        pointer-events: none;
      }

      .term {
        fill: #b9b9b9;
        stroke: #9d9d9d;
        stroke-width: 0.6;
        pointer-events: none;
      }

      .hair {
        stroke: var(--hairline);
        stroke-width: 0.8;
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-plate": InsteonDevicePlate;
  }
}
