import { describe, expect, it } from "vitest";
import "../src/device/insteon-device-header";
import type { InsteonDeviceHeader } from "../src/device/insteon-device-header";
import type { InsteonDevice } from "../src/data/insteon";
import { localize } from "../src/localize/localize";

const device: InsteonDevice = {
  name: "Family Room Keypad OLD",
  address: "39.43.A8",
  is_battery: false,
  aldb_status: "loaded",
  cat: 1,
  subcat: 0x42,
  model: "2334-232",
  description: "Keypad with Dimmer",
  engine_version: "i2cs",
  firmware: 68,
  buttons: { 1: "dimmable_light_main" },
};

const mount = async (over: Partial<InsteonDevice> | undefined, narrow = false) => {
  const el = document.createElement("insteon-device-header") as InsteonDeviceHeader;
  el.insteon = {
    localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
  } as any;
  el.hass = {} as any;
  el.narrow = narrow;
  el.device = over === undefined ? undefined : { ...device, ...over };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

const text = (el: InsteonDeviceHeader) => el.shadowRoot!.textContent!.replace(/\s+/g, " ").trim();

describe("insteon-device-header", () => {
  it("shows the name, model line, status chip and labelled details", async () => {
    const el = await mount({});
    const r = el.shadowRoot!;
    expect(r.querySelector("h1")!.textContent).toBe("Family Room Keypad OLD");
    expect(text(el)).toContain("Keypad with Dimmer 2334-232 · 39.43.A8");
    const chip = r.querySelector(".chip")!;
    expect(chip.classList.contains("ok")).toBe(true);
    expect(chip.textContent!.replace(/\s+/g, " ").trim()).toBe("Link database: Loaded");
    const dts = [...r.querySelectorAll("dt")].map((d) => d.textContent);
    const dds = [...r.querySelectorAll("dd")].map((d) => d.textContent);
    expect(dts).toEqual(["Category / subcategory", "Engine version", "Firmware"]);
    expect(dds).toEqual(["0x01 / 0x42", "I2CS", "68"]);
  });

  it("uses the localized status names and the warning and error colours", async () => {
    expect(
      (await mount({ aldb_status: "partial" })).shadowRoot!.querySelector(".chip")!.className,
    ).toContain("warn");
    expect(text(await mount({ aldb_status: "partial" }))).toContain(
      "Link database: Partially loaded",
    );
    expect(
      (await mount({ aldb_status: "empty" })).shadowRoot!.querySelector(".chip")!.className,
    ).toContain("bad");
  });

  it("adds the not identified and battery chips only when they apply", async () => {
    const plain = await mount({});
    expect(text(plain)).not.toContain("Not identified");
    expect(text(plain)).not.toContain("Battery powered");
    const flagged = await mount({ firmware: 0, is_battery: true, engine_version: "i1" });
    expect(text(flagged)).toContain("Not identified");
    expect(text(flagged)).toContain("Battery powered");
    expect([...flagged.shadowRoot!.querySelectorAll("dt")].map((d) => d.textContent)).toEqual([
      "Category / subcategory",
      "Engine version",
    ]);
  });

  it("renders an empty title while the device is loading", async () => {
    const el = await mount(undefined);
    expect(el.shadowRoot!.querySelector("h1")!.textContent).toBe("");
    expect(el.shadowRoot!.querySelector(".chip")).toBeNull();
  });

  it("collapses to one toolbar line when narrow", async () => {
    const el = await mount({}, true);
    const r = el.shadowRoot!;
    expect(r.querySelector("h1")).toBeNull();
    expect(r.querySelector(".bar-name")!.textContent).toBe("Family Room Keypad OLD");
    expect(r.querySelector("slot")).not.toBeNull();
  });
});
