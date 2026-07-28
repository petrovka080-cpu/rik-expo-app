import { getSessionSafe } from "../../lib/supabaseClient";

type ForemanAuthUserResponse = {
  data?: {
    user?: {
      id?: string | null;
      email?: string | null;
      phone?: string | null;
      user_metadata?: {
        full_name?: string | null;
        phone?: string | null;
      } | null;
    } | null;
  } | null;
};

type ForemanAuthUserReader = () => Promise<ForemanAuthUserResponse>;

type ForemanAuthUserLike = {
  id?: unknown;
  email?: unknown;
  phone?: unknown;
  user_metadata?: {
    full_name?: unknown;
    phone?: unknown;
  } | null;
};

export type ForemanAuthIdentity = {
  id: string | null;
  fullName: string;
  email: string;
  phone: string;
};

const EMPTY_FOREMAN_AUTH_IDENTITY: ForemanAuthIdentity = {
  id: null,
  fullName: "",
  email: "",
  phone: "",
};

function buildForemanAuthIdentityFromUser(
  user: ForemanAuthUserLike | null | undefined,
): ForemanAuthIdentity {
  return {
    id: String(user?.id ?? "").trim() || null,
    fullName: String(user?.user_metadata?.full_name ?? "").trim(),
    email: String(user?.email ?? "").trim(),
    phone: String(user?.phone ?? user?.user_metadata?.phone ?? "").trim(),
  };
}

async function loadDefaultForemanAuthIdentity(): Promise<ForemanAuthIdentity> {
  const { session } = await getSessionSafe({
    caller: "foreman_auth_identity",
  });
  const sessionIdentity = buildForemanAuthIdentityFromUser(session?.user ?? null);
  if (sessionIdentity.id) return sessionIdentity;

  return EMPTY_FOREMAN_AUTH_IDENTITY;
}

export async function loadCurrentForemanAuthIdentity(params: {
  readUser?: ForemanAuthUserReader;
} = {}): Promise<ForemanAuthIdentity> {
  if (!params.readUser) return loadDefaultForemanAuthIdentity();
  const { data } = await params.readUser();
  return buildForemanAuthIdentityFromUser(data?.user ?? null);
}

export async function loadCurrentForemanAuthUserId(params: {
  readUser?: ForemanAuthUserReader;
} = {}): Promise<string | null> {
  const identity = await loadCurrentForemanAuthIdentity(params);
  return identity.id;
}
