import { mdiDatabaseRefreshOutline, mdiLinkPlus } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "@ha/components/data-table/ha-data-table";
import "@ha/layouts/hass-tabs-subpage-data-table";
import "@ha/components/ha-icon-overflow-menu";
import type { HASSDomEvent } from "@ha/common/dom/fire_event";
import { navigate } from "@ha/common/navigate";
import { showAlertDialog, showConfirmationDialog } from "@ha/dialogs/generic/show-dialog-box";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { fetchDeviceRegistry } from "@ha/data/device_registry";
import type { HomeAssistant } from "@ha/types";
import type { Insteon, InsteonDevice } from "../data/insteon";
import type { ALDBRecord } from "../data/device";
import {
  addDefaultLinks,
  fetchInsteonALDB,
  fetchInsteonDevice,
  loadALDB,
  subscribeAldbLoading,
} from "../data/device";
import { buttonTitle, plateLayout } from "../device/plate-layout";
import { insteonAddress, modemAddress, normalizeAddress } from "../device/registry-lookup";
import { paneState } from "../device/pane-state";
import { modemLinkNeeds } from "../device/reporting-groups";
import { hasModemLinkGaps, modemLinkGaps } from "./modem-links";

interface ModemLinkRow extends DataTableRowData {
  id: string;
  name: string;
  address: string;
  status: "gaps" | "not_loaded" | "error";
  problem: string;
  battery: boolean;
}

@customElement("modem-links-panel")
export class ModemLinksPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @state() private _rows: ModemLinkRow[] = [];

  @state() private _scanning = true;

  private _entries: DeviceRegistryEntry[] = [];

  private _modem?: string;

  private _watches = new Map<string, Promise<() => Promise<void>>>();

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    if (!this.hass || !this.insteon) {
      navigate("/insteon");
      return;
    }
    this._scan();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    Array.from(this._watches.keys()).forEach((address) => this._stopWatching(address));
  }

  private async _scan() {
    this._scanning = true;
    const entries = (await fetchDeviceRegistry(this.hass.connection)).filter(
      (entry) =>
        entry.config_entries?.includes(this.insteon.config_entry.entry_id) &&
        insteonAddress(entry) !== undefined,
    );
    const devices = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
    this._modem = modemAddress(devices, entries[0]);
    this._entries = entries.filter(
      (entry) =>
        this._modem === undefined ||
        normalizeAddress(insteonAddress(entry)!) !== normalizeAddress(this._modem),
    );
    const rows = await Promise.all(this._entries.map((entry) => this._rowFor(entry)));
    this._rows = rows.filter((row): row is ModemLinkRow => row !== undefined);
    this._scanning = false;
  }

  private async _rowFor(entry: DeviceRegistryEntry): Promise<ModemLinkRow | undefined> {
    const address = insteonAddress(entry)!;
    let device: InsteonDevice;
    let records: ALDBRecord[];
    try {
      device = await fetchInsteonDevice(this.hass, entry.id);
      records = await fetchInsteonALDB(this.hass, address);
    } catch (_err) {
      return {
        id: entry.id,
        name: entry.name_by_user || entry.name || address,
        address,
        status: "error",
        problem: this.insteon.localize("utils.modem_links.status.unreachable"),
        battery: false,
      };
    }
    const needs = modemLinkNeeds(device);
    if (needs.controllers.length === 0 || this._modem === undefined) {
      return undefined;
    }
    const name = entry.name_by_user || entry.name || device.name;
    const state = paneState({ status: device.aldb_status, records });
    if (state === "not_loaded" || state === "loading") {
      return {
        id: entry.id,
        name,
        address,
        status: "not_loaded",
        problem: this.insteon.localize("utils.modem_links.status.not_loaded"),
        battery: device.is_battery,
      };
    }
    const gaps = modemLinkGaps(records, needs, this._modem);
    if (!hasModemLinkGaps(gaps)) {
      return undefined;
    }
    const layout = plateLayout(device.cat, device.subcat);
    const problems: string[] = [];
    if (gaps.control) {
      problems.push(this.insteon.localize("utils.modem_links.status.control"));
    }
    if (gaps.unreported.length) {
      problems.push(
        this.insteon.localize("utils.modem_links.status.unreported", {
          buttons: gaps.unreported
            .map((group) => buttonTitle(layout, group, this.insteon.localize))
            .join(", "),
        }),
      );
    }
    return {
      id: entry.id,
      name,
      address,
      status: "gaps",
      problem: problems.join(". "),
      battery: device.is_battery,
    };
  }

  private async _refreshRow(id: string) {
    const entry = this._entries.find((candidate) => candidate.id === id);
    if (!entry) {
      return;
    }
    const row = await this._rowFor(entry);
    const rest = this._rows.filter((candidate) => candidate.id !== id);
    this._rows = row ? [...rest, row] : rest;
  }

  private _stopWatching(address: string) {
    const unsubscribe = this._watches.get(address);
    if (!unsubscribe) {
      return;
    }
    this._watches.delete(address);
    unsubscribe.then((unsub) => unsub()).catch(() => undefined);
  }

  private _watchThenRefresh(row: ModemLinkRow) {
    this._stopWatching(row.address);
    this._watches.set(
      row.address,
      subscribeAldbLoading(this.hass, row.address, async (message) => {
        if (message.type !== "status_changed" || message.is_loading) {
          return;
        }
        this._stopWatching(row.address);
        await this._refreshRow(row.id);
      }),
    );
  }

  private async _handleAddDefaultLinks(row: ModemLinkRow) {
    const ok = await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.add_default_links"),
      confirmText: this.insteon.localize("common.yes"),
      dismissText: this.insteon.localize("common.no"),
    });
    if (!ok) {
      return;
    }
    if (row.battery) {
      await showAlertDialog(this, { text: this.insteon.localize("common.warn.wake_up") });
    }
    this._watchThenRefresh(row);
    try {
      await addDefaultLinks(this.hass, row.address);
      const device = await fetchInsteonDevice(this.hass, row.id);
      if (device.aldb_status !== "loading") {
        this._stopWatching(row.address);
      }
      await this._refreshRow(row.id);
    } catch (_err) {
      this._stopWatching(row.address);
      showAlertDialog(this, {
        text: this.insteon.localize("common.error.write"),
        confirmText: this.insteon.localize("common.close"),
      });
    }
  }

  private async _handleLoad(row: ModemLinkRow) {
    const ok = await showConfirmationDialog(this, {
      text: this.insteon.localize("common.warn.load"),
      confirmText: this.insteon.localize("common.yes"),
      dismissText: this.insteon.localize("common.no"),
    });
    if (!ok) {
      return;
    }
    if (row.battery) {
      await showAlertDialog(this, { text: this.insteon.localize("common.warn.wake_up") });
    }
    this._watchThenRefresh(row);
    try {
      await loadALDB(this.hass, row.address);
      const device = await fetchInsteonDevice(this.hass, row.id);
      if (device.aldb_status !== "loading") {
        this._stopWatching(row.address);
      }
      await this._refreshRow(row.id);
    } catch (_err) {
      this._stopWatching(row.address);
      showAlertDialog(this, {
        text: this.insteon.localize("common.error.load"),
        confirmText: this.insteon.localize("common.close"),
      });
    }
  }

  private _rowActions(row: ModemLinkRow) {
    if (row.status === "error") {
      return [];
    }
    if (row.status === "not_loaded") {
      return [
        {
          path: mdiDatabaseRefreshOutline,
          label: this.insteon.localize("common.actions.load"),
          action: () => this._handleLoad(row),
        },
      ];
    }
    return [
      {
        path: mdiLinkPlus,
        label: this.insteon.localize("common.actions.add_default_links"),
        action: () => this._handleAddDefaultLinks(row),
      },
    ];
  }

  private _columns = memoizeOne(
    (): DataTableColumnContainer => ({
      name: {
        title: this.insteon.localize("utils.modem_links.fields.device"),
        sortable: true,
        filterable: true,
        direction: "asc",
      },
      address: {
        title: this.insteon.localize("utils.modem_links.fields.address"),
        sortable: true,
        filterable: true,
      },
      problem: {
        title: this.insteon.localize("utils.modem_links.fields.problem"),
        sortable: true,
        filterable: true,
      },
      actions: {
        title: "",
        type: "overflow-menu",
        template: (row: ModemLinkRow) => html`
          <ha-icon-overflow-menu .hass=${this.hass} narrow .items=${this._rowActions(row)}>
          </ha-icon-overflow-menu>
        `,
      },
    }),
  );

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    navigate("/insteon/device/overview/" + ev.detail.id);
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .data=${this._rows}
        .columns=${this._columns()}
        .localizeFunc=${this.hass.localize}
        .mainPage=${false}
        .hasFab=${false}
        .tabs=${[{ translationKey: "utils.modem_links.caption", path: "/insteon" }]}
        .noDataText=${this.insteon.localize(
          this._scanning ? "utils.modem_links.scanning" : "utils.modem_links.none",
        )}
        backPath="/insteon/utils"
        clickable
        @row-click=${this._handleRowClicked}
      >
      </hass-tabs-subpage-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "modem-links-panel": ModemLinksPanel;
  }
}
