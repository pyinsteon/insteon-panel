import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface InsteonAddingDeviceDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  address: string;
  multiple: boolean;
  title: string;
}

export const loadInsteonAddingDeviceDialog = () =>
  import(/* webpackChunkName: "dialog-insteon-adding-device" */ "./dialog-insteon-adding-device");

export const showInsteonAddingDeviceDialog = (
  element: HTMLElement,
  insteonAddingDeviceDialogParams: InsteonAddingDeviceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-adding-device",
    dialogImport: loadInsteonAddingDeviceDialog,
    dialogParams: insteonAddingDeviceDialogParams,
  });
};
