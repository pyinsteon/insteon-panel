import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";

export interface InsteonSetOnLevelDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  address: string;
  group: number;
  value: number;
  ramp_rate: number;
  callback: (
    address: string,
    group: number,
    value: number,
    ramp_rate: number
  ) => Promise<void>;
}

export const loadInsteonSetOnLevelDialog = () =>
  import(
    /* webpackChunkName: "dialog-insteon-scene-set-on-level" */ "./dialog-insteon-scene-set-on-level"
  );

export const showInsteonSetOnLevelDialog = (
  element: HTMLElement,
  insteonSetOnLevelDialogParams: InsteonSetOnLevelDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-scene-set-on-level",
    dialogImport: loadInsteonSetOnLevelDialog,
    dialogParams: insteonSetOnLevelDialogParams,
  });
};
