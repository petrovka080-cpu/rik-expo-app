import type {
  DirectorFactRow,
  DirectorReportPayload,
} from "./director_reports.shared";
import {
  resolveDirectorObjectIdentity,
  rpcDate,
} from "./director_reports.shared";
import {
  DIVERGENCE_LOG_TTL_MS,
  REPORTS_TIMING,
  canUseCanonicalRpc,
  canUseDisciplineSourceRpc,
  canonicalKey,
  filterDisciplineRowsByObject,
  isMissingCanonicalRpcError,
  legacyMaterialsSnapshotCache,
  logTiming,
  markCanonicalRpcStatus,
  markDisciplineSourceRpcStatus,
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
  fetchDisciplineFactRowsFromTables,
  fetchViaLegacyRpc,
} from "./director_reports.transport";
import {
  buildDisciplinePayloadFromFactRows,
  buildPayloadFromFactRows,
  materialSnapshotFromPayload,
} from "./director_reports.payloads";
import { shouldRejectAllObjectsEmptyMaterialsPayload } from "./director_reports.fallbacks";
import {
  recordDirectorReportsServiceWarning,
  trackedResult,
  type DirectorReportFetchBranch,
  type DirectorReportTrackedResult,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportTracked(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportTrackedResult<DirectorReportPayload>> {
  const objectName = p.objectName ?? null;
  const objectIdentity =
    objectName == null ? null : resolveDirectorObjectIdentity({ object_name_display: objectName });
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const selectedObjectId =
    objectIdentity == null ? null : (p.objectIdByName[objectIdentity.object_name_canonical] ?? null);
  const cKey = canonicalKey("materials", pFrom, pTo, objectName);
  const chain: DirectorReportFetchBranch[] = [];

  if (canUseCanonicalRpc("materials")) {
    const tCanonical = nowMs();
    chain.push("canonical_rpc");
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
        return trackedResult(canonical, {
          stage: "report",
          branch: "canonical_rpc",
          chain: [...chain],
          cacheLayer: "none",
        });
      }
    } catch (error: unknown) {
      if (isMissingCanonicalRpcError(error, "director_report_fetch_materials_v1")) {
        markCanonicalRpcStatus("materials", "missing");
      } else {
        markCanonicalRpcStatus("materials", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] report.canonical_materials.failed: ${(error as Error)?.message ?? error}`);
      }
    }
    logTiming("report.canonical_materials_fallback", tCanonical);
  }

  if (objectName == null || selectedObjectId != null) {
    const t0 = nowMs();
    chain.push("legacy_fast_rpc");
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
      return trackedResult(fast, {
        stage: "report",
        branch: "legacy_fast_rpc",
        chain: [...chain],
        cacheLayer: "none",
      });
    } catch (error) {
      recordDirectorReportsServiceWarning("report_fast_rpc_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
        objectName,
        selectedObjectId,
      });
      logTiming("report.fast_rpc_failed_fallback", t0);
    }
  }

  let rows: DirectorFactRow[] = [];
  let rowBranch: DirectorReportFetchBranch | null = null;
  chain.push("acc_rpc");
  try {
    rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName });
    if (rows.length) rowBranch = "acc_rpc";
  } catch (error) {
    recordDirectorReportsServiceWarning("report_acc_rpc_failed", error, {
      chain: [...chain],
      from: pFrom,
      to: pTo,
      objectName,
    });
  }

  if (!rows.length && canUseDisciplineSourceRpc()) {
    const tSource = nowMs();
    chain.push("source_rpc");
    try {
      const allRows = await fetchDirectorDisciplineSourceRowsViaRpc({ from: pFrom, to: pTo });
      markDisciplineSourceRpcStatus("available");
      rows = objectName == null ? allRows : filterDisciplineRowsByObject(allRows, objectName);
      if (rows.length) rowBranch = "source_rpc";
      logTiming("report.source_rpc", tSource);
    } catch (error: unknown) {
      if (isMissingCanonicalRpcError(error, "director_report_fetch_discipline_source_rows_v1")) {
        markDisciplineSourceRpcStatus("missing");
      } else {
        markDisciplineSourceRpcStatus("failed");
      }
      logTiming("report.source_rpc_failed_fallback", tSource);
    }
  }

  if (!rows.length) {
    chain.push("view");
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName });
      if (rows.length) rowBranch = "view";
    } catch (error) {
      recordDirectorReportsServiceWarning("report_view_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
        objectName,
      });
    }
  }

  if (!rows.length) {
    chain.push("tables");
    try {
      rows = await fetchDisciplineFactRowsFromTables({ from: pFrom, to: pTo, objectName });
      if (rows.length) rowBranch = "tables";
    } catch (error) {
      recordDirectorReportsServiceWarning("report_discipline_tables_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
        objectName,
      });
    }
  }

  if (!rows.length) {
    chain.push("tables");
    try {
      rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName });
      if (rows.length) rowBranch = "tables";
    } catch (error) {
      recordDirectorReportsServiceWarning("report_tables_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
        objectName,
      });
    }
  }

  if (rows.length) {
    try {
      rows = await enrichFactRowsMaterialNames(rows);
    } catch (error) {
      recordDirectorReportsServiceWarning("report_enrich_material_names_failed", error, {
        branch: rowBranch ?? "tables",
        rowCount: rows.length,
      });
    }
    try {
      rows = await enrichFactRowsLevelNames(rows);
    } catch (error) {
      recordDirectorReportsServiceWarning("report_enrich_level_names_failed", error, {
        branch: rowBranch ?? "tables",
        rowCount: rows.length,
      });
    }
    const payload = buildPayloadFromFactRows({
      from: pFrom,
      to: pTo,
      objectName,
      rows,
    });
    payload.discipline = buildDisciplinePayloadFromFactRows(rows);
    legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(payload) });
    trimMap(legacyMaterialsSnapshotCache);
    return trackedResult(payload, {
      stage: "report",
      branch: rowBranch ?? "tables",
      chain: [...chain],
      cacheLayer: "none",
    });
  }

  chain.push("legacy_fast_rpc");
  const fallback = await fetchViaLegacyRpc({
    from: pFrom,
    to: pTo,
    objectId: selectedObjectId,
    objectName,
  });
  legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(fallback) });
  trimMap(legacyMaterialsSnapshotCache);
  return trackedResult(fallback, {
    stage: "report",
    branch: "legacy_fast_rpc",
    chain: [...chain],
    cacheLayer: "none",
  });
}

export async function fetchDirectorWarehouseReport(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportPayload> {
  const { payload } = await fetchDirectorWarehouseReportTracked(p);
  return payload;
}
