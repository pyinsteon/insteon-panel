import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface InsteonAddDeviceDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  callback: (address: string | undefined, multiple: boolean, add_x10: boolean) => Promise<void>;
}

export const loadInsteonAddDeviceDialog = () =>
  import(
    /* webpackChunkName: "dialog-insteon-add-device" */ "./dialog-insteon-add-device"
  );

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
