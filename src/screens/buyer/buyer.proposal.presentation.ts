import type { BuyerProposalBucketRow } from "./buyer.fetchers";

export function selectBuyerProposalCardTitle(
  proposalId: string | number | null | undefined,
  titleByPid: Record<string, string>
) {
  return titleByPid[String(proposalId ?? "")] || "";
}

export function selectBuyerProposalAttachmentCount(
  proposalId: string | number | null | undefined,
  propAttByPid: Record<string, unknown[]>
) {
  const pid = String(proposalId ?? "");
  const count = pid ? propAttByPid?.[pid]?.length ?? null : null;
  return typeof count === "number" ? count : null;
}

export function selectBuyerProposalCardViewModel(
  head: BuyerProposalBucketRow,
  titleByPid: Record<string, string>,
  propAttByPid: Record<string, unknown[]>
) {
  return {
    title: selectBuyerProposalCardTitle(head?.id, titleByPid),
    attCount: selectBuyerProposalAttachmentCount(head?.id, propAttByPid),
  };
}
