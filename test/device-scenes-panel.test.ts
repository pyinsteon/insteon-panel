import { render } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/layouts/hass-tabs-subpage-data-table", () => ({}));
vi.mock("@ha/components/ha-button", () => ({}));
vi.mock("@ha/components/ha-dialog", () => ({}));
vi.mock("@ha/components/ha-spinner", () => ({}));
vi.mock("@ha/common/entity/compute_device_name", () => ({
  computeDeviceName: (device: { name: string }) => device.name,
}));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("@ha/data/device_registry", () => ({ fetchDeviceRegistry: vi.fn() }));
vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showPromptDialog: vi.fn(),
}));

import { navigate } from "@ha/common/navigate";
import { fetchDeviceRegistry } from "@ha/data/device_registry";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { showAlertDialog, showPromptDialog } from "@ha/dialogs/generic/show-dialog-box";
import { DeviceScenesPanel } from "../src/config/device-scenes-panel";
import type { InsteonDeviceScene } from "../src/data/scene";
import { localize } from "../src/localize/localize";

const registry = [
  {
    id: "keypad",
    name: "Kitchen keypad",
    model: "KeypadLinc (0x01, 0x41)",
    address: "22.22.22",
    area_id: "kitchen",
  },
  { id: "light", name: "Island", model: "SwitchLinc (0x01, 0x20)", address: "44.44.44" },
  { id: "remote", name: "Remote", model: "Mini Remote (0x00, 0x10)", address: "66.66.66" },
  { id: "lamp", name: "Lamp", model: "LampLinc (0x01, 0x0e)", address: "77.77.77" },
  {
    id: "remote4",
    name: "Bed remote",
    model: "Mini Remote - 4 Scene (0x00, 0x1b)",
    address: "88.88.88",
  },
  {
    id: "remote8",
    name: "Couch remote",
    model: "Mini Remote - 8 Scene (0x00, 0x12)",
    address: "99.99.99",
  },
].map(
  ({ address, ...entry }) =>
    ({ ...entry, identifiers: [["insteon", address]] }) as unknown as DeviceRegistryEntry,
);

const ready: InsteonDeviceScene = {
  controllers: [{ address: "222222", group: 3 }],
  links: [{ address: "444444", data1: 128, data2: 28, data3: 1 }],
  issues: [],
  importable: true,
};
const blocked: InsteonDeviceScene = {
  controllers: [{ address: "222222", group: 4 }],
  links: [],
  issues: ["Read the complete All-Link Database for 55.55.55"],
  importable: false,
};

const settle = async (element: DeviceScenesPanel): Promise<void> => {
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const mount = async (callWS: (message: Record<string, unknown>) => Promise<unknown>) => {
  vi.mocked(fetchDeviceRegistry).mockResolvedValue(registry);
  const element = new DeviceScenesPanel();
  Object.assign(element, {
    hass: {
      callWS: vi.fn(callWS),
      connection: {},
      localize: (key: string) => key,
      areas: { kitchen: { area_id: "kitchen", name: "Kitchen" } },
    },
    insteon: {
      localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
    },
  });
  document.body.appendChild(element);
  await settle(element);
  const table = element.shadowRoot!.querySelector("hass-tabs-subpage-data-table") as any;
  return { element, table };
};

const importButton = (table: any, index: number): HTMLElement => {
  const container = document.createElement("div");
  render(table.columns.actions.template(table.data[index]), container);
  return container.querySelector("ha-button")!;
};

describe("device scenes panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("names controllers and responders and explains blocked scenes", async () => {
    const { table } = await mount(async () => [ready, blocked]);
    expect(
      table.data.map((row: any) => [row.controllers, row.area, row.responders, row.status]),
    ).toEqual([
      ["Kitchen keypad - Button C", "Kitchen", "Island (50%)", "Ready to import"],
      [
        "Kitchen keypad - Button D",
        "Kitchen",
        "",
        "Read the complete All-Link Database for 55.55.55",
      ],
    ]);
    expect((importButton(table, 0) as any).disabled).toBe(false);
    expect((importButton(table, 1) as any).disabled).toBe(true);
  });

  it("names single-output responders without their output", async () => {
    const mixed: InsteonDeviceScene = {
      ...ready,
      links: [
        { address: "777777", data1: 255, data2: 28, data3: 1 },
        { address: "444444", data1: 0, data2: 28, data3: 0 },
        { address: "222222", data1: 255, data2: 28, data3: 4 },
      ],
    };
    const { table } = await mount(async () => [mixed]);
    expect(table.data[0].responders).toBe(
      "Lamp (100%), Island (0%), Kitchen keypad - Button D (100%)",
    );
  });

  it("names single-output controllers without their output", async () => {
    const paddle: InsteonDeviceScene = {
      ...ready,
      controllers: [
        { address: "444444", group: 1 },
        { address: "222222", group: 3 },
      ],
    };
    vi.mocked(showPromptDialog).mockResolvedValue(null);
    const { element, table } = await mount(async () => [paddle]);
    expect(table.data[0].controllers).toBe("Island, Kitchen keypad - Button C");
    importButton(table, 0).dispatchEvent(new Event("click"));
    await settle(element);
    expect(showPromptDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ defaultValue: "Island" }),
    );
  });

  it("names mini remote buttons by letter", async () => {
    const remotes: InsteonDeviceScene = {
      ...ready,
      controllers: [
        { address: "888888", group: 1 },
        { address: "888888", group: 3 },
        { address: "999999", group: 1 },
        { address: "999999", group: 2 },
        { address: "999999", group: 7 },
        { address: "999999", group: 9 },
      ],
    };
    const { table } = await mount(async () => [remotes]);
    expect(table.data[0].controllers.split(", ")).toEqual([
      "Bed remote - Button A",
      "Bed remote - Button C",
      "Couch remote - Button B",
      "Couch remote - Button A",
      "Couch remote - Button H",
      "Couch remote - Group 9",
    ]);
  });

  it("lists each distinct controller area and skips controllers without one", async () => {
    const shared: InsteonDeviceScene = {
      ...ready,
      controllers: [
        { address: "222222", group: 3 },
        { address: "666666", group: 1 },
        { address: "222222", group: 4 },
      ],
    };
    const { table } = await mount(async () => [shared]);
    expect(table.data[0].area).toBe("Kitchen");
    expect(table.columns.area.title).toBe("Area");
  });

  it("imports with the chosen name and opens the new scene", async () => {
    vi.mocked(showPromptDialog).mockResolvedValue("Evening");
    const { element, table } = await mount(async (message) =>
      message.type === "insteon/scene/import" ? { scene_id: 21, result: true } : [ready],
    );
    importButton(table, 0).dispatchEvent(new Event("click"));
    await settle(element);
    expect(showPromptDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ defaultValue: "Kitchen keypad - Button C" }),
    );
    expect(element.hass.callWS).toHaveBeenCalledWith({
      type: "insteon/scene/import",
      name: "Evening",
      controllers: ready.controllers,
    });
    expect(navigate).toHaveBeenCalledWith("/insteon/scene/21");
  });

  it("shows progress while the import runs", async () => {
    vi.mocked(showPromptDialog).mockResolvedValue("Evening");
    let finish!: (result: { scene_id: number; result: boolean }) => void;
    const { element, table } = await mount((message) =>
      message.type === "insteon/scene/import"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve([ready]),
    );
    importButton(table, 0).dispatchEvent(new Event("click"));
    await settle(element);
    const dialog = element.shadowRoot!.querySelector("ha-dialog") as HTMLElement & {
      heading: string;
    };
    expect(dialog.heading).toBe("Importing scene");
    expect(dialog.querySelector("ha-spinner")).not.toBeNull();
    expect(dialog.textContent).toContain("writing links to each device");
    expect((importButton(table, 0) as any).disabled).toBe(true);
    finish({ scene_id: 21, result: true });
    await settle(element);
    expect(element.shadowRoot!.querySelector("ha-dialog")).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/insteon/scene/21");
  });

  it("does nothing when the name prompt is cancelled", async () => {
    vi.mocked(showPromptDialog).mockResolvedValue(null);
    const { element, table } = await mount(async () => [ready]);
    importButton(table, 0).dispatchEvent(new Event("click"));
    await settle(element);
    expect(element.hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("shows import errors and refreshes the list", async () => {
    vi.mocked(showPromptDialog).mockResolvedValue("Evening");
    const { element, table } = await mount(async (message) => {
      if (message.type === "insteon/scene/import") {
        throw { code: "scene_error", message: "The device scene was not found" };
      }
      return [ready];
    });
    importButton(table, 0).dispatchEvent(new Event("click"));
    await settle(element);
    expect(showAlertDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ text: "The device scene was not found" }),
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(element.hass.callWS)
        .mock.calls.filter(
          ([message]) => (message as { type: string }).type === "insteon/scenes/device_scenes",
        ),
    ).toHaveLength(2);
  });
});
