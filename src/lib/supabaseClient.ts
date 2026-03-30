import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_HOST,
  SUPABASE_PROJECT_REF,
  SUPABASE_URL,
  isClientSupabaseEnvValid,
} from "./env/clientSupabaseEnv";
import { fetchWithRequestTimeout } from "./requestTimeoutPolicy";

type RuntimeProcessLike = {
  env?: Record<string, string | undefined>;
  versions?: {
    node?: string;
  };
};

type RuntimeRequire = (moduleName: string) => unknown;
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

if (!isNodeRuntime) {
  try {
    const req = (0, eval)("require") as (moduleName: string) => unknown;
    req("react-native-url-polyfill/auto");
  } catch {
    // Mobile/web runtime without the polyfill stays best-effort.
  }
}

function tryLoadAsyncStorage(): SupabaseAuthStorage | undefined {
  try {
    const req = (0, eval)("require") as RuntimeRequire;
    const mod = req("@react-native-async-storage/async-storage") as {
      default?: SupabaseAuthStorage;
    };
    return mod.default;
  } catch {
    return undefined;
  }
}

const DEBUG_SUPABASE_REST = false;

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
    const headers = new Headers(init?.headers || {});

    if (SUPABASE_ANON_KEY) {
      if (!headers.has("apikey")) headers.set("apikey", SUPABASE_ANON_KEY);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
      }
    }

    return fetchWithRequestTimeout(
      input,
      {
        ...(init ?? {}),
        headers,
        ...(tag === "web"
          ? {
              keepalive: false,
              cache: "no-store" as RequestCache,
            }
          : {}),
      },
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
    : tryLoadAsyncStorage();
const supabaseClientFetch: typeof fetch = isWeb && supabaseFetch ? supabaseFetch : nativeFetch;

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

  try {
    const session = await supabase.auth.getSession();
    if (session?.data?.session?.user) return true;
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : String(error ?? "");
      console.warn("[ensureSignedIn] session check failed:", message || error);
    }
  }

  if (!isNodeRuntime) {
    try {
      const mod = await import("expo-router");
      mod.router.replace("/auth/login");
    } catch {
      // Non-router runtimes stay best-effort.
    }
  }

  return false;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const session = await supabase.auth.getSession();
    return session?.data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}
