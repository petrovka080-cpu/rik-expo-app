import { supabase } from "../../supabaseClient";

export function readCanonicalEstimateSession() {
  return supabase.auth.getSession();
}

export function refreshCanonicalEstimateSession() {
  return supabase.auth.refreshSession();
}

export function readCanonicalEstimateAuthenticatedUser() {
  return supabase.auth.getUser();
}
