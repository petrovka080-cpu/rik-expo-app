import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveBuyerSummaryAuthUserId(params: {
  supabase: SupabaseClient;
}): Promise<string | null> {
  const { data } = await params.supabase.auth.getUser();
  const userId = String(data?.user?.id ?? "").trim();
  return userId || null;
}
