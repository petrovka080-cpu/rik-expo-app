// src/screens/director/director.types.ts
export type Tab = "foreman" | "buyer";
export type DirTopTab = "Заявки" | "Подряды" | "Финансы" | "Склад" | "Отчёты";

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

export type FinPage = "home" | "debt" | "spend" | "kind" | "supplier";

export type RepTab = "materials" | "discipline";

export type RepRow = {
  rik_code: string;
  name_human_ru?: string;
  uom: string;
  qty_total: number;
  docs_cnt: number;
  qty_free: number;
  docs_free: number;
};

export type RepWho = { who: string; items_cnt: number };

export type RepKpi = {
  issues_total: number;
  issues_no_obj: number;
  items_total: number;
  items_free: number;
};

export type RepDisciplineMaterial = {
  material_name: string;
  rik_code: string;
  uom: string;
  qty_sum: number;
  docs_count: number;
  unit_price?: number;
  amount_sum?: number;
};

export type RepDisciplineLevel = {
  id: string;
  level_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_in_work_pct: number;
  req_positions: number;
  free_positions: number;
  materials: RepDisciplineMaterial[];
};

export type RepDisciplineWork = {
  id: string;
  work_type_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_total_pct: number;
  req_positions: number;
  free_positions: number;
  levels: RepDisciplineLevel[];
};

export type RepDisciplineSummary = {
  total_qty: number;
  total_docs: number;
  total_positions: number;
  pct_without_work: number;
  pct_without_level: number;
  pct_without_request: number;
  issue_cost_total: number;
  purchase_cost_total: number;
  issue_to_purchase_pct: number;
  unpriced_issue_pct: number;
};

export type RepDisciplinePayload = {
  summary: RepDisciplineSummary;
  works: RepDisciplineWork[];
};

export type RepPayload = {
  meta?: { from?: string; to?: string; object_name?: string | null };
  kpi?: RepKpi;
  rows?: RepRow[];
  discipline_who?: RepWho[];
  discipline?: RepDisciplinePayload;
  report_options?: { objects: string[]; objectIdByName: Record<string, string | null> };
};
