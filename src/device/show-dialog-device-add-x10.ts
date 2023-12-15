import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface insteonDeviceAddX10DialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  callback: () => Promise<void>,
}

export const loadInsteonDeviceAddX10 = () =>
  import(/* webpackChunkName: "dialog-device-add-x10" */ "./dialog-device-add-x10");

export const showDeviceAddX10Dialog = (
  element: HTMLElement,
  insteonDeviceAddX10DialogParams: insteonDeviceAddX10DialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-add-x10",
    dialogImport: loadInsteonDeviceAddX10,
    dialogParams: insteonDeviceAddX10DialogParams,
  });
};
