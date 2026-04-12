import type { BuyerProposalBucketRow } from "./buyer.fetchers";
import { readBuyerBucketCanonicalCount } from "./buyer.fetchers.data";
import type { BuyerGroup } from "./buyer.types";

export type BuyerTabCounts = {
  inboxCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  subcontractCount: number;
};

export function selectBuyerTabCounts(params: {
  groups?: BuyerGroup[];
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  subcontractCount?: number | null;
  inboxTotalCount?: number | null;
}): BuyerTabCounts {
  const { pending, approved, rejected, subcontractCount, inboxTotalCount } = params;
  return {
    inboxCount: Math.max(0, inboxTotalCount ?? 0),
    pendingCount: readBuyerBucketCanonicalCount(pending),
    approvedCount: readBuyerBucketCanonicalCount(approved),
    rejectedCount: readBuyerBucketCanonicalCount(rejected),
    subcontractCount: Math.max(0, subcontractCount ?? 0),
  };
}

export function selectBuyerMainListHeaderPad(measuredHeaderMax: number) {
  return measuredHeaderMax + 58;
}

export function selectInboxKeyboardLayoutActive(kbOpen: boolean, isMobileEditorVisible: boolean) {
  return kbOpen && !isMobileEditorVisible;
}
