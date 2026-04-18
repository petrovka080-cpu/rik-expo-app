import { supabase } from "../supabaseClient";
import type {
  AccIssueHead,
  AccIssueLine,
  RequestLookupRow,
} from "./director_reports.shared";
import {
  forEachChunkParallel,
} from "./director_reports.shared";
import { mapWithConcurrencyLimit } from "../async/mapWithConcurrencyLimit";
import { recordDirectorReportsTransportWarning } from "./director_reports.observability";
import { runContainedRpc } from "./queryBoundary";
import { loadCanonicalRequestsByIds } from "./requestCanonical.read";

const DIRECTOR_REPORT_ISSUE_LINE_FALLBACK_CONCURRENCY_LIMIT = 6;

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
  const { data, error } = await runContainedRpc<TRow[]>(supabase, fnName, params);
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
  const result = await loadCanonicalRequestsByIds(supabase, ids, {
    includeItemCounts: false,
  });
  return result.rows;
}

async function fetchRequestsDisciplineRowsSafe(ids: string[]): Promise<RequestLookupRow[]> {
  const result = await loadCanonicalRequestsByIds(supabase, ids, {
    includeItemCounts: false,
  });
  return result.rows;
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

  const settled = await mapWithConcurrencyLimit(
    ids,
    DIRECTOR_REPORT_ISSUE_LINE_FALLBACK_CONCURRENCY_LIMIT,
    async (id) => {
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
    },
  );
  const out: AccIssueLine[] = [];
  for (const rows of settled) if (rows) out.push(...rows);
  return out;
}

export {
  fetchIssueHeadsViaAccRpc,
  fetchIssueLinesViaAccRpc,
  fetchRequestsDisciplineRowsSafe,
  fetchRequestsRowsSafe,
  runTypedRpc,
};
