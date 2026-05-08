import { supabase } from "../supabaseClient";

export async function resolveCurrentRequestUserId(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  const userId = String(session.data.session?.user?.id ?? "").trim();
  return userId || null;
}
