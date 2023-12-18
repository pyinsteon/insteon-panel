import { Repository, Status, Message } from "./common";
import { ConfigEntry } from "@ha/data/config_entries";

export interface Insteon {
  language: string;
  messages: Message[];
  updates: any[];
  resources: any[];
  repositories: Repository[];
  removed: any[];
  config_entry: ConfigEntry;
  sections: any;
  status: Status;
  localize(string: string, replace?: Record<string, any>): string;
  addedToLovelace?(insteon: Insteon, repository: Repository): boolean;
  log: any;
}

export interface InsteonDevice {
  name: string;
  address: string;
  is_battery: boolean;
  aldb_status: string;
}

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

export interface InsteonDeviceEntities {
  [address: string]: {
    [group: number]: {
      entity_id: string;
      registry_id: string;
    };
  };
}

export interface EntitiesInsteonDevice {
  [registry_id: string]: {
    address: string;
    group: number;
  };
}
