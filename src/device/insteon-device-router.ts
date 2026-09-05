import { customElement, property, state } from "lit/decorators";
import type { RouterOptions } from "@ha/layouts/hass-router-page";
import { HassRouterPage } from "@ha/layouts/hass-router-page";
import type { HomeAssistant, Route } from "@ha/types";
import type { PageNavigation } from "@ha/layouts/hass-tabs-subpage";
import type { Insteon } from "../data/insteon";
import { deviceTabs } from "./device-tabs";

export var insteonDeviceTabs: PageNavigation[] | undefined = undefined;

@customElement("insteon-device-router")
class InsteonDeviceRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private deviceId?: string | undefined = undefined;

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
    const deviceId = tail[tail.length - 1];
    if (!insteonDeviceTabs || deviceId !== this.deviceId) {
      insteonDeviceTabs = deviceTabs(this.insteon.localize, deviceId);
    }
    this.deviceId = deviceId;
    el.deviceId = deviceId;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-router": InsteonDeviceRouter;
  }
}
