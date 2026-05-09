import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabase } from "../supabaseClient";

export type AuthLifecycleStateChangeHandler = (
  event: AuthChangeEvent,
  session: Session | null,
) => void | Promise<void>;

export function hasAuthLifecycleClient(): boolean {
  return Boolean(supabase);
}

export function subscribeAuthLifecycleStateChange(
  callback: AuthLifecycleStateChangeHandler,
) {
  return supabase.auth.onAuthStateChange(callback);
}
