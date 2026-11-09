import { mdiFolderMultipleOutline, mdiInformationOutline, mdiNetwork } from "@mdi/js";
import type { PageNavigation } from "@ha/layouts/hass-tabs-subpage";

export const deviceTabs = (
  localize: (key: string) => string,
  deviceId: string,
): PageNavigation[] => [
  {
    name: localize("device.overview.caption"),
    path: `/insteon/device/overview/${deviceId}`,
    iconPath: mdiInformationOutline,
  },
  {
    name: localize("properties.caption"),
    path: `/insteon/device/properties/${deviceId}`,
    iconPath: mdiFolderMultipleOutline,
  },
  {
    name: localize("aldb.caption"),
    path: `/insteon/device/aldb/${deviceId}`,
    iconPath: mdiNetwork,
  },
];
