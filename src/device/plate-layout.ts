export type PlateLayout =
  | "paddle_bar"
  | "paddle_pair"
  | "paddle_i3"
  | "keypad_i3_4"
  | "keypad_6"
  | "keypad_8"
  | "dial_i3"
  | "outlet_dual"
  | "outlet_i3"
  | "outlet_dimmer"
  | "outlet_relay"
  | "toggle"
  | "inline"
  | "plugin"
  | "micro"
  | "fanlinc"
  | "none";

// cat/subcat pairs from pyinsteon/device_types/ipdb.py; a pair missing here gets "none"
const TABLE: [PlateLayout, number, number[]][] = [
  [
    "paddle_bar",
    0x01,
    [0x01, 0x03, 0x04, 0x13, 0x19, 0x1d, 0x1e, 0x20, 0x24, 0x27, 0x2b, 0x2d, 0x30, 0x31],
  ],
  ["paddle_bar", 0x02, [0x0a, 0x0b, 0x0e, 0x13, 0x15, 0x16, 0x18, 0x19, 0x1c, 0x29]],
  ["paddle_pair", 0x02, [0x23, 0x2a]],
  ["paddle_i3", 0x01, [0x57]],
  ["keypad_i3_4", 0x01, [0x59]],
  ["keypad_6", 0x01, [0x09, 0x0a, 0x1b, 0x29, 0x2f, 0x42]],
  ["keypad_6", 0x02, [0x0f, 0x1e, 0x26, 0x2c]],
  ["keypad_8", 0x01, [0x05, 0x0c, 0x1c, 0x41]],
  ["keypad_8", 0x02, [0x05, 0x25]],
  ["dial_i3", 0x01, [0x58]],
  ["outlet_dual", 0x02, [0x39]],
  ["outlet_i3", 0x02, [0x3f]],
  ["outlet_dimmer", 0x01, [0x21]],
  ["outlet_relay", 0x02, [0x08, 0x21]],
  ["toggle", 0x01, [0x17, 0x1f]],
  ["toggle", 0x02, [0x0d, 0x1a]],
  ["inline", 0x01, [0x02, 0x18, 0x1a, 0x25, 0x2c, 0x32, 0x3d, 0x3e, 0x3f, 0x40]],
  ["inline", 0x02, [0x10, 0x12, 0x14, 0x1f, 0x22, 0x2b]],
  ["plugin", 0x01, [0x00, 0x06, 0x07, 0x0b, 0x0d, 0x0e, 0x0f, 0x11, 0x12, 0x22, 0x23, 0x2a]],
  ["plugin", 0x02, [0x06, 0x07, 0x09, 0x0c, 0x17, 0x2d, 0x30, 0x35, 0x36, 0x37, 0x38]],
  ["micro", 0x01, [0x35, 0x38, 0x39]],
  ["micro", 0x02, [0x2f, 0x31, 0x32]],
  ["fanlinc", 0x01, [0x2e]],
];

const LOOKUP = new Map<number, PlateLayout>();
TABLE.forEach(([layout, cat, subcats]) => {
  subcats.forEach((subcat) => LOOKUP.set(cat * 256 + subcat, layout));
});

export const plateLayout = (cat?: number | null, subcat?: number | null): PlateLayout => {
  if (cat === undefined || cat === null || subcat === undefined || subcat === null) {
    return "none";
  }
  return LOOKUP.get(cat * 256 + subcat) ?? "none";
};

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const GROUPS: Record<PlateLayout, number[]> = {
  paddle_bar: [1],
  paddle_pair: [1],
  paddle_i3: [1],
  keypad_i3_4: [1, 2, 3, 4],
  keypad_6: [1, 3, 4, 5, 6],
  keypad_8: [1, 2, 3, 4, 5, 6, 7, 8],
  dial_i3: [1],
  outlet_dual: [1, 2],
  outlet_i3: [1, 2],
  outlet_dimmer: [1],
  outlet_relay: [1],
  toggle: [1],
  inline: [1],
  plugin: [1],
  micro: [1],
  fanlinc: [1, 2],
  none: [],
};

const KINDS: Partial<Record<PlateLayout, Record<number, string>>> = {
  paddle_bar: { 1: "paddle" },
  paddle_pair: { 1: "paddle" },
  paddle_i3: { 1: "paddle" },
  dial_i3: { 1: "dial" },
  outlet_dual: { 1: "outlet_top", 2: "outlet_bottom" },
  outlet_i3: { 1: "outlet_top", 2: "outlet_bottom" },
  outlet_dimmer: { 1: "outlet_top" },
  outlet_relay: { 1: "outlet_top" },
  toggle: { 1: "toggle" },
  inline: { 1: "load" },
  plugin: { 1: "load" },
  micro: { 1: "load" },
  fanlinc: { 1: "light", 2: "fan" },
};

export const plateGroups = (layout: PlateLayout): number[] => GROUPS[layout];

export const buttonLabel = (layout: PlateLayout, group: number): string | undefined => {
  if (layout === "keypad_i3_4") {
    return LETTERS[group - 1];
  }
  if (layout === "keypad_6") {
    return group === 1 ? "ON/OFF" : LETTERS[group - 3];
  }
  if (layout === "keypad_8") {
    return group === 1 ? "MAIN" : LETTERS[group - 1];
  }
  return undefined;
};

export const buttonTitle = (
  layout: PlateLayout,
  group: number,
  localize: (key: string, replace?: Record<string, unknown>) => string,
): string => {
  const label = buttonLabel(layout, group);
  if (label) {
    return localize("device.overview.button.named", { label });
  }
  const kind = KINDS[layout]?.[group];
  if (kind) {
    return localize("device.overview.button." + kind);
  }
  return localize("device.overview.button.group", { group });
};
