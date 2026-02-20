// src/screens/accountant/types.ts
export type Tab = "К оплате" | "Частично" | "Оплачено" | "На доработке" | "История";

export const TABS: Tab[] = ["К оплате", "Частично", "Оплачено", "На доработке", "История"];

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

export type AttachmentRow = {
  id: number | string;
  file_name: string | null;
  url?: string | null;
  bucket_id: string | null;
  storage_path: string | null;
  group_key: string | null;
  created_at?: string | null;
};

export type NotificationRow = {
  id: number | string;
  role?: string | null;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
};
