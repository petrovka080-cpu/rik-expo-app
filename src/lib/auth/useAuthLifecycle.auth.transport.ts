import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabaseClientAvailability } from "../supabaseClient";

export type AuthLifecycleStateChangeHandler = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

export function hasAuthLifecycleClient(): boolean {
  return supabaseClientAvailability.status === "ready";
}

export function subscribeAuthLifecycleStateChange(
  callback: AuthLifecycleStateChangeHandler,
) {
  if (supabaseClientAvailability.status !== "ready") {
    return { data: { subscription: { unsubscribe: () => undefined } } };
  }
  return supabaseClientAvailability.client.auth.onAuthStateChange(callback);
}
