import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/layouts/hass-tabs-subpage-data-table", () => ({}));
vi.mock("@ha/components/ha-icon-overflow-menu", () => ({}));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));

import { localize } from "../src/localize/localize";
import type { ALDBRecord } from "../src/data/device";
import "../src/config/modem-links-panel";

const MODEM = "70.8C.C4";
const entries = [
  {
    id: "modem-1",
    identifiers: [["insteon", MODEM]],
    model: "2413U (0x03, 0x15)",
    via_device_id: null,
    name: "PowerLinc",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "dev-1",
    identifiers: [["insteon", "38.EC.93"]],
    model: "2477D (0x01, 0x20)",
    via_device_id: "modem-1",
    name: "Becca's Office Switch",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "dev-2",
    identifiers: [["insteon", "39.43.A8"]],
    model: "2334-232 (0x01, 0x42)",
    via_device_id: "modem-1",
    name: "Family Room Keypad OLD",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "dev-3",
    identifiers: [["insteon", "60.0D.48"]],
    model: "PS01 (0x01, 0x57)",
    via_device_id: "modem-1",
    name: "Dining Room Switch",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "dev-4",
    identifiers: [["insteon", "05.DC.21"]],
    model: "2476S (0x02, 0x0a)",
    via_device_id: "modem-1",
    name: "Side Spotlights",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "ext-1",
    identifiers: [["insteon", "26.81.71"]],
    model: "2992-222 (0x00, 0x1d)",
    via_device_id: null,
    name: "Range Extender",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "dev-5",
    identifiers: [["insteon", "4D.52.0A"]],
    model: "2474DWH (0x01, 0x24)",
    via_device_id: "modem-1",
    name: "Back Porch Switch",
    name_by_user: null,
    config_entries: ["entry-1"],
  },
  {
    id: "other",
    identifiers: [["zwave", "1"]],
    model: null,
    via_device_id: null,
    name: "Other",
    name_by_user: null,
    config_entries: ["entry-2"],
  },
];

const rec = (over: Partial<ALDBRecord>): ALDBRecord => ({
  mem_addr: 0x0fff,
  in_use: true,
  is_controller: false,
  highwater: false,
  group: 0,
  target: MODEM,
  target_name: "PowerLinc",
  data1: 0,
  data2: 0,
  data3: 0,
  dirty: false,
  ...over,
});

const devicesById: Record<string, object> = {
  "modem-1": {
    name: "PowerLinc",
    address: MODEM,
    is_battery: false,
    aldb_status: "loaded",
    cat: 3,
    subcat: 0x15,
  },
  "dev-1": {
    name: "Becca's Office Switch",
    address: "38.EC.93",
    is_battery: false,
    aldb_status: "loaded",
    cat: 1,
    subcat: 0x20,
    buttons: { 1: "dimmable_light" },
  },
  "dev-2": {
    name: "Family Room Keypad OLD",
    address: "39.43.A8",
    is_battery: false,
    aldb_status: "loaded",
    cat: 1,
    subcat: 0x42,
    buttons: { 1: "main", 3: "a", 4: "b", 5: "c", 6: "d" },
  },
  "dev-3": {
    name: "Dining Room Switch",
    address: "60.0D.48",
    is_battery: false,
    aldb_status: "loaded",
    cat: 1,
    subcat: 0x57,
    buttons: { 1: "dimmable_light" },
  },
  "dev-4": {
    name: "Side Spotlights",
    address: "05.DC.21",
    is_battery: false,
    aldb_status: "empty",
    cat: 2,
    subcat: 0x0a,
    buttons: { 1: "on_off_switch" },
  },
  "ext-1": {
    name: "Range Extender",
    address: "26.81.71",
    is_battery: false,
    aldb_status: "loaded",
    cat: 0,
    subcat: 0x1d,
  },
};

const recordsByAddress: Record<string, ALDBRecord[]> = {
  "38.EC.93": [
    rec({ is_controller: true, group: 0 }),
    rec({ group: 0, target: "60.79.C2", target_name: "Nook" }),
  ],
  "39.43.A8": [
    rec({ group: 0 }),
    rec({ is_controller: true, group: 1 }),
    rec({ is_controller: true, group: 4 }),
    rec({ is_controller: true, group: 5 }),
    rec({ is_controller: true, group: 6 }),
  ],
  "60.0D.48": [rec({ group: 0 }), rec({ is_controller: true, group: 1 })],
  "05.DC.21": [],
  "26.81.71": [],
  [MODEM]: [],
};

const makeHass = () => ({
  devices: {},
  localize: (key: string) => key,
  connection: {
    sendMessagePromise: vi.fn(async () => entries),
    subscribeMessage: vi.fn(async () => async () => {}),
  },
  callWS: vi.fn(async (msg: { type: string; device_id?: string; device_address?: string }) => {
    if (msg.type === "insteon/device/get") {
      if (msg.device_id === "dev-5") {
        throw new Error("device unreachable");
      }
      return devicesById[msg.device_id!];
    }
    if (msg.type === "insteon/aldb/get") return recordsByAddress[msg.device_address!];
    if (msg.type === "insteon/aldb/add_default_links") return undefined;
    throw new Error("unexpected " + msg.type);
  }),
});

const settle = async (el: any) => {
  for (let i = 0; i < 10; i += 1) {
    await el.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const mount = async () => {
  const el = document.createElement("modem-links-panel") as any;
  el.hass = makeHass();
  el.insteon = {
    config_entry: { entry_id: "entry-1" },
    localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
  };
  el.narrow = false;
  document.body.appendChild(el);
  await settle(el);
  return el;
};

describe("modem-links-panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    devicesById["dev-1"] = {
      name: "Becca's Office Switch",
      address: "38.EC.93",
      is_battery: false,
      aldb_status: "loaded",
      cat: 1,
      subcat: 0x20,
      buttons: { 1: "dimmable_light" },
    };
    recordsByAddress["38.EC.93"] = [
      rec({ is_controller: true, group: 0 }),
      rec({ group: 0, target: "60.79.C2", target_name: "Nook" }),
    ];
  });

  it("lists only the devices with gaps, with the problem spelled out", async () => {
    const el = await mount();
    expect(el._scanning).toBe(false);
    const byAddress = Object.fromEntries(el._rows.map((row: any) => [row.address, row]));
    expect(Object.keys(byAddress).sort()).toEqual(["05.DC.21", "38.EC.93", "39.43.A8", "4D.52.0A"]);
    expect(byAddress["38.EC.93"].status).toBe("gaps");
    expect(byAddress["38.EC.93"].problem).toBe(
      "Home Assistant cannot control this device. Not reported to Home Assistant: Paddle",
    );
    expect(byAddress["39.43.A8"].problem).toBe("Not reported to Home Assistant: Button A");
    expect(byAddress["05.DC.21"].status).toBe("not_loaded");
    expect(byAddress["05.DC.21"].problem).toBe("Link database not loaded");
  });

  it("does not count a link that has not been written yet", async () => {
    recordsByAddress["38.EC.93"] = [
      rec({ group: 0 }),
      rec({ is_controller: true, group: 1, dirty: true }),
    ];
    const el = await mount();
    const row = el._rows.find((candidate: any) => candidate.address === "38.EC.93");
    expect(row.problem).toBe("Not reported to Home Assistant: Paddle");
  });

  it("skips the modem, extenders and devices from other config entries", async () => {
    const el = await mount();
    const types = el.hass.callWS.mock.calls.map((call: any[]) => call[0]);
    expect(types.some((msg: any) => msg.device_id === "modem-1")).toBe(false);
    expect(types.some((msg: any) => msg.device_id === "other")).toBe(false);
    expect(el._rows.some((row: any) => row.address === "26.81.71")).toBe(false);
  });

  it("adds default links for a row and refreshes it", async () => {
    const el = await mount();
    recordsByAddress["38.EC.93"] = [rec({ group: 0 }), rec({ is_controller: true, group: 1 })];
    const row = el._rows.find((candidate: any) => candidate.address === "38.EC.93");
    await el._handleAddDefaultLinks(row);
    await settle(el);
    expect(
      el.hass.callWS.mock.calls.some(
        (call: any[]) => call[0].type === "insteon/aldb/add_default_links",
      ),
    ).toBe(true);
    expect(el._rows.some((candidate: any) => candidate.address === "38.EC.93")).toBe(false);
  });

  it("shows an unreachable device instead of dropping it", async () => {
    const el = await mount();
    const row = el._rows.find((candidate: any) => candidate.address === "4D.52.0A");
    expect(row).toBeDefined();
    expect(row.status).toBe("error");
    expect(row.problem).toBe("Could not read this device");
  });

  it("refreshes a row when the load finishes and drops the watch on disconnect", async () => {
    const el = await mount();
    const row = el._rows.find((candidate: any) => candidate.address === "38.EC.93");
    const unsub = vi.fn(async () => {});
    let capturedCallback: ((message: any) => void) | undefined;
    el.hass.connection.subscribeMessage = vi.fn(async (callback: (message: any) => void) => {
      capturedCallback = callback;
      return unsub;
    });
    devicesById["dev-1"] = { ...devicesById["dev-1"], aldb_status: "loading" };
    await el._handleAddDefaultLinks(row);
    await settle(el);
    expect(capturedCallback).toBeDefined();
    expect(unsub).not.toHaveBeenCalled();
    devicesById["dev-1"] = { ...devicesById["dev-1"], aldb_status: "loaded" };
    recordsByAddress["38.EC.93"] = [rec({ group: 0 }), rec({ is_controller: true, group: 1 })];
    capturedCallback!({ type: "status_changed", is_loading: false });
    await settle(el);
    expect(el._rows.some((candidate: any) => candidate.address === "38.EC.93")).toBe(false);
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("drops the watch when the panel disconnects", async () => {
    const el = await mount();
    const row = el._rows.find((candidate: any) => candidate.address === "38.EC.93");
    const unsub = vi.fn(async () => {});
    el.hass.connection.subscribeMessage = vi.fn(async () => unsub);
    devicesById["dev-1"] = { ...devicesById["dev-1"], aldb_status: "loading" };
    await el._handleAddDefaultLinks(row);
    await settle(el);
    expect(unsub).not.toHaveBeenCalled();
    el.remove();
    await settle(el);
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
