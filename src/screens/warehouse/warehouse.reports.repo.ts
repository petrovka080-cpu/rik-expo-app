import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWarehouseIssueLineRows } from "./warehouse.api.repo";

type ReportRow = Record<string, unknown>;

export async function fetchWarehouseIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<ReportRow[]> {
  const result = await fetchWarehouseIssueLineRows(supabase, issueId);
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? (result.data as ReportRow[]) : [];
}
