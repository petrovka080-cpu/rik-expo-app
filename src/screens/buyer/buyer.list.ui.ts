import type { BuyerTab } from "./buyer.types";

type ListItem = { request_id?: string | number | null; id?: string | number | null; __skeleton?: boolean };
type BuyerPublicationState = "idle" | "ready" | "error" | "degraded";
type BuyerPublicationScope = "inbox" | "buckets";

const BUYER_LIST_SKELETON_DATA: ListItem[] = [
  { id: "s1", __skeleton: true },
  { id: "s2", __skeleton: true },
  { id: "s3", __skeleton: true },
  { id: "s4", __skeleton: true },
];
const BUYER_TECHNICAL_PUBLICATION_MARKERS = [
  "Invalid RPC response shape",
  "RpcValidationError",
  "src/screens/",
  "buyer.fetchers.loadBuyerBucketsDataRpcInternal",
  "buyer_summary_buckets_scope_v1",
];
const BUYER_INBOX_ERROR_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0438 \u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0446\u0430.";
const BUYER_BUCKETS_ERROR_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0446\u0430.";
const BUYER_DEGRADED_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u043e\u043a\u0430\u0437\u0430\u043d\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f.";
const BUYER_GENERIC_ERROR_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435.";

export function isBuyerTechnicalPublicationMessage(message: unknown) {
  const text = String(message ?? "");
  return BUYER_TECHNICAL_PUBLICATION_MARKERS.some((marker) => text.includes(marker));
}

export function selectBuyerPublicationFallbackMessage(
  scope: BuyerPublicationScope,
  publicationState: BuyerPublicationState,
) {
  if (publicationState === "degraded") return BUYER_DEGRADED_MESSAGE;
  if (scope === "inbox") return BUYER_INBOX_ERROR_MESSAGE;
  if (scope === "buckets") return BUYER_BUCKETS_ERROR_MESSAGE;
  return BUYER_GENERIC_ERROR_MESSAGE;
}

export function normalizeBuyerPublicationMessage(
  scope: BuyerPublicationScope,
  publicationState: BuyerPublicationState,
  message: unknown,
) {
  const text = String(message ?? "").trim();
  if (!text || isBuyerTechnicalPublicationMessage(text)) {
    return selectBuyerPublicationFallbackMessage(scope, publicationState);
  }
  return text;
}

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

export function selectBuyerShouldShowEmptyState(
  isLoading: boolean,
  publicationState: BuyerPublicationState = "ready",
) {
  return !isLoading && publicationState === "ready";
}
