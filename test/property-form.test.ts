import { describe, expect, it } from "vitest";
import { propertyFormSchema, propertyRange } from "../src/device/properties/property-form";

describe("propertyFormSchema", () => {
  it("turns a bounded integer into a number box", () => {
    const schema = propertyFormSchema({
      type: "integer",
      name: "led_brightness",
      required: true,
      valueMin: 0,
      valueMax: 255,
    });
    expect(schema).toEqual({
      name: "led_brightness",
      required: true,
      selector: { number: { min: 0, max: 255, mode: "box" } },
    });
    expect(propertyRange(schema)).toEqual({ min: 0, max: 255 });
  });

  it("turns a boolean into a switch", () => {
    expect(
      propertyFormSchema({ type: "boolean", name: "program_lock_on", required: true }),
    ).toEqual({ name: "program_lock_on", required: true, selector: { boolean: {} } });
  });

  it("leaves selects and unbounded integers alone", () => {
    const select = {
      type: "select" as const,
      name: "toggle_button_b",
      required: true,
      options: [["toggle", "Toggle On/Off"]] as [string, string][],
    };
    expect(propertyFormSchema(select)).toBe(select);
    const open = { type: "integer" as const, name: "x10_house", required: true };
    expect(propertyFormSchema(open)).toBe(open);
    expect(propertyRange(select)).toBeUndefined();
  });
});
