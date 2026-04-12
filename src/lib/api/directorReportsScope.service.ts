import { type DirectorReportFetchMeta } from "./director_reports";
import { loadDirectorReportTransportScope } from "./directorReportsTransport.service";
import { supabase } from "../supabaseClient";
import { beginPlatformObservability } from "../observability/platformObservability";
import { loadConstructionObjectCodesByNames } from "./constructionObjectIdentity.read";
import type {
  DirectorReportsCanonicalDiagnostics,
  DirectorReportsCanonicalSummary,
  DirectorNamingHealthStatus,
  DirectorNamingProbeCacheMode,
  DirectorNamingSourceStatus,
} from "../../screens/director/director.readModels";

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
  summary?: DirectorReportsCanonicalSummary;
  diagnostics?: DirectorReportsCanonicalDiagnostics;
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

class DirectorReportsCanonicalPayloadError extends Error {}

const requireCanonicalRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorReportsCanonicalPayloadError(
      `director_report_transport_scope_v1 missing canonical ${field}`,
    );
  }
  return value as Record<string, unknown>;
};

const canonicalText = (value: unknown, field: string): string => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new DirectorReportsCanonicalPayloadError(
      `director_report_transport_scope_v1 missing canonical ${field}`,
    );
  }
  return text;
};

const canonicalNumber = (value: unknown, field: string): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new DirectorReportsCanonicalPayloadError(
      `director_report_transport_scope_v1 invalid canonical ${field}`,
    );
  }
  return numeric;
};

const canonicalBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw new DirectorReportsCanonicalPayloadError(
      `director_report_transport_scope_v1 invalid canonical ${field}`,
    );
  }
  return value;
};

const canonicalNamingSourceStatus = (value: unknown, field: string): DirectorNamingSourceStatus => {
  const status = canonicalText(value, field);
  if (status === "ok" || status === "failed" || status === "missing") return status;
  throw new DirectorReportsCanonicalPayloadError(
    `director_report_transport_scope_v1 invalid canonical ${field}`,
  );
};

const canonicalNamingHealthStatus = (value: unknown, field: string): DirectorNamingHealthStatus => {
  const status = canonicalText(value, field);
  if (status === "ok" || status === "degraded" || status === "failed") return status;
  throw new DirectorReportsCanonicalPayloadError(
    `director_report_transport_scope_v1 invalid canonical ${field}`,
  );
};

const canonicalProbeCacheMode = (value: unknown, field: string): DirectorNamingProbeCacheMode => {
  const mode = canonicalText(value, field);
  if (mode === "live" || mode === "cached_positive" || mode === "cached_negative") return mode;
  throw new DirectorReportsCanonicalPayloadError(
    `director_report_transport_scope_v1 invalid canonical ${field}`,
  );
};

const canonicalStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value)) {
    throw new DirectorReportsCanonicalPayloadError(
      `director_report_transport_scope_v1 invalid canonical ${field}`,
    );
  }
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
};

const normalizeDirectorReportsCanonicalSummary = (
  value: unknown,
): DirectorReportsCanonicalSummary => {
  const record = requireCanonicalRecord(value, "canonical_summary");
  return {
    objectCount: canonicalNumber(record.objectCount, "canonical_summary.objectCount"),
    objectCountLabel: canonicalText(record.objectCountLabel, "canonical_summary.objectCountLabel"),
    objectCountExplanation: canonicalText(
      record.objectCountExplanation,
      "canonical_summary.objectCountExplanation",
    ),
    confirmedWarehouseObjectCount: canonicalNumber(
      record.confirmedWarehouseObjectCount,
      "canonical_summary.confirmedWarehouseObjectCount",
    ),
    displayObjectCount: canonicalNumber(record.displayObjectCount, "canonical_summary.displayObjectCount"),
    displayObjectCountLabel: canonicalText(
      record.displayObjectCountLabel,
      "canonical_summary.displayObjectCountLabel",
    ),
    displayObjectCountExplanation: canonicalText(
      record.displayObjectCountExplanation,
      "canonical_summary.displayObjectCountExplanation",
    ),
    noWorkNameCount: canonicalNumber(record.noWorkNameCount, "canonical_summary.noWorkNameCount"),
    noWorkNameExplanation: canonicalText(
      record.noWorkNameExplanation,
      "canonical_summary.noWorkNameExplanation",
    ),
    unresolvedNamesCount: canonicalNumber(
      record.unresolvedNamesCount,
      "canonical_summary.unresolvedNamesCount",
    ),
  };
};

const normalizeDirectorReportsCanonicalDiagnostics = (
  value: unknown,
): DirectorReportsCanonicalDiagnostics => {
  const record = requireCanonicalRecord(value, "canonical_diagnostics");
  const naming = requireCanonicalRecord(record.naming, "canonical_diagnostics.naming");
  const noWorkName = requireCanonicalRecord(record.noWorkName, "canonical_diagnostics.noWorkName");
  const objectCountSource = canonicalText(
    record.objectCountSource,
    "canonical_diagnostics.objectCountSource",
  );
  if (objectCountSource !== "warehouse_confirmed_issues") {
    throw new DirectorReportsCanonicalPayloadError(
      "director_report_transport_scope_v1 invalid canonical canonical_diagnostics.objectCountSource",
    );
  }
  const noWorkNameSource = canonicalText(
    noWorkName.source,
    "canonical_diagnostics.noWorkName.source",
  );
  if (noWorkNameSource !== "warehouse_issues") {
    throw new DirectorReportsCanonicalPayloadError(
      "director_report_transport_scope_v1 invalid canonical canonical_diagnostics.noWorkName.source",
    );
  }
  const transportBranch = canonicalText(
    record.transportBranch,
    "canonical_diagnostics.transportBranch",
  );
  if (transportBranch !== "rpc_scope_v1") {
    throw new DirectorReportsCanonicalPayloadError(
      "director_report_transport_scope_v1 invalid canonical canonical_diagnostics.transportBranch",
    );
  }
  const pricedStageRaw = record.pricedStage == null ? null : canonicalText(record.pricedStage, "canonical_diagnostics.pricedStage");
  if (pricedStageRaw !== null && pricedStageRaw !== "base" && pricedStageRaw !== "priced") {
    throw new DirectorReportsCanonicalPayloadError(
      "director_report_transport_scope_v1 invalid canonical canonical_diagnostics.pricedStage",
    );
  }
  const pricedStage: "base" | "priced" | null =
    pricedStageRaw === "base" || pricedStageRaw === "priced" ? pricedStageRaw : null;
  const backendOwnerPreserved = canonicalBoolean(
    record.backendOwnerPreserved,
    "canonical_diagnostics.backendOwnerPreserved",
  );
  if (!backendOwnerPreserved) {
    throw new DirectorReportsCanonicalPayloadError(
      "director_report_transport_scope_v1 canonical diagnostics are not backend-owned",
    );
  }
  return {
    naming: {
      vrr: canonicalNamingSourceStatus(naming.vrr, "canonical_diagnostics.naming.vrr"),
      overrides: canonicalNamingSourceStatus(
        naming.overrides,
        "canonical_diagnostics.naming.overrides",
      ),
      ledger: canonicalNamingSourceStatus(naming.ledger, "canonical_diagnostics.naming.ledger"),
      objectNamingSourceStatus: canonicalNamingHealthStatus(
        naming.objectNamingSourceStatus,
        "canonical_diagnostics.naming.objectNamingSourceStatus",
      ),
      workNamingSourceStatus: canonicalNamingHealthStatus(
        naming.workNamingSourceStatus,
        "canonical_diagnostics.naming.workNamingSourceStatus",
      ),
      balanceViewStatus: canonicalNamingHealthStatus(
        naming.balanceViewStatus,
        "canonical_diagnostics.naming.balanceViewStatus",
      ),
      namesViewStatus: canonicalNamingHealthStatus(
        naming.namesViewStatus,
        "canonical_diagnostics.naming.namesViewStatus",
      ),
      overridesStatus: canonicalNamingHealthStatus(
        naming.overridesStatus,
        "canonical_diagnostics.naming.overridesStatus",
      ),
      resolvedNames: canonicalNumber(naming.resolvedNames, "canonical_diagnostics.naming.resolvedNames"),
      unresolvedCodes: canonicalStringArray(
        naming.unresolvedCodes,
        "canonical_diagnostics.naming.unresolvedCodes",
      ),
      lastProbeAt: naming.lastProbeAt == null ? null : canonicalText(naming.lastProbeAt, "canonical_diagnostics.naming.lastProbeAt"),
      probeCacheMode: canonicalProbeCacheMode(
        naming.probeCacheMode,
        "canonical_diagnostics.naming.probeCacheMode",
      ),
    },
    objectCountSource,
    noWorkName: {
      workNameMissingCount: canonicalNumber(
        noWorkName.workNameMissingCount,
        "canonical_diagnostics.noWorkName.workNameMissingCount",
      ),
      workNameResolvedCount: canonicalNumber(
        noWorkName.workNameResolvedCount,
        "canonical_diagnostics.noWorkName.workNameResolvedCount",
      ),
      itemsWithoutWorkName: canonicalNumber(
        noWorkName.itemsWithoutWorkName,
        "canonical_diagnostics.noWorkName.itemsWithoutWorkName",
      ),
      locationsWithoutWorkName: canonicalNumber(
        noWorkName.locationsWithoutWorkName,
        "canonical_diagnostics.noWorkName.locationsWithoutWorkName",
      ),
      share: canonicalNumber(noWorkName.share, "canonical_diagnostics.noWorkName.share"),
      source: noWorkNameSource,
      fallbackApplied: canonicalBoolean(
        noWorkName.fallbackApplied,
        "canonical_diagnostics.noWorkName.fallbackApplied",
      ),
      canResolveFromSource: canonicalBoolean(
        noWorkName.canResolveFromSource,
        "canonical_diagnostics.noWorkName.canResolveFromSource",
      ),
      explanation: canonicalText(
        noWorkName.explanation,
        "canonical_diagnostics.noWorkName.explanation",
      ),
    },
    backendOwnerPreserved,
    transportBranch,
    pricedStage,
  };
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

const augmentOptionsStateWithStableObjectKeys = async (
  optionsState: DirectorReportScopeOptionsState,
): Promise<DirectorReportScopeOptionsState> => {
  const namesToResolve = optionsState.objects.filter((name) => {
    const normalized = String(name ?? "").trim();
    return normalized !== "" && !optionsState.objectIdByName[normalized];
  });
  if (!namesToResolve.length) return optionsState;

  const codeByName = await loadConstructionObjectCodesByNames(supabase, namesToResolve);
  if (!codeByName.size) return optionsState;

  const mergedMap: Record<string, string | null> = {
    ...optionsState.objectIdByName,
  };
  for (const name of optionsState.objects) {
    const normalized = String(name ?? "").trim();
    if (!normalized || mergedMap[normalized]) continue;
    const stableCode = codeByName.get(normalized) ?? null;
    if (stableCode) mergedMap[normalized] = stableCode;
  }

  return {
    objects: optionsState.objects,
    objectIdByName: mergedMap,
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

const normalizeDirectorReportCanonicalDecorations = (args: {
  summaryPayload: unknown;
  diagnosticsPayload: unknown;
}): {
  summary: DirectorReportsCanonicalSummary;
  diagnostics: DirectorReportsCanonicalDiagnostics;
} => {
  const summary = normalizeDirectorReportsCanonicalSummary(args.summaryPayload);
  const diagnostics = normalizeDirectorReportsCanonicalDiagnostics(args.diagnosticsPayload);
  return {
    summary,
    diagnostics,
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
  const observation = beginPlatformObservability({
    screen: "director",
    surface: "reports_scope",
    category: "fetch",
    event: "load_report_scope",
    sourceKind: "transport:director_report_transport_scope_v1",
    trigger: args.includeDiscipline ? "discipline" : "report",
  });
  try {
    const transportResult = await loadDirectorReportTransportScope({
      from: args.from,
      to: args.to,
      objectName: args.objectName,
      includeDiscipline: !!args.includeDiscipline,
      skipDisciplinePrices: args.skipDisciplinePrices,
      bypassCache: args.bypassCache,
    });
    const rawOptionsState = normalizeOptionsState(transportResult.options);
    let optionsState = rawOptionsState;
    try {
      optionsState = await augmentOptionsStateWithStableObjectKeys(rawOptionsState);
    } catch (error) {
      console.warn("[directorReportsScope] stable_object_key_augment_failed", error);
    }
    const normalizedReport = normalizeReportPayload(transportResult.report);
    const normalizedDiscipline = normalizeDisciplinePayload(transportResult.discipline);
    const canonicalDecorations = normalizeDirectorReportCanonicalDecorations({
      summaryPayload: transportResult.canonicalSummaryPayload,
      diagnosticsPayload: transportResult.canonicalDiagnosticsPayload,
    });
    const reportWithCanonicalMeta =
      normalizedReport == null
        ? null
        : {
            ...normalizedReport,
            summary: canonicalDecorations.summary,
            diagnostics: canonicalDecorations.diagnostics,
          };
    const result = {
      optionsKey: buildOptionsKey(args.from, args.to),
      optionsState,
      optionsMeta: transportResult.optionsMeta,
      optionsFromCache: transportResult.fromCache,
      key: buildScopeKey(args.from, args.to, args.objectName, optionsState.objectIdByName),
      objectName: args.objectName,
      report: reportWithCanonicalMeta,
      reportMeta: transportResult.reportMeta,
      discipline: normalizedDiscipline,
      disciplineMeta: transportResult.disciplineMeta,
      reportFromCache: transportResult.fromCache,
      disciplineFromCache: transportResult.fromCache,
      disciplinePricesReady:
        args.includeDiscipline === true
          ? transportResult.disciplineMeta?.pricedStage !== "base"
          : false,
    };
    observation.success({
      rowCount: result.report?.rows?.length ?? 0,
      sourceKind: transportResult.branchMeta.transportBranch,
      cacheLayer: transportResult.fromCache ? "transport_cache" : "none",
      fallbackUsed: false,
      extra: {
        optionsObjects: canonicalDecorations.summary.displayObjectCount,
        disciplineWorks: result.discipline?.works?.length ?? 0,
        pricedStage: transportResult.branchMeta.pricedStage ?? null,
        objectCountLabel: canonicalDecorations.summary.displayObjectCountLabel,
        unresolvedNamesCount: canonicalDecorations.summary.unresolvedNamesCount,
        noWorkNameCount: canonicalDecorations.summary.noWorkNameCount,
        objectCountSource: canonicalDecorations.diagnostics.objectCountSource,
        namingVrr: canonicalDecorations.diagnostics.naming.vrr,
        namingOverrides: canonicalDecorations.diagnostics.naming.overrides,
        namingLedger: canonicalDecorations.diagnostics.naming.ledger,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "load_report_scope",
    });
    throw error;
  }
}
