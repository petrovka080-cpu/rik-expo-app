import { supabase } from "../../lib/supabaseClient";

export async function loadSupplierShowcaseCurrentUserId(): Promise<string | null> {
  const auth = await supabase.auth.getUser();
  return auth.data.user?.id ?? null;
}
