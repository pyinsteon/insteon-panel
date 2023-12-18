import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";
import { HaFormSchema, HaFormDataContainer } from "@ha/components/ha-form/types";

export interface insteonConfigModemDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  schema: HaFormSchema[];
  data: HaFormDataContainer;
  errors?: string;
  callback: () => Promise<void>;
}

export const loadInsteonConfigModem = () =>
  import(/* webpackChunkName: "dialog-config-modem" */ "./dialog-config-modem");

export const showConfigModemDialog = (
  element: HTMLElement,
  insteonConfigModemDialogParams: insteonConfigModemDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-config-modem",
    dialogImport: loadInsteonConfigModem,
    dialogParams: insteonConfigModemDialogParams,
  });
};
