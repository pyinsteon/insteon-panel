import type { ALDBRecord } from "../data/device";
import { buttonNotifiesModem, hasModemResponderLink } from "../device/link-rows";
import type { ModemLinkNeeds } from "../device/reporting-groups";

export interface ModemLinkGaps {
  control: boolean;
  unreported: number[];
}

export const modemLinkGaps = (
  records: ALDBRecord[],
  needs: ModemLinkNeeds,
  modem: string,
): ModemLinkGaps => ({
  control: needs.responder && !hasModemResponderLink(records, modem),
  unreported: needs.controllers.filter((button) => !buttonNotifiesModem(records, modem, button)),
});

export const hasModemLinkGaps = (gaps: ModemLinkGaps): boolean =>
  gaps.control || gaps.unreported.length > 0;
