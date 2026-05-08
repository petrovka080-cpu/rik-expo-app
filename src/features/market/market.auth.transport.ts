import { supabase } from "../../lib/supabaseClient";

const trim = (value: unknown): string => String(value ?? "").trim();

export async function resolveCurrentMarketBuyerName(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const fullName =
    trim(user?.user_metadata?.full_name) ||
    trim(user?.user_metadata?.name);
  return fullName || null;
}
