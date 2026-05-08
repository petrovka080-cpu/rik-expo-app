import type { SupabaseClient } from "@supabase/supabase-js";
import type { PagedQuery } from "../../lib/api/_core";
import type { Database } from "../../lib/database.types";

export type ContractorWorkModalRequestNoProbeRow = {
  id?: string | null;
  request_no?: string | null;
};

export type ContractorWorkModalRequestDisplayRow = {
  id?: string | null;
  display_no?: string | null;
  request_no?: string | null;
  status?: string | null;
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

export function createContractorWorkModalRequestDisplayQuery(
  supabaseClient: SupabaseClient<Database>,
  params: {
    select: string;
    requestIds: string[];
  },
): PagedQuery<ContractorWorkModalRequestDisplayRow> {
  return supabaseClient
    .from("requests")
    .select(params.select)
    .in("id", params.requestIds)
    .order("id", { ascending: true }) as unknown as PagedQuery<ContractorWorkModalRequestDisplayRow>;
}

export async function seedContractorWorkDefaultsAuto(
  supabaseClient: SupabaseClient<Database>,
  workCode: string,
) {
  return await supabaseClient.rpc("work_seed_defaults_auto", { p_work_code: workCode });
}
