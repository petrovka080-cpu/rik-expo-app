import type { BuyerProposalBucketRow } from "../buyer.fetchers";

type CardHead = BuyerProposalBucketRow & { items_cnt?: number };

export function mapBuyerProposalToCardProps(head: CardHead, title?: string) {
  const pidStr = String(head.id);
  const headerText = title || pidStr.slice(0, 8);
  const dateStr = head.submitted_at ? new Date(head.submitted_at).toLocaleDateString() : "";

  return {
    pidStr,
    title: headerText,
    subtitle: `${Number(head.total_sum ?? 0).toLocaleString()} сом`,
    meta: `${head.items_cnt || 0} поз.${dateStr ? ` • ${dateStr}` : ""}`,
    statusText: String(head.status || "—"),
  };
}
