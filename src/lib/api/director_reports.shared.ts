import { normalizeRuText } from "../text/encoding";

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
  object_id: string | null;
  object_name: string | null;
  object_type_code: string | null;
  system_code: string | null;
  level_code: string | null;
  zone_code: string | null;
  object: string | null;
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
  price?: number | string | null;
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
  qty?: number | string | null;
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

const WITHOUT_OBJECT = "Без объекта";
const WITHOUT_WORK = "Без вида работ";
const WITHOUT_LEVEL = "Без этажа";
const DASH = "—";

export type DisciplineRowsSource = "tables" | "acc_rpc" | "view" | "source_rpc" | "none";

const toNum = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const firstNonEmpty = (...vals: unknown[]): string => {
  for (const v of vals) {
    const s = String(normalizeRuText(String(v ?? ""))).trim();
    if (s) return s;
  }
  return "";
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeCodeNameRow = (value: unknown): CodeNameRow | null => {
  const row = asRecord(value);
  const code = row.code == null ? null : String(row.code).trim();
  if (!code) return null;
  return {
    code,
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    display_name: row.display_name == null ? null : String(row.display_name),
    alias_ru: row.alias_ru == null ? null : String(row.alias_ru),
    name_ru: row.name_ru == null ? null : String(row.name_ru),
    name: row.name == null ? null : String(row.name),
  };
};

const normalizeRequestLookupRow = (value: unknown): RequestLookupRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    object_id: row.object_id == null ? null : String(row.object_id).trim(),
    object_name: row.object_name == null ? null : String(row.object_name),
    object_type_code: row.object_type_code == null ? null : String(row.object_type_code).trim(),
    system_code: row.system_code == null ? null : String(row.system_code).trim(),
    level_code: row.level_code == null ? null : String(row.level_code).trim(),
    zone_code: row.zone_code == null ? null : String(row.zone_code).trim(),
    object: row.object == null ? null : String(row.object),
  };
};

const normalizeRequestItemRequestLinkRow = (value: unknown): RequestItemRequestLinkRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    request_id: row.request_id == null ? null : String(row.request_id).trim(),
  };
};

const normalizeObjectLookupRow = (value: unknown): ObjectLookupRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    name: row.name == null ? null : String(row.name),
  };
};

const normalizeLegacyFastMaterialRow = (value: unknown): LegacyFastMaterialRow => {
  const row = asRecord(value);
  return {
    material_code: row.material_code == null ? null : String(row.material_code),
    material_name: row.material_name == null ? null : String(row.material_name),
    uom: row.uom == null ? null : String(row.uom),
    sum_total: row.sum_total == null ? null : (row.sum_total as number | string),
    docs_cnt: row.docs_cnt == null ? null : (row.docs_cnt as number | string),
    sum_free: row.sum_free == null ? null : (row.sum_free as number | string),
    docs_free: row.docs_free == null ? null : (row.docs_free as number | string),
    lines_cnt: row.lines_cnt == null ? null : (row.lines_cnt as number | string),
    lines_free: row.lines_free == null ? null : (row.lines_free as number | string),
  };
};

const normalizeLegacyByObjectRow = (value: unknown): LegacyByObjectRow => {
  const row = asRecord(value);
  return {
    object_id: row.object_id == null ? null : String(row.object_id),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    lines_cnt: row.lines_cnt == null ? null : (row.lines_cnt as number | string),
    docs_cnt: row.docs_cnt == null ? null : (row.docs_cnt as number | string),
  };
};

const normalizePurchaseItemPriceRow = (value: unknown): PurchaseItemPriceRow => {
  const row = asRecord(value);
  return {
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    code: row.code == null ? null : String(row.code),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizeProposalItemPriceRow = (value: unknown): ProposalItemPriceRow => {
  const row = asRecord(value);
  return {
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizePurchaseItemRequestPriceRow = (value: unknown): PurchaseItemRequestPriceRow => {
  const row = asRecord(value);
  return {
    request_item_id: row.request_item_id == null ? null : String(row.request_item_id),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizeWarehouseIssueFactRow = (value: unknown): WarehouseIssueFactRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    iss_date: row.iss_date == null ? null : String(row.iss_date),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    request_id: row.request_id == null ? null : String(row.request_id).trim(),
    status: row.status == null ? null : String(row.status),
    note: row.note == null ? null : String(row.note),
    target_object_id: row.target_object_id == null ? null : String(row.target_object_id).trim(),
  };
};

const normalizeWarehouseIssueItemFactRow = (value: unknown): WarehouseIssueItemFactRow | null => {
  const row = asRecord(value);
  return {
    id: row.id == null ? null : String(row.id).trim(),
    issue_id: row.issue_id == null ? null : String(row.issue_id).trim(),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom_id: row.uom_id == null ? null : String(row.uom_id),
    qty: row.qty == null ? null : (row.qty as number | string),
    request_item_id: row.request_item_id == null ? null : String(row.request_item_id).trim(),
  };
};

const normalizeJoinedWarehouseIssueFactRow = (value: unknown): JoinedWarehouseIssueFactRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? null : String(row.id).trim();
  return {
    id,
    iss_date: row.iss_date == null ? null : String(row.iss_date),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    status: row.status == null ? null : String(row.status),
    note: row.note == null ? null : String(row.note),
  };
};

const normalizeJoinedWarehouseIssueItemFactRow = (value: unknown): JoinedWarehouseIssueItemFactRow | null => {
  const row = asRecord(value);
  const item = normalizeWarehouseIssueItemFactRow(value);
  if (!item) return null;
  const nestedRaw = row.warehouse_issues;
  const warehouse_issues = Array.isArray(nestedRaw)
    ? nestedRaw
        .map(normalizeJoinedWarehouseIssueFactRow)
        .filter((nested): nested is JoinedWarehouseIssueFactRow => !!nested)
    : normalizeJoinedWarehouseIssueFactRow(nestedRaw);
  return {
    ...item,
    warehouse_issues,
  };
};

const extractJoinedWarehouseIssueFactRow = (
  item: JoinedWarehouseIssueItemFactRow,
): JoinedWarehouseIssueFactRow | null => {
  return Array.isArray(item.warehouse_issues)
    ? (item.warehouse_issues[0] ?? null)
    : (item.warehouse_issues ?? null);
};

const normalizeRefSystemLookupRow = (value: unknown): RefSystemLookupRow | null => {
  const row = asRecord(value);
  const code = row.code == null ? "" : String(row.code).trim();
  if (!code) return null;
  return {
    code,
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    display_name: row.display_name == null ? null : String(row.display_name),
    alias_ru: row.alias_ru == null ? null : String(row.alias_ru),
    name: row.name == null ? null : String(row.name),
  };
};

const optionObjectName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? ""))).trim();
  return s || WITHOUT_OBJECT;
};

const resolveDirectorObjectIdentity = (input: {
  object_name_display?: unknown;
  object_id_resolved?: unknown;
}): DirectorObjectIdentityResolved => {
  const display = firstNonEmpty(input.object_name_display) || WITHOUT_OBJECT;
  const canonical = canonicalObjectName(display);
  const objectId = String(input.object_id_resolved ?? "").trim() || null;
  return {
    object_name_display: display,
    object_name_canonical: canonical,
    object_id_resolved: objectId,
    is_without_object: canonical === WITHOUT_OBJECT,
  };
};

const getDirectorFactObjectIdentity = (
  row: Pick<DirectorFactRowNormalized, "object_name_resolved" | "object_id_resolved">,
): DirectorObjectIdentityResolved =>
  resolveDirectorObjectIdentity({
    object_name_display: row.object_name_resolved,
    object_id_resolved: row.object_id_resolved,
  });

const matchesDirectorObjectIdentity = (
  selectedObjectName: string | null,
  row: Pick<DirectorFactRowNormalized, "object_name_resolved" | "object_id_resolved">,
): boolean => {
  if (selectedObjectName == null) return true;
  const target = resolveDirectorObjectIdentity({ object_name_display: selectedObjectName });
  const identity = getDirectorFactObjectIdentity(row);
  return identity.object_name_canonical === target.object_name_canonical;
};

const buildDirectorReportOptionsFromIdentities = (
  identities: DirectorObjectIdentityResolved[],
): DirectorReportOptions => {
  const objectIdByName: Record<string, string | null> = {};
  for (const identity of identities) {
    const key = identity.object_name_canonical;
    if (!(key in objectIdByName)) objectIdByName[key] = identity.object_id_resolved;
    if (objectIdByName[key] == null && identity.object_id_resolved) {
      objectIdByName[key] = identity.object_id_resolved;
    }
  }
  const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
  return { objects, objectIdByName };
};

const buildWithoutWorkContextLabelLegacy = (partsRaw: (string | null | undefined)[]): string => {
  const parts = partsRaw
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  if (!parts.length) return WITHOUT_WORK;
  return `${WITHOUT_WORK} · ${parts.slice(0, 2).join(" · ")}`;
};

const buildDirectorLocationLabelLegacy = (input: {
  objectName: string;
  levelName: string;
  systemName?: string | null;
  zoneName?: string | null;
}): string => {
  const parts = [
    String(input.objectName ?? "").trim(),
    String(input.levelName ?? "").trim(),
    String(input.systemName ?? "").trim(),
    String(input.zoneName ?? "").trim(),
  ].filter((part) => !!part && part !== WITHOUT_LEVEL);
  return parts.join(" · ") || input.objectName || WITHOUT_OBJECT;
};

const resolveDirectorFactContextLegacy = (
  input: DirectorFactContextInput,
): DirectorFactContextResolved => {
  const requestId = String(input.request_id ?? input.request?.id ?? "").trim() || null;
  const requestItemId = String(input.request_item_id ?? "").trim() || null;
  const issueObjectId = String(input.issue_object_id ?? "").trim() || null;
  const issueWorkName = String(input.issue_work_name ?? "").trim();
  const issueObjectName = String(input.issue_object_name ?? "").trim();
  const issueObjectNameById = String(input.issue_object_name_by_id ?? "").trim();
  const requestObjectNameById = String(input.request_object_name_by_id ?? "").trim();
  const requestObjectTypeName = String(input.request_object_type_name ?? "").trim();
  const requestSystemName = String(input.request_system_name ?? "").trim();
  const freeCtx = parseFreeIssueContext(input.issue_note ?? null);
  const request = input.request ?? null;

  // item_kind → human-readable work name fallback
  const itemKindRaw = String(input.item_kind ?? "").trim().toLowerCase();
  const itemKindWorkFallback =
    itemKindRaw === "work" || itemKindRaw === "работа" || itemKindRaw === "работы" ? "Работы" :
    itemKindRaw === "service" || itemKindRaw === "услуга" || itemKindRaw === "услуги" ? "Услуги" :
    itemKindRaw === "material" || itemKindRaw === "материал" || itemKindRaw === "материалы" ? "Материалы" :
    "";

  if (request) {
    return {
      request_id: requestId,
      request_item_id: requestItemId,
      object_id_resolved: String(request?.object_id ?? "").trim() || issueObjectId,
      object_name_resolved:
        firstNonEmpty(
          requestObjectNameById,
          request?.object_name,
          requestObjectTypeName,
          issueObjectNameById,
          issueObjectName,
        ) || WITHOUT_OBJECT,
      work_name_resolved:
        firstNonEmpty(issueWorkName, requestSystemName, request?.system_code, itemKindWorkFallback) || WITHOUT_WORK,
      level_name_resolved: normLevelName(request?.level_code),
      system_name_resolved: requestSystemName || request?.system_code || null,
      zone_name_resolved: String(input.request_zone_name ?? request?.zone_code ?? "").trim() || null,
      is_without_request: false,
    };
  }

  return {
    request_id: requestId,
    request_item_id: requestItemId,
    object_id_resolved: issueObjectId,
    object_name_resolved:
      firstNonEmpty(
        issueObjectNameById,
        issueObjectName,
        input.use_free_issue_object_fallback === false ? "" : freeCtx.objectName,
      ) || WITHOUT_OBJECT,
    work_name_resolved: firstNonEmpty(issueWorkName, freeCtx.workName, itemKindWorkFallback) || WITHOUT_WORK,
    level_name_resolved:
      input.force_without_level_when_issue_work_name && issueWorkName
        ? WITHOUT_LEVEL
        : normLevelName(freeCtx.levelName),
    system_name_resolved: String(freeCtx.systemName ?? "").trim() || null,
    zone_name_resolved: String(freeCtx.zoneName ?? "").trim() || null,
    is_without_request: !requestItemId,
  };
};

const resolveItemKindLegacy = (rikCode: string, inputKind?: string | null): DirectorItemKind => {
  const k = String(inputKind ?? "").trim().toLowerCase();
  if (k === "work" || k === "работа" || k === "работы") return "work";
  if (k === "service" || k === "услуга" || k === "услуги") return "service";
  if (k === "material" || k === "материал" || k === "материалы") return "material";
  // If rik_code is present, it's a material; otherwise unknown
  return rikCode ? "material" : "unknown";
};

const normalizeDirectorFactRowLegacy = (
  input: DirectorFactRowNormalizeInput,
): DirectorFactRowNormalized | null => {
  const issueId = String(input.issue_id ?? "").trim();
  const rikCode = String(input.rik_code ?? "").trim().toUpperCase();
  const itemKind = resolveItemKind(rikCode, input.item_kind);

  // Accept row if it has an issueId AND either a rik_code (material) or a known item_kind (work/service)
  if (!issueId) return null;
  if (!rikCode && itemKind === "unknown") return null;

  // For non-material rows, use a synthetic code for aggregation
  const effectiveCode = rikCode || `${itemKind.toUpperCase()}::${String(input.material_name ?? "").trim().toUpperCase().slice(0, 40) || "ITEM"}`;
  const materialName = String(input.material_name ?? "").trim() || effectiveCode;

  return {
    issue_id: issueId,
    issue_item_id: String(input.issue_item_id ?? "").trim() || null,
    iss_date: String(input.iss_date ?? ""),
    request_id: input.context.request_id,
    request_item_id: input.context.request_item_id,
    object_id_resolved: input.context.object_id_resolved,
    object_name_resolved: input.context.object_name_resolved,
    work_name_resolved: input.context.work_name_resolved,
    level_name_resolved: input.context.level_name_resolved,
    system_name_resolved: input.context.system_name_resolved,
    zone_name_resolved: input.context.zone_name_resolved,
    material_name_resolved: materialName,
    rik_code_resolved: effectiveCode,
    uom_resolved: String(input.uom ?? "").trim(),
    qty: toNum(input.qty),
    is_without_request: !!input.context.is_without_request,
    item_kind: itemKind,
  };
};

const buildDirectorLocationLabel = (input: {
  objectName: string;
  levelName: string;
  systemName?: string | null;
  zoneName?: string | null;
}): string => {
  const parts = [
    String(input.objectName ?? "").trim(),
    String(input.levelName ?? "").trim(),
    String(input.systemName ?? "").trim(),
    String(input.zoneName ?? "").trim(),
  ].filter((part) => !!part && part !== WITHOUT_LEVEL);
  return parts.join(" / ") || input.objectName || WITHOUT_OBJECT;
};

const resolveDirectorFactContext = (
  input: DirectorFactContextInput,
): DirectorFactContextResolved => {
  const requestId = String(input.request_id ?? input.request?.id ?? "").trim() || null;
  const requestItemId = String(input.request_item_id ?? "").trim() || null;
  const issueObjectId = String(input.issue_object_id ?? "").trim() || null;
  const issueWorkName = String(input.issue_work_name ?? "").trim();
  const issueObjectName = String(input.issue_object_name ?? "").trim();
  const issueObjectNameById = String(input.issue_object_name_by_id ?? "").trim();
  const requestObjectNameById = String(input.request_object_name_by_id ?? "").trim();
  const requestObjectTypeName = String(input.request_object_type_name ?? "").trim();
  const requestSystemName = String(input.request_system_name ?? "").trim();
  const requestZoneName = String(input.request_zone_name ?? "").trim();
  const freeCtx = parseFreeIssueContext(input.issue_note ?? null);
  const request = input.request ?? null;

  const itemKindRaw = String(input.item_kind ?? "").trim().toLowerCase();
  const itemKindWorkFallback =
    itemKindRaw === "work" || itemKindRaw === "работа" || itemKindRaw === "работы" ? "\u0420\u0430\u0431\u043e\u0442\u044b" :
    itemKindRaw === "service" || itemKindRaw === "услуга" || itemKindRaw === "услуги" ? "\u0423\u0441\u043b\u0443\u0433\u0438" :
    itemKindRaw === "material" || itemKindRaw === "материал" || itemKindRaw === "материалы" ? "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b" :
    "";

  const objectNameResolved =
    firstNonEmpty(
      requestObjectNameById,
      request?.object_name,
      requestObjectTypeName,
      issueObjectNameById,
      issueObjectName,
      input.use_free_issue_object_fallback === false ? "" : freeCtx.objectName,
    ) || WITHOUT_OBJECT;
  const systemNameResolved =
    firstNonEmpty(requestSystemName, request?.system_code, freeCtx.systemName) || null;
  const zoneNameResolved =
    firstNonEmpty(requestZoneName, request?.zone_code, freeCtx.zoneName) || null;
  const levelNameResolved = normLevelName(firstNonEmpty(request?.level_code, freeCtx.levelName));
  const actualWorkName = firstNonEmpty(issueWorkName, freeCtx.workName);
  const contextualWorkFallback =
    !actualWorkName
      ? firstNonEmpty(systemNameResolved, zoneNameResolved)
      : "";
  const workNameResolved =
    actualWorkName ||
    contextualWorkFallback ||
    itemKindWorkFallback ||
    WITHOUT_WORK;

  return {
    request_id: requestId,
    request_item_id: requestItemId,
    object_id_resolved: String(request?.object_id ?? "").trim() || issueObjectId,
    object_name_resolved: objectNameResolved,
    work_name_resolved: workNameResolved,
    level_name_resolved: levelNameResolved,
    system_name_resolved: systemNameResolved,
    zone_name_resolved: zoneNameResolved,
    is_without_request: request ? false : !requestItemId,
  };
};

const resolveItemKind = (rikCode: string, inputKind?: string | null): DirectorItemKind => {
  const k = String(inputKind ?? "").trim().toLowerCase();
  if (k === "work" || k === "работа" || k === "работы") return "work";
  if (k === "service" || k === "услуга" || k === "услуги") return "service";
  if (k === "material" || k === "материал" || k === "материалы") return "material";
  return rikCode ? "material" : "unknown";
};

const normalizeDirectorFactRow = (
  input: DirectorFactRowNormalizeInput,
): DirectorFactRowNormalized | null => {
  const issueId = String(input.issue_id ?? "").trim();
  const rikCode = String(input.rik_code ?? "").trim().toUpperCase();
  const itemKind = resolveItemKind(rikCode, input.item_kind);
  if (!issueId) return null;
  if (!rikCode && itemKind === "unknown") return null;

  const effectiveCode =
    rikCode ||
    `${itemKind.toUpperCase()}::${String(input.material_name ?? "").trim().toUpperCase().slice(0, 40) || "ITEM"}`;
  const materialName = String(input.material_name ?? "").trim() || effectiveCode;

  return {
    issue_id: issueId,
    issue_item_id: String(input.issue_item_id ?? "").trim() || null,
    iss_date: String(input.iss_date ?? ""),
    request_id: input.context.request_id,
    request_item_id: input.context.request_item_id,
    object_id_resolved: input.context.object_id_resolved,
    object_name_resolved: input.context.object_name_resolved,
    work_name_resolved: input.context.work_name_resolved,
    level_name_resolved: input.context.level_name_resolved,
    system_name_resolved: input.context.system_name_resolved,
    zone_name_resolved: input.context.zone_name_resolved,
    material_name_resolved: materialName,
    rik_code_resolved: effectiveCode,
    uom_resolved: String(input.uom ?? "").trim(),
    qty: toNum(input.qty),
    is_without_request: !!input.context.is_without_request,
    item_kind: itemKind,
  };
};
void buildWithoutWorkContextLabelLegacy;
void buildDirectorLocationLabelLegacy;
void resolveDirectorFactContextLegacy;
void resolveItemKindLegacy;
void normalizeDirectorFactRowLegacy;

const normalizeDirectorFactViewRow = (value: unknown): DirectorFactRowNormalized | null => {
  const row = asRecord(value);
  const context = resolveDirectorFactContext({
    issue_object_name: row.object_name == null ? null : String(row.object_name),
    issue_work_name: row.work_name == null ? null : String(row.work_name),
    use_free_issue_object_fallback: false,
  });
  return normalizeDirectorFactRow({
    issue_id: row.issue_id == null ? "" : String(row.issue_id).trim(),
    iss_date: row.iss_date == null ? "" : String(row.iss_date),
    context: {
      ...context,
      is_without_request: row.is_without_request == null ? context.is_without_request : Boolean(row.is_without_request),
    },
    material_name: row.material_name_ru == null ? null : String(row.material_name_ru),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom: row.uom == null ? null : String(row.uom),
    qty: row.qty == null ? null : (row.qty as number | string),
    item_kind: row.item_kind == null ? null : String(row.item_kind),
  });
};

const normalizeDirectorDisciplineSourceRpcRow = (value: unknown): DirectorFactRowNormalized | null => {
  const row = asRecord(value);
  const issueWorkName = row.issue_work_name == null ? "" : String(row.issue_work_name).trim();
  const requestIdFromIssue =
    row.request_id_from_issue == null ? null : String(row.request_id_from_issue).trim() || null;
  const requestIdFromItem =
    row.request_id_from_item == null ? null : String(row.request_id_from_item).trim() || null;
  const effectiveRequestId = issueWorkName ? requestIdFromIssue : (requestIdFromItem ?? requestIdFromIssue);
  const request =
    !issueWorkName && effectiveRequestId
      ? {
          id: effectiveRequestId,
          object_id: null,
          object_name: null,
          object_type_code: null,
          system_code:
            row.request_system_code == null ? null : String(row.request_system_code).trim() || null,
          level_code:
            row.request_level_code == null ? null : String(row.request_level_code).trim() || null,
          zone_code:
            row.request_zone_name == null ? null : String(row.request_zone_name).trim() || null,
          object: null,
        }
      : null;
  const context = resolveDirectorFactContext({
    request_id: effectiveRequestId,
    request_item_id:
      row.request_item_id == null ? null : String(row.request_item_id).trim() || null,
    request,
    issue_note: row.issue_note == null ? null : String(row.issue_note),
    issue_object_name: row.issue_object_name == null ? null : String(row.issue_object_name),
    issue_work_name: row.issue_work_name == null ? null : String(row.issue_work_name),
    request_system_name:
      row.request_system_name == null ? null : String(row.request_system_name),
    request_zone_name:
      row.request_zone_name == null ? null : String(row.request_zone_name),
    use_free_issue_object_fallback: false,
    force_without_level_when_issue_work_name: true,
  });
  return normalizeDirectorFactRow({
    issue_id: row.issue_id == null ? "" : String(row.issue_id).trim(),
    issue_item_id: row.issue_item_id == null ? null : String(row.issue_item_id).trim(),
    iss_date: row.iss_date == null ? "" : String(row.iss_date),
    context,
    material_name: row.material_name == null ? null : String(row.material_name),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom: row.uom == null ? null : String(row.uom),
    qty: row.qty == null ? null : (row.qty as number | string),
  });
};

const buildReportOptionsFromByObjRows = (rows: { object_name?: string | null; object_id?: string | number | null }[]): DirectorReportOptions => {
  return buildDirectorReportOptionsFromIdentities(
    (rows || []).map((r) =>
      resolveDirectorObjectIdentity({
        object_name_display: optionObjectName(r?.object_name),
        object_id_resolved: r?.object_id,
      }),
    ),
  );
};

const canonicalObjectName = (v: unknown): string => {
  let s = String(normalizeRuText(String(v ?? ""))).trim();
  if (!s) return WITHOUT_OBJECT;

  // Canonical object bucket: drop diagnostic tails from free-issue notes.
  // Example: "Адм здание · Контекст: ... · Система: ... · Зона: ..."
  // -> "Адм здание"
  s = s
    .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$/i, "")
    .trim();

  return s || WITHOUT_OBJECT;
};

const normObjectName = (v: unknown): string =>
  resolveDirectorObjectIdentity({ object_name_display: v }).object_name_canonical;

const normWorkName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_WORK;
};

const normLevelName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_LEVEL;
};

const toRangeStart = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T00:00:00.000Z` : x;
};

const toRangeEnd = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T23:59:59.999Z` : x;
};

const rpcDate = (d: string | null | undefined, fallback: string): string => {
  const x = String(d ?? "").trim();
  return x || fallback;
};

const chunk = <T,>(arr: T[], size = 500): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const forEachChunkParallel = async <T,>(
  arr: T[],
  size: number,
  concurrency: number,
  worker: (part: T[]) => Promise<void>,
) => {
  const parts = chunk(arr, size);
  if (!parts.length) return;
  const c = Math.max(1, Math.min(concurrency, parts.length));
  let idx = 0;
  const runners = Array.from({ length: c }, async () => {
    while (true) {
      const i = idx++;
      if (i >= parts.length) return;
      await worker(parts[i]);
    }
  });
  await Promise.all(runners);
};

function parseFreeIssueContextLegacy(note: string | null | undefined): {
  objectName: string;
  workName: string;
  levelName: string;
} {
  const clean = (v: string): string => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    // Cut diagnostic tails from free issue note to keep canonical object/work labels.
    return s
      .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*/i, "")
      .trim();
  };

  const s = String(note ?? "");
  const objRaw = (s.match(/Объект:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const sysRaw =
    (s.match(/Система:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Контекст:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const levelRaw =
    (s.match(/Этаж:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Уровень:\s*([^\n\r]+)/i)?.[1] || "").trim();

  const obj = canonicalObjectName(clean(objRaw));
  const sys = clean(sysRaw) || WITHOUT_WORK;
  const level = clean(levelRaw) || WITHOUT_LEVEL;
  return { objectName: obj, workName: sys, levelName: level };
}

function parseFreeIssueContext(note: string | null | undefined): {
  objectName: string;
  workName: string;
  systemName: string;
  zoneName: string;
  levelName: string;
} {
  const clean = (v: string): string =>
    String(v ?? "")
      .trim()
      .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*/i, "")
      .trim();

  const s = String(note ?? "");
  const objectName = canonicalObjectName(clean((s.match(/Объект:\s*([^\n\r]+)/i)?.[1] || "").trim()));
  const workName = clean((s.match(/(?:Вид|Работа):\s*([^\n\r]+)/i)?.[1] || "").trim());
  const systemName = clean(
    ((s.match(/Система:\s*([^\n\r]+)/i)?.[1] || "").trim()) ||
    ((s.match(/Контекст:\s*([^\n\r]+)/i)?.[1] || "").trim()),
  );
  const zoneName = clean((s.match(/Зона:\s*([^\n\r]+)/i)?.[1] || "").trim());
  const levelName = clean(
    ((s.match(/Этаж:\s*([^\n\r]+)/i)?.[1] || "").trim()) ||
    ((s.match(/Уровень:\s*([^\n\r]+)/i)?.[1] || "").trim()),
  ) || WITHOUT_LEVEL;

  return {
    objectName,
    workName,
    systemName,
    zoneName,
    levelName,
  };
}
void parseFreeIssueContextLegacy;

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
};

export {
  WITHOUT_OBJECT,
  WITHOUT_WORK,
  WITHOUT_LEVEL,
  DASH,
  toNum,
  firstNonEmpty,
  asRecord,
  optionObjectName,
  resolveDirectorObjectIdentity,
  getDirectorFactObjectIdentity,
  matchesDirectorObjectIdentity,
  buildDirectorReportOptionsFromIdentities,
  buildReportOptionsFromByObjRows,
  buildWithoutWorkContextLabelLegacy,
  buildDirectorLocationLabelLegacy,
  buildDirectorLocationLabel,
  canonicalObjectName,
  normObjectName,
  normWorkName,
  normLevelName,
  toRangeStart,
  toRangeEnd,
  rpcDate,
  chunk,
  forEachChunkParallel,
  parseFreeIssueContextLegacy,
  parseFreeIssueContext,
  resolveDirectorFactContextLegacy,
  resolveItemKindLegacy,
  normalizeDirectorFactRowLegacy,
  resolveDirectorFactContext,
  resolveItemKind,
  normalizeDirectorFactRow,
  normalizeDirectorFactViewRow,
  normalizeDirectorDisciplineSourceRpcRow,
  normalizeCodeNameRow,
  normalizeRequestLookupRow,
  normalizeRequestItemRequestLinkRow,
  normalizeObjectLookupRow,
  normalizeLegacyFastMaterialRow,
  normalizeLegacyByObjectRow,
  normalizePurchaseItemPriceRow,
  normalizeProposalItemPriceRow,
  normalizePurchaseItemRequestPriceRow,
  normalizeWarehouseIssueFactRow,
  normalizeWarehouseIssueItemFactRow,
  normalizeJoinedWarehouseIssueFactRow,
  normalizeJoinedWarehouseIssueItemFactRow,
  extractJoinedWarehouseIssueFactRow,
  normalizeRefSystemLookupRow,
};
