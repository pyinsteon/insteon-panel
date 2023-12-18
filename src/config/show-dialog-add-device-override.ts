import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface AddDeviceOverrideDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  callback?: (success: boolean) => Promise<void>;
  error?: string | undefined;
}

export const loadAddDeviceOverrideDialog = () =>
  import(
    /* webpackChunkName: "dialog-add-device-override" */ "./dialog-add-device-override"
  );

export const showAddDeviceOverrideDialog = (
  element: HTMLElement,
  addDeviceOverrideDialogParams: AddDeviceOverrideDialogParams,
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-device-override",
    dialogImport: loadAddDeviceOverrideDialog,
    dialogParams: addDeviceOverrideDialogParams,
  });
};
