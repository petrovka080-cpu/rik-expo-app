import type { BuyerProposalBucketRow } from "./buyer.fetchers";
import type { BuyerGroup, BuyerTab } from "./buyer.types";

type BuyerListItem = BuyerGroup | BuyerProposalBucketRow;

export function selectBuyerBaseListData(
  tab: BuyerTab,
  groups: BuyerGroup[],
  pending: BuyerProposalBucketRow[],
  approved: BuyerProposalBucketRow[],
  rejected: BuyerProposalBucketRow[]
): BuyerListItem[] {
  if (tab === "inbox") return groups;
  if (tab === "pending") return pending;
  if (tab === "approved") return approved;
  if (tab === "rejected") return rejected;
  return [];
}

export function matchesBuyerSearchQuery(
  item: BuyerListItem,
  query: string,
  titleByPid?: Record<string, string>
) {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const candidate = item as Record<string, unknown>;
  const id = String(candidate.id || candidate.request_id || "").toLowerCase();
  const titleKey = String(candidate.id || "");
  const title = titleByPid ? String(titleByPid[titleKey] || "").toLowerCase() : "";
  if (id.includes(q) || title.includes(q)) return true;

  if (Array.isArray(candidate.items)) {
    return candidate.items.some((raw) => {
      const row = raw as Record<string, unknown>;
      const name = String(row.name_human || "").toLowerCase();
      const obj = String(row.object_name || "").toLowerCase();
      const sys = String(row.system_name || row.system || "").toLowerCase();
      const mat = String(row.material || "").toLowerCase();
      const code = String(row.rik_code || "").toLowerCase();
      return name.includes(q) || obj.includes(q) || sys.includes(q) || mat.includes(q) || code.includes(q);
    });
  }

  const supplier = String(candidate.supplier || "").toLowerCase();
  const objName = String(candidate.object_name || "").toLowerCase();
  return supplier.includes(q) || objName.includes(q);
}

export function selectFilteredBuyerListData(
  base: BuyerListItem[],
  search?: string,
  titleByPid?: Record<string, string>
) {
  if (!search?.trim()) return base;
  return base.filter((item) => matchesBuyerSearchQuery(item, search, titleByPid));
}
