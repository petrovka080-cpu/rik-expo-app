import type {
  DirectorFactRow,
  DirectorReportOptions,
} from "./director_reports.shared";
import {
  buildDirectorReportOptionsFromIdentities,
  getDirectorFactObjectIdentity,
  rpcDate,
} from "./director_reports.shared";
import {
  REPORTS_TIMING,
  canUseOptionsRpc,
  isMissingCanonicalRpcError,
  logTiming,
  markOptionsRpcStatus,
  nowMs,
} from "./director_reports.cache";
import {
  fetchAllFactRowsFromTables,
  fetchAllFactRowsFromView,
  fetchDirectorFactViaAccRpc,
  fetchDirectorReportCanonicalOptions,
} from "./director_reports.transport";
import {
  recordDirectorReportsServiceWarning,
  trackedResult,
  type DirectorReportTrackedResult,
  type DirectorReportFetchBranch,
} from "./director_reports.service.shared";

export async function fetchDirectorWarehouseReportOptionsTracked(p: {
  from: string;
  to: string;
}): Promise<DirectorReportTrackedResult<DirectorReportOptions>> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const chain: DirectorReportFetchBranch[] = [];

  if (canUseOptionsRpc()) {
    const t0 = nowMs();
    chain.push("canonical_rpc");
    try {
      const options = await fetchDirectorReportCanonicalOptions({
        from: pFrom,
        to: pTo,
      });
      if (options) {
        markOptionsRpcStatus("available");
        logTiming("options.rpc", t0);
        return trackedResult(options, {
          stage: "options",
          branch: "canonical_rpc",
          chain: [...chain],
          cacheLayer: "none",
        });
      }
      throw new Error("options.rpc_empty_payload");
    } catch (error: unknown) {
      if (isMissingCanonicalRpcError(error, "director_report_fetch_options_v1")) {
        markOptionsRpcStatus("missing");
      } else {
        markOptionsRpcStatus("failed");
      }
      if (REPORTS_TIMING) {
        if (__DEV__) console.info(`[director_reports] options.rpc.failed: ${(error as Error)?.message ?? error}`);
      }
    }
    logTiming("options.rpc_fallback", t0);
  }

  let rows: DirectorFactRow[] = [];
  chain.push("tables");
  try {
    rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName: null });
  } catch (error) {
    recordDirectorReportsServiceWarning("options_tables_failed", error, {
      chain: [...chain],
      from: pFrom,
      to: pTo,
    });
  }

  if (!rows.length) {
    chain.push("acc_rpc");
    try {
      rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName: null });
    } catch (error) {
      recordDirectorReportsServiceWarning("options_acc_rpc_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
      });
    }
  }

  if (!rows.length) {
    chain.push("view");
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName: null });
    } catch (error) {
      recordDirectorReportsServiceWarning("options_view_failed", error, {
        chain: [...chain],
        from: pFrom,
        to: pTo,
      });
    }
  }

  if (!rows.length) {
    return trackedResult(
      { objects: [], objectIdByName: {} },
      {
        stage: "options",
        branch: "empty",
        chain: [...chain],
        cacheLayer: "none",
      },
    );
  }

  const branch = chain[chain.length - 1] ?? "empty";
  return trackedResult(
    buildDirectorReportOptionsFromIdentities(rows.map((row) => getDirectorFactObjectIdentity(row))),
    {
      stage: "options",
      branch: branch === "canonical_rpc" || branch === "legacy_fast_rpc" ? "empty" : branch,
      chain: [...chain],
      cacheLayer: "none",
    },
  );
}

export async function fetchDirectorWarehouseReportOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions> {
  const { payload } = await fetchDirectorWarehouseReportOptionsTracked(p);
  return payload;
}
