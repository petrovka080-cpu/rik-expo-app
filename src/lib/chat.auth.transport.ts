import { supabase } from "./supabaseClient";

export type CurrentChatAuthUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;

export async function getCurrentChatAuthUser(): Promise<CurrentChatAuthUserResult> {
  return await supabase.auth.getUser();
}
