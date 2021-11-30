import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { ALDBRecord } from "../../data/insteon";
import type { HaFormSchema } from "../../../homeassistant-frontend/src/components/ha-form/types";

export interface InsteonALDBRecordDialogParams {
  record: ALDBRecord;
  schema: HaFormSchema[];
  title: string;
  callback: (rec: ALDBRecord) => Promise<void>;
}

export const loadInsteonALDBRecordDialog = () =>
  import(/* webpackChunkName: "dialog-insteon-aldb-record" */ "./dialog-insteon-aldb-record");

export const showInsteonALDBRecordDialog = (
  element: HTMLElement,
  insteonALDBRecordParams: InsteonALDBRecordDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-aldb-record",
    dialogImport: loadInsteonALDBRecordDialog,
    dialogParams: insteonALDBRecordParams,
  });
};
