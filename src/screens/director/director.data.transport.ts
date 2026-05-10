import type { AppSupabaseClient } from "../../lib/dbContract.types";

export type DirectorRequestDisplayProbeRow = Record<string, unknown>;

export type DirectorRequestDisplayProbeResult = {
  data: DirectorRequestDisplayProbeRow[] | null;
  error: unknown;
};

export async function fetchDirectorRequestDisplayProbeRows(
  supabase: AppSupabaseClient,
): Promise<DirectorRequestDisplayProbeResult> {
  const result = await supabase
    .from("requests")
    .select("request_no,display_no")
    .limit(1);
  return {
    data: Array.isArray(result.data) ? (result.data as DirectorRequestDisplayProbeRow[]) : null,
    error: result.error,
  };
}
