import { html } from "lit";
import type { HomeAssistant } from "@ha/types";
import { showConfirmationDialog } from "@ha/dialogs/generic/show-dialog-box";
import { navigate } from "@ha/common/navigate";
import type { Insteon, InsteonDevice } from "../data/insteon";
import { removeInsteonDevice } from "../data/device";

export const confirmDeleteDevice = async (
  element: HTMLElement,
  hass: HomeAssistant,
  insteon: Insteon,
  device: InsteonDevice,
): Promise<void> => {
  const confirmed = await showConfirmationDialog(element, {
    text: insteon.localize("common.warn.delete"),
    confirmText: insteon.localize("common.yes"),
    dismissText: insteon.localize("common.no"),
    warning: true,
  });
  if (!confirmed) {
    return;
  }
  let removeAllRefs = false;
  if (!device.address.includes("X10")) {
    removeAllRefs = await showConfirmationDialog(element, {
      title: insteon.localize("device.remove_all_refs.title"),
      text: html`${insteon.localize("device.remove_all_refs.description")}<br /><br />
        ${insteon.localize("device.remove_all_refs.confirm_description")}<br />
        ${insteon.localize("device.remove_all_refs.dismiss_description")}`,
      confirmText: insteon.localize("common.yes"),
      dismissText: insteon.localize("common.no"),
      warning: true,
      destructive: true,
    });
  }
  await removeInsteonDevice(hass, device.address, removeAllRefs);
  navigate("/insteon");
};
