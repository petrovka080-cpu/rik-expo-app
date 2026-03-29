import { supabase } from "../supabaseClient";
import type {
  AccIssueHead,
  AccIssueLine,
  RequestLookupRow,
} from "./director_reports.shared";
import {
  chunk,
  forEachChunkParallel,
  normalizeRequestLookupRow,
} from "./director_reports.shared";
import {
  REQUESTS_DISCIPLINE_SELECT_PLANS,
  REQUESTS_SELECT_PLANS,
  getFreshLookupValue,
  requestLookupCache,
  requestLookupInFlight,
  setLookupValue,
} from "./director_reports.cache";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";

let requestsSelectPlanCache: string | null = null;
let requestsDisciplineSelectPlanCache: string | null = null;

async function runTypedRpc<TRow>(
  fnName:
    | "acc_report_issues_v2"
    | "acc_report_issue_lines"
    | "director_report_fetch_acc_issue_lines_v1"
    | "wh_report_issued_summary_fast"
    | "wh_report_issued_materials_fast"
    | "wh_report_issued_by_object_fast"
    | "director_report_fetch_options_v1"
    | "director_report_fetch_discipline_source_rows_v1"
    | "director_report_fetch_issue_price_scope_v1"
    | "director_report_fetch_materials_v1"
    | "director_report_fetch_works_v1"
    | "director_report_fetch_summary_v1",
  params: Record<string, unknown>,
): Promise<{
  data: TRow[] | null;
  error: {
    message?: string | null;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  } | null;
}> {
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
    await supabase.from("requests" as never).select(selectCols).in("id", idsPart);

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
      (!!cached?.level_code ||
        !!cached?.system_code ||
        cached?.level_code === null ||
        cached?.system_code === null);
    if (hasDisciplineFields) {
      if (cached) cachedRows.push(cached);
      continue;
    }
    missingIds.push(id);
  }
  if (!missingIds.length) return cachedRows;

  const runSelect = async (selectCols: string) =>
    await supabase.from("requests" as never).select(selectCols).in("id", missingIds);

  if (requestsDisciplineSelectPlanCache) {
    const cached = await runSelect(requestsDisciplineSelectPlanCache);
    if (!cached.error) {
      const rows = Array.isArray(cached.data)
        ? cached.data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
        : [];
      const seen = new Set(rows.map((row) => row.id));
      for (const row of rows) {
        const prev = getFreshLookupValue(requestLookupCache, row.id);
        setLookupValue(requestLookupCache, row.id, {
          ...(prev ?? {
            id: row.id,
            object_id: null,
            object_name: null,
            object_type_code: null,
            system_code: null,
            level_code: null,
            zone_code: null,
            object: null,
          }),
          ...row,
        });
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
        setLookupValue(requestLookupCache, row.id, {
          ...(prev ?? {
            id: row.id,
            object_id: null,
            object_name: null,
            object_type_code: null,
            system_code: null,
            level_code: null,
            zone_code: null,
            object: null,
          }),
          ...row,
        });
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
  const ids = Array.from(
    new Set(
      issueIds
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!ids.length) return [];

  const numericIds = Array.from(
    new Set(
      ids
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  );
  if (numericIds.length) {
    try {
      const batched: AccIssueLine[] = [];
      await forEachChunkParallel(numericIds, 500, 4, async (part) => {
        const { data, error } = await runTypedRpc<AccIssueLine>("director_report_fetch_acc_issue_lines_v1", {
          p_issue_ids: part,
        });
        if (error) throw error;
        if (Array.isArray(data)) batched.push(...data);
      });
      return batched;
    } catch (error) {
      recordDirectorReportsTransportWarning("issue_lines_acc_batch_rpc_failed", error, {
        issueIdCount: numericIds.length,
        source: "director_report_fetch_acc_issue_lines_v1",
        fallbackTarget: "acc_report_issue_lines",
      });
    }
  }

  const out: AccIssueLine[] = [];
  const groups = chunk(ids, 20);
  await forEachChunkParallel(groups, 1, 3, async (groupPart) => {
    const group = groupPart[0] ?? [];
    const settled = await Promise.all(
      group.map(async (id) => {
        try {
          const numId = Number(id);
          if (isNaN(numId)) return [] as AccIssueLine[];

          const { data, error } = await runTypedRpc<AccIssueLine>("acc_report_issue_lines", {
            p_issue_id: numId,
          });
          if (error) {
            recordDirectorReportsTransportWarning("issue_lines_acc_rpc_failed", error, {
              issueId: id,
              source: "acc_report_issue_lines",
            });
            return [] as AccIssueLine[];
          }
          return Array.isArray(data) ? (data as AccIssueLine[]) : [];
        } catch (error) {
          recordDirectorReportsTransportWarning("issue_lines_acc_rpc_failed", error, {
            issueId: id,
            source: "acc_report_issue_lines",
          });
          return [] as AccIssueLine[];
        }
      }),
    );
    for (const rows of settled) if (rows) out.push(...rows);
  });
  return out;
}

export {
  fetchIssueHeadsViaAccRpc,
  fetchIssueLinesViaAccRpc,
  fetchRequestsDisciplineRowsSafe,
  fetchRequestsRowsSafe,
  runTypedRpc,
};
