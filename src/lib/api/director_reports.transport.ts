import { supabase } from "../supabaseClient";
import type {
  AccIssueHead,
  AccIssueLine,
  DirectorDisciplinePayload,
  DirectorFactContextResolved,
  DirectorDisciplineSourceRpcRow,
  DirectorFactRow,
  DirectorReportOptions,
  DirectorReportPayload,
  DirectorReportRow,
  DirectorReportWho,
  JoinedWarehouseIssueItemFactRow,
  RefSystemLookupRow,
  RequestLookupRow,
  RequestItemRequestLinkRow,
  WarehouseIssueFactRow,
  WarehouseIssueItemFactRow,
  DisciplineRowsSource,
} from "./director_reports.shared";
import {
  WITHOUT_OBJECT,
  buildReportOptionsFromByObjRows,
  chunk,
  firstNonEmpty,
  forEachChunkParallel,
  matchesDirectorObjectIdentity,
  normalizeDirectorDisciplineSourceRpcRow,
  normalizeDirectorFactRow,
  normalizeDirectorFactViewRow,
  normalizeJoinedWarehouseIssueItemFactRow,
  normalizeLegacyByObjectRow,
  normalizeLegacyFastMaterialRow,
  normalizeProposalItemPriceRow,
  normalizePurchaseItemPriceRow,
  normalizePurchaseItemRequestPriceRow,
  normalizeRefSystemLookupRow,
  normalizeRequestItemRequestLinkRow,
  normalizeRequestLookupRow,
  normalizeWarehouseIssueFactRow,
  normalizeWarehouseIssueItemFactRow,
  extractJoinedWarehouseIssueFactRow,
  normObjectName,
  normWorkName,
  resolveDirectorFactContext,
  toRangeEnd,
  toRangeStart,
  toNum,
} from "./director_reports.shared";
import {
  DISCIPLINE_ROWS_CACHE_TTL_MS,
  DIRECTOR_REPORTS_STRICT_FACT_SOURCES,
  REPORTS_TIMING,
  REQUESTS_DISCIPLINE_SELECT_PLANS,
  REQUESTS_SELECT_PLANS,
  buildDisciplineSourceRowsRpcCacheKey,
  canUseDisciplineSourceRpc,
  disciplineSourceRowsRpcCache,
  filterDisciplineRowsByObject,
  getFreshLookupValue,
  isMissingCanonicalRpcError,
  markDisciplineSourceRpcStatus,
  requestLookupCache,
  requestLookupInFlight,
  setLookupValue,
  logTiming,
  nowMs,
  trimMap,
} from "./director_reports.cache";
import { adaptCanonicalMaterialsPayload, adaptCanonicalOptionsPayload, adaptCanonicalWorksPayload, unwrapRpcPayload } from "./director_reports.adapters";
import {
  fetchBestMaterialNamesByCode,
  fetchObjectsByIds,
  fetchObjectTypeNamesByCode,
  fetchRikNamesRuByCode,
  fetchSystemNamesByCode,
  looksLikeMaterialCode,
  probeNameSources,
} from "./director_reports.naming";

let requestsSelectPlanCache: string | null = null;
let requestsDisciplineSelectPlanCache: string | null = null;

async function runTypedRpc<TRow>(
  fnName:
    | "acc_report_issues_v2"
    | "acc_report_issue_lines"
    | "wh_report_issued_summary_fast"
    | "wh_report_issued_materials_fast"
    | "wh_report_issued_by_object_fast"
    | "director_report_fetch_options_v1"
    | "director_report_fetch_discipline_source_rows_v1"
    | "director_report_fetch_materials_v1"
    | "director_report_fetch_works_v1"
    | "director_report_fetch_summary_v1",
  params: Record<string, unknown>,
): Promise<{ data: TRow[] | null; error: { message?: string | null; details?: string | null; hint?: string | null; code?: string | null } | null }> {
  const { data, error } = await supabase.rpc(fnName as never, params as never);
  return {
    data: Array.isArray(data) ? (data as TRow[]) : null,
    error: error
      ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      : null,
  };
}

async function fetchRequestsRowsSafe(ids: string[]): Promise<RequestLookupRow[]> {
  const reqIds = Array.from(new Set((ids || []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!reqIds.length) return [];

  const cachedRows: RequestLookupRow[] = [];
  const missingIds: string[] = [];
  for (const id of reqIds) {
    const cached = getFreshLookupValue(requestLookupCache, id);
    if (cached !== undefined) {
      if (cached) cachedRows.push(cached);
      continue;
    }
    missingIds.push(id);
  }
  if (!missingIds.length) return cachedRows;

  const runSelect = async (selectCols: string, idsPart: string[]) =>
    await supabase
      .from("requests" as never)
      .select(selectCols)
      .in("id", idsPart);

  const loadMissing = async (): Promise<RequestLookupRow[]> => {
    if (requestsSelectPlanCache) {
      const cached = await runSelect(requestsSelectPlanCache, missingIds);
      if (!cached.error) {
        const rows = Array.isArray(cached.data)
          ? cached.data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
          : [];
        const seen = new Set(rows.map((row) => row.id));
        for (const row of rows) setLookupValue(requestLookupCache, row.id, row);
        for (const id of missingIds) if (!seen.has(id)) setLookupValue(requestLookupCache, id, null);
        return rows;
      }
      requestsSelectPlanCache = null;
    }

    let lastError: unknown = null;
    for (const selectCols of REQUESTS_SELECT_PLANS) {
      const q = await runSelect(selectCols, missingIds);
      if (!q.error) {
        requestsSelectPlanCache = selectCols;
        const rows = Array.isArray(q.data)
          ? q.data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
          : [];
        const seen = new Set(rows.map((row) => row.id));
        for (const row of rows) setLookupValue(requestLookupCache, row.id, row);
        for (const id of missingIds) if (!seen.has(id)) setLookupValue(requestLookupCache, id, null);
        return rows;
      }
      lastError = q.error;
    }

    if (lastError) throw lastError;
    return [];
  };

  const inFlightKey = missingIds.slice().sort().join("|");
  let pending = requestLookupInFlight.get(inFlightKey);
  if (!pending) {
    pending = loadMissing();
    requestLookupInFlight.set(inFlightKey, pending);
  }

  try {
    const loaded = await pending;
    return [...cachedRows, ...loaded];
  } finally {
    requestLookupInFlight.delete(inFlightKey);
  }
}

async function fetchRequestsDisciplineRowsSafe(ids: string[]): Promise<RequestLookupRow[]> {
  const reqIds = Array.from(new Set((ids || []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!reqIds.length) return [];

  const cachedRows: RequestLookupRow[] = [];
  const missingIds: string[] = [];
  for (const id of reqIds) {
    const cached = getFreshLookupValue(requestLookupCache, id);
    const hasDisciplineFields =
      cached !== undefined &&
      (!!cached?.level_code || !!cached?.system_code || cached?.level_code === null || cached?.system_code === null);
    if (hasDisciplineFields) {
      if (cached) cachedRows.push(cached);
      continue;
    }
    missingIds.push(id);
  }
  if (!missingIds.length) return cachedRows;

  const runSelect = async (selectCols: string) =>
    await supabase
      .from("requests" as never)
      .select(selectCols)
      .in("id", missingIds);

  if (requestsDisciplineSelectPlanCache) {
    const cached = await runSelect(requestsDisciplineSelectPlanCache);
    if (!cached.error) {
      const rows = Array.isArray(cached.data)
        ? cached.data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
        : [];
      const seen = new Set(rows.map((row) => row.id));
      for (const row of rows) {
        const prev = getFreshLookupValue(requestLookupCache, row.id);
        setLookupValue(requestLookupCache, row.id, { ...(prev ?? { id: row.id, object_id: null, object_name: null, object_type_code: null, system_code: null, level_code: null, zone_code: null, object: null }), ...row });
      }
      for (const id of missingIds) if (!seen.has(id)) setLookupValue(requestLookupCache, id, null);
      return [...cachedRows, ...rows];
    }
    requestsDisciplineSelectPlanCache = null;
  }

  let lastError: unknown = null;
  for (const selectCols of REQUESTS_DISCIPLINE_SELECT_PLANS) {
    const q = await runSelect(selectCols);
    if (!q.error) {
      requestsDisciplineSelectPlanCache = selectCols;
      const rows = Array.isArray(q.data)
        ? q.data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
        : [];
      const seen = new Set(rows.map((row) => row.id));
      for (const row of rows) {
        const prev = getFreshLookupValue(requestLookupCache, row.id);
        setLookupValue(requestLookupCache, row.id, { ...(prev ?? { id: row.id, object_id: null, object_name: null, object_type_code: null, system_code: null, level_code: null, zone_code: null, object: null }), ...row });
      }
      for (const id of missingIds) if (!seen.has(id)) setLookupValue(requestLookupCache, id, null);
      return [...cachedRows, ...rows];
    }
    lastError = q.error;
  }

  if (lastError) throw lastError;
  return [];
}

async function fetchIssueHeadsViaAccRpc(p: {
  from: string;
  to: string;
}): Promise<AccIssueHead[]> {
  const { data, error } = await runTypedRpc<AccIssueHead>("acc_report_issues_v2", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchIssueLinesViaAccRpc(issueIds: string[]): Promise<AccIssueLine[]> {
  const out: AccIssueLine[] = [];
  const ids = issueIds.filter(id => String(id || "").trim() !== "");
  if (!ids.length) return [];

  // Уменьшаем размер пачки для параллельного исполнения, чтобы не вешать сеть на телефоне
  const groups = chunk(ids, 20);

  for (const g of groups) {
    const settled = await Promise.all(
      g.map(async (id) => {
        try {
          const numId = Number(id);
          if (isNaN(numId)) return [] as AccIssueLine[];

          const { data, error } = await runTypedRpc<AccIssueLine>("acc_report_issue_lines", {
            p_issue_id: numId,
          });
          if (error) {
            console.warn(`[fetchIssueLines] RPC Error for ${id}:`, error.message);
            return [] as AccIssueLine[];
          }
          return Array.isArray(data) ? (data as AccIssueLine[]) : [];
        } catch (e) {
          console.warn(`[fetchIssueLines] catch for ${id}:`, e);
          return [] as AccIssueLine[];
        }
      })
    );
    for (const arr of settled) if (arr) out.push(...arr);
  }
  return out;
}

async function fetchDirectorFactViaAccRpc(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const heads = await fetchIssueHeadsViaAccRpc({ from: p.from, to: p.to });
  if (!heads.length) return [];

  const requestIds = Array.from(
    new Set(
      heads
        .map((h) => String(h.request_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );

  const reqById = new Map<string, RequestLookupRow>();
  for (const ids of chunk(requestIds, 100)) {
    try {
      const rows = await fetchRequestsRowsSafe(ids);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) reqById.set(id, r);
      }
    } catch {
      continue;
    }
  }

  const objectIds = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectNameById = await fetchObjectsByIds(objectIds);

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_type_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectTypeNameByCode = await fetchObjectTypeNamesByCode(objectTypeCodes);

  const systemCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.system_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const systemNameByCode = await fetchSystemNamesByCode(systemCodes);

  const headCtxByIssueId = new Map<
    string,
    {
      issueId: string;
      issDate: string;
      context: DirectorFactContextResolved;
    }
  >();
  for (const h of heads) {
    const issueId = String(h?.issue_id ?? "").trim();
    if (!issueId) continue;
    const reqId = String(h?.request_id ?? "").trim();
    const request = reqId ? (reqById.get(reqId) ?? null) : null;
    const context = resolveDirectorFactContext({
      request_id: reqId,
      request,
      issue_note: h?.note ?? null,
      request_object_name_by_id: objectNameById.get(String(request?.object_id ?? "").trim()) ?? null,
      request_object_type_name: firstNonEmpty(
        objectTypeNameByCode.get(String(request?.object_type_code ?? "").trim()),
        request?.object_type_code,
      ) || null,
      request_system_name: firstNonEmpty(
        systemNameByCode.get(String(request?.system_code ?? "").trim()),
        request?.system_code,
      ) || null,
      request_zone_name: request?.zone_code ?? null,
    });

    if (!matchesDirectorObjectIdentity(p.objectName, context)) continue;

    headCtxByIssueId.set(issueId, {
      issueId,
      issDate: String(h?.event_dt ?? ""),
      context,
    });
  }

  if (!headCtxByIssueId.size) return [];

  const issueIds = Array.from(headCtxByIssueId.keys());
  const lines = await fetchIssueLinesViaAccRpc(issueIds);
  if (!lines.length) return [];

  const out: DirectorFactRow[] = [];
  for (const ln of lines) {
    const issueId = String(ln?.issue_id ?? "").trim();
    const ctx = headCtxByIssueId.get(issueId);
    if (!ctx) continue;
    const row = normalizeDirectorFactRow({
      issue_id: issueId,
      iss_date: ctx.issDate,
      context: ctx.context,
      material_name: firstNonEmpty(ln?.name_human, ln?.rik_code),
      rik_code: ln?.rik_code,
      uom: ln?.uom,
      qty: ln?.qty_total,
    });
    if (row) out.push(row);
  }

  return out;
}

async function fetchAllFactRowsFromView(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const pageSize = 1000;
  const out: DirectorFactRow[] = [];
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("v_director_issued_fact_rows" as never)
      .select("issue_id,iss_date,object_name,work_name,rik_code,material_name_ru,uom,qty,is_without_request");
    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeDirectorFactViewRow).filter((row): row is DirectorFactRow => !!row)
      : [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  return out;
}

async function fetchDirectorDisciplineSourceRowsViaRpc(p: {
  from: string;
  to: string;
}): Promise<DirectorFactRow[]> {
  const cacheKey = buildDisciplineSourceRowsRpcCacheKey(p);
  const cached = disciplineSourceRowsRpcCache.get(cacheKey);
  if (cached && Date.now() - cached.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
    return cached.rows;
  }
  if (cached) disciplineSourceRowsRpcCache.delete(cacheKey);

  const { data, error } = await runTypedRpc<DirectorDisciplineSourceRpcRow>(
    "director_report_fetch_discipline_source_rows_v1",
    {
      p_from: p.from || "1970-01-01",
      p_to: p.to || "2099-12-31",
    },
  );
  if (error) throw error;
  const rows = Array.isArray(data)
    ? data.map(normalizeDirectorDisciplineSourceRpcRow).filter((row): row is DirectorFactRow => !!row)
    : [];
  disciplineSourceRowsRpcCache.set(cacheKey, { ts: Date.now(), rows });
  trimMap(disciplineSourceRowsRpcCache);
  return rows;
}

async function fetchViaLegacyRpc(p: {
  from: string;
  to: string;
  objectId: string | null;
  objectName: string | null;
}): Promise<DirectorReportPayload> {
  const [summaryRes, materialsRes, byObjRes] = await Promise.all([
    runTypedRpc<Record<string, unknown>>("wh_report_issued_summary_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
    runTypedRpc<Record<string, unknown>>("wh_report_issued_materials_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
    runTypedRpc<Record<string, unknown>>("wh_report_issued_by_object_fast", {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    }),
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (materialsRes.error) throw materialsRes.error;
  if (byObjRes.error) throw byObjRes.error;

  const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : null;
  const matRows = Array.isArray(materialsRes.data) ? materialsRes.data : [];
  const objRows = Array.isArray(byObjRes.data) ? byObjRes.data : [];

  const normalizedMatRows = matRows.map(normalizeLegacyFastMaterialRow);
  const normalizedObjRows = objRows.map(normalizeLegacyByObjectRow);

  const rows: DirectorReportRow[] = normalizedMatRows
    .map((r) => ({
      rik_code: String(r.material_code ?? "").trim().toUpperCase(),
      name_human_ru: String(r.material_name ?? "").trim() || String(r.material_code ?? "").trim(),
      uom: String(r.uom ?? ""),
      qty_total: toNum(r.sum_total),
      docs_cnt: Math.round(toNum(r.docs_cnt)),
      qty_without_request: toNum(r.sum_free),
      docs_without_request: Math.round(toNum(r.docs_free)),
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const disciplineAgg = new Map<string, number>();
  for (const r of normalizedObjRows) {
    const who = normWorkName(r.work_name);
    disciplineAgg.set(who, (disciplineAgg.get(who) || 0) + Math.round(toNum(r.lines_cnt)));
  }
  const discipline_who: DirectorReportWho[] = Array.from(disciplineAgg.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);
  const reportOptions = buildReportOptionsFromByObjRows(normalizedObjRows);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: Math.round(toNum(summary?.docs_total)),
      issues_without_object: normalizedObjRows
        .filter((r) => normObjectName(r.object_name) === WITHOUT_OBJECT)
        .reduce((acc: number, r) => acc + Math.round(toNum(r.docs_cnt)), 0),
      items_total: normalizedMatRows.reduce((acc: number, r) => acc + Math.round(toNum(r.lines_cnt)), 0),
      items_without_request: normalizedMatRows.reduce((acc: number, r) => acc + Math.round(toNum(r.lines_free)), 0),
    },
    rows,
    discipline_who,
    report_options: reportOptions,
  };
}

async function fetchAllFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const tTotal = nowMs();
  const issuesById = new Map<string, WarehouseIssueFactRow>();
  const pageSize = 2500;
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("warehouse_issues" as never)
      .select("id,iss_date,object_name,work_name,request_id,status,note,target_object_id")
      .eq("status", "Подтверждено");

    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeWarehouseIssueFactRow).filter((row): row is WarehouseIssueFactRow => !!row)
      : [];
    for (const r of rows) issuesById.set(r.id, r);

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }
  logTiming("discipline.rows.tables.issues_scan", tTotal);

  if (!issuesById.size) return [];

  const issueIds = Array.from(issuesById.keys()).filter(id => id !== "");
  if (!issueIds.length) return [];

  const issueItems: WarehouseIssueItemFactRow[] = [];
  const tIssueItems = nowMs();
  await forEachChunkParallel(issueIds, 500, 6, async (ids) => {
    const { data, error } = await supabase
      .from("warehouse_issue_items" as never)
      .select("id,issue_id,rik_code,uom_id,qty,request_item_id")
      .in("issue_id", ids);
    if (error) throw error;
    if (Array.isArray(data)) {
      issueItems.push(
        ...data
          .map(normalizeWarehouseIssueItemFactRow)
          .filter((row): row is WarehouseIssueItemFactRow => !!row),
      );
    }
  });
  logTiming("discipline.rows.tables.issue_items", tIssueItems);

  if (!issueItems.length) return [];

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .map((x) => String(x?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const requestIdByRequestItem = new Map<string, string>();
  if (requestItemIds.length) {
    const tReqItems = nowMs();
    await forEachChunkParallel(requestItemIds, 500, 6, async (ids) => {
      const { data, error } = await supabase
        .from("request_items" as never)
        .select("id,request_id")
        .in("id", ids);
      if (error) throw error;

      const rows = Array.isArray(data)
        ? data
            .map(normalizeRequestItemRequestLinkRow)
            .filter((row): row is RequestItemRequestLinkRow => !!row)
        : [];
      for (const r of rows) {
        const id = r.id;
        const reqId = String(r.request_id ?? "").trim();
        if (id && reqId) requestIdByRequestItem.set(id, reqId);
      }
    });
    logTiming("discipline.rows.tables.request_items", tReqItems);
  }

  const requestIds = Array.from(
    new Set(
      [
        ...issueItems.map((it) => {
          const rid = String(it?.request_item_id ?? "").trim();
          return rid ? requestIdByRequestItem.get(rid) ?? "" : "";
        }),
        ...Array.from(issuesById.values()).map((iss) => String(iss?.request_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, RequestLookupRow>();
  if (requestIds.length) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsRowsSafe(ids);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) requestById.set(id, r);
      }
    });
    logTiming("discipline.rows.tables.requests", tReq);
  }

  const objectIds = Array.from(
    new Set(
      [
        ...Array.from(issuesById.values()).map((iss) => String(iss?.target_object_id ?? "").trim()),
        ...Array.from(requestById.values()).map((req) => String(req?.object_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const tObjects = nowMs();
  const objectNameById = await fetchObjectsByIds(objectIds);
  logTiming("discipline.rows.tables.objects", tObjects);

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.object_type_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const tObjTypes = nowMs();
  const objectTypeNameByCode = await fetchObjectTypeNamesByCode(objectTypeCodes);
  logTiming("discipline.rows.tables.object_types", tObjTypes);

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.system_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const tSystems = nowMs();
  const systemNameByCode = await fetchSystemNamesByCode(systemCodes);
  logTiming("discipline.rows.tables.systems", tSystems);

  const codes = Array.from(
    new Set(
      issueItems
        .map((it) => String(it?.rik_code ?? "").trim().toUpperCase())
        .filter(code => code !== ""),
    ),
  );

  const nameRuByCode = new Map<string, string>();
  if (codes.length) {
    const tNames = nowMs();
    try {
      const probe = await probeNameSources();
      if (probe.vrr) {
        const resolved = await fetchRikNamesRuByCode(codes);
        for (const [code, name] of resolved.entries()) {
          if (code && name && !nameRuByCode.has(code)) nameRuByCode.set(code, name);
        }
      }
    } catch (e: unknown) {
      console.warn("[director_reports] disable v_rik_names_ru:", (e as Error)?.message ?? e);
    }
    logTiming("discipline.rows.tables.name_resolve", tNames);
  }

  const out: DirectorFactRow[] = [];
  for (const it of issueItems) {
    const issueId = String(it?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(it?.request_item_id ?? "").trim();
    const issueReqId = String(issue?.request_id ?? "").trim();
    const reqId =
      (reqItemId ? requestIdByRequestItem.get(reqItemId) : null) ??
      (issueReqId || null);
    const req = reqId ? requestById.get(reqId) : null;
    const context = resolveDirectorFactContext({
      request_id: reqId,
      request_item_id: reqItemId || null,
      request: req,
      issue_object_id: issue?.target_object_id ?? null,
      issue_note: issue?.note ?? null,
      issue_object_name: issue?.object_name ?? null,
      issue_work_name: issue?.work_name ?? null,
      issue_object_name_by_id: objectNameById.get(String(issue?.target_object_id ?? "").trim()) ?? null,
      request_object_name_by_id: objectNameById.get(String(req?.object_id ?? "").trim()) ?? null,
      request_object_type_name: firstNonEmpty(
        objectTypeNameByCode.get(String(req?.object_type_code ?? "").trim()),
        req?.object_type_code,
      ) || null,
      request_system_name: firstNonEmpty(
        systemNameByCode.get(String(req?.system_code ?? "").trim()),
        req?.system_code,
      ) || null,
      request_zone_name: req?.zone_code ?? null,
    });

    if (!matchesDirectorObjectIdentity(p.objectName, context)) continue;

    const row = normalizeDirectorFactRow({
      issue_id: issueId,
      issue_item_id: it?.id ?? null,
      iss_date: String(issue?.iss_date ?? ""),
      context,
      material_name: nameRuByCode.get(String(it?.rik_code ?? "").trim().toUpperCase()) ?? String(it?.rik_code ?? ""),
      rik_code: it?.rik_code,
      uom: it?.uom_id,
      qty: it?.qty,
    });
    if (row) out.push(row);
  }

  logTiming("discipline.rows.tables.total", tTotal);
  return out;
}

async function fetchDisciplineFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const tTotal = nowMs();
  const tryJoinedIssueItemsPath = async (): Promise<DirectorFactRow[] | null> => {
    const tJoined = nowMs();
    try {
      const out: DirectorFactRow[] = [];
      const pageSize = 3000;
      let fromIdx = 0;
      let totalIssueItems = 0;
      while (true) {
        let q = supabase
          .from("warehouse_issue_items" as never)
          .select("id,issue_id,rik_code,uom_id,qty,request_item_id,warehouse_issues!inner(id,iss_date,object_name,work_name,status,note)")
          .eq("warehouse_issues.status", "Подтверждено");
        if (p.from) q = q.gte("warehouse_issues.iss_date", toRangeStart(p.from));
        if (p.to) q = q.lte("warehouse_issues.iss_date", toRangeEnd(p.to));
        if (p.objectName != null) q = q.eq("warehouse_issues.object_name", p.objectName);
        q = q.order("issue_id", { ascending: false }).range(fromIdx, fromIdx + pageSize - 1);

        const { data, error } = await q;
        if (error) throw error;
        const rows = Array.isArray(data)
          ? data
              .map(normalizeJoinedWarehouseIssueItemFactRow)
              .filter((row): row is JoinedWarehouseIssueItemFactRow => !!row)
          : [];
        if (!rows.length) break;
        totalIssueItems += rows.length;
        const seenIssueItemIds = new Set<string>();

        for (const it of rows) {
          const issueItemId = String(it.id ?? "").trim();
          if (issueItemId) {
            if (seenIssueItemIds.has(issueItemId)) continue;
            seenIssueItemIds.add(issueItemId);
          }
          const issue = extractJoinedWarehouseIssueFactRow(it);
          if (!issue) continue;
          const issueId = String(it.issue_id ?? issue.id ?? "").trim();
          const requestItemId = String(it.request_item_id ?? "").trim() || null;
          const context = resolveDirectorFactContext({
            request_item_id: requestItemId,
            issue_note: issue?.note ?? null,
            issue_object_name: issue?.object_name ?? null,
            issue_work_name: issue?.work_name ?? null,
            force_without_level_when_issue_work_name: true,
            use_free_issue_object_fallback: false,
          });
          const row = normalizeDirectorFactRow({
            issue_id: issueId,
            issue_item_id: issueItemId,
            iss_date: String(issue?.iss_date ?? ""),
            context,
            material_name: it.rik_code == null ? null : String(it.rik_code),
            rik_code: it.rik_code,
            uom: it.uom_id,
            qty: it.qty,
          });
          if (row) out.push(row);
        }

        if (rows.length < pageSize) break;
        fromIdx += pageSize;
        if (fromIdx > 500000) break;
      }

      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.rows.light.counts(joined): issue_items=${totalIssueItems} final_rows=${out.length}`);
      }
      logTiming("discipline.rows.light.joined.total", tJoined);
      return out;
    } catch (e: unknown) {
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.rows.light.joined.failed: ${(e as Error)?.message ?? e}`);
      }
      return null;
    }
  };

  const joinedRows = await tryJoinedIssueItemsPath();
  if (joinedRows && joinedRows.length) {
    logTiming("discipline.rows.light.total", tTotal);
    return joinedRows;
  }

  const issuesById = new Map<string, WarehouseIssueFactRow>();
  const pageSize = 2500;
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("warehouse_issues" as never)
      .select("id,iss_date,object_name,work_name,request_id,status,note")
      .eq("status", "Подтверждено");

    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeWarehouseIssueFactRow).filter((row): row is WarehouseIssueFactRow => !!row)
      : [];
    for (const r of rows) issuesById.set(r.id, r);

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }
  logTiming("discipline.rows.light.issues_scan", tTotal);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: issues=${issuesById.size}`);

  if (!issuesById.size) return [];
  const issueIds = Array.from(issuesById.keys());
  if (!issueIds.length) return [];

  const issueItems: WarehouseIssueItemFactRow[] = [];
  const tIssueItems = nowMs();
  await forEachChunkParallel(issueIds, 500, 6, async (ids) => {
    const { data, error } = await supabase
      .from("warehouse_issue_items" as never)
      .select("id,issue_id,rik_code,uom_id,qty,request_item_id")
      .in("issue_id", ids);
    if (error) throw error;
    if (Array.isArray(data)) {
      issueItems.push(
        ...data
          .map(normalizeWarehouseIssueItemFactRow)
          .filter((row): row is WarehouseIssueItemFactRow => !!row),
      );
    }
  });
  logTiming("discipline.rows.light.issue_items", tIssueItems);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: issue_items=${issueItems.length}`);
  if (!issueItems.length) return [];

  const issuesMissingWork = new Set<string>();
  for (const [id, issue] of issuesById.entries()) {
    const w = String(issue?.work_name ?? "").trim();
    if (!w) issuesMissingWork.add(id);
  }

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .filter((x) => {
          const issueId = String(x.issue_id ?? "").trim();
          const issue = issuesById.get(issueId);
          if (!issue) return false;
          const issueReqId = String(issue?.request_id ?? "").trim();
          return !issueReqId && issuesMissingWork.has(issueId);
        })
        .map((x) => String(x?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const requestIdByRequestItem = new Map<string, string>();
  if (requestItemIds.length) {
    const tReqItems = nowMs();
    await forEachChunkParallel(requestItemIds, 500, 6, async (ids) => {
      const { data, error } = await supabase
        .from("request_items" as never)
        .select("id,request_id")
        .in("id", ids);
      if (error) throw error;
      const rows = Array.isArray(data)
        ? data
            .map(normalizeRequestItemRequestLinkRow)
            .filter((row): row is RequestItemRequestLinkRow => !!row)
        : [];
      for (const r of rows) {
        const id = r.id;
        const reqId = String(r.request_id ?? "").trim();
        if (id && reqId) requestIdByRequestItem.set(id, reqId);
      }
    });
    logTiming("discipline.rows.light.request_items", tReqItems);
    if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: request_items=${requestItemIds.length}`);
  }

  const requestIds = Array.from(
    new Set(
      [
        ...Array.from(issuesById.entries())
          .filter(([issueId]) => issuesMissingWork.has(issueId))
          .map(([, iss]) => String(iss?.request_id ?? "").trim()),
        ...Array.from(requestIdByRequestItem.values())
          .map((rid) => String(rid ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, RequestLookupRow>();
  if (requestIds.length) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsDisciplineRowsSafe(ids);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) requestById.set(id, r);
      }
    });
    logTiming("discipline.rows.light.requests", tReq);
    if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: requests=${requestIds.length}`);
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.system_code ?? "").trim())
        .filter(Boolean),
    ),
  );
  const systemNameByCode = new Map<string, string>();
  if (systemCodes.length) {
    const tSystems = nowMs();
    await forEachChunkParallel(systemCodes, 500, 4, async (codes) => {
      const { data, error } = await supabase
        .from("ref_systems" as never)
        .select("code,name_human_ru,display_name,alias_ru,name")
        .in("code", codes);
      if (error) throw error;
      const rows = Array.isArray(data)
        ? data
            .map(normalizeRefSystemLookupRow)
            .filter((row): row is RefSystemLookupRow => !!row)
        : [];
      for (const r of rows) {
        const code = r.code;
        const name =
          String(r.name_human_ru ?? "").trim() ||
          String(r.display_name ?? "").trim() ||
          String(r.alias_ru ?? "").trim() ||
          String(r.name ?? "").trim();
        if (code && name) systemNameByCode.set(code, name);
      }
    });
    logTiming("discipline.rows.light.systems", tSystems);
  }

  const out: DirectorFactRow[] = [];
  const seenIssueItemIds = new Set<string>();
  const tBuild = nowMs();
  for (const it of issueItems) {
    const issueItemId = String(it.id ?? "").trim();
    if (issueItemId) {
      if (seenIssueItemIds.has(issueItemId)) continue;
      seenIssueItemIds.add(issueItemId);
    }
    const issueId = String(it?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(it?.request_item_id ?? "").trim();
    const issueReqId = String(issue?.request_id ?? "").trim();
    const issueWorkName = String(issue?.work_name ?? "").trim();
    const reqId =
      issueWorkName
        ? (issueReqId || null)
        : ((reqItemId ? requestIdByRequestItem.get(reqItemId) : null) ?? (issueReqId || null));
    const req = reqId ? requestById.get(reqId) : null;

    const context = resolveDirectorFactContext({
      request_id: reqId,
      request_item_id: reqItemId || null,
      request: req,
      issue_note: issue?.note ?? null,
      issue_object_name: issue?.object_name ?? null,
      issue_work_name: issue?.work_name ?? null,
      request_system_name: firstNonEmpty(
        systemNameByCode.get(String(req?.system_code ?? "").trim()),
        req?.system_code,
      ) || null,
      request_zone_name: req?.zone_code ?? null,
      use_free_issue_object_fallback: false,
      force_without_level_when_issue_work_name: true,
    });
    if (!matchesDirectorObjectIdentity(p.objectName, context)) continue;

    const row = normalizeDirectorFactRow({
      issue_id: issueId,
      issue_item_id: issueItemId,
      iss_date: String(issue?.iss_date ?? ""),
      context,
      material_name: it?.rik_code == null ? null : String(it.rik_code),
      rik_code: it?.rik_code,
      uom: it?.uom_id,
      qty: it?.qty,
    });
    if (row) out.push(row);
  }
  logTiming("discipline.rows.light.build", tBuild);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: final_rows=${out.length}`);
  logTiming("discipline.rows.light.total", tTotal);
  return out;
}

async function fetchIssuePriceMapByCode(opts?: {
  skipPurchaseItems?: boolean;
  codes?: string[];
}): Promise<Map<string, number>> {
  const weighted = new Map<string, { sum: number; w: number }>();
  const scopedCodes = Array.from(
    new Set((opts?.codes ?? []).map((x) => String(x ?? "").trim().toUpperCase()).filter(Boolean)),
  );
  const hasScopedCodes = scopedCodes.length > 0;

  const push = (codeRaw: unknown, priceRaw: unknown, qtyRaw: unknown) => {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    const price = toNum(priceRaw);
    if (!code || !(price > 0)) return;
    const qty = Math.max(1, toNum(qtyRaw));
    const prev = weighted.get(code) ?? { sum: 0, w: 0 };
    prev.sum += price * qty;
    prev.w += qty;
    weighted.set(code, prev);
  };

  if (!opts?.skipPurchaseItems) {
    try {
      if (hasScopedCodes) {
        for (const part of chunk(scopedCodes, 500)) {
          const q = await supabase
            .from("purchase_items" as never)
            .select("rik_code,code,price,qty")
            .in("rik_code", part)
            .limit(50000);
          if (!q.error && Array.isArray(q.data)) {
            for (const r of q.data) {
              const row = normalizePurchaseItemPriceRow(r);
              push(row.rik_code ?? row.code, row.price, row.qty);
            }
          }
        }
      } else {
        const q = await supabase
          .from("purchase_items" as never)
          .select("rik_code,code,price,qty")
          .limit(50000);
        if (!q.error && Array.isArray(q.data)) {
          for (const r of q.data) {
            const row = normalizePurchaseItemPriceRow(r);
            push(row.rik_code ?? row.code, row.price, row.qty);
          }
        }
      }
    } catch { }
  }

  if (!weighted.size && !DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    try {
      if (hasScopedCodes) {
        for (const part of chunk(scopedCodes, 500)) {
          const q2 = await supabase
            .from("proposal_items" as never)
            .select("rik_code,price,qty")
            .in("rik_code", part)
            .limit(50000);
          if (!q2.error && Array.isArray(q2.data)) {
            for (const r of q2.data) {
              const row = normalizeProposalItemPriceRow(r);
              push(row.rik_code, row.price, row.qty);
            }
          }
        }
      } else {
        const q2 = await supabase
          .from("proposal_items" as never)
          .select("rik_code,price,qty")
          .limit(50000);
        if (!q2.error && Array.isArray(q2.data)) {
          for (const r of q2.data) {
            const row = normalizeProposalItemPriceRow(r);
            push(row.rik_code, row.price, row.qty);
          }
        }
      }
    } catch { }
  }

  const out = new Map<string, number>();
  for (const [code, a] of weighted.entries()) {
    out.set(code, a.w > 0 ? a.sum / a.w : 0);
  }
  return out;
}

async function fetchDirectorReportCanonicalMaterials(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorReportPayload | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_materials_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  const adapted = adaptCanonicalMaterialsPayload(payload);
  if (!adapted || !Array.isArray(adapted.rows) || !adapted.rows.length) return adapted;

  const codesToResolve = Array.from(
    new Set(
      adapted.rows
        .filter((r) => {
          const code = String(r.rik_code ?? "").trim().toUpperCase();
          if (!code) return false;
          const nm = String(r.name_human_ru ?? "").trim();
          return !nm || looksLikeMaterialCode(nm);
        })
        .map((r) => String(r.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  if (!codesToResolve.length) return adapted;

  try {
    const nameByCode = await fetchBestMaterialNamesByCode(codesToResolve);
    if (!nameByCode.size) return adapted;
    return {
      ...adapted,
      rows: adapted.rows.map((r) => {
        const code = String(r.rik_code ?? "").trim().toUpperCase();
        const best = nameByCode.get(code);
        if (!best) return r;
        const curr = String(r.name_human_ru ?? "").trim();
        if (curr && !looksLikeMaterialCode(curr)) return r;
        return { ...r, name_human_ru: best };
      }),
    };
  } catch {
    return adapted;
  }
}

async function fetchDirectorReportCanonicalWorks(p: {
  from: string;
  to: string;
  objectName: string | null;
  includeCosts: boolean;
}): Promise<DirectorDisciplinePayload | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_works_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
    p_include_costs: !!p.includeCosts,
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalWorksPayload(payload);
}

async function fetchDirectorReportCanonicalOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions | null> {
  const { data, error } = await runTypedRpc<Record<string, unknown>>("director_report_fetch_options_v1", {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
  });
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalOptionsPayload(payload);
}

async function fetchPriceByRequestItemId(requestItemIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = Array.from(new Set((requestItemIds || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!ids.length) return out;

  for (const part of chunk(ids, 500)) {
    try {
      const q = await supabase
        .from("purchase_items" as never)
        .select("request_item_id,price,qty")
        .in("request_item_id", part);
      if (q.error || !Array.isArray(q.data)) continue;

      const agg = new Map<string, { sum: number; w: number }>();
      for (const r of q.data) {
        const row = normalizePurchaseItemRequestPriceRow(r);
        const id = String(row.request_item_id ?? "").trim();
        const price = toNum(row.price);
        if (!id || !(price > 0)) continue;
        const w = Math.max(1, toNum(row.qty));
        const prev = agg.get(id) ?? { sum: 0, w: 0 };
        prev.sum += price * w;
        prev.w += w;
        agg.set(id, prev);
      }
      for (const [id, v] of agg.entries()) {
        if (v.w > 0) out.set(id, v.sum / v.w);
      }
    } catch { }
  }

  return out;
}

async function fetchFactRowsForDiscipline(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<{ rows: DirectorFactRow[]; source: DisciplineRowsSource }> {
  const objectName = p.objectName ?? null;
  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchDirectorFactViaAccRpc({ from: p.from, to: p.to, objectName });
    if (rows.length) return { rows, source: "acc_rpc" };
  } catch { }
  if (!rows.length) {
    if (canUseDisciplineSourceRpc()) {
      try {
        const allRows = await fetchDirectorDisciplineSourceRowsViaRpc({ from: p.from, to: p.to });
        markDisciplineSourceRpcStatus("available");
        const filteredRows = p.objectName == null ? allRows : filterDisciplineRowsByObject(allRows, p.objectName);
        return { rows: filteredRows, source: "source_rpc" };
      } catch (e: unknown) {
        if (isMissingCanonicalRpcError(e, "director_report_fetch_discipline_source_rows_v1")) {
          markDisciplineSourceRpcStatus("missing");
        } else {
          markDisciplineSourceRpcStatus("failed");
        }
      }
    }
  }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: p.from, to: p.to, objectName });
      if (rows.length) return { rows, source: "view" };
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchDisciplineFactRowsFromTables({ from: p.from, to: p.to, objectName });
      if (rows.length) return { rows, source: "tables" };
    } catch { }
  }
  return { rows: [], source: "none" };
}

export {
  fetchAllFactRowsFromTables,
  fetchAllFactRowsFromView,
  fetchDirectorDisciplineSourceRowsViaRpc,
  fetchDirectorFactViaAccRpc,
  fetchDirectorReportCanonicalMaterials,
  fetchDirectorReportCanonicalOptions,
  fetchDirectorReportCanonicalWorks,
  fetchDisciplineFactRowsFromTables,
  fetchFactRowsForDiscipline,
  fetchIssuePriceMapByCode,
  fetchPriceByRequestItemId,
  fetchViaLegacyRpc,
};
