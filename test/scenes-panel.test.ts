import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/layouts/hass-tabs-subpage-data-table", () => ({}));
vi.mock("@ha/components/ha-fab", () => ({}));
vi.mock("@ha/common/entity/compute_device_name", () => ({
  computeDeviceName: (device: { name: string }) => device.name,
}));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("../src/insteon-router", () => ({ insteonMainTabs: [] }));
vi.mock("@ha/data/entity_registry", () => ({
  fetchEntityRegistry: vi.fn(async () => [
    { platform: "insteon", unique_id: "aaaaaa_scene_21", area_id: "bedroom" },
    { platform: "insteon", unique_id: "aaaaaa_scene_20", area_id: null },
    { platform: "other", unique_id: "x_scene_20", area_id: "kitchen" },
  ]),
}));

import { InsteonScenesPanel } from "../src/insteon-scenes-panel";
import type { InsteonScenes } from "../src/data/scene";
import { localize } from "../src/localize/localize";

const devices = Object.fromEntries(
  [
    { id: "keypad", name: "Bedroom keypad", model: "KeypadLinc (0x01, 0x41)", address: "46.7B.ED" },
    { id: "remote", name: "Bed remote", model: "Mini Remote (0x00, 0x10)", address: "34.F9.CA" },
    { id: "switch", name: "Hall", model: "SwitchLinc (0x01, 0x20)", address: "4F.77.68" },
  ].map(({ address, ...entry }) => [entry.id, { ...entry, identifiers: [["insteon", address]] }]),
);

const scenes: InsteonScenes = {
  20: { name: "Evening", group: 20, devices: { "44.44.44": [] } },
  21: {
    name: "Bedtime",
    group: 21,
    devices: {},
    controllers: [
      { address: "467bed", group: 3 },
      { address: "34f9ca", group: 3 },
      { address: "4f7768", group: 1 },
      { address: "123456", group: 2 },
    ],
  },
};

const settle = async (element: InsteonScenesPanel): Promise<void> => {
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

describe("scenes panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("names each controller's device and button", async () => {
    const element = new InsteonScenesPanel();
    Object.assign(element, {
      hass: {
        callWS: vi.fn(async () => scenes),
        connection: {},
        devices,
        areas: { bedroom: { area_id: "bedroom", name: "Bedroom" } },
        localize: (key: string) => key,
      },
      insteon: {
        localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
      },
    });
    document.body.appendChild(element);
    await settle(element);
    const table = element.shadowRoot!.querySelector("hass-tabs-subpage-data-table") as any;
    expect(table.data.map((row: any) => row.controller_names)).toEqual([
      "Home Assistant Only",
      "Bedroom keypad - Button C, Bed remote - Button C, Hall, 123456 - Group 2",
    ]);
    expect(table.columns.controller_names).toMatchObject({ sortable: true, filterable: true });
    expect(table.data.map((row: any) => row.area)).toEqual([undefined, "Bedroom"]);
    expect(table.columns.area).toMatchObject({ title: "Area", sortable: true, filterable: true });
  });
});
