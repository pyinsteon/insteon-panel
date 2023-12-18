import { fireEvent } from "@ha/common/dom/fire_event";
import { Insteon } from "../../data/insteon";
import type { HomeAssistant } from "@ha/types";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import type { Property } from "../../data/insteon";

export interface InsteonPropertyDialogParams {
  hass: HomeAssistant;
  insteon: Insteon;
  record: Property;
  schema: HaFormSchema[];
  title: string;
  callback: (name: string, value: any) => Promise<void>;
}

export const loadInsteonPropertyDialog = () =>
  import(/* webpackChunkName: "dialog-insteon-property" */ "./dialog-insteon-property");

export const showInsteonPropertyDialog = (
  element: HTMLElement,
  insteonPropertyParams: InsteonPropertyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-property",
    dialogImport: loadInsteonPropertyDialog,
    dialogParams: insteonPropertyParams,
  });
};
