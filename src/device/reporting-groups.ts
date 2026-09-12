import type { InsteonDevice } from "../data/insteon";
import { plateGroups, plateLayout } from "./plate-layout";

export interface ModemLinkNeeds {
  controllers: number[];
  responder: boolean;
}

const IO_LINC: ModemLinkNeeds = { controllers: [1], responder: false };
const THERMOSTAT: ModemLinkNeeds = { controllers: [1, 2, 3, 4, 0xef], responder: true };

const TABLE: [number, number[], ModemLinkNeeds][] = [
  [0x07, [0x00, 0x0d], IO_LINC],
  [
    0x05,
    [0x03, 0x07, 0x08, 0x0a, 0x0b, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18],
    THERMOSTAT,
  ],
];

const BY_PRODUCT = new Map<number, ModemLinkNeeds>();
TABLE.forEach(([cat, subcats, needs]) => {
  subcats.forEach((subcat) => BY_PRODUCT.set(cat * 256 + subcat, needs));
});

export const stateGroups = (device: InsteonDevice): number[] => {
  const layout = plateLayout(device.cat, device.subcat);
  if (layout !== "none") {
    return plateGroups(layout);
  }
  return Object.keys(device.buttons || {})
    .map(Number)
    .sort((a, b) => a - b);
};

export const modemLinkNeeds = (device: InsteonDevice): ModemLinkNeeds => {
  if (
    device.cat !== undefined &&
    device.cat !== null &&
    device.subcat !== undefined &&
    device.subcat !== null
  ) {
    const known = BY_PRODUCT.get(device.cat * 256 + device.subcat);
    if (known) {
      return known;
    }
  }
  return { controllers: stateGroups(device), responder: true };
};
