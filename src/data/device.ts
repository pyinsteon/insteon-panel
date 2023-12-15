import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import type { HaFormSchema } from "../../homeassistant-frontend/src/components/ha-form/types";
import { Insteon, InsteonDevice, InsteonX10Device} from "./insteon"
import { ConfigUpdateStatus } from "./config"


export type InsteonProperty =
  | PropertyNumber
  | PropertyBoolean
  | PropertySelect
  | PropertyMultiSelect
  | PropertyRadioButtons;

export interface PropertyBase {
  name: string;
  modified: boolean;
}

export interface PropertyNumber extends PropertyBase {
  value: number;
}

export interface PropertyBoolean extends PropertyBase {
  value: boolean;
}

export interface PropertySelect extends PropertyBase {
  value: [string] | [number];
}

export interface PropertyMultiSelect extends PropertyBase {
  value: [string] | [number];
}

export interface PropertyRadioButtons extends PropertyBase {
  name: "radio_button_groups";
  value: [[number]] | [];
}

export interface PropertiesInfo {
  properties: InsteonProperty[];
  schema: { [key: string]: HaFormSchema }; // HaFormSchema };
}

export interface ALDBRecord {
  mem_addr: number;
  in_use: boolean;
  is_controller: boolean;
  highwater: boolean;
  group: number;
  target: string;
  target_name: string;
  data1: number;
  data2: number;
  data3: number;
  dirty: boolean;
}

export const fetchInsteonDevice = (
  hass: HomeAssistant,
  id: string
): Promise<InsteonDevice> =>
  hass.callWS({
    type: "insteon/device/get",
    device_id: id,
  });

export const fetchInsteonALDB = (
  hass: HomeAssistant,
  id: string
): Promise<ALDBRecord[]> =>
  hass.callWS({
    type: "insteon/aldb/get",
    device_address: id,
  });

export const fetchInsteonProperties = (
  hass: HomeAssistant,
  id: string,
  showAdvanced: boolean
): Promise<PropertiesInfo> =>
  hass.callWS({
    type: "insteon/properties/get",
    device_address: id,
    show_advanced: showAdvanced,
  });

export const changeALDBRecord = (
  hass: HomeAssistant,
  id: string,
  record: ALDBRecord
): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/change",
    device_address: id,
    record: record,
  });

export const changeProperty = (
  hass: HomeAssistant,
  id: string,
  name: string,
  value: any
): Promise<void> =>
  hass.callWS({
    type: "insteon/properties/change",
    device_address: id,
    name: name,
    value: value,
  });

export const createALDBRecord = (
  hass: HomeAssistant,
  id: string,
  record: ALDBRecord
): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/create",
    device_address: id,
    record: record,
  });

export const loadALDB = (hass: HomeAssistant, id: string): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/load",
    device_address: id,
  });

export const loadProperties = (
  hass: HomeAssistant,
  id: string
): Promise<void> =>
  hass.callWS({
    type: "insteon/properties/load",
    device_address: id,
  });

export const writeALDB = (hass: HomeAssistant, id: string): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/write",
    device_address: id,
  });

export const writeProperties = (
  hass: HomeAssistant,
  id: string
): Promise<void> =>
  hass.callWS({
    type: "insteon/properties/write",
    device_address: id,
  });

export const resetALDB = (hass: HomeAssistant, id: string): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/reset",
    device_address: id,
  });

export const resetProperties = (
  hass: HomeAssistant,
  id: string
): Promise<void> =>
  hass.callWS({
    type: "insteon/properties/reset",
    device_address: id,
  });

export const addDefaultLinks = (
  hass: HomeAssistant,
  id: string
): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/add_default_links",
    device_address: id,
  });

export const aldbRecordLoaded = (
  hass: HomeAssistant,
  id: string
): Promise<void> =>
  hass.callWS({
    type: "insteon/aldb/record_loaded",
    device_address: id,
  });

export const aldbNewRecordSchema = (insteon: Insteon): HaFormSchema[] => [
  {
    name: "mode",
    options: [
      ["c", insteon.localize("aldb.mode.controller")],
      ["r", insteon.localize("aldb.mode.responder")],
    ],
    required: true,
    type: "select",
  },
  {
    name: "group",
    required: true,
    type: "integer",
    valueMin: -1,
    valueMax: 255,
  },
  {
    name: "target",
    required: true,
    type: "string",
  },
  {
    name: "data1",
    required: true,
    type: "integer",
    valueMin: -1,
    valueMax: 255,
  },
  {
    name: "data2",
    required: true,
    type: "integer",
    valueMin: -1,
    valueMax: 255,
  },
  {
    name: "data3",
    required: true,
    type: "integer",
    valueMin: -1,
    valueMax: 255,
  },
];

export const aldbChangeRecordSchema = (insteon: Insteon): HaFormSchema[] => [
  {
    name: "in_use",
    required: true,
    type: "boolean",
  },
  ...aldbNewRecordSchema(insteon),
];

export const addDeviceSchema = (multiple: boolean, add_x10: boolean): HaFormSchema[] => [
  {
    name: "multiple",
    required: false,
    type: add_x10 ? "constant" : "boolean",
  },
  {
    name: "add_x10",
    required: false,
    type: multiple ? "constant" : "boolean",
  },
  {
    name: "device_address",
    required: false,
    type: (multiple || add_x10) ? "constant": "string",
  },
];

export const cancelAddInsteonDevice = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "insteon/device/add/cancel",
  });

export const removeInsteonDevice = (
  hass: HomeAssistant,
  address: string,
  remove_all_refs: boolean
): Promise<void> =>
  hass.callWS({
    type: "insteon/device/remove",
    device_address: address,
    remove_all_refs: remove_all_refs,
  });


export const addX10Device = (
  hass: HomeAssistant,
  x10_device: InsteonX10Device,
): Promise<ConfigUpdateStatus> =>
  hass.callWS({
    type: "insteon/device/add_x10",
    x10_device: x10_device,
  });


export type deviceAddedMessage = {
  type: string;
  address: string;
};

export const RAMP_RATE_SECONDS: { [seconds: string]: number } = {
  "480": 1,
  "420": 2,
  "360": 3,
  "300": 4,
  "270": 5,
  "240": 6,
  "210": 7,
  "180": 8,
  "150": 9,
  "120": 10,
  "90": 11,
  "60": 12,
  "47": 13,
  "43": 14,
  "38.5": 15,
  "34": 16,
  "32": 17,
  "30": 18,
  "28": 19,
  "26": 20,
  "23.5": 21,
  "21.5": 22,
  "19": 23,
  "8.5": 24,
  "6.5": 25,
  "4.5": 26,
  "2": 27,
  "0.5": 28,
  "0.3": 29,
  "0.2": 30,
  "0.1": 31,
};

export const rampRateSchema: HaFormSchema = {
  name: "ramp_rate",
  options: [
    ["31", "0.1"],
    ["30", "0.2"],
    ["29", "0.3"],
    ["28", "0.5"],
    ["27", "2"],
    ["26", "4.5"],
    ["25", "6.5"],
    ["24", "8.5"],
    ["23", "19"],
    ["22", "21.5"],
    ["21", "23.5"],
    ["20", "26"],
    ["19", "28"],
    ["18", "30"],
    ["17", "32"],
    ["16", "34"],
    ["15", "38.5"],
    ["14", "43"],
    ["13", "47"],
    ["12", "60"],
    ["11", "90"],
    ["10", "120"],
    ["9", "150"],
    ["8", "180"],
    ["7", "210"],
    ["6", "240"],
    ["5", "270"],
    ["4", "300"],
    ["3", "360"],
    ["2", "420"],
    ["1", "480"],
  ],
  required: true,
  type: "select",
};
