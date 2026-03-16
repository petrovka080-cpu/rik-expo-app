import type { Database } from "../database.types";

type RequestStatusEnum = Database["public"]["Enums"]["request_status_enum"];

export const REQUEST_DRAFT_STATUS: RequestStatusEnum = "Черновик";
export const REQUEST_PENDING_STATUS: RequestStatusEnum = "На утверждении";
export const REQUEST_APPROVED_STATUS: RequestStatusEnum = "Утверждено";
export const REQUEST_REJECTED_STATUS: RequestStatusEnum = "Отклонено";

export const REQUEST_PENDING_EN = "pending";
export const REQUEST_DRAFT_EN = "draft";
export const REQUEST_APPROVED_EN = "approved";
export const REQUEST_REJECTED_EN = "rejected";

export const REQUEST_STATUS_MATCHERS = {
  draftFragment: "чернов",
  pendingFragment: "на утверждении",
} as const;

export const REQUEST_TERMINAL_ITEM_STATUS_FILTER = `("${REQUEST_APPROVED_STATUS}","${REQUEST_REJECTED_STATUS}","${REQUEST_APPROVED_EN}","${REQUEST_REJECTED_EN}")`;

export const normalizeStatus = (raw: unknown): string =>
  String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export const isDraftOrPendingStatus = (raw: unknown): boolean => {
  const s = normalizeStatus(raw);
  if (!s) return true;
  return (
    s === REQUEST_DRAFT_EN ||
    s === REQUEST_PENDING_EN ||
    s.includes(REQUEST_STATUS_MATCHERS.draftFragment) ||
    s.includes(REQUEST_STATUS_MATCHERS.pendingFragment)
  );
};
