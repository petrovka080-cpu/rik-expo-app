import type { User } from "@supabase/supabase-js";

import { RequestTimeoutError } from "../../lib/requestTimeoutPolicy";
import { supabase } from "../../lib/supabaseClient";

export async function loadCurrentAuthUser(): Promise<User> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw error || new Error("Не найден текущий пользователь");
    }
    return data.user;
  } catch (error) {
    if (!(error instanceof RequestTimeoutError)) {
      throw error;
    }

    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session?.user) {
      throw error;
    }

    return data.session.user;
  }
}

export async function updateProfileAuthAvatar(
  avatarUrl: string | null,
): Promise<void> {
  const authUpdate = await supabase.auth.updateUser({
    data: {
      avatar_url: avatarUrl,
    },
  });
  if (authUpdate.error) throw authUpdate.error;
}

export async function signOutProfileSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
