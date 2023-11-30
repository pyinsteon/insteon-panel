import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../data/insteon";
import type { HomeAssistant } from "@ha/types";
import { HaFormSchema, HaFormDataContainer } from "@ha/components/ha-form/types";

export interface insteonConfigAddX10DialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  title: string;
  schema: HaFormSchema[],
  data: HaFormDataContainer,
  callback: (formData: HaFormDataContainer) => Promise<void>,
  error: string | undefined,
}

export const loadInsteonConfigAddX10 = () =>
  import(/* webpackChunkName: "dialog-config-add-x10" */ "./dialog-config-add-x10");

export const showConfigAddX10Dialog = (
  element: HTMLElement,
  insteonConfigAddX10DialogParams: insteonConfigAddX10DialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-config-add-x10",
    dialogImport: loadInsteonConfigAddX10,
    dialogParams: insteonConfigAddX10DialogParams,
  });
};
