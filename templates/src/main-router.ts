import { customElement, property, state } from "lit/decorators";
import { mdiFolderMultipleOutline } from "@mdi/js";
import { HassRouterPage, RouterOptions } from "@ha/layouts/hass-router-page";
import { PageNavigation } from "@ha/layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "@ha/types";
import { panel_url_base } from "./config";

export const mainTabs: PageNavigation[] = [
  {
    translationKey: "main-tab-name",
    path: panel_url_base,
    iconPath: mdiFolderMultipleOutline,
  },
];

@customElement("main-router")
class MainRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "default_page",
    routes: {
      default_page: {
        tag: "default-page",
        load: () => import("./main-panel"),
      },
    },
  };

  protected updatePageEl(el) {
    const section = this.route.path.replace("/", "");
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;
    el.hass = this.hass;
    el.route = this.routeTail;
    el.narrow = this.narrow;
    el.isWide = isWide;
    el.section = section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "main-router": MainRouter;
  }
}
