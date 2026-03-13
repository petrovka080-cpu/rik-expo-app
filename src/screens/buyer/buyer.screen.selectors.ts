import type { BuyerProposalBucketRow } from "./buyer.fetchers";
import type { BuyerGroup } from "./buyer.types";

export type BuyerTabCounts = {
  inboxCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  subcontractCount: number;
};

export function selectBuyerTabCounts(params: {
  groups: BuyerGroup[];
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  subcontractCount?: number | null;
}): BuyerTabCounts {
  const { groups, pending, approved, rejected, subcontractCount } = params;
  return {
    inboxCount: groups.length,
    pendingCount: pending.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    subcontractCount: Math.max(0, subcontractCount ?? 0),
  };
}

export function selectBuyerMainListHeaderPad(measuredHeaderMax: number) {
  return measuredHeaderMax + 58;
}

export function selectInboxKeyboardLayoutActive(kbOpen: boolean, isMobileEditorVisible: boolean) {
  return kbOpen && !isMobileEditorVisible;
}
