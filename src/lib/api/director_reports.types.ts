type DirectorReportOptions = {
  objects: string[];
  objectIdByName: Record<string, string | null>;
};

type DirectorReportRow = {
  rik_code: string;
  name_human_ru: string;
  uom: string;
  qty_total: number;
  docs_cnt: number;
  qty_without_request: number;
  docs_without_request: number;
};

type DirectorReportWho = {
  who: string;
  items_cnt: number;
};

type DirectorDisciplineMaterial = {
  material_name: string;
  rik_code: string;
  uom: string;
  qty_sum: number;
  docs_count: number;
  unit_price?: number;
  amount_sum?: number;
  source_issue_ids?: string[];
  source_request_item_ids?: string[];
};

type DirectorDisciplineLevel = {
  id: string;
  level_name: string;
  object_name?: string;
  system_name?: string | null;
  zone_name?: string | null;
  location_label?: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_in_work_pct: number;
  req_positions: number;
  free_positions: number;
  source_issue_ids?: string[];
  source_request_item_ids?: string[];
  materials: DirectorDisciplineMaterial[];
};

type DirectorDisciplineWork = {
  id: string;
  work_type_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_total_pct: number;
  req_positions: number;
  free_positions: number;
  location_count?: number;
  levels: DirectorDisciplineLevel[];
};

type DirectorDisciplinePayload = {
  summary: {
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
  works: DirectorDisciplineWork[];
};

type DirectorReportPayload = {
  meta?: { from?: string; to?: string; object_name?: string | null };
  kpi?: {
    issues_total: number;
    issues_without_object: number;
    items_total: number;
    items_without_request: number;
  };
  rows?: DirectorReportRow[];
  discipline_who?: DirectorReportWho[];
  discipline?: DirectorDisciplinePayload;
  report_options?: DirectorReportOptions;
};

type DirectorItemKind = "material" | "work" | "service" | "unknown";

type DirectorFactRowNormalized = {
  issue_id: string;
  issue_item_id: string | null;
  iss_date: string;
  request_id: string | null;
  request_item_id: string | null;
  object_id_resolved: string | null;
  object_name_resolved: string;
  work_name_resolved: string;
  level_name_resolved: string;
  system_name_resolved: string | null;
  zone_name_resolved: string | null;
  material_name_resolved: string;
  rik_code_resolved: string;
  uom_resolved: string;
  qty: number;
  is_without_request: boolean;
  item_kind: DirectorItemKind;
};

type DirectorFactContextResolved = {
  request_id: string | null;
  request_item_id: string | null;
  object_id_resolved: string | null;
  object_name_resolved: string;
  work_name_resolved: string;
  level_name_resolved: string;
  system_name_resolved: string | null;
  zone_name_resolved: string | null;
  is_without_request: boolean;
};

type DirectorObjectIdentityResolved = {
  object_name_display: string;
  object_name_canonical: string;
  object_id_resolved: string | null;
  is_without_object: boolean;
};

type DirectorFactContextInput = {
  request_id?: string | null;
  request_item_id?: string | null;
  request?: RequestLookupRow | null;
  issue_object_id?: string | null;
  issue_note?: string | null;
  issue_object_name?: string | null;
  issue_work_name?: string | null;
  issue_object_name_by_id?: string | null;
  request_object_name_by_id?: string | null;
  request_object_type_name?: string | null;
  request_system_name?: string | null;
  request_zone_name?: string | null;
  use_free_issue_object_fallback?: boolean;
  force_without_level_when_issue_work_name?: boolean;
  item_kind?: string | null;
};

type DirectorFactRowNormalizeInput = {
  issue_id: string | number | null | undefined;
  issue_item_id?: string | number | null | undefined;
  iss_date?: string | null | undefined;
  context: DirectorFactContextResolved;
  material_name?: string | null | undefined;
  rik_code?: string | null | undefined;
  uom?: string | null | undefined;
  qty?: number | string | null | undefined;
  item_kind?: string | null | undefined;
};

type DirectorFactRow = DirectorFactRowNormalized;

type DirectorObjectLinkedIssueLinkState = "linked" | "partial" | "unlinked";

type DirectorObjectLinkedIssue = {
  issueId: string;
  requestId: string | null;
  requestItemId: string | null;
  objectId: string | null;
  objectName: string | null;
  levelName: string | null;
  systemName: string | null;
  zoneName: string | null;
  workId: string | null;
  workName: string | null;
  contractorId: string | null;
  materialCount: number;
  positionCount: number;
  linkState: DirectorObjectLinkedIssueLinkState;
};

type CodeNameRow = {
  code?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  alias_ru?: string | null;
  name_ru?: string | null;
  name?: string | null;
};

type RequestLookupRow = {
  id: string;
  request_no: string | null;
  display_no: string | null;
  status: string | null;
  object_id: string | null;
  object_name: string | null;
  object_type_code: string | null;
  object_identity_key?: string | null;
  object_identity_name?: string | null;
  object_identity_status?: string | null;
  object_identity_source?: string | null;
  system_code: string | null;
  level_code: string | null;
  zone_code: string | null;
  object: string | null;
  submitted_at: string | null;
  created_at: string | null;
  note: string | null;
  comment: string | null;
  item_count_total: number | null;
  item_count_active: number | null;
  item_qty_total: number | null;
  item_qty_active: number | null;
};

type ObjectLookupRow = {
  id: string;
  name: string | null;
};

type RequestItemRequestLinkRow = {
  id: string;
  request_id: string | null;
};

type RikNameLookupRow = {
  code?: string | null;
  name_ru?: string | null;
};

type LegacyFastMaterialRow = {
  material_code?: string | null;
  material_name?: string | null;
  uom?: string | null;
  sum_total?: number | string | null;
  docs_cnt?: number | string | null;
  sum_free?: number | string | null;
  docs_free?: number | string | null;
  lines_cnt?: number | string | null;
  lines_free?: number | string | null;
};

type LegacyByObjectRow = {
  object_id?: string | number | null;
  object_name?: string | null;
  work_name?: string | null;
  lines_cnt?: number | string | null;
  docs_cnt?: number | string | null;
};

type PurchaseItemPriceRow = {
  rik_code?: string | null;
  code?: string | null;
  ref_id?: string | null;
  price?: number | string | null;
  price_per_unit?: number | string | null;
  amount?: number | string | null;
  qty?: number | string | null;
};

type ProposalItemPriceRow = {
  rik_code?: string | null;
  price?: number | string | null;
  qty?: number | string | null;
};

type PurchaseItemRequestPriceRow = {
  request_item_id?: string | number | null;
  price?: number | string | null;
  price_per_unit?: number | string | null;
  amount?: number | string | null;
  qty?: number | string | null;
};

type DirectorIssuePriceScopeRow = {
  request_item_id?: string | number | null;
  rik_code?: string | null;
  unit_price?: number | string | null;
  source_kind?: string | null;
};

type WarehouseIssueFactRow = {
  id: string;
  iss_date: string | null;
  object_name: string | null;
  work_name: string | null;
  request_id: string | null;
  status: string | null;
  note: string | null;
  target_object_id: string | null;
};

type WarehouseIssueItemFactRow = {
  id: string | null;
  issue_id: string | null;
  rik_code: string | null;
  uom_id: string | null;
  qty: number | string | null;
  request_item_id: string | null;
};

type JoinedWarehouseIssueFactRow = {
  id: string | null;
  iss_date: string | null;
  object_name: string | null;
  work_name: string | null;
  status: string | null;
  note: string | null;
};

type JoinedWarehouseIssueItemFactRow = WarehouseIssueItemFactRow & {
  warehouse_issues: JoinedWarehouseIssueFactRow | JoinedWarehouseIssueFactRow[] | null;
};

type DirectorDisciplineSourceRpcRow = {
  issue_id?: string | number | null;
  issue_item_id?: string | number | null;
  iss_date?: string | null;
  request_id_from_item?: string | number | null;
  request_id_from_issue?: string | number | null;
  request_item_id?: string | number | null;
  issue_note?: string | null;
  issue_object_name?: string | null;
  issue_work_name?: string | null;
  request_system_code?: string | null;
  request_system_name?: string | null;
  request_level_code?: string | null;
  request_zone_name?: string | null;
  material_name?: string | null;
  rik_code?: string | null;
  uom?: string | null;
  qty?: number | string | null;
};

type RefSystemLookupRow = {
  code: string;
  name_human_ru: string | null;
  display_name: string | null;
  alias_ru: string | null;
  name: string | null;
};

type CanonicalMaterialsPayloadRaw = {
  rows?: unknown;
  kpi?: unknown;
  report_options?: unknown;
} & Record<string, unknown>;

type CanonicalOptionsPayloadRaw = {
  objects?: unknown;
  objectIdByName?: unknown;
} & Record<string, unknown>;

type AccIssueHead = {
  issue_id: number | string;
  event_dt: string | null;
  kind: string | null;
  who: string | null;
  note: string | null;
  request_id: string | null;
  display_no: string | null;
};

type AccIssueLine = {
  issue_id: number | string;
  rik_code: string | null;
  uom: string | null;
  name_human: string | null;
  qty_total: number | string | null;
  qty_in_req: number | string | null;
  qty_over: number | string | null;
};

type DisciplineRowsSource = "tables" | "acc_rpc" | "view" | "source_rpc" | "none";

export type {
  DirectorReportOptions,
  DirectorReportRow,
  DirectorReportWho,
  DirectorDisciplineMaterial,
  DirectorDisciplineLevel,
  DirectorDisciplineWork,
  DirectorDisciplinePayload,
  DirectorReportPayload,
  DirectorItemKind,
  DirectorFactRowNormalized,
  DirectorFactContextResolved,
  DirectorObjectIdentityResolved,
  DirectorFactContextInput,
  DirectorFactRowNormalizeInput,
  DirectorFactRow,
  DirectorObjectLinkedIssueLinkState,
  DirectorObjectLinkedIssue,
  CodeNameRow,
  RequestLookupRow,
  ObjectLookupRow,
  RequestItemRequestLinkRow,
  RikNameLookupRow,
  LegacyFastMaterialRow,
  LegacyByObjectRow,
  PurchaseItemPriceRow,
  ProposalItemPriceRow,
  PurchaseItemRequestPriceRow,
  DirectorIssuePriceScopeRow,
  WarehouseIssueFactRow,
  WarehouseIssueItemFactRow,
  JoinedWarehouseIssueFactRow,
  JoinedWarehouseIssueItemFactRow,
  DirectorDisciplineSourceRpcRow,
  RefSystemLookupRow,
  CanonicalMaterialsPayloadRaw,
  CanonicalOptionsPayloadRaw,
  AccIssueHead,
  AccIssueLine,
  DisciplineRowsSource,
};
