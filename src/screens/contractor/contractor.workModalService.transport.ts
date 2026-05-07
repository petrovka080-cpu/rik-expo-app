import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

export type ContractorWorkModalRequestNoProbeRow = {
  id?: string | null;
  request_no?: string | null;
};

const normalizeRequestNoProbeRow = (
  row: ContractorWorkModalRequestNoProbeRow | null | undefined,
): ContractorWorkModalRequestNoProbeRow | null => {
  if (!row) return null;
  return {
    id: row.id ?? null,
    request_no: row.request_no ?? null,
  };
};

export async function fetchContractorWorkModalRequestNoProbe(
  supabaseClient: SupabaseClient<Database>,
): Promise<ContractorWorkModalRequestNoProbeRow | null> {
  const probe = await supabaseClient.from("requests").select("id, request_no").limit(1);
  if (probe.error) throw probe.error;
  const rows = Array.isArray(probe.data)
    ? (probe.data as ContractorWorkModalRequestNoProbeRow[])
    : [];
  return normalizeRequestNoProbeRow(rows[0]);
}
