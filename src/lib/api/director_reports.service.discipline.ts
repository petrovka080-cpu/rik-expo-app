import type { DirectorDisciplinePayload } from "./director_reports.shared";
import { rpcDate, toNum } from "./director_reports.shared";
import {
  DIVERGENCE_LOG_TTL_MS,
  DISCIPLINE_ROWS_CACHE_TTL_MS,
  REPORTS_TIMING,
  buildDisciplineRowsCacheKey,
  canUseCanonicalRpc,
  canonicalKey,
  disciplineRowsCache,
  filterDisciplineRowsByObject,
  isMissingCanonicalRpcError,
  legacyWorksSnapshotCache,
  logTiming,
  markCanonicalRpcStatus,
  maybeLogDivergence,
  nowMs,
  trimMap,
} from "./director_reports.cache";
import { enrichFactRowsLevelNames, enrichFactRowsMaterialNames } from "./director_reports.naming";
import {
  fetchDirectorReportCanonicalWorks,
  fetchFactRowsForDiscipline,
  fetchIssuePriceMapByCode,
  fetchPriceByRequestItemId,
} from "./director_reports.transport";
import {
  buildDisciplinePayloadFromFactRows,
  collectDisciplinePriceInputs,
  pct,
  worksSnapshotFromPayload,
} from "./director_reports.payloads";
import { hasCanonicalWorksDetailLevels } from "./director_reports.fallbacks";
import {
  branchFromDisciplineSource,
  mapDisciplineChain,
  recordDirectorReportsServiceWarning,
  summarizeDisciplinePayload,
  trackedResult,
  type DirectorReportFetchBranch,
  type DirectorReportTrackedResult,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportDisciplineTracked(
  p: {
    from: string;
    to: string;
    objectName: string | null;
    objectIdByName: Record<string, string | null>;
  },
  opts?: { skipPrices?: boolean },
): Promise<DirectorReportTrackedResult<DirectorDisciplinePayload>> {
  const tTotal = nowMs();
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const cKey = canonicalKey("works", pFrom, pTo, p.objectName ?? null);
  const pricedStage = opts?.skipPrices ? "base" : "priced";
  const chain: DirectorReportFetchBranch[] = [];

  if (canUseCanonicalRpc("works")) {
    const tCanonical = nowMs();
    chain.push("canonical_rpc");
    try {
      let canonical = await fetchDirectorReportCanonicalWorks({
        from: pFrom,
        to: pTo,
        objectName: p.objectName ?? null,
        includeCosts: !opts?.skipPrices,
      });
      if (canonical) {
        const hasDetailLevels = hasCanonicalWorksDetailLevels(canonical);
        if (REPORTS_TIMING && !hasDetailLevels) {
          console.info("[director_reports] discipline.canonical_works.rejected_without_semantic_drilldown");
        }
        if (!hasDetailLevels) canonical = null;
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
        return trackedResult(canonical, {
          stage: "discipline",
          branch: "canonical_rpc",
          chain: [...chain],
          cacheLayer: "none",
          pricedStage,
        });
      }
    } catch (error: unknown) {
      if (isMissingCanonicalRpcError(error, "director_report_fetch_works_v1")) {
        markCanonicalRpcStatus("works", "missing");
      } else {
        markCanonicalRpcStatus("works", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.canonical_works.failed: ${(error as Error)?.message ?? error}`);
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
  let cacheLayer: "none" | "rows" | "rows_slice" = "none";
  let rowsResult: Awaited<ReturnType<typeof fetchFactRowsForDiscipline>> | null = null;
  const cachedRows = disciplineRowsCache.get(rowsKey);
  if (cachedRows && Date.now() - cachedRows.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
    rowsResult = {
      rows: cachedRows.rows,
      source: cachedRows.source,
      chain: cachedRows.chain ?? [cachedRows.source],
    };
    cacheLayer = "rows";
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
      rowsResult = {
        rows: slicedRows,
        source: baseCachedRows.source,
        chain: baseCachedRows.chain ?? [baseCachedRows.source],
      };
      cacheLayer = "rows_slice";
      disciplineRowsCache.set(rowsKey, {
        ts: Date.now(),
        rows: slicedRows,
        source: baseCachedRows.source,
        chain: baseCachedRows.chain ?? [baseCachedRows.source],
      });
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
      skipMaterialNameResolve: !!opts?.skipPrices,
    });
    disciplineRowsCache.set(rowsKey, {
      ts: Date.now(),
      rows: rowsResult.rows,
      source: rowsResult.source,
      chain: rowsResult.chain,
    });
    trimMap(disciplineRowsCache);
  }

  let rows = rowsResult.rows;
  logTiming("discipline.fetch_rows", tRows);
  if (REPORTS_TIMING) {
    console.info(`[director_reports] discipline.rows_source: ${rowsResult.source} rows=${rows.length}`);
  }

  try {
    if (!opts?.skipPrices && rowsResult.source !== "tables") {
      const tNames = nowMs();
      rows = await enrichFactRowsMaterialNames(rows);
      logTiming("discipline.enrich_material_names", tNames);
    } else if (REPORTS_TIMING) {
      console.info(
        `[director_reports] discipline.enrich_material_names: skipped_${opts?.skipPrices ? "in_first_stage" : "for_tables_source"}`,
      );
    }
  } catch (error) {
    recordDirectorReportsServiceWarning("discipline_enrich_material_names_failed", error, {
      rowCount: rows.length,
      rowsSource: rowsResult.source,
      skipPrices: !!opts?.skipPrices,
    });
  }

  try {
    if (!opts?.skipPrices) {
      const tLevels = nowMs();
      rows = await enrichFactRowsLevelNames(rows);
      logTiming("discipline.enrich_level_names", tLevels);
    } else if (REPORTS_TIMING) {
      console.info("[director_reports] discipline.enrich_level_names: skipped_in_first_stage");
    }
  } catch (error) {
    recordDirectorReportsServiceWarning("discipline_enrich_level_names_failed", error, {
      rowCount: rows.length,
      rowsSource: rowsResult.source,
      skipPrices: !!opts?.skipPrices,
    });
  }

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
    if (REPORTS_TIMING) {
      const summary = summarizeDisciplinePayload(payload);
      console.info(
        `[director_reports] discipline.base_ready: works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
      );
    }
    logTiming("discipline.total", tTotal);
    return trackedResult(payload, {
      stage: "discipline",
      branch: branchFromDisciplineSource(rowsResult.source),
      chain: [...chain, ...mapDisciplineChain(rowsResult.chain)],
      cacheLayer,
      rowsSource: rowsResult.source,
      pricedStage,
    });
  }

  const { requestItemIds, rowCodes, costInputs } = collectDisciplinePriceInputs(rows);
  const tPrices = nowMs();
  const [priceByCode, priceByRequestItem] = await Promise.all([
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

  if (REPORTS_TIMING) {
    const summary = summarizeDisciplinePayload(payload);
    console.info(
      `[director_reports] discipline.priced_ready: works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
    );
  }
  logTiming("discipline.total", tTotal);
  return trackedResult(payload, {
    stage: "discipline",
    branch: branchFromDisciplineSource(rowsResult.source),
    chain: [...chain, ...mapDisciplineChain(rowsResult.chain)],
    cacheLayer,
    rowsSource: rowsResult.source,
    pricedStage,
  });
}

export async function fetchDirectorWarehouseReportDiscipline(
  p: {
    from: string;
    to: string;
    objectName: string | null;
    objectIdByName: Record<string, string | null>;
  },
  opts?: { skipPrices?: boolean },
): Promise<DirectorDisciplinePayload> {
  const { payload } = await fetchDirectorWarehouseReportDisciplineTracked(p, opts);
  return payload;
}
