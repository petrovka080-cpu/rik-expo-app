// src/screens/director/director.types.ts
export type Tab = "foreman" | "buyer";
export type DirTopTab = "Заявки" | "Финансы" | "Склад" | "Отчёты";

export type PendingRow = {
  id: number;
  request_id: number | string;
  request_item_id: string | null;
  name_human: string;
  qty: number;
  uom?: string | null;
  rik_code?: string | null;
  app_code?: string | null;
  item_kind?: string | null; // material | work | service
  note?: string | null;
};

export type Group = { request_id: number | string; items: PendingRow[] };

export type ProposalHead = { id: string; submitted_at?: string | null; pretty?: string | null };

export type ProposalItem = {
  id: number;
  request_item_id: string | null;
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
  price?: number | null;
  item_kind?: string | null;
};

export type ProposalAttachmentRow = {
  id: string;
  file_name: string;
  url?: string | null;
  group_key?: string | null;
  created_at?: string | null;
  bucket_id?: string | null;
  storage_path?: string | null;
};

export type SheetKind = "none" | "request" | "proposal";

export type RequestMeta = {
  note_preview?: string | null;
  object_name?: string | null;
  object?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  site_address_snapshot?: string | null;
  note?: string | null;
  comment?: string | null;
};

export type RtToast = { visible: boolean; title: string; body: string; count: number };
