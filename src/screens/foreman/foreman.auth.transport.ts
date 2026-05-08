import { supabase } from "../../lib/supabaseClient";

type ForemanAuthUserResponse = {
  data?: {
    user?: {
      id?: string | null;
    } | null;
  } | null;
};

type ForemanAuthUserReader = () => Promise<ForemanAuthUserResponse>;

export async function loadCurrentForemanAuthUserId(params: {
  readUser?: ForemanAuthUserReader;
} = {}): Promise<string | null> {
  const readUser = params.readUser ?? (() => supabase.auth.getUser());
  const { data } = await readUser();
  const userId = String(data?.user?.id ?? "").trim();
  return userId || null;
}
