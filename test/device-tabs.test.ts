import { describe, expect, it } from "vitest";
import { deviceTabs } from "../src/device/device-tabs";

const localize = (key: string) => key;

describe("deviceTabs", () => {
  it("points every tab at the given device", () => {
    expect(deviceTabs(localize, "dev-1").map((tab) => tab.path)).toEqual([
      "/insteon/device/overview/dev-1",
      "/insteon/device/properties/dev-1",
      "/insteon/device/aldb/dev-1",
    ]);
    expect(deviceTabs(localize, "dev-1").map((tab) => tab.name)).toEqual([
      "device.overview.caption",
      "properties.caption",
      "aldb.caption",
    ]);
  });

  it("builds new tab objects each time so a changed device is seen", () => {
    const first = deviceTabs(localize, "dev-1");
    const second = deviceTabs(localize, "dev-2");
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
    expect(first[0].path).toBe("/insteon/device/overview/dev-1");
    expect(second[0].path).toBe("/insteon/device/overview/dev-2");
  });
});
