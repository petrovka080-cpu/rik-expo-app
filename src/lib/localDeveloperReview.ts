import {
  signOutSafely,
  supabaseClientAvailability,
} from "./supabaseClient";
import {
  LOCAL_DEVELOPER_CONSUMER_ROLE,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  type LocalDeveloperPrincipalRole,
  type LocalDeveloperReviewRole,
} from "./localDeveloperReviewRoles";

export {
  LOCAL_DEVELOPER_REVIEW_ROLES,
  type LocalDeveloperReviewRole,
} from "./localDeveloperReviewRoles";

const BROKER_URL = "http://127.0.0.1:54329";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalDeveloperReviewEnabled(input: {
  publicFlag?: unknown;
  platform?: string;
  hostname?: string | null;
  port?: string | null;
  clientEnvironment?: string | null;
} = {}): boolean {
  const publicFlag = String(
    input.publicFlag ?? process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW ?? "",
  )
    .trim()
    .toLowerCase();
  const platform = input.platform ??
    (typeof window === "undefined" ? "native" : "web");
  const hostname = input.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : null);
  const port = input.port ??
    (typeof window !== "undefined" ? window.location.port : null);
  const clientEnvironment = input.clientEnvironment ??
    (supabaseClientAvailability.status === "ready"
      ? supabaseClientAvailability.environment
      : null);
  return (
    publicFlag === "1" &&
    platform === "web" &&
    LOOPBACK_HOSTS.has(String(hostname ?? "").toLowerCase()) &&
    String(port ?? "") === "8081" &&
    clientEnvironment === "local_developer"
  );
}

type BrokerSession = {
  role?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
};

async function switchLocalDeveloperProviderPrincipal(
  role: LocalDeveloperPrincipalRole,
  runtimeProbe?: Parameters<typeof isLocalDeveloperReviewEnabled>[0],
): Promise<void> {
  if (
    role !== LOCAL_DEVELOPER_CONSUMER_ROLE &&
    !LOCAL_DEVELOPER_REVIEW_ROLES.includes(role)
  ) {
    throw new Error("LOCAL_DEVELOPER_ROLE_NOT_ALLOWED");
  }
  if (!isLocalDeveloperReviewEnabled(runtimeProbe)) {
    throw new Error("LOCAL_DEVELOPER_REVIEW_NOT_AVAILABLE");
  }
  if (supabaseClientAvailability.status !== "ready") {
    throw new Error("LOCAL_DEVELOPER_SUPABASE_UNAVAILABLE");
  }

  const signedOut = await signOutSafely("local");
  if (signedOut.status === "failed") {
    throw new Error("LOCAL_DEVELOPER_CURRENT_SESSION_SIGN_OUT_FAILED");
  }
  if (signedOut.status === "unavailable") {
    throw new Error("LOCAL_DEVELOPER_SUPABASE_UNAVAILABLE");
  }

  const response = await fetch(`${BROKER_URL}/session`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const payload = (await response.json().catch(() => ({}))) as BrokerSession;
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken =
    typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  if (!response.ok || payload.role !== role || !accessToken || !refreshToken) {
    throw new Error("LOCAL_DEVELOPER_PROVIDER_LOGIN_FAILED");
  }

  const { error } = await supabaseClientAvailability.client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error("LOCAL_DEVELOPER_PROVIDER_SESSION_REJECTED");
}

export async function switchLocalDeveloperPrincipal(
  role: LocalDeveloperReviewRole,
  runtimeProbe?: Parameters<typeof isLocalDeveloperReviewEnabled>[0],
): Promise<void> {
  return switchLocalDeveloperProviderPrincipal(role, runtimeProbe);
}

export async function switchLocalDeveloperConsumerPrincipal(
  runtimeProbe?: Parameters<typeof isLocalDeveloperReviewEnabled>[0],
): Promise<void> {
  return switchLocalDeveloperProviderPrincipal(
    LOCAL_DEVELOPER_CONSUMER_ROLE,
    runtimeProbe,
  );
}
