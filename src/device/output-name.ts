import { computeDeviceName } from "@ha/common/entity/compute_device_name";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { deviceButtonTitle, plateGroups, plateLayout } from "./plate-layout";
import { catSubcatFromModel, insteonDeviceByAddress } from "./registry-lookup";

// Names a device's button or output for lists. Single-output devices are named
// without their output, which would only repeat "Load" or "Paddle".
export const outputName = (
  devices: Record<string, DeviceRegistryEntry>,
  address: string,
  group: number,
  localize: (key: string, replace?: Record<string, unknown>) => string,
): string => {
  const entry = insteonDeviceByAddress(devices, address);
  const [cat, subcat] = catSubcatFromModel(entry?.model) ?? [undefined, undefined];
  const name = entry ? computeDeviceName(entry) || address : address;
  if (entry && plateGroups(plateLayout(cat, subcat)).length === 1) {
    return name;
  }
  return `${name} - ${deviceButtonTitle(cat, subcat, group, localize)}`;
};
