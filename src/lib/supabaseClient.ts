import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_HOST,
  SUPABASE_PROJECT_REF,
  SUPABASE_URL,
  isClientSupabaseEnvValid,
} from "./env/clientSupabaseEnv";
import { recordPlatformObservability } from "./observability/platformObservability";
import { fetchWithRequestTimeout } from "./requestTimeoutPolicy";

type RuntimeProcessLike = {
  env?: Record<string, string | undefined>;
  versions?: {
    node?: string;
  };
};

type SupabaseAuthStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const runtimeProcess =
  typeof globalThis === "object" && "process" in globalThis
    ? (globalThis as typeof globalThis & { process?: RuntimeProcessLike }).process
    : undefined;
const isWeb = typeof window !== "undefined" && typeof document !== "undefined";
const isNodeRuntime =
  Boolean(runtimeProcess?.versions?.node) &&
  typeof window === "undefined";

const DEBUG_SUPABASE_REST = false;
const DEV_FUNCTION_OVERRIDES = {
  "foreman-request-pdf":
    typeof process !== "undefined"
      ? String(process.env.EXPO_PUBLIC_FOREMAN_PDF_FUNCTION_URL ?? "").trim()
      : "",
  "warehouse-pdf":
    typeof process !== "undefined"
      ? String(process.env.EXPO_PUBLIC_WAREHOUSE_PDF_FUNCTION_URL ?? "").trim()
      : "",
} as const;

export { SUPABASE_ANON_KEY, SUPABASE_HOST, SUPABASE_PROJECT_REF, SUPABASE_URL };
export const SUPABASE_KEY_KIND = "anon";

function fixNakedTimestamp(urlStr: string): string {
  let value = String(urlStr || "");

  if (!/[?&]\d{13}([&]|$)/.test(value)) return value;

  try {
    const url = new URL(value);
    const toMove: string[] = [];
    url.searchParams.forEach((paramValue, key) => {
      if (/^\d{13}$/.test(key) && (paramValue == null || paramValue === "")) {
        toMove.push(key);
      }
    });

    if (toMove.length > 0) {
      const last = toMove[toMove.length - 1];
      for (const key of toMove) url.searchParams.delete(key);
      url.searchParams.set("_ts", last);
    }

    value = url.toString();
  } catch {
    value = value.replace(/([?&])(\d{13})(?=(&|$))/g, "$1_ts=$2");
  }

  return value.replace(/\?&/g, "?").replace(/[?&]$/g, "");
}

const wrapFetchWithLog = (tag: string, baseFetch: typeof fetch): typeof fetch => {
  return async (input: FetchInput, init?: FetchInit) => {
    const originalUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? String(input.url)
            : String(input);

    const fixedUrl = fixNakedTimestamp(originalUrl);

    if (DEBUG_SUPABASE_REST && fixedUrl !== originalUrl) {
      console.warn(`${tag} SUPABASE REST: fixed naked timestamp`, {
        before: originalUrl,
        after: fixedUrl,
      });
    }

    if (DEBUG_SUPABASE_REST && fixedUrl.includes("/rest/v1/")) {
      console.log(`${tag} SUPABASE REST:`, fixedUrl);
    }

    let patchedInput: FetchInput = fixedUrl;
    if (input instanceof Request) {
      try {
        patchedInput = new Request(fixedUrl, input);
      } catch {
        patchedInput = fixedUrl;
      }
    }

    return baseFetch(patchedInput, init);
  };
};

const getFetchUrl = (input: FetchInput) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return String(input ?? "");
};

const getFetchMethod = (input: FetchInput, init?: FetchInit) =>
  String(init?.method ?? (input instanceof Request ? input.method : "GET"))
    .trim()
    .toUpperCase() || "GET";

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

function rewriteFunctionUrlForDev(input: FetchInput) {
  const rawUrl = getFetchUrl(input);
  if (!rawUrl || typeof __DEV__ === "undefined" || __DEV__ !== true) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const match = parsed.pathname.match(/\/functions\/v1\/([^/?#]+)/i);
  if (!match) return null;
  const functionName = String(match[1] || "").trim() as keyof typeof DEV_FUNCTION_OVERRIDES;
  const overrideBase = DEV_FUNCTION_OVERRIDES[functionName];
  if (!overrideBase) return null;

  try {
    const overrideUrl = new URL(overrideBase);
    overrideUrl.search = parsed.search;
    return overrideUrl.toString();
  } catch {
    return null;
  }
}

const isSupabaseAuthTokenPath = (input: FetchInput, init?: FetchInit) => {
  if (getFetchMethod(input, init) !== "POST") return false;
  try {
    const url = new URL(getFetchUrl(input));
    return url.pathname.includes("/auth/v1/token");
  } catch {
    return false;
  }
};
const buildSupabaseAuthTokenSourceKind = (tag: "web" | "native") =>
  `supabase_auth:token:${tag}`;

const recordSupabaseAuthTokenStart = (tag: "web" | "native", method: string, urlPath: string) =>
  recordPlatformObservability({
    screen: "request",
    surface: "supabase_auth_token",
    category: "fetch",
    event: "token_request_start",
    result: "skipped",
    sourceKind: buildSupabaseAuthTokenSourceKind(tag),
    extra: {
      owner: "supabase_client",
      method,
      urlPath,
    },
  });

const recordSupabaseAuthTokenEnd = (params: {
  tag: "web" | "native";
  method: string;
  urlPath: string;
  startedAt: number;
  result: "success" | "error";
  httpStatus?: number;
  error?: unknown;
}) =>
  recordPlatformObservability({
    screen: "request",
    surface: "supabase_auth_token",
    category: "fetch",
    event: "token_request_end",
    result: params.result,
    durationMs: Math.max(0, Math.round(nowMs() - params.startedAt)),
    sourceKind: buildSupabaseAuthTokenSourceKind(params.tag),
    errorClass: params.error instanceof Error ? params.error.name : undefined,
    errorMessage:
      params.error instanceof Error
        ? params.error.message
        : params.error != null
          ? String(params.error)
          : undefined,
    extra: {
      owner: "supabase_client",
      method: params.method,
      urlPath: params.urlPath,
      httpStatus: params.httpStatus,
    },
  });

const fetchSupabaseAuthTokenWithoutTimeout = async (
  tag: "web" | "native",
  baseFetch: typeof fetch,
  input: FetchInput,
  init: FetchInit | undefined,
) => {
  const method = getFetchMethod(input, init);
  const urlPath = (() => {
    try {
      return new URL(getFetchUrl(input)).pathname;
    } catch {
      return getFetchUrl(input);
    }
  })();
  const startedAt = nowMs();

  recordSupabaseAuthTokenStart(tag, method, urlPath);

  try {
    const response = await baseFetch(input, init);
    recordSupabaseAuthTokenEnd({
      tag,
      method,
      urlPath,
      startedAt,
      result: "success",
      httpStatus: response.status,
    });
    return response;
  } catch (error) {
    recordSupabaseAuthTokenEnd({
      tag,
      method,
      urlPath,
      startedAt,
      result: "error",
      error,
    });
    throw error;
  }
};

function assertEnv() {
  const ok = isClientSupabaseEnvValid();
  const looksLikeTargetProject = SUPABASE_HOST?.startsWith(`${SUPABASE_PROJECT_REF}.`);

  if (ok && !looksLikeTargetProject) {
    console.warn(
      `[supabaseClient] SUPABASE_URL host ("${SUPABASE_HOST}") does not match ref ${SUPABASE_PROJECT_REF}.`,
    );
  }

  if (!ok) {
    const message =
      "[supabaseClient] Missing/invalid EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.";
    if (process.env.NODE_ENV !== "production") console.warn(message);
  }

  return ok;
}

const buildSupabaseFetch = (tag: "web" | "native", baseFetch: typeof fetch): typeof fetch =>
  wrapFetchWithLog(tag, (input: FetchInput, init?: FetchInit) => {
    const rewrittenUrl = rewriteFunctionUrlForDev(input);
    const effectiveInput: FetchInput = rewrittenUrl ?? input;
    const headers = new Headers(init?.headers || {});
    const requestInit: FetchInit = {
      ...(init ?? {}),
      headers,
      ...(tag === "web"
        ? {
            keepalive: false,
            cache: "no-store" as RequestCache,
          }
        : {}),
    };

    if (SUPABASE_ANON_KEY) {
      if (!headers.has("apikey")) headers.set("apikey", SUPABASE_ANON_KEY);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
      }
    }

    if (isSupabaseAuthTokenPath(effectiveInput, requestInit)) {
      return fetchSupabaseAuthTokenWithoutTimeout(tag, baseFetch, effectiveInput, requestInit);
    }

    return fetchWithRequestTimeout(
      effectiveInput,
      requestInit,
      {
        fetchImpl: baseFetch,
        screen: "request",
        surface: "supabase_transport",
        owner: "supabase_client",
        sourceKind: `supabase_transport:${tag}`,
      },
    );
  });

const supabaseFetch: typeof fetch | undefined = isWeb ? buildSupabaseFetch("web", window.fetch.bind(window)) : undefined;

const nativeFetch: typeof fetch = buildSupabaseFetch("native", fetch);

function createMissingSupabaseClient(): SupabaseClient<Database> {
  const err =
    "[supabaseClient] Supabase client is unavailable: missing/invalid EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.";
  return new Proxy(
    {},
    {
      get() {
        throw new Error(err);
      },
    },
  ) as SupabaseClient<Database>;
}

export const isSupabaseEnvValid = assertEnv();
const authStorage = isWeb
  ? window.localStorage
  : isNodeRuntime
    ? undefined
    : (AsyncStorage as SupabaseAuthStorage);
const supabaseClientFetch: typeof fetch = isWeb && supabaseFetch ? supabaseFetch : nativeFetch;

const recordSupabaseAuthBootstrapFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "request",
    surface: "supabase_auth_bootstrap",
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "supabase_auth_bootstrap_failed"),
    sourceKind: "supabase_auth:getSession",
    extra: {
      owner: "supabase_client",
      ...extra,
    },
  });

const recordAuthSessionReadStart = (extra?: Record<string, unknown>) =>
  recordPlatformObservability({
    screen: "request",
    surface: "auth_session_gate",
    category: "fetch",
    event: "auth_session_read_start",
    result: "skipped",
    sourceKind: "supabase_auth:getSession",
    extra: {
      owner: "supabase_client",
      ...(extra ?? {}),
    },
  });

const recordAuthSessionReadResult = (params: {
  result: "success" | "error";
  degraded: boolean;
  hasSession: boolean;
  error?: unknown;
  extra?: Record<string, unknown>;
}) =>
  recordPlatformObservability({
    screen: "request",
    surface: "auth_session_gate",
    category: "fetch",
    event: "auth_session_read_result",
    result: params.result,
    fallbackUsed: params.degraded || undefined,
    errorClass: params.error instanceof Error ? params.error.name : undefined,
    errorMessage:
      params.error instanceof Error
        ? params.error.message
        : params.error != null
          ? String(params.error)
          : undefined,
    sourceKind: "supabase_auth:getSession",
    extra: {
      owner: "supabase_client",
      degraded: params.degraded,
      hasSession: params.hasSession,
      ...(params.extra ?? {}),
    },
  });

type SafeSessionResult = {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  degraded: boolean;
};

function isTimeoutLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("timed out") ||
    message.includes("aborted") ||
    message.includes("AbortError") ||
    message.includes("network request failed")
  );
}

export async function getSessionSafe(
  extra?: Record<string, unknown>,
): Promise<SafeSessionResult> {
  if (!supabase) {
    recordAuthSessionReadResult({
      result: "error",
      degraded: true,
      hasSession: false,
      extra: {
        ...(extra ?? {}),
        reason: "supabase_missing",
      },
    });
    return { session: null, degraded: true };
  }

  recordAuthSessionReadStart(extra);

  try {
    const result = await supabase.auth.getSession();
    const session = result?.data?.session ?? null;
    recordAuthSessionReadResult({
      result: "success",
      degraded: false,
      hasSession: Boolean(session),
      extra,
    });
    return {
      session,
      degraded: false,
    };
  } catch (error: unknown) {
    recordSupabaseAuthBootstrapFallback("get_session_safe_failed", error, extra);
    recordAuthSessionReadResult({
      result: "error",
      degraded: isTimeoutLikeError(error),
      hasSession: false,
      error,
      extra,
    });

    return {
      session: null,
      degraded: isTimeoutLikeError(error),
    };
  }
}
export const supabase: SupabaseClient<Database> = isSupabaseEnvValid
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isWeb,
      storage: authStorage,
    },
    realtime: { params: { eventsPerSecond: 5 } },
    global: {
      headers: { "x-client-info": "rik-expo-app" },
      fetch: supabaseClientFetch,
    },
  })
  : createMissingSupabaseClient();

export async function ensureSignedIn(): Promise<boolean> {
  if (!supabase) return false;

  const { session, degraded } = await getSessionSafe({
    route: "/auth/login",
    caller: "ensureSignedIn",
  });

  if (session?.user) return true;

  // При network/timeout degradation НЕ редиректим.
  if (degraded) return false;

  if (!isNodeRuntime) {
    try {
      const mod = await import("expo-router");
      mod.router.replace("/auth/login");
    } catch (error) {
      recordPlatformObservability({
        screen: "request",
        surface: "supabase_auth_bootstrap",
        category: "ui",
        event: "ensure_signed_in_router_redirect_failed",
        result: "error",
        fallbackUsed: true,
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error ?? "router_redirect_failed"),
        sourceKind: "expo_router",
        extra: {
          owner: "supabase_client",
          route: "/auth/login",
        },
      });
    }
  }

  return false;
}
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { session } = await getSessionSafe({
    caller: "currentUserId",
  });

  return session?.user?.id ?? null;
}
