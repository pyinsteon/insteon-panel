import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "@ha/layouts/hass-subpage";
import { HomeAssistant, Route } from "@ha/types";

@customElement("main-panel")
export class MainPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .header="Main page"
      >
        Put content here.
      </hass-subpage>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "main-panel": MainPanel;
  }
}
