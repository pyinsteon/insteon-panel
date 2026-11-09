import type { EntityRegistryEntry } from "@ha/data/entity_registry";
import type { HomeAssistant } from "@ha/types";
import type { HaFormSchema } from "@ha/components/ha-form/types";

export interface InsteonScene {
  name: string;
  group: number;
  devices: { [address: string]: InsteonSceneDeviceData[] };
  controllers?: InsteonSceneController[];
  pending?: boolean;
}

export interface InsteonSceneController {
  address: string;
  group: number;
}

export interface InsteonScenes {
  [scene: number]: InsteonScene;
}

export interface SceneSaveResult {
  scene_id: number;
  result: boolean;
}

export interface InsteonSceneDeviceData {
  data1: number;
  data2: number;
  data3: number;
  has_controller: boolean;
  has_responder: boolean;
}

export interface InsteonSceneLinkData {
  address: string;
  data1: number;
  data2: number;
  data3: number;
}

// The integration adds a switch for each scene with the unique ID "<modem>_scene_<group>".
export const insteonSceneGroup = (entry: EntityRegistryEntry): number | undefined => {
  const match = entry.platform === "insteon" ? /_scene_(\d+)$/.exec(entry.unique_id) : null;
  return match ? Number(match[1]) : undefined;
};

export const fetchInsteonScenes = (hass: HomeAssistant): Promise<InsteonScenes> =>
  hass.callWS({
    type: "insteon/scenes/get",
  });

export const fetchInsteonScene = (hass: HomeAssistant, id: number): Promise<InsteonScene> =>
  hass.callWS({
    type: "insteon/scene/get",
    scene_id: id,
  });

export const saveInsteonScene = (
  hass: HomeAssistant,
  scene_id: number,
  links: InsteonSceneLinkData[],
  scene_name: string,
  controllers?: InsteonSceneController[],
): Promise<SceneSaveResult> =>
  hass.callWS({
    type: "insteon/scene/save",
    name: scene_name,
    scene_id: scene_id,
    links: links,
    ...(controllers === undefined ? {} : { controllers }),
  });

export interface InsteonDeviceScene {
  controllers: InsteonSceneController[];
  links: InsteonSceneLinkData[];
  issues: string[];
  importable: boolean;
}

export const fetchInsteonDeviceScenes = (hass: HomeAssistant): Promise<InsteonDeviceScene[]> =>
  hass.callWS({
    type: "insteon/scenes/device_scenes",
  });

export const importInsteonDeviceScene = (
  hass: HomeAssistant,
  controllers: InsteonSceneController[],
  scene_name: string,
): Promise<SceneSaveResult> =>
  hass.callWS({
    type: "insteon/scene/import",
    name: scene_name,
    controllers,
  });

export const deleteInsteonScene = (
  hass: HomeAssistant,
  scene_id: number,
): Promise<SceneSaveResult> =>
  hass.callWS({
    type: "insteon/scene/delete",
    scene_id: scene_id,
  });

export const sceneDataSchema: HaFormSchema[] = [
  {
    name: "data1",
    required: true,
    type: "integer",
  },
  {
    name: "data2",
    required: true,
    type: "integer",
  },
  {
    name: "data3",
    required: true,
    type: "integer",
  },
];
