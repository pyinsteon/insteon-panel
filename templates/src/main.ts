import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "@ha/common/dom/apply_themes_on_element";
import { navigate } from "@ha/common/navigate";
import { makeDialogManager } from "@ha/dialogs/make-dialog-manager";
import "@ha/resources/ha-style";
import { HomeAssistant, Route } from "@ha/types";
import { ProvideHassLitMixin } from "@ha/mixins/provide-hass-lit-mixin";
import { LocationChangedEvent } from "./data/common";
import { panel_name } from "./config";
import "./main-router";

const panel_frontend_name = panel_name + "-frontend";

@customElement(panel_frontend_name)
class PanelFrontend extends ProvideHassLitMixin {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hass) {
      return;
    }
    //this.insteon.language = this.hass.language;
    this.addEventListener(panel_name + "-location-changed", (e) =>
      this._setRoute(e as LocationChangedEvent)
    );

    makeDialogManager(this, this.shadowRoot!);
    if (this.route.path === "") {
      navigate("/insteon/devices", { replace: true });
    }

    this._applyTheme();
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    return html`
      <main-router
        .hass=${this.hass}
        .route=${this.route}
        .narrow=${this.narrow}
      ></main-router>
    `;
  }

  private _setRoute(ev: LocationChangedEvent): void {
    this.route = ev.detail!.route;
    navigate(this.route.path, { replace: true });
    this.requestUpdate();
  }

  private _applyTheme() {
    let options: Partial<HomeAssistant["selectedTheme"]> | undefined;

    const themeName =
      this.hass.selectedTheme?.theme ||
      (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
        ? this.hass.themes.default_dark_theme!
        : this.hass.themes.default_theme);

    options = this.hass.selectedTheme;
    if (themeName === "default" && options?.dark === undefined) {
      options = {
        ...this.hass.selectedTheme,
      };
    }

    applyThemesOnElement(this.parentElement, this.hass.themes, themeName, {
      ...options,
      dark: this.hass.themes.darkMode,
    });
    this.parentElement!.style.backgroundColor =
      "var(--primary-background-color)";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    panel_frontend_name: PanelFrontend;
  }
}
