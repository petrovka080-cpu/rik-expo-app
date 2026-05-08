import { supabase } from "../supabaseClient";

export async function resolveRequestDraftSyncAccessToken(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}
