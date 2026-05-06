import { supabase } from "../supabaseClient";
import type {
  AccIssueHead,
  AccIssueLine,
  RequestLookupRow,
} from "./director_reports.shared";
import { runContainedRpc } from "./queryBoundary";
import { loadCanonicalRequestsByIds } from "./requestCanonical.read";
import { createDirectorReportsAggregationContractRequiredError } from "./director_reports.aggregation.contracts";

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

async function fetchIssueHeadsViaAccRpc(_p: {
  from: string;
  to: string;
}): Promise<AccIssueHead[]> {
  throw createDirectorReportsAggregationContractRequiredError("director issue heads acc rpc fallback");
}

async function fetchIssueLinesViaAccRpc(_issueIds: string[]): Promise<AccIssueLine[]> {
  throw createDirectorReportsAggregationContractRequiredError("director issue lines acc rpc fallback");
}

export {
  fetchIssueHeadsViaAccRpc,
  fetchIssueLinesViaAccRpc,
  fetchRequestsDisciplineRowsSafe,
  fetchRequestsRowsSafe,
  runTypedRpc,
};
