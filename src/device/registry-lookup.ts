import type { DeviceRegistryEntry } from "@ha/data/device_registry";

export const MODEM_CAT = 0x03;

export const normalizeAddress = (address: string): string =>
  address.replace(/\./g, "").toUpperCase();

export const insteonAddress = (entry: DeviceRegistryEntry): string | undefined =>
  entry.identifiers.find((ident) => ident[0] === "insteon")?.[1];

export const catSubcatFromModel = (model?: string | null): [number, number] | undefined => {
  const match = /\((0x[0-9a-f]{2}), (0x[0-9a-f]{2})\)/i.exec(model ?? "");
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16)] : undefined;
};

export const insteonDeviceByAddress = (
  devices: Record<string, DeviceRegistryEntry>,
  address: string,
): DeviceRegistryEntry | undefined => {
  const wanted = normalizeAddress(address);
  return Object.values(devices).find((entry) => {
    const found = insteonAddress(entry);
    return found !== undefined && normalizeAddress(found) === wanted;
  });
};

export const modemAddress = (
  devices: Record<string, DeviceRegistryEntry>,
  entry?: DeviceRegistryEntry,
): string | undefined => {
  const via = entry?.via_device_id ? devices[entry.via_device_id] : undefined;
  if (via) {
    return insteonAddress(via);
  }
  const modem = Object.values(devices).find((candidate) => {
    const pair = catSubcatFromModel(candidate.model);
    return pair !== undefined && pair[0] === MODEM_CAT && insteonAddress(candidate) !== undefined;
  });
  return modem ? insteonAddress(modem) : undefined;
};
