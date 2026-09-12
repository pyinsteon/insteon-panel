import { describe, expect, it } from "vitest";
import { buttonLabel, buttonTitle, plateGroups, plateLayout } from "../src/device/plate-layout";

const localize = (key: string, replace?: Record<string, unknown>) =>
  replace ? `${key}:${JSON.stringify(replace)}` : key;

describe("plateLayout", () => {
  it("maps the switchlinc family to the led bar paddle", () => {
    expect(plateLayout(0x01, 0x24)).toBe("paddle_bar");
    expect(plateLayout(0x01, 0x20)).toBe("paddle_bar");
    expect(plateLayout(0x02, 0x0a)).toBe("paddle_bar");
  });

  it("gives the 2477s the two indicator paddle", () => {
    expect(plateLayout(0x02, 0x2a)).toBe("paddle_pair");
  });

  it("maps the i3 devices", () => {
    expect(plateLayout(0x01, 0x57)).toBe("paddle_i3");
    expect(plateLayout(0x01, 0x58)).toBe("dial_i3");
    expect(plateLayout(0x01, 0x59)).toBe("keypad_i3_4");
    expect(plateLayout(0x02, 0x3f)).toBe("outlet_i3");
  });

  it("maps keypads including the countdown timers", () => {
    expect(plateLayout(0x01, 0x42)).toBe("keypad_6");
    expect(plateLayout(0x02, 0x1e)).toBe("keypad_6");
    expect(plateLayout(0x02, 0x26)).toBe("keypad_6");
    expect(plateLayout(0x01, 0x41)).toBe("keypad_8");
    expect(plateLayout(0x01, 0x05)).toBe("keypad_8");
    expect(plateLayout(0x02, 0x25)).toBe("keypad_8");
  });

  it("maps outlets", () => {
    expect(plateLayout(0x02, 0x39)).toBe("outlet_dual");
    expect(plateLayout(0x01, 0x21)).toBe("outlet_dimmer");
    expect(plateLayout(0x02, 0x08)).toBe("outlet_relay");
  });

  it("maps togglelinc, in-line, plug-in, micro and fanlinc to their own layouts", () => {
    expect(plateLayout(0x01, 0x17)).toBe("toggle");
    expect(plateLayout(0x02, 0x1a)).toBe("toggle");
    expect(plateLayout(0x01, 0x32)).toBe("inline");
    expect(plateLayout(0x02, 0x1f)).toBe("inline");
    expect(plateLayout(0x01, 0x0e)).toBe("plugin");
    expect(plateLayout(0x02, 0x37)).toBe("plugin");
    expect(plateLayout(0x01, 0x35)).toBe("micro");
    expect(plateLayout(0x02, 0x2f)).toBe("micro");
    expect(plateLayout(0x01, 0x2e)).toBe("fanlinc");
  });

  it("falls back to none instead of a paddle", () => {
    expect(plateLayout(0x01, 0x3a)).toBe("none");
    expect(plateLayout(0x01, 0x34)).toBe("none");
    expect(plateLayout(0x02, 0x20)).toBe("none");
    expect(plateLayout(0x03, 0x15)).toBe("none");
    expect(plateLayout(0x01, 0x7f)).toBe("none");
    expect(plateLayout(null, 0x24)).toBe("none");
    expect(plateLayout(0x01, undefined)).toBe("none");
  });
});

describe("plateGroups", () => {
  it("lists the groups each layout draws", () => {
    expect(plateGroups("paddle_bar")).toEqual([1]);
    expect(plateGroups("keypad_6")).toEqual([1, 3, 4, 5, 6]);
    expect(plateGroups("keypad_8")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plateGroups("keypad_i3_4")).toEqual([1, 2, 3, 4]);
    expect(plateGroups("outlet_dual")).toEqual([1, 2]);
    expect(plateGroups("fanlinc")).toEqual([1, 2]);
    expect(plateGroups("none")).toEqual([]);
  });
});

describe("buttonLabel", () => {
  it("returns what is printed on the key", () => {
    expect(buttonLabel("keypad_6", 1)).toBe("ON/OFF");
    expect(buttonLabel("keypad_6", 3)).toBe("A");
    expect(buttonLabel("keypad_8", 1)).toBe("MAIN");
    expect(buttonLabel("keypad_8", 8)).toBe("H");
    expect(buttonLabel("keypad_i3_4", 2)).toBe("B");
    expect(buttonLabel("paddle_bar", 1)).toBeUndefined();
  });
});

describe("buttonTitle", () => {
  it("names printed keys with the button word", () => {
    expect(buttonTitle("keypad_6", 3, localize)).toBe('device.overview.button.named:{"label":"A"}');
  });

  it("names unprinted controls by kind", () => {
    expect(buttonTitle("paddle_bar", 1, localize)).toBe("device.overview.button.paddle");
    expect(buttonTitle("outlet_dual", 2, localize)).toBe("device.overview.button.outlet_bottom");
    expect(buttonTitle("fanlinc", 2, localize)).toBe("device.overview.button.fan");
    expect(buttonTitle("dial_i3", 1, localize)).toBe("device.overview.button.dial");
    expect(buttonTitle("micro", 1, localize)).toBe("device.overview.button.load");
    expect(buttonTitle("none", 4, localize)).toBe('device.overview.button.group:{"group":4}');
  });
});
