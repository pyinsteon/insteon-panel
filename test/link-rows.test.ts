import { describe, expect, it } from "vitest";
import type { ALDBRecord } from "../src/data/device";
import {
  attributeRecords,
  buttonNotifiesModem,
  hasModemResponderLink,
  hasPendingRecords,
  rowDetail,
} from "../src/device/link-rows";
import type { LinkRow } from "../src/device/link-rows";

const MODEM = "70.8C.C4";

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

const names = (rows: LinkRow[]) => rows.map((r) => `${r.name}/${r.group}`);

describe("attributeRecords", () => {
  const kp014 = [1, 2, 3, 4];

  it("puts controller records on their group and responder records on data3", () => {
    const links = attributeRecords(
      [
        rec({ is_controller: true, group: 2, target: "60.19.68", target_name: "Outlet", data3: 2 }),
        rec({ group: 1, target: "39.43.A8", target_name: "Keypad", data3: 2 }),
      ],
      kp014,
      MODEM,
    );
    expect(names(links.byButton.get(2)!.controls)).toEqual(["Outlet/2"]);
    expect(names(links.byButton.get(2)!.controlledBy)).toEqual(["Keypad/1"]);
    expect(links.byButton.get(1)!.controls).toEqual([]);
    expect(links.other).toEqual([]);
  });

  it("gives the modem default link (group 0, any data3) to button 1 and collapses its variants", () => {
    const links = attributeRecords(
      [
        rec({ group: 0, data3: 158, data1: 3, data2: 21 }),
        rec({ group: 0, data3: 1 }),
        rec({ group: 0, data3: 0 }),
      ],
      kp014,
      MODEM,
    );
    const rows = links.byButton.get(1)!.controlledBy;
    expect(rows.length).toBe(1);
    expect(rows[0].isModem).toBe(true);
    expect(links.other).toEqual([]);
  });

  it("treats data3 0 from another device as the main button", () => {
    const links = attributeRecords(
      [rec({ group: 1, target: "60.79.C2", target_name: "Nook", data3: 0 })],
      kp014,
      MODEM,
    );
    expect(names(links.byButton.get(1)!.controlledBy)).toEqual(["Nook/1"]);
  });

  it("gives every responder record to the only button of a single button device", () => {
    const links = attributeRecords(
      [
        rec({ group: 3, target: "39.43.A8", target_name: "Keypad", data3: 158 }),
        rec({ group: 20, data3: 2 }),
      ],
      [1],
      MODEM,
    );
    expect(names(links.byButton.get(1)!.controlledBy)).toEqual([
      "Keypad/3",
      "PowerLinc USB Modem 70.8C.C4/20",
    ]);
  });

  it("sends controller records for a group that is not a button to other", () => {
    const links = attributeRecords(
      [
        rec({
          is_controller: true,
          group: 0,
          target: "60.79.C2",
          target_name: "Nook",
          data1: 3,
          data2: 28,
        }),
      ],
      [1],
      MODEM,
    );
    expect(links.byButton.get(1)!.controls).toEqual([]);
    expect(names(links.other)).toEqual(["Nook/0"]);
    expect(links.other[0].isController).toBe(true);
  });

  it("sends responder records with an unknown data3 on a multi button device to other", () => {
    const links = attributeRecords(
      [rec({ group: 4, target: "39.43.A8", target_name: "Keypad", data3: 158 })],
      kp014,
      MODEM,
    );
    expect(names(links.other)).toEqual(["Keypad/4"]);
  });

  it("ignores records that are not in use", () => {
    const links = attributeRecords(
      [rec({ in_use: false, is_controller: true, group: 1, target: "60.19.68" })],
      kp014,
      MODEM,
    );
    expect(links.byButton.get(1)!.controls).toEqual([]);
    expect(links.other).toEqual([]);
  });

  it("collapses records that differ only in memory address or data", () => {
    const links = attributeRecords(
      [
        rec({ mem_addr: 0x0fff, is_controller: true, group: 1, data1: 3, data2: 21, data3: 158 }),
        rec({ mem_addr: 0x0ff7, is_controller: true, group: 1, data1: 1, data2: 31, data3: 1 }),
      ],
      [1],
      MODEM,
    );
    expect(links.byButton.get(1)!.controls.length).toBe(1);
  });

  it("works without a modem address", () => {
    const links = attributeRecords([rec({ group: 0, data3: 158 })], kp014, undefined);
    expect(links.byButton.get(1)!.controlledBy).toEqual([]);
    expect(links.other.length).toBe(1);
    expect(links.other[0].isModem).toBe(false);
  });

  it("gives the modem default link to the load button when one is set", () => {
    const links = attributeRecords([rec({ group: 0, data3: 158 })], kp014, MODEM, 3);
    expect(links.byButton.get(3)!.controlledBy.length).toBe(1);
  });

  it("marks rows that have not been written yet", () => {
    const links = attributeRecords(
      [
        rec({
          is_controller: true,
          group: 1,
          target: "60.19.68",
          target_name: "Outlet",
          dirty: true,
        }),
      ],
      [1],
      MODEM,
    );
    expect(links.byButton.get(1)!.controls[0].pending).toBe(true);
  });
});

describe("rowDetail", () => {
  const modemRow: LinkRow = {
    target: MODEM,
    name: "modem",
    group: 0,
    data3: 0,
    isModem: true,
    isController: false,
    pending: false,
  };
  const deviceRow = (group: number, data3: number): LinkRow => ({
    target: "39.43.A8",
    name: "Keypad",
    group,
    data3,
    isModem: false,
    isController: false,
    pending: false,
  });

  it("explains modem rows", () => {
    expect(rowDetail(modemRow, "controls")).toEqual({ kind: "ha_notified" });
    expect(rowDetail(modemRow, "controlled_by")).toEqual({ kind: "ha_controls" });
    expect(rowDetail({ ...modemRow, group: 20 }, "controlled_by")).toEqual({
      kind: "scene",
      group: 20,
    });
  });

  it("names the other side's button when it has several", () => {
    expect(rowDetail(deviceRow(1, 2), "controlled_by", "keypad_6")).toEqual({
      kind: "button",
      layout: "keypad_6",
      group: 1,
    });
    expect(rowDetail(deviceRow(1, 2), "controls", "keypad_i3_4")).toEqual({
      kind: "button",
      layout: "keypad_i3_4",
      group: 2,
    });
    expect(rowDetail(deviceRow(1, 0), "controls", "keypad_i3_4")).toEqual({
      kind: "button",
      layout: "keypad_i3_4",
      group: 1,
    });
  });

  it("flags a controller group that is not a button on the controller", () => {
    expect(rowDetail(deviceRow(0, 0), "controlled_by", "paddle_bar")).toEqual({
      kind: "not_a_button",
      group: 0,
    });
  });

  it("flags a data3 value that is not a button on the target", () => {
    expect(rowDetail(deviceRow(1, 9), "controls", "keypad_i3_4")).toEqual({
      kind: "not_a_button_on_target",
      group: 9,
    });
  });

  it("says nothing for single button devices and unknown layouts", () => {
    expect(rowDetail(deviceRow(1, 1), "controlled_by", "paddle_bar")).toEqual({ kind: "none" });
    expect(rowDetail(deviceRow(1, 1), "controlled_by", undefined)).toEqual({ kind: "none" });
    expect(rowDetail(deviceRow(1, 1), "controlled_by", "none")).toEqual({ kind: "none" });
  });
});

describe("modem link diagnostics", () => {
  it("detects a missing responder link to the modem", () => {
    expect(hasModemResponderLink([rec({ group: 0 })], MODEM)).toBe(true);
    expect(
      hasModemResponderLink(
        [rec({ group: 0, in_use: false }), rec({ is_controller: true, group: 1 })],
        MODEM,
      ),
    ).toBe(false);
  });

  it("detects a button with no controller link to the modem", () => {
    expect(buttonNotifiesModem([rec({ is_controller: true, group: 3 })], MODEM, 3)).toBe(true);
    expect(buttonNotifiesModem([rec({ is_controller: true, group: 3 })], MODEM, 1)).toBe(false);
  });

  it("ignores links that have not been written yet", () => {
    expect(hasModemResponderLink([rec({ group: 0, dirty: true })], MODEM)).toBe(false);
    expect(
      buttonNotifiesModem([rec({ is_controller: true, group: 1, dirty: true })], MODEM, 1),
    ).toBe(false);
  });

  it("knows when any record is still waiting to be written", () => {
    expect(hasPendingRecords([rec({ group: 0 }), rec({ group: 1, dirty: true })])).toBe(true);
    expect(hasPendingRecords([rec({ group: 0 })])).toBe(false);
  });
});
