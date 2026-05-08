import { supabase } from "../../lib/supabaseClient";

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
