import { supabase } from "../../lib/supabaseClient";

type AccountantAuthSessionResponse = {
  data?: {
    session?: {
      access_token?: string | null;
      user?: unknown;
    } | null;
  } | null;
};

type AccountantSessionReader = () => Promise<AccountantAuthSessionResponse>;

type AccountantAuthSession = NonNullable<
  NonNullable<AccountantAuthSessionResponse["data"]>["session"]
>;

export async function readCurrentAccountantAuthSession(params: {
  readSession?: AccountantSessionReader;
} = {}): Promise<AccountantAuthSession | null> {
  const readSession = params.readSession ?? (() => supabase.auth.getSession());
  const { data } = await readSession();
  return data?.session ?? null;
}

export async function hasCurrentAccountantSessionUser(params: {
  readSession?: AccountantSessionReader;
} = {}): Promise<boolean> {
  const session = await readCurrentAccountantAuthSession(params);
  return Boolean(session?.user);
}
