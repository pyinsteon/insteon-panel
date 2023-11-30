
import { HomeAssistant } from "../../homeassistant-frontend/src/types";
import type { HaFormSchema, HaFormDataContainer } from "../../homeassistant-frontend/src/components/ha-form/types";

export enum X10HouseCode {
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
}

export const X10UnitCode = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
];

export interface InsteonPLMConfig {
  device: string;
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

export interface InsteonX10Device {
  housecode: X10HouseCode;
  unitcode:
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16;
  platform: "binary_sensor" | "light" | "switch";
  dim_steps: null | number;
}

export interface X10Platrom {

}

export interface InsteonDeviceOverride {
  address: string;
  cat: number;
  subcat: number;
  firmware: number;
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


export const addX10Device = (
  hass: HomeAssistant,
  x10_device: HaFormDataContainer,
): Promise<ConfigUpdateStatus> =>
  hass.callWS({
    type: "insteon/config/add_x10_device",
    x10_device: x10_device,
  });
