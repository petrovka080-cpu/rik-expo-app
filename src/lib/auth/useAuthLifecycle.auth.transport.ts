import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { isSupabaseEnvValid, supabase } from "../supabaseClient";

export type AuthLifecycleStateChangeHandler = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

export function hasAuthLifecycleClient(): boolean {
  return isSupabaseEnvValid;
}

export function subscribeAuthLifecycleStateChange(
  callback: AuthLifecycleStateChangeHandler,
) {
  return supabase.auth.onAuthStateChange(callback);
}
