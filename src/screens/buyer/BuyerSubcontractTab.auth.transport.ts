import { supabase } from "../../lib/supabaseClient";

export async function resolveCurrentBuyerSubcontractUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const userId = String(data?.user?.id ?? "").trim();
  return userId || null;
}
