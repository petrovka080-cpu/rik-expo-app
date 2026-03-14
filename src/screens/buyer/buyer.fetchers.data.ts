import type { Database } from "../../lib/database.types";

export type BuyerProposalBucketRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  total_sum?: number;
  sent_to_accountant_at?: string | null;
  items_cnt?: number;
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

const asMaybeText = (value: unknown): string | null => {
  const normalized = asText(value);
  return normalized || null;
};

const asNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const mapProposalSummaryRows = (
  rows: ProposalSummaryRow[] | null | undefined,
): BuyerProposalBucketRow[] => {
  if (!Array.isArray(rows)) return [];

  const mapped: Array<BuyerProposalBucketRow | null> = rows
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
