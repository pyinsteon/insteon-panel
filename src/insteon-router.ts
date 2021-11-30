import { customElement, property, state } from "lit/decorators";
import {
  HassRouterPage,
  RouterOptions,
} from "../homeassistant-frontend/src/layouts/hass-router-page";
import { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import { Insteon } from "./data/insteon";

@customElement("insteon-router")
class InsteonRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "device",
    routes: {
      device: {
        tag: "insteon-device-router",
        load: () => {
          // eslint-disable-next-line no-console
          console.info("Importing insteon-device-router");
          return import("./device/insteon-device-router");
        },
      },
      devices: {
        tag: "insteon-devices-panel",
        load: () => {
          // eslint-disable-next-line no-console
          console.info("Importing insteon-devices-panel");
          return import("./insteon-devices-panel");
        },
      },
    },
  };

  protected updatePageEl(el) {
    const section = this.route.path.replace("/", "");
    const isWide = this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;
    el.hass = this.hass;
    el.route = this.routeTail;
    el.narrow = this.narrow;
    el.isWide = isWide;
    el.section = section;

    // eslint-disable-next-line no-console
    console.info("Current Page: " + this._currentPage + " in insteon-router");

    // eslint-disable-next-line no-console
    console.info("Route " + this.route.path + " in insteon-router");

    if (this._currentPage != "devices") {
      const routeSplit = this.routeTail.path.split("/");
      el.deviceId = routeSplit[routeSplit.length - 1];

      // eslint-disable-next-line no-console
      console.info("Device ID: " + el.deviceId + " in insteon-router");
    }
    el.insteon = this.insteon;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-router": InsteonRouter;
  }
}
