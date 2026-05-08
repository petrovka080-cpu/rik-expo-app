import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

export async function loadCurrentProfileIdentityAuthUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
