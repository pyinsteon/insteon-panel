import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import type { HaFormSchema } from "../../homeassistant-frontend/src/components/ha-form/types";


export interface InsteonScene {
  name: string;
  group: number;
  devices: { [address: string]: InsteonSceneDeviceData[] };
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

export const fetchInsteonScenes = (
  hass: HomeAssistant
): Promise<InsteonScenes> =>
  hass.callWS({
    type: "insteon/scenes/get",
  });

export const fetchInsteonScene = (
  hass: HomeAssistant,
  id: number
): Promise<InsteonScene> =>
  hass.callWS({
    type: "insteon/scene/get",
    scene_id: id,
  });

export const saveInsteonScene = (
  hass: HomeAssistant,
  scene_id: number,
  links: InsteonSceneLinkData[],
  scene_name: string
): Promise<SceneSaveResult> =>
  hass.callWS({
    type: "insteon/scene/save",
    name: scene_name,
    scene_id: scene_id,
    links: links,
  });

export const deleteInsteonScene = (
  hass: HomeAssistant,
  scene_id: number
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
