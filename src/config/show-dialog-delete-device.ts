import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface insteonDeleteDeviceDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  callback?: (address: string) => Promise<void>;
}

export const loadInsteonDeleteDevice = () =>
  import(
    /* webpackChunkName: "dialog-delete-device" */ "./dialog-delete-device"
  );

export const showDeleteDeviceDialog = (
  element: HTMLElement,
  insteonDeleteDeviceDialogParams: insteonDeleteDeviceDialogParams,
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-delete-device",
    dialogImport: loadInsteonDeleteDevice,
    dialogParams: insteonDeleteDeviceDialogParams,
  });
};
