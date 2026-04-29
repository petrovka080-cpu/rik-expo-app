import { safeJsonParse } from "../format";

export type ProposalRequestItemIntegrityState =
  | "active"
  | "source_cancelled"
  | "source_missing";

export type ProposalRequestItemIntegrityReason =
  | "request_item_cancelled"
  | "request_item_missing"
  | null;

export type ProposalRequestItemIntegrityFields = {
  request_item_integrity_state?: ProposalRequestItemIntegrityState;
  request_item_integrity_reason?: ProposalRequestItemIntegrityReason;
  request_item_source_status?: string | null;
  request_item_cancelled_at?: string | null;
};

export type ProposalRequestItemIntegrityRow = {
  proposal_id: string;
  proposal_item_id: number;
  request_item_id: string;
  integrity_state: ProposalRequestItemIntegrityState;
  integrity_reason: ProposalRequestItemIntegrityReason;
  request_item_exists: boolean;
  request_item_status: string | null;
  request_item_cancelled_at: string | null;
};

export type ProposalRequestItemIntegritySummary = {
  proposalId: string | null;
  totalItems: number;
  degradedItems: number;
  cancelledItems: number;
  missingItems: number;
  requestItemIds: string[];
};

export const ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE: ProposalRequestItemIntegrityState =
  "active";

const trim = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseSummary = (detail: unknown): ProposalRequestItemIntegritySummary => {
  let raw = asRecord(detail);
  if (typeof detail === "string" && detail.trim().startsWith("{")) {
    const parsed = safeJsonParse<Record<string, unknown>>(detail, {});
    if (parsed.ok === false) throw parsed.error;
    raw = asRecord(parsed.value);
  }
  const requestItemIds = Array.isArray(raw.request_item_ids)
    ? raw.request_item_ids.map((value) => trim(value)).filter(Boolean)
    : [];

  return {
    proposalId: trim(raw.proposal_id) || null,
    totalItems: toNumber(raw.total_items),
    degradedItems: toNumber(raw.degraded_items),
    cancelledItems: toNumber(raw.cancelled_items),
    missingItems: toNumber(raw.missing_items),
    requestItemIds,
  };
};

export class ProposalRequestItemIntegrityDegradedError extends Error {
  code: "proposal_request_item_integrity_degraded";
  summary: ProposalRequestItemIntegritySummary;

  constructor(summary: ProposalRequestItemIntegritySummary) {
    super(
      summary.cancelledItems > 0 && summary.missingItems > 0
        ? "Proposal contains cancelled and missing source request items. Review the degraded lines before submit or approval."
        : summary.cancelledItems > 0
          ? "Proposal contains cancelled source request items. Review the degraded lines before submit or approval."
          : "Proposal contains missing source request items. Review the degraded lines before submit or approval.",
    );
    this.name = "ProposalRequestItemIntegrityDegradedError";
    this.code = "proposal_request_item_integrity_degraded";
    this.summary = summary;
  }
}

export const toProposalRequestItemIntegrityDegradedError = (
  error: unknown,
): ProposalRequestItemIntegrityDegradedError | null => {
  const record = asRecord(error);
  const message = trim(record.message);
  if (message !== "proposal_request_item_integrity_degraded") return null;

  try {
    return new ProposalRequestItemIntegrityDegradedError(parseSummary(record.details));
  } catch {
    return new ProposalRequestItemIntegrityDegradedError({
      proposalId: null,
      totalItems: 0,
      degradedItems: 0,
      cancelledItems: 0,
      missingItems: 0,
      requestItemIds: [],
    });
  }
};

export const isProposalItemIntegrityDegraded = (
  value: ProposalRequestItemIntegrityFields | null | undefined,
) =>
  (value?.request_item_integrity_state ?? ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE) !==
  ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE;

export const getProposalItemIntegrityLabel = (
  value: ProposalRequestItemIntegrityFields | null | undefined,
): string | null => {
  switch (value?.request_item_integrity_state) {
    case "source_cancelled":
      return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0437\u0430\u044f\u0432\u043a\u0438 \u043e\u0442\u043c\u0435\u043d\u0451\u043d";
    case "source_missing":
      return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0437\u0430\u044f\u0432\u043a\u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d";
    default:
      return null;
  }
};

export const getProposalIntegritySummaryLabel = (
  rows: readonly ProposalRequestItemIntegrityFields[],
): string | null => {
  const degradedRows = rows.filter(isProposalItemIntegrityDegraded);
  if (!degradedRows.length) return null;

  const cancelledCount = degradedRows.filter(
    (row) => row.request_item_integrity_state === "source_cancelled",
  ).length;
  const missingCount = degradedRows.filter(
    (row) => row.request_item_integrity_state === "source_missing",
  ).length;

  if (cancelledCount > 0 && missingCount > 0) {
    return `\u0415\u0441\u0442\u044c \u043e\u0442\u043c\u0435\u043d\u0451\u043d\u043d\u044b\u0435 \u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 source item: ${degradedRows.length}`;
  }
  if (cancelledCount > 0) {
    return `\u0415\u0441\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u0438 \u0441 \u043e\u0442\u043c\u0435\u043d\u0451\u043d\u043d\u044b\u043c source item: ${cancelledCount}`;
  }
  return `\u0415\u0441\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u0438 \u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u043c source item: ${missingCount}`;
};
