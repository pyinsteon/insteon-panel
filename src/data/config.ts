
import { HomeAssistant } from "@ha/types";
import type { HaFormSchema, HaFormDataContainer } from "@ha/components/ha-form/types";
import { InsteonX10Device, X10HouseCode, X10UnitCode } from "./insteon"

export interface InsteonPLMConfig {
  device: string;
  manual_config?: boolean;
  plm_manual_config?: string;
}

export interface InsteonHubv1Config {
  host: string;
  port: number;
  hub_version: 1;
}

export interface InsteonHubv2Config {
  host: string;
  port: number;
  username: string;
  password: string;
  hub_version: 2;
}

export interface X10Platrom {

}

export interface InsteonDeviceOverride {
  address: string;
  cat: number | string;
  subcat: number | string;
  firmware?: number | string;
}

export type InsteonModemConfig =
  | InsteonPLMConfig
  | InsteonHubv1Config
  | InsteonHubv2Config;

export interface InsteonConfig {
  modem_config: InsteonModemConfig;
  x10_config: InsteonX10Device[] | undefined;
  override_config: InsteonDeviceOverride[] | undefined;
}

export interface ConfigUpdateStatus {
  status: "success" | "update_failed" | "connection_failed" | "duplicate_device";
}

export interface X10DeviceRecord {
  housecode: X10HouseCode,
  unitcode: typeof X10UnitCode,
  platform: ""
}

export const fetchInsteonConfig = (
  hass: HomeAssistant,
  ): Promise<InsteonConfig> =>
    hass.callWS({
      type: "insteon/config/get",
});

export const fetchModemConfigSchema = (
  hass: HomeAssistant,
  ): Promise<HaFormSchema[]> =>
    hass.callWS({
    type: "insteon/config/get_modem_schema",
});


export const updateModemConfig = (
    hass: HomeAssistant,
    config: HaFormDataContainer,
  ): Promise<ConfigUpdateStatus> =>
    hass.callWS({
      type: "insteon/config/update_modem_config",
      config: config,
});

export const addDeviceOverride = (
  hass: HomeAssistant,
  override: InsteonDeviceOverride,
): Promise<ConfigUpdateStatus> =>
  hass.callWS({
    type: "insteon/config/device_override/add",
    override: override,
});

export const removeDeviceOverride = (
  hass: HomeAssistant,
  device_address: string,
): Promise<ConfigUpdateStatus> =>
    hass.callWS({
      type: "insteon/config/device_override/remove",
      device_address: device_address,
});


export const X10DeviceSchema = (platform: string | undefined): HaFormSchema[] => {
  let dim_steps: HaFormSchema;
  platform == "light"
    ?
      dim_steps = {
      "type": "integer",
      "valueMin": -1,
      "valueMax": 255,
      "name": "dim_steps",
      "required": true,
      "default": 22
    }
    : dim_steps = {
      "type": "constant",
      "name": "dim_steps",
      "required": false,
      "default": "",
    }

  return [
    {
      "type": "select",
      "options": [
        ["a", "a"],
        ["b", "b"],
        ["c", "c"],
        ["d", "d"],
        ["e", "e"],
        ["f", "f"],
        ["g", "g"],
        ["h", "h"],
        ["i", "i"],
        ["j", "j"],
        ["k", "k"],
        ["l", "l"],
        ["m", "m"],
        ["n", "n"],
        ["o", "o"],
        ["p", "p"]
      ],
      "name": "housecode",
      "required": true
    },
    {
      "type": "select",
      "options": [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
        ["4", "4"],
        ["5", "5"],
        ["6", "6"],
        ["7", "7"],
        ["8", "8"],
        ["9", "9"],
        ["10", "10"],
        ["11", "11"],
        ["12", "12"],
        ["13", "13"],
        ["14", "14"],
        ["15", "15"],
        ["16", "16"],
      ],
      "name": "unitcode",
      "required": true
    },
    {
      "type": "select",
      "options": [
        ["binary_sensor", "binary_sensor"],
        ["switch", "switch"],
        ["light", "light"]
      ],
      "name": "platform",
      "required": true
    },
    dim_steps
  ]
}


export function modemIsPlm(config: any): config is InsteonPLMConfig {
  return "device" in config;
}

export const addPlmManualConfig = (manual: boolean, schema: HaFormSchema[]) => {

  const plm_schema = schema.slice()
  plm_schema.push(
    {
      "type": "boolean",
      "required": false,
      "name": "manual_config"
    })

  manual
    ? plm_schema.push({
      type: "string",
      name: "plm_manual_config",
      required: true
    })
    : null;
  return plm_schema
}

export const DeviceOverrideSchema: HaFormSchema[] = [
  {
    name: "address",
    type: "string",
    required: true
  },
  {
    name: "cat",
    type: "string",
    required: true
  },
  {
    name: "subcat",
    type: "string",
    required: true
  }
]