import type { Database } from "../../lib/database.types";
import type { BuyerInboxRow } from "../../lib/catalog_api";

export type BuyerProposalBucketRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  total_sum?: number;
  sent_to_accountant_at?: string | null;
  items_cnt?: number;
};

const BUYER_BUCKET_CANONICAL_COUNT_KEY = "__buyerCanonicalTotalCount";

export type BuyerProposalBucketRows = BuyerProposalBucketRow[] & {
  [BUYER_BUCKET_CANONICAL_COUNT_KEY]?: number;
};

export type BuyerSummaryBucketCounts = {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export type BuyerSummaryBucketsScopeEnvelope = {
  document_type: string;
  version: string;
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  counts: BuyerSummaryBucketCounts;
  meta: Record<string, unknown>;
};

export type BuyerSummaryInboxScopeEnvelope = {
  document_type: string;
  version: string;
  rows: BuyerInboxRow[];
  meta: Record<string, unknown>;
};

type ProposalSummaryRow = Pick<
  Database["public"]["Views"]["v_proposals_summary"]["Row"],
  "proposal_id" | "status" | "submitted_at" | "sent_to_accountant_at" | "total_sum" | "items_cnt"
>;
type ProposalRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "id" | "payment_status" | "submitted_at" | "created_at"
>;
type ProposalItemIdRow = Pick<Database["public"]["Tables"]["proposal_items"]["Row"], "proposal_id">;

const asText = (value: unknown): string => String(value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asMaybeText = (value: unknown): string | null => {
  const normalized = asText(value);
  return normalized || null;
};

const asNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asRequiredCount = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`buyer_summary_buckets_scope_v1 missing canonical ${field}`);
  }
  return Math.trunc(parsed);
};

const asMaybeNumber = (value: unknown): number | undefined => {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const withBuyerBucketCanonicalCount = (
  rows: BuyerProposalBucketRow[],
  count: number,
): BuyerProposalBucketRows => {
  const next = [...rows] as BuyerProposalBucketRows;
  Object.defineProperty(next, BUYER_BUCKET_CANONICAL_COUNT_KEY, {
    value: Math.max(0, Math.trunc(Number(count) || 0)),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return next;
};

export const readBuyerBucketCanonicalCount = (rows: BuyerProposalBucketRow[]): number => {
  const count = (rows as BuyerProposalBucketRows)[BUYER_BUCKET_CANONICAL_COUNT_KEY];
  return Number.isFinite(Number(count)) ? Math.max(0, Math.trunc(Number(count))) : 0;
};

export const mapProposalSummaryRows = (
  rows: ProposalSummaryRow[] | null | undefined,
): BuyerProposalBucketRow[] => {
  if (!Array.isArray(rows)) return [];

  const mapped: (BuyerProposalBucketRow | null)[] = rows
    .map((row) => {
      const id = asText(row.proposal_id);
      if (!id) return null;

      return {
        id,
        status: asText(row.status),
        submitted_at: asMaybeText(row.submitted_at),
        total_sum: asNumber(row.total_sum),
        sent_to_accountant_at: asMaybeText(row.sent_to_accountant_at),
        items_cnt: asNumber(row.items_cnt),
      };
    });

  return mapped.filter((row): row is BuyerProposalBucketRow => row !== null);
};

export const mapRejectedProposalRows = (
  rows: ProposalRow[] | null | undefined,
  reworkStatusLower: string,
): BuyerProposalBucketRow[] => {
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const mapped: BuyerProposalBucketRow[] = [];

  for (const row of rows) {
    const id = asText(row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const paymentStatus = asText(row.payment_status);
    if (!paymentStatus.toLowerCase().startsWith(reworkStatusLower)) continue;

    mapped.push({
      id,
      status: paymentStatus || reworkStatusLower,
      submitted_at: asMaybeText(row.submitted_at) ?? asMaybeText(row.created_at),
    });
  }

  return mapped;
};

export const buildProposalItemCountMap = (
  rows: ProposalItemIdRow[] | null | undefined,
): Map<string, number> => {
  const counts = new Map<string, number>();
  if (!Array.isArray(rows)) return counts;

  for (const row of rows) {
    const proposalId = asText(row.proposal_id);
    if (!proposalId) continue;
    counts.set(proposalId, (counts.get(proposalId) ?? 0) + 1);
  }

  return counts;
};

export const filterProposalBucketsWithItems = (
  rows: BuyerProposalBucketRow[],
  itemCounts: ReadonlyMap<string, number>,
): BuyerProposalBucketRow[] => rows.filter((row) => (itemCounts.get(row.id) ?? 0) > 0);

const mapScopeSummaryRows = (rows: unknown): BuyerProposalBucketRow[] => {
  if (!Array.isArray(rows)) return [];

  const mapped: (BuyerProposalBucketRow | null)[] = rows.map((raw) => {
    const row = asRecord(raw);
    if (!row) return null;

    const id = asText(row.id);
    if (!id) return null;

    return {
      id,
      status: asText(row.status),
      submitted_at: asMaybeText(row.submitted_at),
      total_sum: asNumber(row.total_sum),
      sent_to_accountant_at: asMaybeText(row.sent_to_accountant_at),
      items_cnt: asNumber(row.items_cnt),
    };
  });

  return mapped.filter((row): row is BuyerProposalBucketRow => row !== null);
};

const mapScopeRejectedRows = (rows: unknown): BuyerProposalBucketRow[] => {
  if (!Array.isArray(rows)) return [];

  const mapped: (BuyerProposalBucketRow | null)[] = rows.map((raw) => {
    const row = asRecord(raw);
    if (!row) return null;

    const id = asText(row.id);
    if (!id) return null;

    const result: BuyerProposalBucketRow = {
      id,
      status: asText(row.status),
      submitted_at: asMaybeText(row.submitted_at),
    };
    const totalSum = asMaybeNumber(row.total_sum);
    if (typeof totalSum === "number") result.total_sum = totalSum;
    const sentToAccountantAt = asMaybeText(row.sent_to_accountant_at);
    if (sentToAccountantAt) result.sent_to_accountant_at = sentToAccountantAt;
    const itemsCount = asMaybeNumber(row.items_cnt);
    if (typeof itemsCount === "number") result.items_cnt = itemsCount;
    return result;
  });

  return mapped.filter((row): row is BuyerProposalBucketRow => row !== null);
};

export const adaptBuyerSummaryBucketsScopeEnvelope = (
  raw: unknown,
): BuyerSummaryBucketsScopeEnvelope => {
  const root = asRecord(raw) ?? {};
  const meta = asRecord(root.meta) ?? {};
  const counts = {
    pendingCount: asRequiredCount(meta.pending_count, "meta.pending_count"),
    approvedCount: asRequiredCount(meta.approved_count, "meta.approved_count"),
    rejectedCount: asRequiredCount(meta.rejected_count, "meta.rejected_count"),
  };
  return {
    document_type: asText(root.document_type),
    version: asText(root.version),
    pending: mapScopeSummaryRows(root.pending),
    approved: mapScopeSummaryRows(root.approved),
    rejected: mapScopeRejectedRows(root.rejected),
    counts,
    meta,
  };
};

export const isBuyerSummaryBucketsScopeResponse = (
  raw: unknown,
): raw is BuyerSummaryBucketsScopeEnvelope => {
  const root = asRecord(raw);
  if (!root) return false;
  if (asText(root.document_type) !== "buyer_summary_buckets_scope_v1") return false;
  if (!asText(root.version)) return false;
  if (!Array.isArray(root.pending) || !Array.isArray(root.approved) || !Array.isArray(root.rejected)) {
    return false;
  }

  try {
    adaptBuyerSummaryBucketsScopeEnvelope(raw);
    return true;
  } catch {
    return false;
  }
};

const mapScopeInboxRows = (rows: unknown): BuyerInboxRow[] => {
  if (!Array.isArray(rows)) return [];

  const mapped: (BuyerInboxRow | null)[] = rows.map((raw) => {
    const row = asRecord(raw);
    if (!row) return null;

    const requestId = asText(row.request_id);
    const requestItemId = asText(row.request_item_id);
    if (!requestId || !requestItemId) return null;

    return {
      request_id: requestId,
      request_id_old: asMaybeNumber(row.request_id_old) ?? null,
      request_item_id: requestItemId,
      rik_code: asMaybeText(row.rik_code),
      name_human: asText(row.name_human) || "\u2014",
      qty: asMaybeNumber(row.qty) ?? 0,
      uom: asMaybeText(row.uom),
      app_code: asMaybeText(row.app_code),
      note: asMaybeText(row.note),
      object_name: asMaybeText(row.object_name),
      status: asText(row.status),
      created_at: asMaybeText(row.created_at) ?? undefined,
      director_reject_note: asMaybeText(row.director_reject_note),
      director_reject_at: asMaybeText(row.director_reject_at),
      director_reject_reason: asMaybeText(row.director_reject_reason),
      last_offer_supplier: asMaybeText(row.last_offer_supplier),
      last_offer_price: asMaybeNumber(row.last_offer_price) ?? null,
      last_offer_note: asMaybeText(row.last_offer_note),
    };
  });

  return mapped.filter((row): row is BuyerInboxRow => row !== null);
};

export const adaptBuyerSummaryInboxScopeEnvelope = (
  raw: unknown,
): BuyerSummaryInboxScopeEnvelope => {
  const root = asRecord(raw) ?? {};
  return {
    document_type: asText(root.document_type),
    version: asText(root.version),
    rows: mapScopeInboxRows(root.rows),
    meta: asRecord(root.meta) ?? {},
  };
};
