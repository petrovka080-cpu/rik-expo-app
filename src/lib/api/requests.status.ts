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

export type RequestItemLifecycleClass =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "unknown";

export type RequestHeadExpectation = {
  mode:
    | "all_draft"
    | "mixed_with_inflight"
    | "all_approved"
    | "all_rejected"
    | "mixed_terminal"
    | "unknown";
  allowedHeadStatuses: string[];
  verifiable: boolean;
};

export const classifyRequestItemLifecycleStatus = (raw: unknown): RequestItemLifecycleClass => {
  const s = normalizeStatus(raw);
  if (!s || s === REQUEST_DRAFT_EN || s === normalizeStatus(REQUEST_DRAFT_STATUS)) return "draft";
  if (s === REQUEST_PENDING_EN || s === normalizeStatus(REQUEST_PENDING_STATUS)) return "pending";
  if (s === REQUEST_APPROVED_EN || s === normalizeStatus(REQUEST_APPROVED_STATUS)) return "approved";
  if (s === REQUEST_REJECTED_EN || s === normalizeStatus(REQUEST_REJECTED_STATUS)) return "rejected";
  if (isDraftOrPendingStatus(s)) return s === REQUEST_PENDING_EN ? "pending" : "draft";
  return "unknown";
};

export const matchesRequestHeadExpectation = (
  headStatus: unknown,
  expectation: RequestHeadExpectation,
): boolean => {
  const normalized = normalizeStatus(headStatus);
  return expectation.allowedHeadStatuses.includes(normalized);
};

export const deriveRequestHeadExpectationFromItemStatuses = (
  itemStatuses: unknown[],
): RequestHeadExpectation => {
  const classes = itemStatuses.map(classifyRequestItemLifecycleStatus);
  if (!classes.length || classes.includes("unknown")) {
    return {
      mode: "unknown",
      allowedHeadStatuses: [],
      verifiable: false,
    };
  }

  const hasDraft = classes.includes("draft");
  const hasPending = classes.includes("pending");
  const hasApproved = classes.includes("approved");
  const hasRejected = classes.includes("rejected");

  if (hasDraft && !hasPending && !hasApproved && !hasRejected) {
    return {
      mode: "all_draft",
      allowedHeadStatuses: [normalizeStatus(REQUEST_DRAFT_STATUS), REQUEST_DRAFT_EN],
      verifiable: true,
    };
  }

  if (hasPending || hasDraft) {
    return {
      mode: "mixed_with_inflight",
      allowedHeadStatuses: [normalizeStatus(REQUEST_PENDING_STATUS), REQUEST_PENDING_EN],
      verifiable: true,
    };
  }

  if (hasApproved && !hasRejected) {
    return {
      mode: "all_approved",
      allowedHeadStatuses: [normalizeStatus(REQUEST_APPROVED_STATUS), REQUEST_APPROVED_EN],
      verifiable: true,
    };
  }

  if (hasRejected && !hasApproved) {
    return {
      mode: "all_rejected",
      allowedHeadStatuses: [normalizeStatus(REQUEST_REJECTED_STATUS), REQUEST_REJECTED_EN],
      verifiable: true,
    };
  }

  return {
    mode: "mixed_terminal",
    allowedHeadStatuses: [normalizeStatus(REQUEST_APPROVED_STATUS), normalizeStatus(REQUEST_REJECTED_STATUS)],
    verifiable: true,
  };
};
