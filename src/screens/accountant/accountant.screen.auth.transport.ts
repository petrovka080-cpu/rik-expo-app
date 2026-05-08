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

export type AccountantAuthStateSession = { user?: unknown } | null;
export type AccountantAuthStateChangeCallback = (
  event: string,
  session: AccountantAuthStateSession,
) => void;
export type AccountantAuthStateSubscription = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
};
export type AccountantAuthStateSubscriber = (
  callback: AccountantAuthStateChangeCallback,
) => AccountantAuthStateSubscription;

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

export function subscribeAccountantAuthStateChange(params: {
  onChange: AccountantAuthStateChangeCallback;
  subscribe?: AccountantAuthStateSubscriber;
}): AccountantAuthStateSubscription {
  const subscribe = params.subscribe ?? ((callback) => supabase.auth.onAuthStateChange(callback));
  return subscribe(params.onChange);
}
