import { supabase } from "../../lib/supabaseClient";

export async function resolveDirectorRealtimeAccessToken(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}
