import { describe, expect, it } from "vitest";
import "../src/device/insteon-device-plate";
import type { InsteonDevicePlate } from "../src/device/insteon-device-plate";

export const renderPlate = async (
  cat: number,
  subcat: number,
  names: Record<number, string> = {},
): Promise<InsteonDevicePlate> => {
  const el = document.createElement("insteon-device-plate") as InsteonDevicePlate;
  el.cat = cat;
  el.subcat = subcat;
  el.names = names;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

export const root = (el: InsteonDevicePlate) => el.shadowRoot!;

export const click = (target: Element) =>
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

describe("insteon-device-plate scaffold", () => {
  it("renders nothing for an unmapped device", async () => {
    const el = await renderPlate(0x03, 0x15);
    expect(root(el).querySelector("svg")).toBeNull();
  });

  it("fires the selected group on click and on enter", async () => {
    const el = await renderPlate(0x01, 0x42);
    const seen: number[] = [];
    el.addEventListener("insteon-button-selected", (ev) => {
      seen.push((ev as CustomEvent<{ group: number }>).detail.group);
    });
    const key = root(el).querySelector('.key[data-group="3"]')!;
    click(key);
    key.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toEqual([3, 3]);
  });

  it("labels keys from the names map", async () => {
    const el = await renderPlate(0x01, 0x42, { 3: "Button A" });
    expect(root(el).querySelector('.key[data-group="3"]')!.getAttribute("aria-label")).toBe(
      "Button A",
    );
  });

  it("renders a single button plate as a picture with an inert key", async () => {
    const el = await renderPlate(0x01, 0x24);
    el.selected = 1;
    el.label = "SwitchLinc Dimmer";
    await el.updateComplete;
    const r = root(el);
    expect(r.querySelector("svg")!.getAttribute("role")).toBe("img");
    expect(r.querySelector("svg")!.getAttribute("aria-label")).toBe("SwitchLinc Dimmer");
    const key = r.querySelector(".key")!;
    expect(key.classList.contains("selected")).toBe(false);
    expect(key.hasAttribute("role")).toBe(false);
    expect(key.hasAttribute("tabindex")).toBe(false);
  });
});

describe("switchlinc led bar paddle", () => {
  it("draws a bezel and nine equal leds on the left strip, top half only", async () => {
    const el = await renderPlate(0x01, 0x24);
    const r = root(el);
    expect(r.querySelector(".bezel")).not.toBeNull();
    const leds = [...r.querySelectorAll(".led")];
    expect(leds.length).toBe(9);
    expect(new Set(leds.map((c) => c.getAttribute("cx")))).toEqual(new Set(["4"]));
    expect(new Set(leds.map((c) => c.getAttribute("r")))).toEqual(new Set(["2"]));
    const ys = leds.map((c) => Number(c.getAttribute("cy")));
    expect(ys[0]).toBe(11);
    expect(ys[8]).toBeCloseTo(78.6, 1);
    expect(ys[8] - ys[7]).toBeGreaterThan(ys[2] - ys[1]);
  });

  it("puts the set button under the paddle inside the bezel, black on the 2474dwh", async () => {
    const white = await renderPlate(0x01, 0x20);
    expect(white.shadowRoot!.querySelector(".tab.dark")).toBeNull();
    const dwh = await renderPlate(0x01, 0x24);
    const tab = dwh.shadowRoot!.querySelector(".tab")!;
    expect(tab.classList.contains("dark")).toBe(true);
    expect(Number(tab.getAttribute("y"))).toBe(152);
    expect(Number(tab.getAttribute("width"))).toBe(12);
  });

  it("uses the same drawing for the 2476s relay", async () => {
    const el = await renderPlate(0x02, 0x0a);
    expect(root(el).querySelectorAll(".led").length).toBe(9);
  });
});

describe("switchlinc two indicator paddle", () => {
  it("draws the on led at the top and the off led at mid paddle, same size", async () => {
    const el = await renderPlate(0x02, 0x2a);
    const leds = [...root(el).querySelectorAll(".led")];
    expect(leds.length).toBe(2);
    expect(leds.map((c) => c.getAttribute("r"))).toEqual(["2", "2"]);
    expect(leds.map((c) => c.getAttribute("cy"))).toEqual(["10", "78"]);
    expect(leds.map((c) => c.getAttribute("cx"))).toEqual(["4", "4"]);
    expect(root(el).querySelector(".bezel")).not.toBeNull();
  });
});

describe("i3 paddle", () => {
  it("fills the insert with no bezel, one small led and a slot in the lip", async () => {
    const el = await renderPlate(0x01, 0x57);
    const r = root(el);
    expect(r.querySelector(".bezel")).toBeNull();
    const face = r.querySelector(".key .face")!;
    expect(face.getAttribute("width")).toBe("79");
    expect(face.getAttribute("height")).toBe("159");
    const leds = r.querySelectorAll(".led");
    expect(leds.length).toBe(1);
    expect(leds[0].getAttribute("r")).toBe("1.2");
    expect(leds[0].getAttribute("cx")).toBe("8");
    const slot = r.querySelector(".slot.lip")!;
    expect(slot.getAttribute("width")).toBe("27");
    expect(Number(slot.getAttribute("y"))).toBeCloseTo(154.5, 1);
  });
});

describe("kp014 keypad", () => {
  it("draws four blank rows with a led each and keeps separators when selected", async () => {
    const el = await renderPlate(0x01, 0x59, { 1: "Button A", 2: "Button B" });
    el.selected = 1;
    await el.updateComplete;
    const r = root(el);
    const keys = r.querySelectorAll(".key");
    expect(keys.length).toBe(4);
    expect(r.querySelectorAll(".print").length).toBe(0);
    expect(r.querySelectorAll(".led").length).toBe(4);
    expect([...r.querySelectorAll(".led")].map((c) => c.getAttribute("cy"))).toEqual([
      "9.2",
      "49.2",
      "89.2",
      "129.2",
    ]);
    expect(r.querySelectorAll("line.hair").length).toBe(3);
    expect(keys[0].classList.contains("selected")).toBe(true);
    expect(keys[0].getAttribute("aria-label")).toBe("Button A");
    expect(r.querySelector(".slot.lip")!.getAttribute("width")).toBe("26");
  });
});

describe("keypadlinc 6", () => {
  it("draws on and off as one key with two faces and four portrait scene keys", async () => {
    const el = await renderPlate(0x01, 0x42);
    const r = root(el);
    const keys = [...r.querySelectorAll(".key")];
    expect(keys.length).toBe(5);
    expect(keys[0].querySelectorAll(".face").length).toBe(2);
    const a = keys[1].querySelector(".face")!;
    expect(Number(a.getAttribute("width"))).toBeCloseTo(33.5, 1);
    expect(Number(a.getAttribute("height"))).toBeCloseTo(33.75, 1);
    expect(r.querySelectorAll(".print").length).toBe(6);
    expect(r.textContent).not.toContain("scene");
    expect(r.querySelector(".tab")!.getAttribute("width")).toBe("18");
    expect(r.querySelectorAll(".led").length).toBe(0);
  });

  it("rings both faces of the on/off pair when group 1 is selected", async () => {
    const el = await renderPlate(0x02, 0x1e);
    el.selected = 1;
    await el.updateComplete;
    expect(root(el).querySelectorAll(".key.selected").length).toBe(1);
    expect(root(el).querySelectorAll(".key.selected .face").length).toBe(2);
  });
});

describe("keypadlinc 8", () => {
  it("draws eight keys with main on/off in the top left", async () => {
    const el = await renderPlate(0x01, 0x41);
    const r = root(el);
    const keys = [...r.querySelectorAll(".key")];
    expect(keys.length).toBe(8);
    expect(keys[0].textContent).toContain("MAIN");
    expect(keys[0].textContent).not.toContain("On/Off");
    expect(keys[0].querySelector(".print")!.getAttribute("font-size")).toBe("6");
    expect(keys[7].textContent).toContain("H");
    expect(r.querySelectorAll(".print.bold").length).toBe(1);
  });
});

describe("i3 dial", () => {
  it("draws a knob 0.87 of the insert width with a shadow and no leds", async () => {
    const el = await renderPlate(0x01, 0x58);
    const r = root(el);
    const knob = r.querySelector(".key .face.knob")!;
    expect(knob.getAttribute("r")).toBe("34.8");
    expect(knob.getAttribute("cx")).toBe("40");
    expect(r.querySelector(".shadow")).not.toBeNull();
    expect(r.querySelectorAll(".led").length).toBe(0);
    expect(r.querySelector(".tab")).toBeNull();
  });
});

describe("on/off outlet", () => {
  it("uses invisible hit regions on a flat face with pills and ring leds at x 14.4", async () => {
    const el = await renderPlate(0x02, 0x39);
    const r = root(el);
    expect(r.querySelectorAll(".key .hit").length).toBe(2);
    expect(r.querySelectorAll(".key .face").length).toBe(0);
    const pills = r.querySelectorAll("rect.btn");
    expect(pills.length).toBe(2);
    expect(pills[0].getAttribute("width")).toBe("24");
    const leds = [...r.querySelectorAll(".led")];
    expect(leds.map((c) => c.getAttribute("cx"))).toEqual(["14.4", "14.4"]);
    expect(leds[0].getAttribute("r")).toBe("2.3");
    expect(r.querySelectorAll(".slot").length).toBe(6);
  });
});

describe("i3 outlet", () => {
  it("draws round buttons and tiny leds at x 24.8", async () => {
    const el = await renderPlate(0x02, 0x3f);
    const r = root(el);
    const buttons = r.querySelectorAll("circle.btn");
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute("r")).toBe("6.4");
    const leds = [...r.querySelectorAll(".led")];
    expect(leds.map((c) => c.getAttribute("cx"))).toEqual(["24.8", "24.8"]);
    expect(leds[0].getAttribute("r")).toBe("0.8");
    expect(r.querySelector(".slot")!.getAttribute("width")).toBe("5");
  });
});

describe("outletlinc dimmer", () => {
  it("keys only the upper receptacle and draws a vertical oval", async () => {
    const el = await renderPlate(0x01, 0x21);
    const r = root(el);
    expect(r.querySelectorAll(".key").length).toBe(1);
    expect(r.querySelector(".keyed")).not.toBeNull();
    expect(r.querySelectorAll(".print").length).toBe(0);
    const oval = r.querySelector("rect.btn")!;
    expect(oval.getAttribute("height")).toBe("28.8");
    expect(oval.getAttribute("x")).toBe("9.6");
    const ledEl = r.querySelector(".led")!;
    expect(ledEl.getAttribute("cx")).toBe("56");
    expect(ledEl.getAttribute("r")).toBe("2.4");
    expect(r.querySelector(".dim")).not.toBeNull();
    expect(r.querySelector(".dim .key")).toBeNull();
  });
});

describe("outletlinc relay", () => {
  it("centres the led above a pill", async () => {
    const el = await renderPlate(0x02, 0x08);
    const r = root(el);
    expect(r.querySelector(".keyed")).toBeNull();
    expect(r.querySelectorAll(".print").length).toBe(0);
    expect(r.querySelectorAll(".key").length).toBe(1);
    const pill = r.querySelector("rect.btn")!;
    expect(pill.getAttribute("x")).toBe("31");
    expect(pill.getAttribute("width")).toBe("18");
    const ledEl = r.querySelector(".led")!;
    expect(ledEl.getAttribute("cx")).toBe("40");
    expect(ledEl.getAttribute("cy")).toBe("72");
  });
});

describe("togglelinc", () => {
  it("draws a lever in a toggle opening with one led and a set tab beside it", async () => {
    const el = await renderPlate(0x02, 0x1a);
    const r = root(el);
    expect(r.querySelector(".opening")).not.toBeNull();
    expect(r.querySelector(".key .face.lever")).not.toBeNull();
    const leds = r.querySelectorAll(".led");
    expect(leds.length).toBe(1);
    expect(leds[0].getAttribute("cy")).toBe("104");
    const tabEl = r.querySelector(".tab")!;
    expect(tabEl.getAttribute("width")).toBe("8");
    expect(Number(tabEl.getAttribute("x"))).toBeLessThan(40);
  });
});

describe("in-line module", () => {
  it("draws the round dimple, three square buttons and two leds on a portrait face", async () => {
    const el = await renderPlate(0x02, 0x1f);
    const r = root(el);
    expect(r.querySelector(".plate")).toBeNull();
    expect(r.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 80 120");
    expect(r.querySelectorAll("circle.btn").length).toBe(1);
    expect(r.querySelectorAll("rect.btn").length).toBe(3);
    expect(r.querySelectorAll(".print").length).toBe(0);
    expect(r.querySelectorAll(".led").length).toBe(2);
    expect(r.querySelectorAll(".key").length).toBe(1);
  });
});

describe("plug-in module", () => {
  it("draws a tall body with a receptacle, led strip and edge rocker", async () => {
    const el = await renderPlate(0x01, 0x0e);
    const r = root(el);
    expect(r.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 86 127");
    expect(r.querySelector(".led.strip")).not.toBeNull();
    expect(r.querySelector(".wordmark")).toBeNull();
    expect(r.querySelectorAll(".slot").length).toBe(3);
    expect(r.querySelector("rect.btn")!.getAttribute("x")).toBe("80");
  });
});

describe("micro module", () => {
  it("draws an octagon body with the on/off/set glyph and paired terminals", async () => {
    const el = await renderPlate(0x01, 0x35);
    const r = root(el);
    expect(r.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 100 100");
    expect(r.querySelector("polygon.face")).not.toBeNull();
    expect(r.querySelectorAll(".term").length).toBe(4);
    expect(r.querySelectorAll("circle.btn").length).toBe(3);
    expect(r.querySelectorAll(".print").length).toBe(0);
    const ledEl = r.querySelector(".led")!;
    expect(ledEl.getAttribute("r")).toBe("1.55");
  });
});

describe("fanlinc", () => {
  it("draws two leds and two hit regions", async () => {
    const el = await renderPlate(0x01, 0x2e, { 1: "Light", 2: "Fan" });
    const r = root(el);
    expect(r.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 80 176");
    expect(r.querySelectorAll(".led").length).toBe(2);
    expect(r.querySelectorAll(".print").length).toBe(0);
    const keys = r.querySelectorAll(".key");
    expect(keys.length).toBe(2);
    expect(keys[1].getAttribute("aria-label")).toBe("Fan");
    expect(r.querySelector(".vents")).not.toBeNull();
    el.selected = 2;
    await el.updateComplete;
    expect(r.querySelectorAll(".key.selected").length).toBe(1);
  });
});

describe("load caption", () => {
  it("shows the caption once under the plate and never inside a key", async () => {
    const el = await renderPlate(0x01, 0x42);
    el.loadCaption = "Load button: ON/OFF";
    await el.updateComplete;
    const captions = root(el).querySelectorAll(".caption");
    expect(captions.length).toBe(1);
    expect(captions[0].textContent).toContain("ON/OFF");
    expect(root(el).querySelector(".key .caption")).toBeNull();
  });
});

describe("plate keys as tabs", () => {
  it("marks the keys as tabs with the tab stop on the selected key", async () => {
    const el = await renderPlate(0x01, 0x42);
    el.label = "Keypad";
    el.selected = 4;
    await el.updateComplete;
    const r = root(el);
    expect(r.querySelector("svg")!.getAttribute("role")).toBe("tablist");
    expect(r.querySelector("svg")!.getAttribute("aria-label")).toBe("Keypad");
    const keys = [...r.querySelectorAll(".key")];
    expect(keys.map((k) => k.getAttribute("role"))).toEqual(["tab", "tab", "tab", "tab", "tab"]);
    expect(keys.map((k) => k.getAttribute("data-group"))).toEqual(["1", "3", "4", "5", "6"]);
    expect(keys.map((k) => k.getAttribute("tabindex"))).toEqual(["-1", "-1", "0", "-1", "-1"]);
    expect(keys.map((k) => k.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
      "true",
      "false",
      "false",
    ]);
    expect(r.querySelector("title")).toBeNull();
  });

  it("gives the first key the tab stop before anything is selected", async () => {
    const el = await renderPlate(0x01, 0x59);
    const keys = [...root(el).querySelectorAll(".key")];
    expect(keys.map((k) => k.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
  });

  it("moves the selection with the arrow, home and end keys", async () => {
    const el = await renderPlate(0x01, 0x42);
    el.selected = 6;
    await el.updateComplete;
    const seen: number[] = [];
    el.addEventListener("insteon-button-selected", (ev) => {
      seen.push((ev as CustomEvent<{ group: number }>).detail.group);
    });
    const key = root(el).querySelector('.key[data-group="6"]')!;
    for (const name of ["ArrowRight", "ArrowLeft", "Home", "End", "Tab"]) {
      key.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
      );
    }
    expect(seen).toEqual([1, 5, 1, 6]);
  });
});

describe("plate legibility", () => {
  it("gives the toggle lever a hit area that covers the opening", async () => {
    const el = await renderPlate(0x01, 0x17);
    const hit = root(el).querySelector(".key .hit")!;
    expect(hit).not.toBeNull();
    expect(Number(hit.getAttribute("width"))).toBeGreaterThanOrEqual(16);
    expect(Number(hit.getAttribute("height"))).toBeGreaterThanOrEqual(46);
    expect(hit.getAttribute("y")).toBe("48");
    expect(hit.classList.contains("no-edge")).toBe(true);
  });
});
