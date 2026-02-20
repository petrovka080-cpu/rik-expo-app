import { supabase } from "../supabaseClient";

export async function ensureMyProfile(): Promise<boolean> {
  const { error } = await supabase.rpc("ensure_my_profile");
  if (error) {
    console.warn("[ensureMyProfile]", error.message);
    return false;
  }
  return true;
}

export async function getMyRole(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error) {
    console.warn("[getMyRole]", error.message);
    return null;
  }
  return (data as string) ?? null;
}
