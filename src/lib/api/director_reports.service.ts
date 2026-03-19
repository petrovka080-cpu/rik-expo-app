import type {
  DirectorDisciplinePayload,
  DirectorFactRow,
  DirectorReportOptions,
  DirectorReportPayload,
  DisciplineRowsSource,
} from "./director_reports.shared";
import {
  buildDirectorReportOptionsFromIdentities,
  getDirectorFactObjectIdentity,
  resolveDirectorObjectIdentity,
  rpcDate,
  toNum,
} from "./director_reports.shared";
import {
  DIVERGENCE_LOG_TTL_MS,
  DISCIPLINE_ROWS_CACHE_TTL_MS,
  REPORTS_TIMING,
  buildDisciplineRowsCacheKey,
  canUseCanonicalRpc,
  canUseDisciplineSourceRpc,
  canUseOptionsRpc,
  canonicalKey,
  disciplineRowsCache,
  filterDisciplineRowsByObject,
  isMissingCanonicalRpcError,
  legacyMaterialsSnapshotCache,
  legacyWorksSnapshotCache,
  logTiming,
  markCanonicalRpcStatus,
  markDisciplineSourceRpcStatus,
  markOptionsRpcStatus,
  maybeLogDivergence,
  nowMs,
  trimMap,
} from "./director_reports.cache";
import { enrichFactRowsLevelNames, enrichFactRowsMaterialNames } from "./director_reports.naming";
import {
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
} from "./director_reports.transport";
import {
  buildDisciplinePayloadFromFactRows,
  buildPayloadFromFactRows,
  collectDisciplinePriceInputs,
  materialSnapshotFromPayload,
  pct,
  worksSnapshotFromPayload,
} from "./director_reports.payloads";
import {
  hasCanonicalWorksDetailLevels,
  shouldRejectAllObjectsEmptyMaterialsPayload,
} from "./director_reports.fallbacks";

export async function fetchDirectorWarehouseReportOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");

  if (canUseOptionsRpc()) {
    const t0 = nowMs();
    try {
      const options = await fetchDirectorReportCanonicalOptions({
        from: pFrom,
        to: pTo,
      });
      if (options) {
        markOptionsRpcStatus("available");
        logTiming("options.rpc", t0);
        return options;
      }
      throw new Error("options.rpc_empty_payload");
    } catch (e: unknown) {
      if (isMissingCanonicalRpcError(e, "director_report_fetch_options_v1")) {
        markOptionsRpcStatus("missing");
      } else {
        markOptionsRpcStatus("failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] options.rpc.failed: ${(e as Error)?.message ?? e}`);
      }
    }
    logTiming("options.rpc_fallback", t0);
  }

  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName: null });
  } catch { }
  if (!rows.length) {
    try {
      rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    return { objects: [], objectIdByName: {} };
  }

  return buildDirectorReportOptionsFromIdentities(rows.map((r) => getDirectorFactObjectIdentity(r)));
}

export async function fetchDirectorWarehouseReport(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportPayload> {
  const objectName = p.objectName ?? null;
  const objectIdentity =
    objectName == null ? null : resolveDirectorObjectIdentity({ object_name_display: objectName });
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const selectedObjectId =
    objectIdentity == null ? null : (p.objectIdByName[objectIdentity.object_name_canonical] ?? null);
  const cKey = canonicalKey("materials", pFrom, pTo, objectName);

  if (canUseCanonicalRpc("materials")) {
    const tCanonical = nowMs();
    try {
      let canonical = await fetchDirectorReportCanonicalMaterials({
        from: pFrom,
        to: pTo,
        objectName,
      });
      if (shouldRejectAllObjectsEmptyMaterialsPayload(canonical, objectName, p.objectIdByName)) {
        canonical = null;
        logTiming("report.canonical_materials_rejected_empty_all_objects", tCanonical);
      }
      if (canonical) {
        markCanonicalRpcStatus("materials", "available");
        const legacySnap = legacyMaterialsSnapshotCache.get(cKey);
        if (legacySnap && Date.now() - legacySnap.ts <= DIVERGENCE_LOG_TTL_MS) {
          const canSnap = materialSnapshotFromPayload(canonical);
          const mismatch =
            canSnap.rows_count !== legacySnap.rows_count ||
            canSnap.kpi.items_total !== legacySnap.kpi.items_total ||
            canSnap.kpi.items_without_request !== legacySnap.kpi.items_without_request;
          if (mismatch) {
            maybeLogDivergence(cKey, {
              mode: "materials",
              canonical: canSnap,
              legacy: legacySnap,
            });
          }
        }
        logTiming("report.canonical_materials", tCanonical);
        return canonical;
      }
    } catch (e: unknown) {
      if (isMissingCanonicalRpcError(e, "director_report_fetch_materials_v1")) {
        markCanonicalRpcStatus("materials", "missing");
      } else {
        markCanonicalRpcStatus("materials", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] report.canonical_materials.failed: ${(e as Error)?.message ?? e}`);
      }
    }
    logTiming("report.canonical_materials_fallback", tCanonical);
  }

  // Production-first path: try optimized RPC first.
  // For object filter we need a real object_id; if absent, preserve old behavior and use detailed paths.
  if (objectName == null || selectedObjectId != null) {
    const t0 = nowMs();
    try {
      const fast = await fetchViaLegacyRpc({
        from: pFrom,
        to: pTo,
        objectId: selectedObjectId,
        objectName,
      });
      if (shouldRejectAllObjectsEmptyMaterialsPayload(fast, objectName, p.objectIdByName)) {
        logTiming("report.fast_rpc_rejected_empty_all_objects", t0);
        throw new Error("all-objects materials payload empty for non-empty scope");
      }
      legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(fast) });
      trimMap(legacyMaterialsSnapshotCache);
      logTiming("report.fast_rpc", t0);
      return fast;
    } catch {
      logTiming("report.fast_rpc_failed_fallback", t0);
    }
  }

  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName });
  } catch { }
  if (!rows.length) {
    if (canUseDisciplineSourceRpc()) {
      const tSource = nowMs();
      try {
        const allRows = await fetchDirectorDisciplineSourceRowsViaRpc({ from: pFrom, to: pTo });
        markDisciplineSourceRpcStatus("available");
        rows = objectName == null ? allRows : filterDisciplineRowsByObject(allRows, objectName);
        logTiming("report.source_rpc", tSource);
      } catch (e: unknown) {
        if (isMissingCanonicalRpcError(e, "director_report_fetch_discipline_source_rows_v1")) {
          markDisciplineSourceRpcStatus("missing");
        } else {
          markDisciplineSourceRpcStatus("failed");
        }
        logTiming("report.source_rpc_failed_fallback", tSource);
      }
    }
  }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName });
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchDisciplineFactRowsFromTables({ from: pFrom, to: pTo, objectName });
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName });
    } catch { }
  }

  if (rows.length) {
    try {
      rows = await enrichFactRowsMaterialNames(rows);
    } catch { }
    try {
      rows = await enrichFactRowsLevelNames(rows);
    } catch { }
    const payload = buildPayloadFromFactRows({
      from: pFrom,
      to: pTo,
      objectName,
      rows,
    });
    payload.discipline = buildDisciplinePayloadFromFactRows(rows);
    legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(payload) });
    trimMap(legacyMaterialsSnapshotCache);
    return payload;
  }

  const fallback = await fetchViaLegacyRpc({
    from: pFrom,
    to: pTo,
    objectId: selectedObjectId,
    objectName,
  });
  legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(fallback) });
  trimMap(legacyMaterialsSnapshotCache);
  return fallback;
}

export async function fetchDirectorWarehouseReportDiscipline(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}, opts?: { skipPrices?: boolean }): Promise<DirectorDisciplinePayload> {
  const tTotal = nowMs();
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const cKey = canonicalKey("works", pFrom, pTo, p.objectName ?? null);

  if (canUseCanonicalRpc("works")) {
    const tCanonical = nowMs();
    try {
      let canonical = await fetchDirectorReportCanonicalWorks({
        from: pFrom,
        to: pTo,
        objectName: p.objectName ?? null,
        includeCosts: !opts?.skipPrices,
      });
      if (canonical) {
        const hasDetailLevels = hasCanonicalWorksDetailLevels(canonical);
        if (REPORTS_TIMING) {
          if (!hasDetailLevels) {
            console.info("[director_reports] discipline.canonical_works.rejected_without_semantic_drilldown");
          }
        }
        if (!hasDetailLevels) {
          canonical = null;
        }
      }
      if (canonical) {
        markCanonicalRpcStatus("works", "available");
        const legacySnap = legacyWorksSnapshotCache.get(cKey);
        if (legacySnap && Date.now() - legacySnap.ts <= DIVERGENCE_LOG_TTL_MS) {
          const canSnap = worksSnapshotFromPayload(canonical);
          const mismatch =
            canSnap.summary.total_positions !== legacySnap.summary.total_positions ||
            canSnap.summary.req_positions !== legacySnap.summary.req_positions ||
            canSnap.summary.free_positions !== legacySnap.summary.free_positions ||
            canSnap.summary.issue_cost_total !== legacySnap.summary.issue_cost_total ||
            canSnap.summary.purchase_cost_total !== legacySnap.summary.purchase_cost_total ||
            canSnap.works_count !== legacySnap.works_count;
          if (mismatch) {
            maybeLogDivergence(cKey, {
              mode: "works",
              canonical: canSnap,
              legacy: legacySnap,
            });
          }
        }
        logTiming("discipline.canonical_works", tCanonical);
        return canonical;
      }
    } catch (e: unknown) {
      if (isMissingCanonicalRpcError(e, "director_report_fetch_works_v1")) {
        markCanonicalRpcStatus("works", "missing");
      } else {
        markCanonicalRpcStatus("works", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.canonical_works.failed: ${(e as Error)?.message ?? e}`);
      }
    }
    logTiming("discipline.canonical_works_fallback", tCanonical);
  }

  const rowsKey = buildDisciplineRowsCacheKey({
    from: pFrom,
    to: pTo,
    objectName: p.objectName ?? null,
    objectIdByName: p.objectIdByName ?? {},
  });
  let rowsResult: { rows: DirectorFactRow[]; source: DisciplineRowsSource } | null = null;
  const cachedRows = disciplineRowsCache.get(rowsKey);
  if (cachedRows && Date.now() - cachedRows.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
    rowsResult = { rows: cachedRows.rows, source: cachedRows.source };
  } else if (cachedRows) {
    disciplineRowsCache.delete(rowsKey);
  }
  if (!rowsResult && p.objectName != null) {
    const baseRowsKey = buildDisciplineRowsCacheKey({
      from: pFrom,
      to: pTo,
      objectName: null,
      objectIdByName: p.objectIdByName ?? {},
    });
    const baseCachedRows = disciplineRowsCache.get(baseRowsKey);
    if (baseCachedRows && Date.now() - baseCachedRows.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
      const slicedRows = filterDisciplineRowsByObject(baseCachedRows.rows, p.objectName);
      rowsResult = { rows: slicedRows, source: baseCachedRows.source };
      disciplineRowsCache.set(rowsKey, { ts: Date.now(), rows: slicedRows, source: baseCachedRows.source });
      trimMap(disciplineRowsCache);
      if (REPORTS_TIMING) {
        console.info(
          `[director_reports] discipline.rows.cache_slice: object=${String(p.objectName)} rows=${slicedRows.length}`,
        );
      }
    }
  }
  const tRows = nowMs();
  if (!rowsResult) {
    rowsResult = await fetchFactRowsForDiscipline({
      from: pFrom,
      to: pTo,
      objectName: p.objectName ?? null,
      objectIdByName: p.objectIdByName ?? {},
    });
    disciplineRowsCache.set(rowsKey, { ts: Date.now(), rows: rowsResult.rows, source: rowsResult.source });
    trimMap(disciplineRowsCache);
  }
  let rows = rowsResult.rows;
  logTiming("discipline.fetch_rows", tRows);
  if (REPORTS_TIMING) {
    console.info(`[director_reports] discipline.rows_source: ${rowsResult.source} rows=${rows.length}`);
  }
  try {
    // Table path already resolves names by code during row materialization.
    // Skip expensive cross-source enrichment here to keep works first paint fast.
    if (rowsResult.source !== "tables") {
      const tNames = nowMs();
      rows = await enrichFactRowsMaterialNames(rows);
      logTiming("discipline.enrich_material_names", tNames);
    } else if (REPORTS_TIMING) {
      console.info("[director_reports] discipline.enrich_material_names: skipped_for_tables_source");
    }
  } catch { }
  try {
    if (!opts?.skipPrices) {
      const tLevels = nowMs();
      rows = await enrichFactRowsLevelNames(rows);
      logTiming("discipline.enrich_level_names", tLevels);
    } else if (REPORTS_TIMING) {
      console.info("[director_reports] discipline.enrich_level_names: skipped_in_first_stage");
    }
  } catch { }

  if (opts?.skipPrices) {
    const payload = buildDisciplinePayloadFromFactRows(rows, {
      issue_cost_total: 0,
      purchase_cost_total: 0,
      issue_to_purchase_pct: 0,
      unpriced_issue_pct: 0,
      price_by_code: new Map(),
      price_by_request_item: new Map(),
    });
    legacyWorksSnapshotCache.set(cKey, { ts: Date.now(), ...worksSnapshotFromPayload(payload) });
    trimMap(legacyWorksSnapshotCache);
    logTiming("discipline.total", tTotal);
    return payload;
  }

  const { requestItemIds, rowCodes, costInputs } = collectDisciplinePriceInputs(rows);

  const tPrices = nowMs();
  const [priceByCode, priceByRequestItem] = await Promise.all([
    // Works mode should not depend on purchase/ledger sources for first paint.
    // Use proposal-based prices only here to avoid invalid material-only requests.
    fetchIssuePriceMapByCode({ skipPurchaseItems: true, codes: rowCodes }),
    fetchPriceByRequestItemId(requestItemIds),
  ]);
  logTiming("discipline.fetch_prices", tPrices);

  const tCost = nowMs();
  let issueCostTotal = 0;
  let issuePositions = 0;
  let unpricedIssuePositions = 0;
  for (const row of costInputs) {
    issuePositions += 1;
    const price = row.requestItemId
      ? toNum(priceByRequestItem.get(row.requestItemId) ?? priceByCode.get(row.code) ?? 0)
      : toNum(priceByCode.get(row.code) ?? 0);
    if (price > 0) issueCostTotal += row.qty * price;
    else unpricedIssuePositions += 1;
  }
  logTiming("discipline.compute_cost", tCost);

  // Keep purchase-cost branch out of works first-load path.
  // In installations where purchase/ledger views are unavailable this avoids 400s
  // without changing core discipline metrics (positions/req/free breakdown).
  const purchaseCostTotal = 0;

  const issueToPurchasePct = pct(issueCostTotal, purchaseCostTotal);
  const unpricedIssuePct = pct(unpricedIssuePositions, issuePositions);

  const payload = buildDisciplinePayloadFromFactRows(rows, {
    issue_cost_total: issueCostTotal,
    purchase_cost_total: purchaseCostTotal,
    issue_to_purchase_pct: issueToPurchasePct,
    unpriced_issue_pct: unpricedIssuePct,
    price_by_code: priceByCode,
    price_by_request_item: priceByRequestItem,
  });
  legacyWorksSnapshotCache.set(cKey, { ts: Date.now(), ...worksSnapshotFromPayload(payload) });
  trimMap(legacyWorksSnapshotCache);
  logTiming("discipline.total", tTotal);
  return payload;
}
