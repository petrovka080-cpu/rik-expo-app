import type { BuyerProposalBucketRow } from "../buyer.fetchers";

type CardHead = BuyerProposalBucketRow & { items_cnt?: number };

const SUM_LABEL = "\u0441\u043e\u043c";
const ITEMS_LABEL = "\u043f\u043e\u0437.";
const BULLET = "\u2022";
const EMPTY_DASH = "\u2014";

export function mapBuyerProposalToCardProps(head: CardHead, title?: string) {
  const pidStr = String(head.id);
  const headerText = title || pidStr.slice(0, 8);
  const dateStr = head.submitted_at ? new Date(head.submitted_at).toLocaleDateString() : "";

  return {
    pidStr,
    title: headerText,
    subtitle: `${Number(head.total_sum ?? 0).toLocaleString()} ${SUM_LABEL}`,
    meta: `${head.items_cnt || 0} ${ITEMS_LABEL}${dateStr ? ` ${BULLET} ${dateStr}` : ""}`,
    statusText: String(head.status || EMPTY_DASH),
  };
}
