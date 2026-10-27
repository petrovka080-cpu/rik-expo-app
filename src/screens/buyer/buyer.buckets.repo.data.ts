import type { Database } from "../../lib/database.types";

export const BUYER_PROPOSAL_SUMMARY_SELECT =
  "proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt";
export const BUYER_REJECTED_PROPOSAL_SELECT = "id, payment_status, submitted_at, created_at";
export const BUYER_PROPOSAL_ITEM_ID_SELECT = "proposal_id";

export type BuyerProposalSummaryRow = Pick<
  Database["public"]["Views"]["v_proposals_summary"]["Row"],
  "proposal_id" | "status" | "submitted_at" | "sent_to_accountant_at" | "total_sum" | "items_cnt"
>;

export type BuyerRejectedProposalRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "id" | "payment_status" | "submitted_at" | "created_at"
>;

export type BuyerProposalItemIdRow = Pick<
  Database["public"]["Tables"]["proposal_items"]["Row"],
  "proposal_id"
>;
