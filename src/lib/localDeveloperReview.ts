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

const DEFAULT_BROKER_URL = "http://127.0.0.1:54329";
const DEFAULT_LOCAL_DEVELOPER_WEB_PORT = "8081";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type LocalDeveloperRuntimeProbe = {
  publicFlag?: unknown;
  platform?: string;
  hostname?: string | null;
  port?: string | null;
  clientEnvironment?: string | null;
  expectedWebPort?: string | null;
};

function configuredLocalDeveloperWebPort(input?: string | null): string {
  const value = String(
    input ?? process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_WEB_PORT ?? DEFAULT_LOCAL_DEVELOPER_WEB_PORT,
  ).trim();
  const port = Number(value);
  return Number.isInteger(port) && port >= 1024 && port <= 65_535
    ? String(port)
    : "";
}

export function resolveLocalDeveloperBrokerUrl(
  configured = process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_AUTH_BROKER_URL,
): string {
  const value = String(configured ?? DEFAULT_BROKER_URL).trim();
  try {
    const url = new URL(value);
    const port = Number(url.port);
    if (
      url.protocol === "http:" &&
      LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) &&
      Number.isInteger(port) &&
      port >= 1024 &&
      port <= 65_535 &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    ) {
      return url.origin;
    }
  } catch {
    // Fail closed below; a session token must never be sent to an invalid target.
  }
  throw new Error("LOCAL_DEVELOPER_AUTH_BROKER_URL_FORBIDDEN");
}

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
  const expectedWebPort = configuredLocalDeveloperWebPort(input.expectedWebPort);
  return (
    publicFlag === "1" &&
    platform === "web" &&
    LOOPBACK_HOSTS.has(String(hostname ?? "").toLowerCase()) &&
    expectedWebPort !== "" &&
    String(port ?? "") === expectedWebPort &&
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

let localDeveloperSessionInstallTail: Promise<void> = Promise.resolve();

async function installLocalDeveloperBrokerSessionNow(params: {
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

  const response = await fetch(`${resolveLocalDeveloperBrokerUrl()}${params.path}`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      // React Native does not synthesize a browser Origin header. The broker
      // remains loopback-only and origin-sealed, while the Android acceptance
      // harness exposes that same port through adb reverse.
      ...(typeof document === "undefined"
        ? { Origin: `http://localhost:${configuredLocalDeveloperWebPort()}` }
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

function installLocalDeveloperBrokerSession(
  params: Parameters<typeof installLocalDeveloperBrokerSessionNow>[0],
): Promise<void> {
  const queued = localDeveloperSessionInstallTail
    .catch(() => undefined)
    .then(() => installLocalDeveloperBrokerSessionNow(params));
  localDeveloperSessionInstallTail = queued.catch(() => undefined);
  return queued;
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
