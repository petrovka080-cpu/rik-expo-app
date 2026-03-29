import type { AccountantInboxRow } from "../../lib/rik_api";
import type {
  ProposalAttachmentViewState,
} from "../../lib/api/proposalAttachments.service";
import type { AccountantAttachment } from "./accountant.attachments";

export type Tab = "К оплате" | "Частично" | "Оплачено" | "На доработке" | "История" | "Подряды";

export const TABS: Tab[] = ["К оплате", "Частично", "Оплачено", "На доработке", "История", "Подряды"];

export type StatusKey = "K_PAY" | "PART" | "PAID" | "REWORK" | "HISTORY";

export type HistoryRow = {
  payment_id: number;
  paid_at: string;
  proposal_id: string;
  supplier: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  amount: number;
  method: string | null;
  note: string | null;
  has_invoice: boolean;
  accountant_fio?: string | null;
  purpose?: string | null;
};

export type AttachmentRow = AccountantAttachment;
export type AttachmentState = ProposalAttachmentViewState;

export type NotificationRow = {
  id: number | string;
  role?: string | null;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
};

export type AccountantInboxUiRow = AccountantInboxRow & {
  proposal_no?: string | null;
  id_short?: string | null;
  last_paid_at?: number | null;
};
