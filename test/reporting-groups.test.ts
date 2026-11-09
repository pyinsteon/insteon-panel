import { describe, expect, it } from "vitest";
import type { InsteonDevice } from "../src/data/insteon";
import { modemLinkNeeds, stateGroups } from "../src/device/reporting-groups";

const device = (over: Partial<InsteonDevice>): InsteonDevice => ({
  name: "Device",
  address: "11.22.33",
  is_battery: false,
  aldb_status: "loaded",
  ...over,
});

describe("stateGroups", () => {
  it("takes the plate's buttons for a known layout and the state groups otherwise", () => {
    expect(stateGroups(device({ cat: 1, subcat: 0x59 }))).toEqual([1, 2, 3, 4]);
    expect(stateGroups(device({ cat: 0x10, subcat: 0x01, buttons: { 3: "c", 1: "a" } }))).toEqual([
      1, 3,
    ]);
    expect(stateGroups(device({ cat: 0, subcat: 0x1d }))).toEqual([]);
  });
});

describe("modemLinkNeeds", () => {
  it("asks an I/O Linc for its group 1 controller link only", () => {
    const ioLinc = device({ cat: 7, subcat: 0, buttons: { 1: "relay", 2: "open_close_sensor" } });
    expect(modemLinkNeeds(ioLinc)).toEqual({ controllers: [1], responder: false });
    expect(modemLinkNeeds(device({ cat: 7, subcat: 0x0d }))).toEqual({
      controllers: [1],
      responder: false,
    });
  });

  it("asks a thermostat for its five reporting groups and the responder link", () => {
    const thermostat = device({ cat: 5, subcat: 8, buttons: { 1: "cooling", 10: "temperature" } });
    expect(modemLinkNeeds(thermostat)).toEqual({
      controllers: [1, 2, 3, 4, 0xef],
      responder: true,
    });
    expect(modemLinkNeeds(device({ cat: 5, subcat: 7 })).controllers).toEqual([1, 2, 3, 4, 0xef]);
    expect(modemLinkNeeds(device({ cat: 5, subcat: 0x0b }))).toEqual({
      controllers: [1, 2, 3, 4, 0xef],
      responder: true,
    });
    expect(modemLinkNeeds(device({ cat: 5, subcat: 0x11 })).responder).toBe(true);
    expect(modemLinkNeeds(device({ cat: 5, subcat: 0x18 })).controllers).toContain(0xef);
  });

  it("asks every other device for one controller link per button", () => {
    expect(modemLinkNeeds(device({ cat: 1, subcat: 0x2e }))).toEqual({
      controllers: [1, 2],
      responder: true,
    });
    expect(
      modemLinkNeeds(device({ cat: 0x10, subcat: 0x01, buttons: { 1: "a", 2: "b" } })),
    ).toEqual({
      controllers: [1, 2],
      responder: true,
    });
  });
});
