import { LitElement } from "lit";
import { property } from "lit/decorators";
import { Insteon } from "./data/insteon";
import { addedToLovelace } from "./tools/added-to-lovelace";
import { InsteonLogger } from "./tools/insteon-logger";
import { localize } from "./localize/localize";
import { ProvideHassLitMixin } from "../homeassistant-frontend/src/mixins/provide-hass-lit-mixin";
import { getConfigEntries } from "../homeassistant-frontend/src/data/config_entries";
import { HomeAssistant } from "../homeassistant-frontend/src/types";

export class insteonElement extends ProvideHassLitMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  public connectedCallback() {
    super.connectedCallback();

    this.addEventListener("update-insteon", (e) =>
      this._updateInsteon((e as any).detail as Partial<Insteon>),
    );
  }

  protected _getInsteonConfigEntry() {
    getConfigEntries(this.hass).then((configEntries) => {
      const insteonEntry = configEntries.filter(
        (entry) =>
          entry.domain === "insteon" &&
          entry.disabled_by == null &&
          entry.source != "ignore",
      )[0];
      this.insteon = {
        language: this.hass.language,
        messages: [],
        updates: [],
        resources: [],
        repositories: [],
        removed: [],
        sections: [],
        config_entry: insteonEntry,
        status: {} as any,
        addedToLovelace,
        localize: (string: string, replace?: Record<string, any>) =>
          localize(this.insteon.language || "en", string, replace),
        log: new InsteonLogger(),
      };
    });
  }

  protected _updateInsteon(obj: Partial<Insteon>) {
    let shouldUpdate = false;

    Object.keys(obj).forEach((key) => {
      if (JSON.stringify(this.insteon[key]) !== JSON.stringify(obj[key])) {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      this.insteon = { ...this.insteon, ...obj };
    }
  }
}
