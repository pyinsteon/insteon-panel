import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/components/ha-dialog", () => ({
  createCloseHeading: (_hass: unknown, title: string) => title,
}));
vi.mock("@ha/components/ha-form/ha-form", () => ({}));
vi.mock("@ha/components/ha-button", () => ({}));
vi.mock("@ha/resources/styles", () => ({ haStyleDialog: [] }));

import { localize } from "../src/localize/localize";
import "../src/device/properties/dialog-insteon-property";

const settle = async (el: any) => {
  for (let i = 0; i < 4; i += 1) {
    await el.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

describe("dialog-insteon-property", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("edits a bounded integer in a labelled number box with its range", async () => {
    const el = document.createElement("dialog-insteon-property") as any;
    document.body.appendChild(el);
    await el.showDialog({
      hass: { localize: (key: string) => key },
      insteon: {
        localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
      },
      record: { name: "led_brightness", value: 127, modified: false },
      schema: [
        { type: "integer", name: "led_brightness", required: true, valueMin: 0, valueMax: 255 },
      ],
      title: "Change Property Value",
      callback: async () => {},
    });
    await settle(el);
    const form = el.shadowRoot!.querySelector("ha-form") as any;
    expect(form.schema[0].selector.number).toEqual({ min: 0, max: 255, mode: "box" });
    expect(form.computeLabel(form.schema[0])).toBe("LED brightness");
    expect(form.computeHelper(form.schema[0])).toBe("0 to 255");
    expect(el.shadowRoot!.querySelector(".secondary")!.textContent).toBe("led_brightness");
  });

  const open = async (callback: (name: string, value: unknown) => Promise<void>) => {
    const el = document.createElement("dialog-insteon-property") as any;
    document.body.appendChild(el);
    await el.showDialog({
      hass: { localize: (key: string) => key },
      insteon: {
        localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
      },
      record: { name: "led_brightness", value: 127, modified: false },
      schema: [
        { type: "integer", name: "led_brightness", required: true, valueMin: 0, valueMax: 255 },
      ],
      title: "Change Property Value",
      callback,
    });
    await settle(el);
    return el;
  };

  const submitWith = async (el: any, value: unknown) => {
    el.shadowRoot!.querySelector("ha-form")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { led_brightness: value } } }),
    );
    await settle(el);
    const buttons = el.shadowRoot!.querySelectorAll("ha-button");
    buttons[buttons.length - 1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(el);
  };

  const formError = (el: any) =>
    (el.shadowRoot!.querySelector("ha-form") as any).error.led_brightness;

  it("keeps the dialog open and names the problem for a value outside the range", async () => {
    const callback = vi.fn(async () => {});
    const el = await open(callback);
    await submitWith(el, 256);
    expect(formError(el)).toBe("Enter a number from 0 to 255");
    expect(callback).not.toHaveBeenCalled();
    expect(el.shadowRoot!.querySelector("ha-dialog")).not.toBeNull();
  });

  it("rejects fractions and an empty box", async () => {
    const callback = vi.fn(async () => {});
    const el = await open(callback);
    await submitWith(el, 1.5);
    expect(formError(el)).toBe("Enter a whole number");
    await submitWith(el, undefined);
    expect(formError(el)).toBe("Enter a value");
    expect(callback).not.toHaveBeenCalled();
  });

  it("clears the error once a valid value is entered and submits it", async () => {
    const callback = vi.fn(async () => {});
    const el = await open(callback);
    await submitWith(el, 256);
    await submitWith(el, 255);
    expect(callback).toHaveBeenCalledWith("led_brightness", 255);
    expect(el.shadowRoot!.querySelector("ha-dialog")).toBeNull();
  });
});
