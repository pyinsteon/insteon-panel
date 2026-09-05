import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/layouts/hass-tabs-subpage", () => ({}));
vi.mock("@ha/components/ha-card", () => ({}));
vi.mock("@ha/components/ha-alert", () => ({}));
vi.mock("@ha/components/ha-button", () => ({}));
vi.mock("@ha/components/ha-button-menu", () => ({}));
vi.mock("@ha/components/ha-expansion-panel", () => ({}));
vi.mock("@ha/components/ha-icon-button", () => ({}));
vi.mock("@ha/components/ha-icon-next", () => ({}));
vi.mock("@ha/components/ha-list-item", () => ({}));
vi.mock("@ha/components/ha-md-list", () => ({}));
vi.mock("@ha/components/ha-md-list-item", () => ({}));
vi.mock("@ha/components/ha-spinner", () => ({}));
vi.mock("@ha/resources/styles", () => ({ haStyle: [] }));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));
vi.mock("../src/device/insteon-device-router", () => ({ insteonDeviceTabs: [] }));

import { localize } from "../src/localize/localize";
import type { ALDBRecord } from "../src/data/device";
import { navigate } from "@ha/common/navigate";
import "../src/device/insteon-device-overview-page";

const MODEM = "70.8C.C4";

const devices = {
  "dev-1": {
    id: "dev-1",
    identifiers: [["insteon", "60.7D.D6"]],
    model: "KP014 (0x01, 0x59)",
    via_device_id: "modem-1",
  },
  "modem-1": {
    id: "modem-1",
    identifiers: [["insteon", MODEM]],
    model: "2413U (0x03, 0x15)",
    via_device_id: null,
  },
  "dev-2": {
    id: "dev-2",
    identifiers: [["insteon", "39.43.A8"]],
    model: "2334-232 (0x01, 0x42)",
    via_device_id: "modem-1",
  },
  "dev-3": {
    id: "dev-3",
    identifiers: [["insteon", "60.79.C2"]],
    model: "KP014 (0x01, 0x59)",
    via_device_id: "modem-1",
  },
};

const kp014 = {
  name: "Family Room 4 Switch",
  address: "60.7D.D6",
  is_battery: false,
  aldb_status: "loaded",
  cat: 1,
  subcat: 0x59,
  model: "KP014",
  description: "i3 Keypad (4 Button)",
  engine_version: "i2cs",
  firmware: 88,
  buttons: {
    1: "on_off_switch_a",
    2: "on_off_switch_b",
    3: "on_off_switch_c",
    4: "on_off_switch_d",
  },
};

const rec = (over: Partial<ALDBRecord>): ALDBRecord => ({
  mem_addr: 0x0fff,
  in_use: true,
  is_controller: false,
  highwater: false,
  group: 0,
  target: MODEM,
  target_name: "PowerLinc USB Modem 70.8C.C4",
  data1: 0,
  data2: 0,
  data3: 0,
  dirty: false,
  ...over,
});

const records = [
  rec({ group: 0, data3: 1 }),
  rec({ is_controller: true, group: 1, data1: 3, data2: 21, data3: 158 }),
  rec({ is_controller: true, group: 2, data1: 3, data2: 21, data3: 158 }),
  rec({ group: 20, data1: 255, data2: 28, data3: 2 }),
  rec({ group: 1, target: "39.43.A8", target_name: "Family Room Keypad OLD", data3: 2 }),
  rec({
    is_controller: true,
    group: 0,
    target: "60.79.C2",
    target_name: "Nook Light",
    data1: 3,
    data2: 28,
  }),
];

type Handlers = Record<string, () => Promise<unknown>>;

const makeHass = (handlers: Handlers) => ({
  devices,
  localize: (key: string) => key,
  callWS: vi.fn((msg: { type: string }) =>
    (handlers[msg.type] ?? (() => Promise.reject(new Error("unexpected " + msg.type))))(),
  ),
  connection: { subscribeMessage: vi.fn(async () => async () => {}) },
});

const defaults = (
  over: Partial<Handlers> = {},
  device: object = kp014,
  aldb: ALDBRecord[] = records,
): Handlers => ({
  "insteon/device/get": async () => device,
  "insteon/aldb/get": async () => aldb,
  "insteon/scenes/get": async () => ({}),
  "insteon/properties/get": async () => ({
    properties: [{ name: "load_button", value: 1, modified: false }],
    schema: {},
  }),
  ...over,
});

const settle = async (el: any) => {
  for (let i = 0; i < 8; i += 1) {
    await el.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const mount = async (hass: ReturnType<typeof makeHass>, narrow = false) => {
  const el = document.createElement("insteon-device-overview-page") as any;
  el.hass = hass;
  el.insteon = {
    localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
  };
  el.narrow = narrow;
  el.route = { prefix: "/insteon/device/overview", path: "/dev-1" };
  el.deviceId = "dev-1";
  document.body.appendChild(el);
  await settle(el);
  return el;
};

const text = (el: any) => el.shadowRoot!.textContent!.replace(/\s+/g, " ");

const select = async (el: any, group: number) => {
  el.shadowRoot!.querySelector("insteon-device-plate")!.dispatchEvent(
    new CustomEvent("insteon-button-selected", {
      detail: { group },
      bubbles: true,
      composed: true,
    }),
  );
  await settle(el);
};

describe("insteon-device-overview-page", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a spinner until the device arrives", async () => {
    const el = await mount(makeHass({ "insteon/device/get": () => new Promise(() => {}) }));
    expect(el.shadowRoot!.querySelector("ha-spinner")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("insteon-device-plate")).toBeNull();
  });

  it("titles the card, hints, and explains the modem rows for the first button", async () => {
    const el = await mount(makeHass(defaults()));
    const t = text(el);
    expect(
      el.shadowRoot!.querySelector("ha-card")!.getAttribute("header") ??
        (el.shadowRoot!.querySelector("ha-card") as any).header,
    ).toBe("Buttons");
    expect(t).toContain("Select a button to see what it controls");
    expect(t).toContain("Button A");
    expect(t).toContain("Group 1 · Load button");
    expect(t).toContain("Notified when this button is used");
    expect(t).toContain("Can control this button");
    expect(t).not.toContain("No connections");
    const pane = el.shadowRoot!.querySelector("#pane")!;
    expect(pane.getAttribute("role")).toBe("region");
    expect(pane.getAttribute("aria-live")).toBe("polite");
    expect(pane.getAttribute("aria-label")).toBe("Button A");
  });

  it("switches the pane on selection, names scenes and the controller's button, and links rows", async () => {
    const el = await mount(
      makeHass(
        defaults({
          "insteon/scenes/get": async () => ({
            20: { name: "Movie", group: 20, devices: { "60.7D.D6": [] } },
          }),
        }),
      ),
    );
    await select(el, 2);
    const t = text(el);
    expect(t).toContain("Button B");
    expect(t).toContain("Group 2 · Scene button");
    expect(t).toContain("Scene 20: Movie");
    expect(t).toContain("Family Room Keypad OLD");
    expect(t).toContain("Button ON/OFF");
    const items = [...el.shadowRoot!.querySelectorAll("ha-md-list-item")];
    expect(items.some((item) => item.getAttribute("type") === "button")).toBe(true);
  });

  it("navigates to the other device from a row", async () => {
    const el = await mount(makeHass(defaults()));
    await select(el, 2);
    const items = [...el.shadowRoot!.querySelectorAll("ha-md-list-item")];
    const row = items.find(
      (item) =>
        item.querySelector('[slot="headline"]')?.textContent?.trim() === "Family Room Keypad OLD",
    )!;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(el);
    expect(navigate).toHaveBeenCalledWith("/insteon/device/overview/dev-2");
  });

  it("lists links that belong to no button under other links", async () => {
    const extraRecords = [...records, rec({ group: 21, data3: 158 })];
    const el = await mount(makeHass(defaults({}, kp014, extraRecords)));
    const t = text(el);
    const panel = el.shadowRoot!.querySelector("ha-expansion-panel")!;
    expect(panel.getAttribute("header") ?? (panel as any).header).toBe("Other links (2)");
    expect(t).toContain("Controls Nook Light");
    expect(t).toContain("Group 0, not a button");
    expect(t).toContain("Controlled by Home Assistant");
    expect(t).toContain("Group 21, not a button");
    expect(t).not.toContain("Group 158");
  });

  it("moves links the controller can never fire out of controlled by", async () => {
    const el = await mount(
      makeHass(
        defaults({}, kp014, [
          ...records,
          rec({ group: 0, target: "60.79.C2", target_name: "Nook Light", data3: 0 }),
        ]),
      ),
    );
    const sections = [...el.shadowRoot!.querySelectorAll(".section")].map((section) =>
      section.textContent!.replace(/\s+/g, " "),
    );
    const controlledBy = sections.find((textContent) => textContent.includes("Controlled by"))!;
    expect(controlledBy).not.toContain("Nook Light");
    const t = text(el);
    expect((el.shadowRoot!.querySelector("ha-expansion-panel") as any).header).toBe(
      "Other links (2)",
    );
    expect(t).toContain("Controlled by Nook Light");
    expect(t).toContain("Group 0, not a button");
  });

  it("shows an error with retry when the record fetch fails", async () => {
    const el = await mount(
      makeHass(
        defaults({
          "insteon/aldb/get": async () => {
            throw new Error("nope");
          },
        }),
      ),
    );
    const alert = el.shadowRoot!.querySelector("ha-alert")!;
    expect(alert.getAttribute("alert-type")).toBe("error");
    expect(text(el)).toContain("Could not read the link database");
    expect(text(el)).toContain("Retry");
    expect(text(el)).not.toContain("No connections");
  });

  it("offers to read the device when the database is not loaded", async () => {
    const el = await mount(makeHass(defaults({}, { ...kp014, aldb_status: "empty" }, [])));
    const alert = el.shadowRoot!.querySelector("ha-alert")!;
    expect(alert.getAttribute("alert-type")).toBe("warning");
    expect(text(el)).toContain("has not been loaded");
    expect(text(el)).toContain("Read from device");
    expect(text(el)).not.toContain("No connections");
  });

  it("shows rows under a warning when the database is partial", async () => {
    const el = await mount(makeHass(defaults({}, { ...kp014, aldb_status: "partial" })));
    expect(text(el)).toContain("Partially loaded");
    expect(text(el)).toContain("Notified when this button is used");
  });

  it("warns when home assistant has no control link and offers default links", async () => {
    const el = await mount(
      makeHass(
        defaults(
          {},
          kp014,
          records.filter((r) => r.is_controller),
        ),
      ),
    );
    expect(text(el)).toContain("Home Assistant has no control link to this device");
    expect(text(el)).toContain("Add default links");
  });

  it("notes a button that never reaches home assistant", async () => {
    const el = await mount(makeHass(defaults()));
    await select(el, 3);
    expect(text(el)).toContain("Home Assistant is not notified when this button is used");
    expect(text(el)).toContain("Add default links");
    expect(el.shadowRoot!.querySelector('ha-alert[alert-type="warning"]')).not.toBeNull();
  });

  it("renders the modem as scenes and a device count", async () => {
    const modem = {
      ...kp014,
      name: "PowerLinc",
      address: MODEM,
      cat: 3,
      subcat: 0x15,
      model: "2413U",
      description: "PowerLinc USB Modem",
      buttons: undefined,
    };
    const modemRecords = [
      rec({
        is_controller: true,
        group: 0,
        target: "60.7D.D6",
        target_name: "Family Room 4 Switch",
      }),
      rec({
        is_controller: true,
        group: 0,
        target: "39.43.A8",
        target_name: "Family Room Keypad OLD",
      }),
      rec({
        is_controller: true,
        group: 20,
        target: "60.7D.D6",
        target_name: "Family Room 4 Switch",
      }),
    ];
    const el = await mount(
      makeHass(
        defaults(
          {
            "insteon/scenes/get": async () => ({
              20: { name: "Movie", group: 20, devices: { "60.7D.D6": [] } },
            }),
          },
          modem,
          modemRecords,
        ),
      ),
    );
    const t = text(el);
    const card = el.shadowRoot!.querySelector("ha-card")!;
    expect(card.getAttribute("header") ?? (card as any).header).toBe("Connections");
    expect(t).toContain("Movie");
    expect(t).toContain("Scene 20 · 1 device");
    expect(t).toContain("2 devices Home Assistant can control");
    expect(el.shadowRoot!.querySelector("insteon-device-plate")).toBeNull();
  });

  it("says when a device stores no links", async () => {
    const extender = {
      ...kp014,
      name: "Range Extender",
      address: "26.81.71",
      cat: 0,
      subcat: 0x1d,
      buttons: undefined,
    };
    const el = await mount(makeHass(defaults({}, extender, [])));
    expect(text(el)).toContain("No links stored on this device");
  });

  it("moves inert links out of controlled by on a device without buttons", async () => {
    const extender = {
      ...kp014,
      name: "Range Extender",
      address: "26.81.71",
      cat: 0,
      subcat: 0x1d,
      buttons: undefined,
    };
    const el = await mount(
      makeHass(
        defaults({}, extender, [
          rec({ is_controller: true, group: 1, data1: 3, data2: 21, data3: 158 }),
          rec({ group: 0, target: "60.79.C2", target_name: "Nook Light", data3: 0 }),
        ]),
      ),
    );
    const sections = [...el.shadowRoot!.querySelectorAll(".section")].map((section) =>
      section.textContent!.replace(/\s+/g, " "),
    );
    const controlledBy = sections.find((textContent) => textContent.includes("Controlled by"))!;
    expect(controlledBy).not.toContain("Nook Light");
    expect((el.shadowRoot!.querySelector("ha-expansion-panel") as any).header).toBe(
      "Other links (1)",
    );
    expect(text(el)).toContain("Controlled by Nook Light");
  });

  it("falls back to selectable tiles for an unknown model", async () => {
    const unknown = { ...kp014, cat: 0x07, subcat: 0x00, buttons: { 1: "sensor", 2: "relay" } };
    const el = await mount(makeHass(defaults({}, unknown)));
    const tiles = [...el.shadowRoot!.querySelectorAll(".tile")];
    expect(tiles.map((tile) => tile.getAttribute("role"))).toEqual(["tab", "tab"]);
    expect(tiles.map((tile) => tile.getAttribute("tabindex"))).toEqual(["0", "-1"]);
    expect(el.shadowRoot!.querySelector("#pane")).not.toBeNull();
    (tiles[1] as HTMLElement).click();
    await settle(el);
    expect(tiles[1].getAttribute("aria-selected")).toBe("true");
  });

  it("puts the header in the toolbar slot when narrow", async () => {
    const el = await mount(makeHass(defaults()), true);
    const headers = [...el.shadowRoot!.querySelectorAll("insteon-device-header")];
    expect(headers.length).toBe(1);
    expect(headers[0].getAttribute("slot")).toBe("header");
  });

  it("clears a pending load and its subscription when the device changes", async () => {
    const unsub = vi.fn(async () => {});
    const loading = { ...kp014, aldb_status: "loading" };
    let current: object = loading;
    const hass = makeHass(
      defaults(
        {
          "insteon/device/get": async () => current,
          "insteon/aldb/load": async () => undefined,
        },
        loading,
      ),
    );
    hass.connection.subscribeMessage = vi.fn(async () => unsub) as any;
    const el = await mount(hass);
    await (el as any)._readFromDevice();
    await settle(el);
    expect(text(el)).toContain("is loading");
    current = { ...kp014, name: "Second Device", address: "60.79.C2" };
    el.deviceId = "dev-3";
    await settle(el);
    expect(unsub).toHaveBeenCalled();
    const header = el.shadowRoot!.querySelector("insteon-device-header")!;
    expect(header.shadowRoot!.textContent).toContain("Second Device");
    expect(text(el)).not.toContain("is loading");
  });

  it("watches a read that was already running and refreshes when it finishes", async () => {
    let listener: ((message: { type: string; is_loading?: boolean }) => void) | undefined;
    const unsub = vi.fn(async () => {});
    let current: object = { ...kp014, aldb_status: "loading" };
    const hass = makeHass(defaults({ "insteon/device/get": async () => current }));
    hass.connection.subscribeMessage = vi.fn(async (callback: any) => {
      listener = callback;
      return unsub;
    }) as any;
    const el = await mount(hass);
    expect(text(el)).toContain("is loading");
    expect(hass.connection.subscribeMessage).toHaveBeenCalledTimes(1);
    current = kp014;
    listener!({ type: "status_changed", is_loading: false });
    await settle(el);
    expect(text(el)).not.toContain("is loading");
    expect(text(el)).toContain("Controls");
    expect(unsub).toHaveBeenCalled();
    expect(el._watchTimeout).toBeUndefined();
  });

  it("does not subscribe when the database is already loaded", async () => {
    const hass = makeHass(defaults());
    await mount(hass);
    expect(hass.connection.subscribeMessage).not.toHaveBeenCalled();
  });

  it("flags links that have not been written yet and marks their rows", async () => {
    const staged = [
      ...records,
      rec({
        is_controller: true,
        group: 3,
        target: "60.19.68",
        target_name: "Outlet",
        dirty: true,
      }),
    ];
    const el = await mount(makeHass(defaults({}, kp014, staged)));
    expect(text(el)).toContain("have not been written to the device yet");
    await select(el, 3);
    const t = text(el);
    expect(t).toContain("Outlet");
    expect(t).toContain("Not written yet");
  });

  it("does not ask an I/O Linc sensor for a modem link it never sends", async () => {
    const ioLinc = {
      ...kp014,
      cat: 0x07,
      subcat: 0x00,
      buttons: { 1: "relay", 2: "open_close_sensor" },
    };
    const el = await mount(
      makeHass(defaults({}, ioLinc, [rec({ is_controller: true, group: 1 })])),
    );
    const tiles = [...el.shadowRoot!.querySelectorAll(".tile")];
    (tiles[1] as HTMLElement).click();
    await settle(el);
    const t = text(el);
    expect(t).not.toContain("is not notified");
    expect(t).not.toContain("no control link");
  });
});

describe("load caption", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("only captions the load button while another button is selected", async () => {
    const el = await mount(makeHass(defaults()));
    const plate = () => el.shadowRoot!.querySelector("insteon-device-plate") as any;
    expect(plate().loadCaption).toBeUndefined();
    await select(el, 2);
    expect(plate().loadCaption).toBe("Load button: A");
    await select(el, 1);
    expect(plate().loadCaption).toBeUndefined();
  });
});
