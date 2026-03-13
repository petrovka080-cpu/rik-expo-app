import type { SupabaseClient } from "@supabase/supabase-js";

type ReportRow = Record<string, unknown>;

export async function fetchWarehouseIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<ReportRow[]> {
  const result = await supabase.rpc("acc_report_issue_lines", { p_issue_id: issueId });
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? (result.data as ReportRow[]) : [];
}
