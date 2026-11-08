import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "@ha/layouts/hass-router-page";
import { HassRouterPage } from "@ha/layouts/hass-router-page";
import type { HomeAssistant, Route } from "@ha/types";
import type { Insteon } from "../data/insteon";

@customElement("insteon-device-router")
class InsteonDeviceRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "overview",
    routes: {
      overview: {
        tag: "insteon-device-overview-page",
        load: () => import("./insteon-device-overview-page"),
      },
      aldb: {
        tag: "insteon-device-aldb-page",
        load: () => import("./aldb/insteon-device-aldb-page"),
      },
      properties: {
        tag: "insteon-device-properties-page",
        load: () => import("./properties/insteon-device-properties-page"),
      },
      config: {
        tag: "insteon-device-redirect",
        load: () => import("./insteon-device-redirect"),
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.route;
    el.hass = this.hass;
    el.insteon = this.insteon;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    const tail = this.routeTail.path.split("/");
    el.deviceId = tail[tail.length - 1];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-router": InsteonDeviceRouter;
  }
}
