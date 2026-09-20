import { Platform } from "react-native";

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
const LOCAL_DEVELOPER_WEB_ORIGIN = "http://localhost:8081";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type LocalDeveloperRuntimeProbe = {
  publicFlag?: unknown;
  platform?: string;
  hostname?: string | null;
  port?: string | null;
  clientEnvironment?: string | null;
};

function localDeveloperRuntime(input: LocalDeveloperRuntimeProbe = {}) {
  return {
    publicFlag: String(
      input.publicFlag ?? process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW ?? "",
    ).trim().toLowerCase(),
    platform: input.platform ?? Platform.OS,
    hostname: input.hostname ??
      (typeof window !== "undefined" ? window.location?.hostname ?? null : null),
    port: input.port ??
      (typeof window !== "undefined" ? window.location?.port ?? null : null),
    clientEnvironment: input.clientEnvironment ??
      (supabaseClientAvailability.status === "ready"
        ? supabaseClientAvailability.environment
        : null),
  };
}

export function isLocalDeveloperReviewEnabled(input: LocalDeveloperRuntimeProbe = {}): boolean {
  const { publicFlag, platform, hostname, port, clientEnvironment } = localDeveloperRuntime(input);
  return (
    publicFlag === "1" &&
    platform === "web" &&
    LOOPBACK_HOSTS.has(String(hostname ?? "").toLowerCase()) &&
    String(port ?? "") === "8081" &&
    clientEnvironment === "local_developer"
  );
}

export function isLocalDeveloperConsumerReviewEnabled(
  input: LocalDeveloperRuntimeProbe = {},
): boolean {
  const runtime = localDeveloperRuntime(input);
  if (runtime.platform === "web") return isLocalDeveloperReviewEnabled(input);
  return runtime.publicFlag === "1"
    && ["android", "ios"].includes(runtime.platform)
    && runtime.clientEnvironment === "local_developer";
}

type BrokerSession = {
  actor?: unknown;
  role?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
};

async function installLocalDeveloperBrokerSession(params: {
  path: "/owner-session" | "/session";
  body: Record<string, unknown>;
  expectedActor?: "owner";
  expectedRole?: LocalDeveloperPrincipalRole;
  runtimeProbe?: LocalDeveloperRuntimeProbe;
}): Promise<void> {
  const available = params.expectedRole === LOCAL_DEVELOPER_CONSUMER_ROLE
    ? isLocalDeveloperConsumerReviewEnabled(params.runtimeProbe)
    : isLocalDeveloperReviewEnabled(params.runtimeProbe);
  if (!available) {
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

  const response = await fetch(`${BROKER_URL}${params.path}`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      // React Native does not synthesize a browser Origin header. The broker
      // remains loopback-only and origin-sealed, while the Android acceptance
      // harness exposes that same port through adb reverse.
      ...(typeof document === "undefined"
        ? { Origin: LOCAL_DEVELOPER_WEB_ORIGIN }
        : {}),
    },
    body: JSON.stringify(params.body),
  });
  const payload = (await response.json().catch(() => ({}))) as BrokerSession;
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken =
    typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  const actorMatches = params.expectedActor
    ? payload.actor === params.expectedActor
    : true;
  const roleMatches = params.expectedRole
    ? payload.role === params.expectedRole
    : true;
  if (!response.ok || !actorMatches || !roleMatches || !accessToken || !refreshToken) {
    throw new Error("LOCAL_DEVELOPER_PROVIDER_LOGIN_FAILED");
  }

  const { error } = await supabaseClientAvailability.client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error("LOCAL_DEVELOPER_PROVIDER_SESSION_REJECTED");
}

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
  return installLocalDeveloperBrokerSession({
    path: "/session",
    body: { role },
    expectedRole: role,
    runtimeProbe,
  });
}

export async function restoreLocalDeveloperOwnerSession(
  runtimeProbe?: Parameters<typeof isLocalDeveloperReviewEnabled>[0],
): Promise<void> {
  return installLocalDeveloperBrokerSession({
    path: "/owner-session",
    body: {},
    expectedActor: "owner",
    runtimeProbe,
  });
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
