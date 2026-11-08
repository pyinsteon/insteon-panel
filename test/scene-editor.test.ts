import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/components/ha-list-item", () => ({}));
vi.mock("@ha/components/ha-button-menu", () => ({}));
vi.mock("@ha/common/util/render-status", () => ({ afterNextRender: vi.fn() }));
vi.mock("@ha/common/util/compute_rtl", () => ({ computeRTL: () => false }));
vi.mock("@ha/common/entity/compute_device_name", () => ({
  computeDeviceName: (device: { name: string }) => device.name,
}));
vi.mock("@ha/layouts/hass-subpage", () => ({}));
vi.mock("@ha/components/ha-card", () => ({}));
vi.mock("@ha/components/ha-fab", () => ({}));
vi.mock("@ha/components/ha-icon-button", () => ({}));
vi.mock("@ha/components/ha-svg-icon", () => ({}));
vi.mock("@ha/components/ha-textfield", () => ({}));
vi.mock("@ha/components/ha-checkbox", () => ({}));
vi.mock("@ha/components/ha-formfield", () => ({}));
vi.mock("@ha/components/ha-form/ha-form", () => ({}));
vi.mock("@ha/components/ha-alert", () => ({}));
vi.mock("@ha/components/ha-button", () => ({}));
vi.mock("@ha/components/ha-spinner", () => ({}));
vi.mock("@ha/components/ha-selector/ha-selector-select", () => ({}));
vi.mock("@ha/panels/config/ha-config-section", () => ({}));
vi.mock("@ha/resources/styles", () => ({ haStyle: [] }));
vi.mock("@ha/mixins/keyboard-shortcut-mixin", () => ({
  KeyboardShortcutMixin: (base: unknown) => base,
}));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("@ha/data/device_registry", () => ({ fetchDeviceRegistry: vi.fn() }));
vi.mock("@ha/data/entity_registry", () => ({
  fetchEntityRegistry: vi.fn(async () => []),
  subscribeEntityRegistry: vi.fn(() => vi.fn()),
  updateEntityRegistryEntry: vi.fn(async (_hass, entityId: string, updates: object) => ({
    entity_entry: { ...sceneSwitch(20), entity_id: entityId, ...updates },
  })),
}));
vi.mock("@ha/components/ha-area-picker", () => ({}));
vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));
vi.mock("@ha/components/device/ha-device-picker", () => ({}));

import { fetchDeviceRegistry } from "@ha/data/device_registry";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import {
  fetchEntityRegistry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "@ha/data/entity_registry";
import type { EntityRegistryEntry } from "@ha/data/entity_registry";
import { navigate } from "@ha/common/navigate";
import { localize } from "../src/localize/localize";
import { InsteonSceneEditor } from "../src/scene/insteon-scene-editor";
import type { InsteonScene, SceneSaveResult } from "../src/data/scene";
import { saveInsteonScene } from "../src/data/scene";

const scene: InsteonScene = {
  name: "Evening",
  group: 20,
  devices: {},
  controllers: [{ address: "22.22.22", group: 3 }],
};

const registry: DeviceRegistryEntry[] = [
  {
    id: "remote",
    name: "Remote",
    config_entries: ["entry"],
    identifiers: [["insteon", "33.33.33"]],
  },
  {
    id: "keypad",
    name: "Keypad",
    config_entries: ["entry"],
    identifiers: [["insteon", "22.22.22"]],
    area_id: "kitchen",
  },
  {
    id: "fanlinc",
    name: "Fan",
    config_entries: ["entry"],
    identifiers: [["insteon", "44.44.44"]],
  },
  {
    id: "lock",
    name: "Door",
    config_entries: ["entry"],
    identifiers: [["insteon", "55.55.55"]],
  },
].map((entry) => ({
  ...entry,
  identifiers: entry.identifiers.map(([domain, address]): [string, string] => [domain, address]),
  created_at: 0,
  modified_at: 0,
  config_entries_subentries: {},
  connections: [],
  manufacturer: null,
  model: null,
  model_id: null,
  labels: [],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: entry.area_id ?? null,
  name_by_user: null,
  entry_type: null,
  disabled_by: null,
  configuration_url: null,
  primary_config_entry: null,
}));

const remote = {
  name: "Remote",
  address: "33.33.33",
  cat: 0,
  subcat: 0x1b,
  is_battery: true,
  controller_groups: [1, 2],
  buttons: { 1: "on_off_switch_a", 2: "on_off_switch_b" },
};
const keypad = {
  name: "Keypad",
  address: "22.22.22",
  cat: 1,
  subcat: 9,
  is_battery: false,
  controller_groups: [1, 3, 4, 5, 6],
  buttons: { 3: "on_off_switch_a" },
};

const settle = async (element: InsteonSceneEditor): Promise<void> => {
  for (let i = 0; i < 5; i += 1) {
    await element.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const mount = async (
  existing?: InsteonScene,
  save: (message: Record<string, unknown>) => Promise<SceneSaveResult> = vi.fn(async () => ({
    scene_id: 20,
    result: true,
  })),
) => {
  vi.mocked(fetchDeviceRegistry).mockResolvedValue(registry);
  let stored = existing;
  const callWS = vi.fn(async (message: Record<string, unknown>) => {
    if (message.type === "insteon/device/get") {
      return message.device_id === "remote" ? remote : keypad;
    }
    if (message.type === "insteon/scene/get") {
      return structuredClone(stored);
    }
    if (message.type === "insteon/scene/save") {
      const result = await save(message);
      if (result.result) {
        stored = {
          name: message.name as string,
          group: result.scene_id,
          devices: stored?.devices ?? {},
          controllers: (message.controllers as InsteonScene["controllers"]) ?? [],
        };
      }
      return result;
    }
    if (message.type === "insteon/scene/delete") {
      return { scene_id: 20, result: false };
    }
    throw new Error("Unexpected WebSocket request");
  });
  const element = new InsteonSceneEditor();
  Object.assign(element, {
    hass: {
      callWS,
      connection: {},
      states: {},
      areas: { kitchen: { area_id: "kitchen", name: "Kitchen" } },
      localize: (key: string) => key,
    },
    insteon: {
      config_entry: { entry_id: "entry" },
      localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
    },
    sceneId: existing ? "20" : null,
  });
  document.body.appendChild(element);
  await settle(element);
  return { element, callWS, save };
};

const select = async (
  element: InsteonSceneEditor,
  index: number,
  value: string | undefined,
): Promise<void> => {
  element
    .shadowRoot!.querySelectorAll("ha-selector-select")
    [index].dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
  await settle(element);
};

const pickController = async (element: InsteonSceneEditor, deviceId: string): Promise<void> => {
  element
    .shadowRoot!.querySelector("ha-device-picker.controller-picker")!
    .dispatchEvent(new CustomEvent("value-changed", { detail: { value: deviceId } }));
  await settle(element);
};

const pickResponder = async (element: InsteonSceneEditor, deviceId: string): Promise<void> => {
  element
    .shadowRoot!.querySelector("ha-device-picker.responder-picker")!
    .dispatchEvent(new CustomEvent("value-changed", { detail: { value: deviceId } }));
  await settle(element);
};

const entity = (
  entity_id: string,
  device_id: string,
  unique_id: string,
  original_name: string,
): EntityRegistryEntry =>
  ({
    entity_id,
    device_id,
    config_entry_id: "entry",
    entity_category: null,
    unique_id,
    name: null,
    original_name,
  }) as EntityRegistryEntry;

type EntityForm = HTMLElement & {
  data: Record<string, unknown>;
  schema: {
    name: string;
    selector: Record<string, { options: { value: string; label: string }[] }>;
  }[];
};

const forms = (element: InsteonSceneEditor): EntityForm[] =>
  [...element.shadowRoot!.querySelectorAll("ha-form")] as EntityForm[];

const toggleOptions = (form: EntityForm): string[] =>
  form.schema[0].selector.button_toggle.options.map((option) => `${option.label}=${option.value}`);

const changeForm = async (
  element: InsteonSceneEditor,
  form: EntityForm,
  value: Record<string, unknown>,
): Promise<void> => {
  form.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
  await settle(element);
};

function sceneSwitch(group: number, area_id: string | null = null): EntityRegistryEntry {
  return {
    entity_id: `switch.scene_${group}`,
    device_id: "modem",
    config_entry_id: "entry",
    entity_category: null,
    platform: "insteon",
    unique_id: `aaaaaa_scene_${group}`,
    area_id,
    name: null,
    original_name: `Scene ${group}`,
  } as EntityRegistryEntry;
}

const areaPicker = (element: InsteonSceneEditor) =>
  element.shadowRoot!.querySelector("ha-area-picker") as HTMLElement & { value?: string };

const add = async (element: InsteonSceneEditor): Promise<void> => {
  element.shadowRoot!.querySelector("ha-button")!.dispatchEvent(new Event("click"));
  await settle(element);
};

const saveScene = async (element: InsteonSceneEditor): Promise<void> => {
  element.shadowRoot!.querySelector("ha-fab")!.dispatchEvent(new Event("click"));
  await settle(element);
};

describe("scene controllers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("defaults to app-only and sends an explicit empty controller list", async () => {
    const { element, callWS } = await mount();
    expect(element.shadowRoot!.textContent).toContain("Home Assistant can always control");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ type: "insteon/scene/save", controllers: [] }),
    );
  });

  it("lists controller-only remotes without responder-domain entities", async () => {
    const { element, callWS } = await mount();
    await select(element, 0, "device");
    await pickController(element, "remote");
    await select(element, 1, "2");
    await add(element);
    expect(element.shadowRoot!.textContent).toContain("Remote");
    expect(element.shadowRoot!.textContent).toContain("Wake battery-operated controllers");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ controllers: [{ address: remote.address, group: 2 }] }),
    );
    expect(callWS).toHaveBeenLastCalledWith({ type: "insteon/scene/get", scene_id: 20 });
    expect(element._scene!.controllers).toEqual([{ address: remote.address, group: 2 }]);
  });

  it("names mini remote buttons by letter", async () => {
    const { element } = await mount();
    await select(element, 0, "device");
    await pickController(element, "remote");
    const buttons = element.shadowRoot!.querySelectorAll("ha-selector-select")[1] as HTMLElement & {
      selector: { select: { options: { label: string }[] } };
    };
    expect(buttons.selector.select.options.map((option) => option.label)).toEqual([
      "Button A",
      "Button B",
    ]);
    await select(element, 1, "2");
    await add(element);
    expect(
      element.shadowRoot!.querySelector(".controller-row")!.textContent!.replace(/\s+/g, " "),
    ).toContain("Remote - Button B");
  });

  it("adds responders after selectors report cleared values", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      {
        entity_id: "light.keypad_main",
        device_id: "keypad",
        config_entry_id: "entry",
        entity_category: null,
        unique_id: "222222_1",
        name: null,
        original_name: "Keypad main",
      } as EntityRegistryEntry,
    ]);
    const { element, callWS } = await mount();
    await select(element, 0, "device");
    await pickController(element, "remote");
    await select(element, 1, "1");
    await add(element);
    await pickController(element, "");
    await select(element, 1, undefined);
    await select(element, 0, undefined);

    await pickResponder(element, "keypad");

    expect(element.shadowRoot!.querySelector(".scene-device")!.textContent).not.toContain(";");
    // A device with one output joins the scene without an output checkbox.
    expect(element.shadowRoot!.querySelector("ha-checkbox")).toBeNull();
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({
        controllers: [{ address: remote.address, group: 1 }],
        links: [{ address: "22.22.22", data1: 255, data2: 28, data3: 1 }],
      }),
    );
  });

  it("loads keypad groups independently from the modem scene number", async () => {
    const { element, callWS } = await mount(scene);
    expect(element.shadowRoot!.textContent).toContain("Button A");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ scene_id: 20, controllers: scene.controllers }),
    );
  });

  it("rejects duplicate buttons and device-controlled scenes with no controller", async () => {
    const { element, callWS } = await mount(scene);
    await pickController(element, "keypad");
    await select(element, 1, "3");
    await add(element);
    expect(element.shadowRoot!.textContent).toContain("already in the scene");
    element
      .shadowRoot!.querySelector(".controller-row ha-icon-button")!
      .dispatchEvent(new Event("click"));
    await settle(element);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("Add at least one controller");
    expect(callWS.mock.calls.filter(([msg]) => msg.type === "insteon/scene/save")).toEqual([]);
  });

  it("converts an existing scene to app-only", async () => {
    const { element, callWS } = await mount(scene);
    await select(element, 0, "app");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ scene_id: 20, controllers: [] }));
    expect(element._scene!.controllers).toEqual([]);
  });

  it("keeps failed new-scene saves dirty and retries the reserved group", async () => {
    const write = vi.fn(async () => ({ scene_id: 23, result: false }));
    const { element, callWS } = await mount(undefined, write);
    await select(element, 0, "device");
    await pickController(element, "keypad");
    await select(element, 1, "3");
    await add(element);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("not fully written");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/insteon/scene/23", { replace: true });
    await saveScene(element);
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({ scene_id: 23 }));
  });

  it("shows backend errors and permits retry without losing selections", async () => {
    const write = vi.fn(async () => {
      throw { code: "scene_error", message: "Controller group belongs to scene 21" };
    });
    const { element } = await mount(scene, write);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("belongs to scene 21");
    expect(element._scene!.controllers).toEqual(scene.controllers);
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("saving")).toBe(false);
    await saveScene(element);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("offers interrupted scenes for retry after loading", async () => {
    const { element } = await mount({ ...scene, pending: true });
    expect(element.shadowRoot!.textContent).toContain("not fully written");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
  });

  it("shows levels of set-button links that store output 0", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      {
        entity_id: "light.keypad_main",
        device_id: "keypad",
        config_entry_id: "entry",
        entity_category: null,
        unique_id: "222222_1",
        name: null,
        original_name: "Keypad main",
      } as EntityRegistryEntry,
    ]);
    const { element, callWS } = await mount({
      ...scene,
      devices: {
        "22.22.22": [
          { data1: 191, data2: 28, data3: 0, has_controller: true, has_responder: true },
        ],
      },
    });
    const [form] = forms(element);
    expect(form.data).toEqual({ on_level: 75, ramp_rate: "28" });
    // The rounded level is reported back without changing the stored level.
    await changeForm(element, form, { on_level: 75, ramp_rate: "28" });
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(false);
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [{ address: "22.22.22", data1: 191, data2: 28, data3: 1 }],
      }),
    );
  });

  it("lists controller devices with their areas", async () => {
    const { element } = await mount(scene);
    const picker = element.shadowRoot!.querySelector(
      "ha-device-picker.controller-picker",
    ) as HTMLElement & { deviceFilter: (device: { id: string }) => boolean };
    expect(picker.deviceFilter({ id: "keypad" })).toBe(true);
    expect(picker.deviceFilter({ id: "remote" })).toBe(true);
    expect(picker.deviceFilter({ id: "missing" })).toBe(false);
    const row = element.shadowRoot!.querySelector(".controller-row")!;
    expect(row.querySelector(".secondary")!.textContent).toBe("Kitchen");
  });

  it("offers Insteon responder devices that are not already in the scene", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      entity("fan.fan", "fanlinc", "444444_2", "Fan"),
    ]);
    const { element } = await mount({
      ...scene,
      devices: {
        "44.44.44": [
          { data1: 255, data2: 0, data3: 2, has_controller: false, has_responder: true },
        ],
      },
    });
    const picker = element.shadowRoot!.querySelector(
      "ha-device-picker.responder-picker",
    ) as HTMLElement & {
      deviceFilter: (device: { id: string; model?: string }) => boolean;
      excludeDevices: string[];
    };
    expect(picker.deviceFilter({ id: "keypad" })).toBe(true);
    expect(picker.deviceFilter({ id: "keypad", model: "PowerLinc Modem (0x03, 0x15)" })).toBe(
      false,
    );
    expect(picker.deviceFilter({ id: "zigbee" })).toBe(false);
    expect(picker.excludeDevices).toEqual(["fanlinc"]);
  });

  it("selects outputs of multi-output devices and sets each by type", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      entity("light.keypad_main", "keypad", "222222_1", "Keypad main"),
      entity("switch.keypad_c", "keypad", "222222_3", "Keypad C"),
    ]);
    const { element, callWS } = await mount();
    await pickResponder(element, "keypad");
    const card = element.shadowRoot!.querySelector(".scene-device")!;
    expect(card.querySelector(".card-header .secondary")!.textContent).toBe("Kitchen");
    expect(element._scene!.devices).toEqual({ "22.22.22": [] });
    expect(card.querySelector("ha-form")).toBeNull();

    const checkboxes = card.querySelectorAll("ha-checkbox");
    expect(checkboxes).toHaveLength(2);
    const buttonC = checkboxes[1] as HTMLElement & { checked: boolean };
    buttonC.checked = true;
    buttonC.dispatchEvent(new Event("change"));
    await settle(element);

    const [state] = forms(element);
    expect(forms(element)).toHaveLength(1);
    expect(toggleOptions(state)).toEqual(["Off=0", "On=255"]);
    expect(state.data).toEqual({ state: "255" });
    await changeForm(element, state, { state: "0" });
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [{ address: "22.22.22", data1: 0, data2: 0, data3: 3 }],
      }),
    );
  });

  it("sets dimmer levels and ramp rates inline", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      entity("light.keypad_main", "keypad", "222222_1", "Keypad main"),
    ]);
    const { element, callWS } = await mount();
    await pickResponder(element, "keypad");
    const [form] = forms(element);
    const [level, ramp] = form.schema;
    expect(level.selector.number).toMatchObject({ min: 0, max: 100, mode: "slider" });
    const options = ramp.selector.select.options.map((o) => `${o.value}=${o.label}`);
    expect(options[0]).toBe("31=0.1 s");
    expect(options.at(-1)).toBe("0=540 s");
    expect(form.data).toEqual({ on_level: 100, ramp_rate: "28" });
    await changeForm(element, form, { on_level: 50, ramp_rate: "28" });
    await changeForm(element, forms(element)[0], { on_level: 50, ramp_rate: "27" });
    await changeForm(element, forms(element)[0], { on_level: undefined, ramp_rate: "27" });
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [{ address: "22.22.22", data1: 128, data2: 27, data3: 1 }],
      }),
    );
  });

  it("offers fan speeds and lock states", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      entity("fan.fan", "fanlinc", "444444_2", "Fan"),
      entity("lock.door", "lock", "555555_1", "Door"),
    ]);
    const { element, callWS } = await mount({
      ...scene,
      devices: {
        "44.44.44": [
          { data1: 0x7f, data2: 0, data3: 2, has_controller: false, has_responder: true },
        ],
      },
    });
    const [fan] = forms(element);
    expect(toggleOptions(fan)).toEqual(["Off=0", "Low=64", "Medium=192", "High=255"]);
    expect(fan.data).toEqual({ speed: "64" });
    await changeForm(element, fan, { speed: "192" });

    await pickResponder(element, "lock");
    expect(toggleOptions(forms(element)[1])).toEqual(["Unlocked=0", "Locked=255"]);
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [
          { address: "44.44.44", data1: 192, data2: 0, data3: 2 },
          { address: "55.55.55", data1: 255, data2: 0, data3: 1 },
        ],
      }),
    );
  });

  it("sets the area of an existing scene's switch when saving", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([
      sceneSwitch(20, "kitchen"),
      sceneSwitch(21, "bedroom"),
    ]);
    const { element } = await mount(scene);
    expect(areaPicker(element).value).toBe("kitchen");
    // Scene switches are not treated as outputs of the modem.
    expect(element.shadowRoot!.querySelector(".scene-device")).toBeNull();

    areaPicker(element).dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "bedroom" } }),
    );
    await settle(element);
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
    expect(updateEntityRegistryEntry).not.toHaveBeenCalled();

    await saveScene(element);
    expect(updateEntityRegistryEntry).toHaveBeenCalledWith(element.hass, "switch.scene_20", {
      area_id: "bedroom",
    });
    expect(areaPicker(element).value).toBe("bedroom");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(false);
  });

  it("clears an area and leaves unchanged areas alone", async () => {
    vi.mocked(fetchEntityRegistry).mockResolvedValueOnce([sceneSwitch(20, "kitchen")]);
    const { element } = await mount(scene);
    areaPicker(element).dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "kitchen" } }),
    );
    await saveScene(element);
    expect(updateEntityRegistryEntry).not.toHaveBeenCalled();

    areaPicker(element).dispatchEvent(new CustomEvent("value-changed", { detail: { value: "" } }));
    await saveScene(element);
    expect(updateEntityRegistryEntry).toHaveBeenCalledWith(element.hass, "switch.scene_20", {
      area_id: null,
    });
  });

  it("sets the area of a new scene once its switch is added", async () => {
    vi.mocked(subscribeEntityRegistry).mockImplementationOnce((_conn, callback) => {
      callback([]);
      setTimeout(() => callback([sceneSwitch(20)]), 0);
      return vi.fn();
    });
    const { element } = await mount();
    expect(areaPicker(element).value).toBeUndefined();
    areaPicker(element).dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "kitchen" } }),
    );
    await saveScene(element);
    expect(updateEntityRegistryEntry).toHaveBeenCalledWith(element.hass, "switch.scene_20", {
      area_id: "kitchen",
    });
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(false);
  });

  it("reports an area that cannot be set", async () => {
    const { element } = await mount();
    areaPicker(element).dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "kitchen" } }),
    );
    await settle(element);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      element.shadowRoot!.querySelector("ha-fab")!.dispatchEvent(new Event("click"));
      await vi.advanceTimersByTimeAsync(10000);
    } finally {
      vi.useRealTimers();
    }
    await settle(element);
    expect(element.shadowRoot!.textContent).toContain("its area could not be set");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
    expect(updateEntityRegistryEntry).not.toHaveBeenCalled();
  });

  it("explains that the scene is saving", async () => {
    let finish!: (result: SceneSaveResult) => void;
    const write = vi.fn(
      () =>
        new Promise<SceneSaveResult>((resolve) => {
          finish = resolve;
        }),
    );
    const { element } = await mount(scene, write);
    await saveScene(element);
    const saving = element.shadowRoot!.querySelector(".saving")!;
    expect(saving.querySelector("ha-spinner")).not.toBeNull();
    expect(saving.textContent).toContain("Saving scene data");
    finish({ scene_id: 20, result: true });
    await settle(element);
    expect(element.shadowRoot!.querySelector(".saving")).toBeNull();
  });

  it("preserves the legacy save shape when controllers are omitted", async () => {
    const { element, callWS } = await mount(scene);
    await saveInsteonScene(element.hass, 20, [], "Evening");
    expect(callWS).toHaveBeenCalledWith({
      type: "insteon/scene/save",
      scene_id: 20,
      links: [],
      name: "Evening",
    });
  });
});
