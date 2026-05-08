import { supabase } from "../../lib/supabaseClient";

type AccountantAuthSessionResponse = {
  data?: {
    session?: {
      user?: unknown;
    } | null;
  } | null;
};

type AccountantSessionReader = () => Promise<AccountantAuthSessionResponse>;

export async function hasCurrentAccountantSessionUser(params: {
  readSession?: AccountantSessionReader;
} = {}): Promise<boolean> {
  const readSession = params.readSession ?? (() => supabase.auth.getSession());
  const { data } = await readSession();
  return Boolean(data?.session?.user);
}
