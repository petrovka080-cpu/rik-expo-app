import { supabase } from "../../lib/supabaseClient";

type ForemanAuthUserResponse = {
  data?: {
    user?: {
      id?: string | null;
      user_metadata?: {
        full_name?: string | null;
      } | null;
    } | null;
  } | null;
};

type ForemanAuthUserReader = () => Promise<ForemanAuthUserResponse>;

export type ForemanAuthIdentity = {
  id: string | null;
  fullName: string;
};

export async function loadCurrentForemanAuthIdentity(params: {
  readUser?: ForemanAuthUserReader;
} = {}): Promise<ForemanAuthIdentity> {
  const readUser = params.readUser ?? (() => supabase.auth.getUser());
  const { data } = await readUser();
  return {
    id: String(data?.user?.id ?? "").trim() || null,
    fullName: String(data?.user?.user_metadata?.full_name ?? "").trim(),
  };
}

export async function loadCurrentForemanAuthUserId(params: {
  readUser?: ForemanAuthUserReader;
} = {}): Promise<string | null> {
  const identity = await loadCurrentForemanAuthIdentity(params);
  return identity.id;
}
