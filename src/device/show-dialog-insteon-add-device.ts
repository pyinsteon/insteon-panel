import { fireEvent } from "../../homeassistant-frontend/src/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "../../homeassistant-frontend/src/types";

export interface InsteonAddDeviceDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  callback: (address: string, multiple: boolean) => Promise<void>;
}

export const loadInsteonAddDeviceDialog = () =>
  import(/* webpackChunkName: "dialog-insteon-add-device" */ "./dialog-insteon-add-device");

export const showInsteonAddDeviceDialog = (
  element: HTMLElement,
  insteonAddDeviceDialogParams: InsteonAddDeviceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-add-device",
    dialogImport: loadInsteonAddDeviceDialog,
    dialogParams: insteonAddDeviceDialogParams,
  });
};
