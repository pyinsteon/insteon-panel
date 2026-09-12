import { describe, expect, it } from "vitest";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import {
  catSubcatFromModel,
  insteonDeviceByAddress,
  modemAddress,
  normalizeAddress,
} from "../src/device/registry-lookup";

const entry = (
  id: string,
  address: string,
  model: string,
  via: string | null,
): DeviceRegistryEntry =>
  ({
    id,
    identifiers: [["insteon", address]],
    model,
    via_device_id: via,
  }) as unknown as DeviceRegistryEntry;

const devices: Record<string, DeviceRegistryEntry> = {
  modem: entry("modem", "70.8C.C4", "2413U (0x03, 0x15)", null),
  kpl: entry("kpl", "39.43.A8", "2334-232 (0x01, 0x42)", "modem"),
  orphan: entry("orphan", "26.81.71", "2992-222 (0x00, 0x1d)", null),
  other: {
    id: "other",
    identifiers: [["zwave", "1"]],
    model: null,
    via_device_id: null,
  } as unknown as DeviceRegistryEntry,
};

describe("registry lookup", () => {
  it("normalizes dotted and lowercase addresses", () => {
    expect(normalizeAddress("39.43.a8")).toBe("3943A8");
    expect(normalizeAddress("3943A8")).toBe("3943A8");
  });

  it("finds an insteon device by any address spelling", () => {
    expect(insteonDeviceByAddress(devices, "3943a8")!.id).toBe("kpl");
    expect(insteonDeviceByAddress(devices, "00.00.00")).toBeUndefined();
  });

  it("resolves the modem through via_device_id, then by category", () => {
    expect(modemAddress(devices, devices.kpl)).toBe("70.8C.C4");
    expect(modemAddress(devices, devices.orphan)).toBe("70.8C.C4");
    expect(modemAddress({ kpl: devices.kpl }, devices.kpl)).toBeUndefined();
  });

  it("reads cat and subcat out of the registry model string", () => {
    expect(catSubcatFromModel("2334-232 (0x01, 0x42)")).toEqual([1, 0x42]);
    expect(catSubcatFromModel("KP014")).toBeUndefined();
    expect(catSubcatFromModel(null)).toBeUndefined();
  });
});
