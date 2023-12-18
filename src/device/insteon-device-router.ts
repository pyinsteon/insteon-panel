import { customElement, property, state } from "lit/decorators";
import { mdiNetwork, mdiFolderMultipleOutline } from "@mdi/js";
import {
  HassRouterPage,
  RouterOptions,
} from "@ha/layouts/hass-router-page";
import { HomeAssistant, Route } from "@ha/types";
import { PageNavigation } from "@ha/layouts/hass-tabs-subpage";
import { Insteon } from "../data/insteon";

export const insteonDeviceTabs: PageNavigation[] = [
  {
    translationKey: "properties.caption",
    path: `/insteon/device/properties/`,
    iconPath: mdiFolderMultipleOutline,
  },
  {
    translationKey: "aldb.caption",
    path: `/insteon/device/aldb/`,
    iconPath: mdiNetwork,
  },
];

@customElement("insteon-device-router")
class InsteonDeviceRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private deviceId?: string | undefined = undefined;

  protected routerOptions: RouterOptions = {
    defaultPage: "properties",
    routes: {
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
        load: () => import("./insteon-device-redirect")
      }
    },
  };

  protected updatePageEl(el) {
    // eslint-disable-next-line no-console
    console.info("In device router updatePageEl");
    el.route = this.route;
    el.hass = this.hass;
    el.insteon = this.insteon;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    const tail = this.routeTail.path.split("/");
    this.deviceId = tail[tail.length - 1];
    insteonDeviceTabs[0].path = "/insteon/device/properties/" + this.deviceId;
    insteonDeviceTabs[1].path = "/insteon/device/aldb/" + this.deviceId;
    el.deviceId = this.deviceId;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-device-router": InsteonDeviceRouter;
  }
}
