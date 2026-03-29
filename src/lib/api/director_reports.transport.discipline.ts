import { supabase } from "../supabaseClient";
import type {
  DirectorDisciplineSourceRpcRow,
  DirectorFactRow,
  JoinedWarehouseIssueItemFactRow,
  RefSystemLookupRow,
  RequestItemRequestLinkRow,
  RequestLookupRow,
  WarehouseIssueFactRow,
  WarehouseIssueItemFactRow,
  DisciplineRowsSource,
} from "./director_reports.shared";
import {
  extractJoinedWarehouseIssueFactRow,
  firstNonEmpty,
  forEachChunkParallel,
  matchesDirectorObjectIdentity,
  normalizeDirectorDisciplineSourceRpcRow,
  normalizeDirectorFactRow,
  normalizeJoinedWarehouseIssueItemFactRow,
  normalizeRefSystemLookupRow,
  normalizeRequestItemRequestLinkRow,
  normalizeWarehouseIssueFactRow,
  normalizeWarehouseIssueItemFactRow,
  resolveDirectorFactContext,
  toRangeEnd,
  toRangeStart,
} from "./director_reports.shared";
import {
  DISCIPLINE_ROWS_CACHE_TTL_MS,
  REPORTS_TIMING,
  buildDisciplineSourceRowsRpcCacheKey,
  canUseDisciplineSourceRpc,
  disciplineSourceRowsRpcCache,
  filterDisciplineRowsByObject,
  isMissingCanonicalRpcError,
  logTiming,
  markDisciplineSourceRpcStatus,
  nowMs,
  trimMap,
} from "./director_reports.cache";
import {
  fetchRikNamesRuByCode,
  probeNameSources,
} from "./director_reports.naming";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";
import {
  fetchRequestsDisciplineRowsSafe,
  fetchRequestsRowsSafe,
  runTypedRpc,
} from "./director_reports.transport.base";
import {
  fetchAllFactRowsFromView,
  fetchDirectorFactViaAccRpc,
} from "./director_reports.transport.facts";
import { loadDirectorRequestContextLookups } from "./director_reports.transport.lookups";

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

async function resolveMaterialNamesByCode(
  codes: string[],
  opts?: { skip?: boolean },
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (opts?.skip || !codes.length) return out;

  try {
    const probe = await probeNameSources();
    if (!probe.vrr) return out;

    const resolved = await fetchRikNamesRuByCode(codes);
    for (const [code, name] of resolved.entries()) {
      if (code && name && !out.has(code)) out.set(code, name);
    }
  } catch (error: unknown) {
    recordDirectorReportsTransportWarning("discipline_rows_tables_name_resolve_failed", error, {
      codeCount: codes.length,
    });
  }

  return out;
}

async function fetchAllFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
  skipMaterialNameResolve?: boolean;
}): Promise<DirectorFactRow[]> {
  const tTotal = nowMs();
  const issuesById = new Map<string, WarehouseIssueFactRow>();
  const pageSize = 2500;
  let fromIdx = 0;

  while (true) {
    let query = supabase
      .from("warehouse_issues" as never)
      .select("id,iss_date,object_name,work_name,request_id,status,note,target_object_id")
      .eq("status", "Подтверждено");

    if (p.from) query = query.gte("iss_date", toRangeStart(p.from));
    if (p.to) query = query.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) query = query.eq("object_name", p.objectName);

    query = query
      .order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeWarehouseIssueFactRow).filter((row): row is WarehouseIssueFactRow => !!row)
      : [];
    for (const row of rows) issuesById.set(row.id, row);

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }
  logTiming("discipline.rows.tables.issues_scan", tTotal);

  if (!issuesById.size) return [];

  const issueIds = Array.from(issuesById.keys()).filter((id) => id !== "");
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

  const codes = Array.from(
    new Set(
      issueItems
        .map((item) => String(item?.rik_code ?? "").trim().toUpperCase())
        .filter((code) => code !== ""),
    ),
  );
  const tNames = nowMs();
  const nameRuByCodePromise = resolveMaterialNamesByCode(codes, {
    skip: !!p.skipMaterialNameResolve,
  });

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .map((item) => String(item?.request_item_id ?? "").trim())
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
      for (const row of rows) {
        const id = row.id;
        const reqId = String(row.request_id ?? "").trim();
        if (id && reqId) requestIdByRequestItem.set(id, reqId);
      }
    });
    logTiming("discipline.rows.tables.request_items", tReqItems);
  }

  const requestIds = Array.from(
    new Set(
      [
        ...issueItems.map((item) => {
          const requestItemId = String(item?.request_item_id ?? "").trim();
          return requestItemId ? requestIdByRequestItem.get(requestItemId) ?? "" : "";
        }),
        ...Array.from(issuesById.values()).map((issue) => String(issue?.request_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, RequestLookupRow>();
  if (requestIds.length) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsRowsSafe(ids);
      for (const row of rows) {
        const id = String(row?.id ?? "").trim();
        if (id) requestById.set(id, row);
      }
    });
    logTiming("discipline.rows.tables.requests", tReq);
  }

  const tLookups = nowMs();
  const [
    {
      objectNameById,
      objectTypeNameByCode,
      systemNameByCode,
    },
    nameRuByCode,
  ] = await Promise.all([
    loadDirectorRequestContextLookups({
      requests: requestById.values(),
      extraObjectIds: Array.from(issuesById.values()).map((issue) => issue.target_object_id),
    }),
    nameRuByCodePromise,
  ]);
  logTiming("discipline.rows.tables.request_context_lookups", tLookups);
  logTiming("discipline.rows.tables.name_resolve", tNames);

  const out: DirectorFactRow[] = [];
  for (const item of issueItems) {
    const issueId = String(item?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(item?.request_item_id ?? "").trim();
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
      issue_item_id: item?.id ?? null,
      iss_date: String(issue?.iss_date ?? ""),
      context,
      material_name: nameRuByCode.get(String(item?.rik_code ?? "").trim().toUpperCase()) ?? String(item?.rik_code ?? ""),
      rik_code: item?.rik_code,
      uom: item?.uom_id,
      qty: item?.qty,
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
  skipMaterialNameResolve?: boolean;
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
        let query = supabase
          .from("warehouse_issue_items" as never)
          .select("id,issue_id,rik_code,uom_id,qty,request_item_id,warehouse_issues!inner(id,iss_date,object_name,work_name,status,note)")
          .eq("warehouse_issues.status", "Подтверждено");
        if (p.from) query = query.gte("warehouse_issues.iss_date", toRangeStart(p.from));
        if (p.to) query = query.lte("warehouse_issues.iss_date", toRangeEnd(p.to));
        if (p.objectName != null) query = query.eq("warehouse_issues.object_name", p.objectName);
        query = query.order("issue_id", { ascending: false }).range(fromIdx, fromIdx + pageSize - 1);

        const { data, error } = await query;
        if (error) throw error;
        const rows = Array.isArray(data)
          ? data
              .map(normalizeJoinedWarehouseIssueItemFactRow)
              .filter((row): row is JoinedWarehouseIssueItemFactRow => !!row)
          : [];
        if (!rows.length) break;
        totalIssueItems += rows.length;
        const seenIssueItemIds = new Set<string>();

        for (const item of rows) {
          const issueItemId = String(item.id ?? "").trim();
          if (issueItemId) {
            if (seenIssueItemIds.has(issueItemId)) continue;
            seenIssueItemIds.add(issueItemId);
          }
          const issue = extractJoinedWarehouseIssueFactRow(item);
          if (!issue) continue;
          const issueId = String(item.issue_id ?? issue.id ?? "").trim();
          const requestItemId = String(item.request_item_id ?? "").trim() || null;
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
            material_name: item.rik_code == null ? null : String(item.rik_code),
            rik_code: item.rik_code,
            uom: item.uom_id,
            qty: item.qty,
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
    } catch (error: unknown) {
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.rows.light.joined.failed: ${(error as Error)?.message ?? error}`);
      }
      recordDirectorReportsTransportWarning("discipline_rows_joined_failed", error, {
        from: p.from,
        to: p.to,
        objectName: p.objectName,
      });
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
    let query = supabase
      .from("warehouse_issues" as never)
      .select("id,iss_date,object_name,work_name,request_id,status,note")
      .eq("status", "Подтверждено");

    if (p.from) query = query.gte("iss_date", toRangeStart(p.from));
    if (p.to) query = query.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) query = query.eq("object_name", p.objectName);

    query = query
      .order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;

    const rows = Array.isArray(data)
      ? data.map(normalizeWarehouseIssueFactRow).filter((row): row is WarehouseIssueFactRow => !!row)
      : [];
    for (const row of rows) issuesById.set(row.id, row);

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
    const workName = String(issue?.work_name ?? "").trim();
    if (!workName) issuesMissingWork.add(id);
  }

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .filter((item) => {
          const issueId = String(item.issue_id ?? "").trim();
          const issue = issuesById.get(issueId);
          if (!issue) return false;
          const issueReqId = String(issue?.request_id ?? "").trim();
          return !issueReqId && issuesMissingWork.has(issueId);
        })
        .map((item) => String(item?.request_item_id ?? "").trim())
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
      for (const row of rows) {
        const id = row.id;
        const reqId = String(row.request_id ?? "").trim();
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
          .map(([, issue]) => String(issue?.request_id ?? "").trim()),
        ...Array.from(requestIdByRequestItem.values())
          .map((requestId) => String(requestId ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, RequestLookupRow>();
  if (requestIds.length) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsDisciplineRowsSafe(ids);
      for (const row of rows) {
        const id = String(row?.id ?? "").trim();
        if (id) requestById.set(id, row);
      }
    });
    logTiming("discipline.rows.light.requests", tReq);
    if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: requests=${requestIds.length}`);
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((request) => String(request?.system_code ?? "").trim())
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
      for (const row of rows) {
        const code = row.code;
        const name =
          String(row.name_human_ru ?? "").trim() ||
          String(row.display_name ?? "").trim() ||
          String(row.alias_ru ?? "").trim() ||
          String(row.name ?? "").trim();
        if (code && name) systemNameByCode.set(code, name);
      }
    });
    logTiming("discipline.rows.light.systems", tSystems);
  }

  const out: DirectorFactRow[] = [];
  const seenIssueItemIds = new Set<string>();
  const tBuild = nowMs();
  for (const item of issueItems) {
    const issueItemId = String(item.id ?? "").trim();
    if (issueItemId) {
      if (seenIssueItemIds.has(issueItemId)) continue;
      seenIssueItemIds.add(issueItemId);
    }
    const issueId = String(item?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(item?.request_item_id ?? "").trim();
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
      material_name: item?.rik_code == null ? null : String(item.rik_code),
      rik_code: item?.rik_code,
      uom: item?.uom_id,
      qty: item?.qty,
    });
    if (row) out.push(row);
  }
  logTiming("discipline.rows.light.build", tBuild);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: final_rows=${out.length}`);
  logTiming("discipline.rows.light.total", tTotal);
  return out;
}

async function fetchFactRowsForDiscipline(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
  skipMaterialNameResolve?: boolean;
}): Promise<{ rows: DirectorFactRow[]; source: DisciplineRowsSource; chain: DisciplineRowsSource[] }> {
  const objectName = p.objectName ?? null;
  const chain: DisciplineRowsSource[] = [];
  let rows: DirectorFactRow[] = [];
  try {
    chain.push("acc_rpc");
    rows = await fetchDirectorFactViaAccRpc({ from: p.from, to: p.to, objectName });
    if (rows.length) return { rows, source: "acc_rpc", chain };
  } catch (error) {
    recordDirectorReportsTransportWarning("discipline_rows_acc_rpc_failed", error, {
      chain: [...chain],
      from: p.from,
      to: p.to,
      objectName,
    });
  }
  if (!rows.length && canUseDisciplineSourceRpc()) {
    try {
      chain.push("source_rpc");
      const allRows = await fetchDirectorDisciplineSourceRowsViaRpc({ from: p.from, to: p.to });
      markDisciplineSourceRpcStatus("available");
      const filteredRows = p.objectName == null ? allRows : filterDisciplineRowsByObject(allRows, p.objectName);
      return { rows: filteredRows, source: "source_rpc", chain };
    } catch (error: unknown) {
      if (isMissingCanonicalRpcError(error, "director_report_fetch_discipline_source_rows_v1")) {
        markDisciplineSourceRpcStatus("missing");
      } else {
        markDisciplineSourceRpcStatus("failed");
      }
    }
  }
  if (!rows.length) {
    try {
      chain.push("view");
      rows = await fetchAllFactRowsFromView({ from: p.from, to: p.to, objectName });
      if (rows.length) return { rows, source: "view", chain };
    } catch (error) {
      recordDirectorReportsTransportWarning("discipline_rows_view_failed", error, {
        chain: [...chain],
        from: p.from,
        to: p.to,
        objectName,
      });
    }
  }
  if (!rows.length) {
    try {
      chain.push("tables");
      rows = await fetchDisciplineFactRowsFromTables({
        from: p.from,
        to: p.to,
        objectName,
        skipMaterialNameResolve: p.skipMaterialNameResolve,
      });
      if (rows.length) return { rows, source: "tables", chain };
    } catch (error) {
      recordDirectorReportsTransportWarning("discipline_rows_tables_failed", error, {
        chain: [...chain],
        from: p.from,
        to: p.to,
        objectName,
        skipMaterialNameResolve: !!p.skipMaterialNameResolve,
      });
    }
  }
  return { rows: [], source: "none", chain };
}

export {
  fetchAllFactRowsFromTables,
  fetchDirectorDisciplineSourceRowsViaRpc,
  fetchDisciplineFactRowsFromTables,
  fetchFactRowsForDiscipline,
};
