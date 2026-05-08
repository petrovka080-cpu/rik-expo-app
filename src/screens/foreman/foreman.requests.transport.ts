import { supabase } from "../../lib/supabaseClient";
import type { ForemanRequestUpdate } from "../../types/contracts/foreman";

export type ForemanRequestLinkPatch = Pick<
  ForemanRequestUpdate,
  "subcontract_id" | "contractor_job_id" | "object_name"
>;

type ForemanRequestNoProbeResult = {
  error?: unknown;
};

type ForemanRequestNoProbeClient = {
  from: (table: "requests") => {
    select: (selection: "request_no") => {
      limit: (count: 1) => Promise<ForemanRequestNoProbeResult>;
    };
  };
};

type ForemanRequestLinkPatchResult = {
  error: unknown | null;
};

type ForemanRequestLinkPatchClient = {
  from: (table: "requests") => {
    update: (patch: ForemanRequestLinkPatch) => {
      eq: (column: "id", requestId: string) => Promise<ForemanRequestLinkPatchResult>;
    };
  };
};

const readDefaultForemanRequestNoProbe = async (): Promise<ForemanRequestNoProbeResult> => {
  const result = await supabase.from("requests").select("request_no").limit(1);
  return { error: result.error };
};

export async function probeForemanRequestsHasRequestNo(params: {
  client?: ForemanRequestNoProbeClient;
} = {}): Promise<boolean> {
  const result = params.client
    ? await params.client.from("requests").select("request_no").limit(1)
    : await readDefaultForemanRequestNoProbe();
  if (result.error) throw result.error;
  return true;
}

export async function patchForemanRequestLinkRow(params: {
  requestId: string;
  patch: ForemanRequestLinkPatch;
  client?: ForemanRequestLinkPatchClient;
}): Promise<ForemanRequestLinkPatchResult> {
  const result = params.client
    ? await params.client.from("requests").update(params.patch).eq("id", params.requestId)
    : await supabase.from("requests").update(params.patch).eq("id", params.requestId);

  return { error: result.error ?? null };
}
