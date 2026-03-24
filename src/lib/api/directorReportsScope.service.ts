import { type DirectorReportFetchMeta } from "./director_reports";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";

export type DirectorReportScopeOptionsState = {
  objects: string[];
  objectIdByName: Record<string, string | null>;
};

export type DirectorReportScopeRow = {
  rik_code: string;
  name_human_ru?: string;
  uom: string;
  qty_total: number;
  docs_cnt: number;
  qty_free: number;
  docs_free: number;
};

export type DirectorReportScopeKpi = {
  issues_total: number;
  issues_no_obj: number;
  issues_without_object?: number;
  items_total: number;
  items_free: number;
  items_without_request?: number;
};

export type DirectorReportScopeDisciplineMaterial = {
  material_name: string;
  rik_code: string;
  uom: string;
  qty_sum: number;
  docs_count: number;
  unit_price?: number;
  amount_sum?: number;
};

export type DirectorReportScopeDisciplineLevel = {
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
  materials: DirectorReportScopeDisciplineMaterial[];
};

export type DirectorReportScopeDisciplineWork = {
  id: string;
  work_type_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_total_pct: number;
  req_positions: number;
  free_positions: number;
  location_count?: number;
  levels: DirectorReportScopeDisciplineLevel[];
};

export type DirectorReportScopeDisciplinePayload = {
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
  works: DirectorReportScopeDisciplineWork[];
};

export type DirectorReportScopePayload = {
  meta?: { from?: string; to?: string; object_name?: string | null };
  kpi?: DirectorReportScopeKpi;
  rows?: DirectorReportScopeRow[];
  discipline?: DirectorReportScopeDisciplinePayload;
};

export type DirectorReportScopeLoadResult = {
  optionsKey: string;
  optionsState: DirectorReportScopeOptionsState;
  optionsMeta: DirectorReportFetchMeta | null;
  optionsFromCache: boolean;
  key: string;
  objectName: string | null;
  report: DirectorReportScopePayload | null;
  reportMeta: DirectorReportFetchMeta | null;
  discipline: DirectorReportScopeDisciplinePayload | null;
  disciplineMeta: DirectorReportFetchMeta | null;
  reportFromCache: boolean;
  disciplineFromCache: boolean;
  disciplinePricesReady: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const textOrUndefined = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const normalizeOptionsState = (value: unknown): DirectorReportScopeOptionsState => {
  const record = asRecord(value);
  const objectIdByNameRaw = asRecord(record.objectIdByName);
  return {
    objects: Array.isArray(record.objects) ? record.objects.map((item) => String(item ?? "")) : [],
    objectIdByName: Object.fromEntries(
      Object.entries(objectIdByNameRaw).map(([key, item]) => [key, item == null ? null : String(item)]),
    ),
  };
};

const normalizeReportRow = (value: unknown): DirectorReportScopeRow => {
  const record = asRecord(value);
  return {
    rik_code: String(record.rik_code ?? "").trim(),
    name_human_ru: textOrUndefined(record.name_human_ru),
    uom: String(record.uom ?? "").trim(),
    qty_total: toFiniteNumber(record.qty_total),
    docs_cnt: toFiniteNumber(record.docs_cnt),
    qty_free: toFiniteNumber(record.qty_without_request ?? record.qty_free),
    docs_free: toFiniteNumber(record.docs_without_request ?? record.docs_free),
  };
};

const normalizeReportKpi = (value: unknown): DirectorReportScopeKpi => {
  const record = asRecord(value);
  const issuesWithoutObject = toFiniteNumber(record.issues_without_object ?? record.issues_no_obj);
  const itemsWithoutRequest = toFiniteNumber(record.items_without_request ?? record.items_free);
  return {
    issues_total: toFiniteNumber(record.issues_total),
    issues_no_obj: issuesWithoutObject,
    issues_without_object: issuesWithoutObject,
    items_total: toFiniteNumber(record.items_total),
    items_free: itemsWithoutRequest,
    items_without_request: itemsWithoutRequest,
  };
};

const normalizeDisciplineMaterial = (value: unknown): DirectorReportScopeDisciplineMaterial => {
  const record = asRecord(value);
  return {
    material_name: String(record.material_name ?? record.rik_code ?? "").trim(),
    rik_code: String(record.rik_code ?? "").trim(),
    uom: String(record.uom ?? "").trim(),
    qty_sum: toFiniteNumber(record.qty_sum),
    docs_count: toFiniteNumber(record.docs_count),
    unit_price: toFiniteNumber(record.unit_price),
    amount_sum: toFiniteNumber(record.amount_sum),
  };
};

const normalizeDisciplineLevel = (value: unknown): DirectorReportScopeDisciplineLevel => {
  const record = asRecord(value);
  const materialsRaw = Array.isArray(record.materials) ? record.materials : [];
  return {
    id: String(record.id ?? "").trim(),
    level_name: String(record.level_name ?? "").trim(),
    object_name: textOrUndefined(record.object_name),
    system_name: textOrUndefined(record.system_name) ?? null,
    zone_name: textOrUndefined(record.zone_name) ?? null,
    location_label: textOrUndefined(record.location_label),
    total_qty: toFiniteNumber(record.total_qty),
    total_docs: toFiniteNumber(record.total_docs),
    total_positions: toFiniteNumber(record.total_positions),
    share_in_work_pct: toFiniteNumber(record.share_in_work_pct),
    req_positions: toFiniteNumber(record.req_positions),
    free_positions: toFiniteNumber(record.free_positions),
    materials: materialsRaw.map(normalizeDisciplineMaterial),
  };
};

const normalizeDisciplineWork = (value: unknown): DirectorReportScopeDisciplineWork => {
  const record = asRecord(value);
  const levelsRaw = Array.isArray(record.levels) ? record.levels : [];
  const locationCount =
    record.location_count == null ? undefined : Math.max(toFiniteNumber(record.location_count), levelsRaw.length);
  return {
    id: String(record.id ?? record.work_type_name ?? "").trim(),
    work_type_name: String(record.work_type_name ?? record.id ?? "").trim(),
    total_qty: toFiniteNumber(record.total_qty),
    total_docs: toFiniteNumber(record.total_docs),
    total_positions: toFiniteNumber(record.total_positions),
    share_total_pct: toFiniteNumber(record.share_total_pct),
    req_positions: toFiniteNumber(record.req_positions),
    free_positions: toFiniteNumber(record.free_positions),
    location_count: locationCount,
    levels: levelsRaw.map(normalizeDisciplineLevel),
  };
};

const normalizeDisciplinePayload = (payload: unknown): DirectorReportScopeDisciplinePayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = asRecord(payload);
  const summary = asRecord(record.summary);
  const worksRaw = Array.isArray(record.works) ? record.works : [];
  return {
    summary: {
      total_qty: toFiniteNumber(summary.total_qty),
      total_docs: toFiniteNumber(summary.total_docs),
      total_positions: toFiniteNumber(summary.total_positions),
      pct_without_work: toFiniteNumber(summary.pct_without_work),
      pct_without_level: toFiniteNumber(summary.pct_without_level),
      pct_without_request: toFiniteNumber(summary.pct_without_request),
      issue_cost_total: toFiniteNumber(summary.issue_cost_total),
      purchase_cost_total: toFiniteNumber(summary.purchase_cost_total),
      issue_to_purchase_pct: toFiniteNumber(summary.issue_to_purchase_pct),
      unpriced_issue_pct: toFiniteNumber(summary.unpriced_issue_pct),
    },
    works: worksRaw.map(normalizeDisciplineWork),
  };
};

const normalizeReportPayload = (payload: unknown): DirectorReportScopePayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = asRecord(payload);
  const rowsRaw = Array.isArray(record.rows) ? record.rows : [];
  const kpi = record.kpi == null ? undefined : normalizeReportKpi(record.kpi);
  const discipline = normalizeDisciplinePayload(record.discipline);
  const metaRecord = asRecord(record.meta);
  return {
    meta: {
      from: textOrUndefined(metaRecord.from),
      to: textOrUndefined(metaRecord.to),
      object_name: textOrUndefined(metaRecord.object_name) ?? null,
    },
    kpi,
    rows: rowsRaw.map(normalizeReportRow),
    discipline: discipline ?? undefined,
  };
};

const buildOptionsKey = (from: string, to: string) => `${from}|${to}`;

const buildScopeKey = (
  from: string,
  to: string,
  objectName: string | null,
  objectIdByName: Record<string, string | null>,
) =>
  `${from}|${to}|${String(objectName ?? "")}|${String(objectName == null ? "" : (objectIdByName?.[objectName] ?? ""))}`;

export async function loadDirectorReportUiScope(args: {
  from: string;
  to: string;
  objectName: string | null;
  optionsState?: DirectorReportScopeOptionsState | null;
  includeDiscipline?: boolean;
  skipDisciplinePrices: boolean;
  bypassCache?: boolean;
}): Promise<DirectorReportScopeLoadResult> {
  const transportResult = await loadDirectorReportTransportScope({
    from: args.from,
    to: args.to,
    objectName: args.objectName,
    includeDiscipline: !!args.includeDiscipline,
    skipDisciplinePrices: args.skipDisciplinePrices,
    legacyObjectIdByName: args.optionsState?.objectIdByName,
    bypassCache: args.bypassCache,
  });
  const optionsState = normalizeOptionsState(transportResult.options);

  return {
    optionsKey: buildOptionsKey(args.from, args.to),
    optionsState,
    optionsMeta: transportResult.optionsMeta,
    optionsFromCache: transportResult.fromCache,
    key: buildScopeKey(args.from, args.to, args.objectName, optionsState.objectIdByName),
    objectName: args.objectName,
    report: normalizeReportPayload(transportResult.report),
    reportMeta: transportResult.reportMeta,
    discipline: normalizeDisciplinePayload(transportResult.discipline),
    disciplineMeta: transportResult.disciplineMeta,
    reportFromCache: transportResult.fromCache,
    disciplineFromCache: transportResult.fromCache,
    disciplinePricesReady:
      args.includeDiscipline === true
        ? transportResult.disciplineMeta?.pricedStage !== "base"
        : false,
  };
}
