import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "@ha/common/dom/apply_themes_on_element";
import { navigate } from "@ha/common/navigate";
import { makeDialogManager } from "@ha/dialogs/make-dialog-manager";
import "@ha/resources/ha-style";
import { HomeAssistant, Route } from "@ha/types";
import { LocationChangedEvent } from "./data/common";
import { insteonElement } from "./insteon";
import "./insteon-router";

@customElement("insteon-frontend")
class InsteonFrontend extends insteonElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hass) {
      return;
    }
    if (!this.insteon) {
      this._getInsteonConfigEntry();
    }
    //this.insteon.language = this.hass.language;
    this.addEventListener("insteon-location-changed", (e) =>
      this._setRoute(e as LocationChangedEvent)
    );

    makeDialogManager(this, this.shadowRoot!);
    if (this.route.path === "") {
      navigate("/insteon/devices", { replace: true });
    }

    this._applyTheme();
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.insteon) {
      return html``;
    }

    return html`
      <insteon-router
        .hass=${this.hass}
        .insteon=${this.insteon}
        .route=${this.route}
        .narrow=${this.narrow}
      ></insteon-router>
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
    this.parentElement!.style.backgroundColor = "var(--primary-background-color)";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-frontend": InsteonFrontend;
  }
}
