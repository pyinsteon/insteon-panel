import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { Property } from "../../data/insteon";
import type { HaFormSchema } from "../../../homeassistant-frontend/src/components/ha-form/types";

export interface InsteonPropertyDialogParams {
  record: Property;
  schema: HaFormSchema;
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
