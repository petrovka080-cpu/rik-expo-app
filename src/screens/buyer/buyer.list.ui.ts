import type { BuyerTab } from "./buyer.types";

type ListItem = { request_id?: string | number | null; id?: string | number | null; __skeleton?: boolean };

const BUYER_LIST_SKELETON_DATA: ListItem[] = [
  { id: "s1", __skeleton: true },
  { id: "s2", __skeleton: true },
  { id: "s3", __skeleton: true },
  { id: "s4", __skeleton: true },
];

export function selectBuyerListLoading(tab: BuyerTab, loadingInbox: boolean, loadingBuckets: boolean) {
  return (tab === "inbox" && loadingInbox) || (tab !== "inbox" && loadingBuckets);
}

export function selectBuyerMainListData(
  data: ListItem[],
  isLoading: boolean,
  refreshing: boolean
) {
  if (isLoading && !refreshing && (!data || data.length === 0)) {
    return BUYER_LIST_SKELETON_DATA;
  }
  return data;
}

export function selectBuyerShouldShowEmptyState(isLoading: boolean) {
  return !isLoading;
}
