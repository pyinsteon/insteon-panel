import type { ALDBRecord } from "../data/device";
import type { PlateLayout } from "./plate-layout";
import { plateGroups } from "./plate-layout";
import { normalizeAddress } from "./registry-lookup";

export interface LinkRow {
  target: string;
  name: string;
  group: number;
  data3: number;
  isModem: boolean;
  isController: boolean;
  pending: boolean;
}

export interface ButtonLinks {
  controls: LinkRow[];
  controlledBy: LinkRow[];
}

export interface AttributedLinks {
  byButton: Map<number, ButtonLinks>;
  other: LinkRow[];
}

export type RowDetail =
  | { kind: "ha_notified" }
  | { kind: "ha_controls" }
  | { kind: "scene"; group: number }
  | { kind: "button"; layout: PlateLayout; group: number }
  | { kind: "not_a_button"; group: number }
  | { kind: "none" };

const isModemTarget = (rec: ALDBRecord, modem?: string): boolean =>
  modem !== undefined && normalizeAddress(rec.target) === normalizeAddress(modem);

const isInstalled = (rec: ALDBRecord): boolean => rec.in_use && !rec.dirty;

export const hasPendingRecords = (records: ALDBRecord[]): boolean =>
  records.some((rec) => rec.dirty);

const toRow = (rec: ALDBRecord, modem?: string): LinkRow => ({
  target: rec.target,
  name: rec.target_name || rec.target,
  group: rec.group,
  data3: rec.data3,
  isModem: isModemTarget(rec, modem),
  isController: rec.is_controller,
  pending: rec.dirty,
});

const responderButton = (
  rec: ALDBRecord,
  buttons: number[],
  modem?: string,
  loadButton?: number,
): number | undefined => {
  if (buttons.length === 1) {
    return buttons[0];
  }
  if (isModemTarget(rec, modem) && rec.group === 0) {
    if (loadButton !== undefined && buttons.includes(loadButton)) {
      return loadButton;
    }
    return buttons.includes(1) ? 1 : buttons[0];
  }
  if (buttons.includes(rec.data3)) {
    return rec.data3;
  }
  if (rec.data3 === 0 && buttons.includes(1)) {
    return 1;
  }
  return undefined;
};

const controllerButton = (rec: ALDBRecord, buttons: number[]): number | undefined =>
  buttons.includes(rec.group) ? rec.group : undefined;

export const attributeRecords = (
  records: ALDBRecord[],
  buttons: number[],
  modem?: string,
  loadButton?: number,
): AttributedLinks => {
  const byButton = new Map<number, ButtonLinks>();
  buttons.forEach((button) => byButton.set(button, { controls: [], controlledBy: [] }));
  const other: LinkRow[] = [];
  const seen = new Set<string>();
  records
    .filter((rec) => rec.in_use)
    .forEach((rec) => {
      const button = rec.is_controller
        ? controllerButton(rec, buttons)
        : responderButton(rec, buttons, modem, loadButton);
      const key = [
        rec.is_controller ? "c" : "r",
        normalizeAddress(rec.target),
        rec.group,
        button ?? "x",
      ].join(":");
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const row = toRow(rec, modem);
      if (button === undefined) {
        other.push(row);
        return;
      }
      const links = byButton.get(button)!;
      (rec.is_controller ? links.controls : links.controlledBy).push(row);
    });
  return { byButton, other };
};

export const rowDetail = (
  row: LinkRow,
  section: "controls" | "controlled_by",
  targetLayout?: PlateLayout,
): RowDetail => {
  if (row.isModem) {
    if (section === "controls") {
      return { kind: "ha_notified" };
    }
    return row.group > 0 ? { kind: "scene", group: row.group } : { kind: "ha_controls" };
  }
  if (section === "controls" || !targetLayout) {
    return { kind: "none" };
  }
  const groups = plateGroups(targetLayout);
  if (groups.length === 0) {
    return { kind: "none" };
  }
  if (!groups.includes(row.group)) {
    return { kind: "not_a_button", group: row.group };
  }
  if (groups.length < 2) {
    return { kind: "none" };
  }
  return { kind: "button", layout: targetLayout, group: row.group };
};

export const hasModemResponderLink = (records: ALDBRecord[], modem: string): boolean =>
  records.some((rec) => isInstalled(rec) && !rec.is_controller && isModemTarget(rec, modem));

export const buttonNotifiesModem = (
  records: ALDBRecord[],
  modem: string,
  button: number,
): boolean =>
  records.some(
    (rec) =>
      isInstalled(rec) && rec.is_controller && rec.group === button && isModemTarget(rec, modem),
  );
