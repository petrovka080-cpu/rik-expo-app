import { supabase } from "../../lib/supabaseClient";

export async function loadAccountantCardFlowAuthFio(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return String(data?.user?.user_metadata?.full_name ?? data?.user?.user_metadata?.name ?? "").trim();
}
