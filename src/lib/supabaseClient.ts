// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const isWeb = typeof window !== "undefined" && typeof document !== "undefined";
const isNodeRuntime =
  typeof process !== "undefined" &&
  !!(process as any).versions?.node &&
  typeof window === "undefined";

if (!isNodeRuntime) {
  try {
    const req = (0, eval)("require") as (m: string) => unknown;
    req("react-native-url-polyfill/auto");
  } catch {
    // no-op
  }
}

function tryLoadAsyncStorage(): any | undefined {
  try {
    // Keep RN persistence in mobile runtime; avoid hard dependency in Node worker.
    const req = (0, eval)("require") as (m: string) => any;
    return req("@react-native-async-storage/async-storage").default;
  } catch {
    return undefined;
  }
}

const DEBUG_SUPABASE_REST = false; // ⚠️ debug-флаг, НЕ влияет на логику

export const SUPABASE_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";

// —–– ENV —––
const rawUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const rawKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const rawServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const useServiceRoleInNodeWorker =
  isNodeRuntime &&
  process.env.RIK_QUEUE_WORKER_USE_SERVICE_ROLE === "true" &&
  !!rawServiceRoleKey;
const resolvedSupabaseKey = useServiceRoleInNodeWorker ? rawServiceRoleKey : rawKey;

// нормализуем URL: убираем хвостовой слеш и сразу валидируем
function normUrl(u: string): string {
  if (!u) return "";
  const url = new URL(u);
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

export const SUPABASE_URL = rawUrl ? normUrl(rawUrl) : "";
export const SUPABASE_ANON_KEY = rawKey;
export const SUPABASE_KEY_KIND = useServiceRoleInNodeWorker ? "service_role" : "anon";
export const SUPABASE_HOST = (() => {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : "";
  } catch {
    return "";
  }
})();

/**
 * Чиним "голые" timestamp-параметры, которые ломают PostgREST:
 *   ...?1767063864951
 *   ...&1767063864951
 * PostgREST воспринимает это как фильтр => PGRST100
 */
function fixNakedTimestamp(urlStr: string): string {
  let s = String(urlStr || "");

  // Быстрый выход
  if (!/[?&]\d{13}([&]|$)/.test(s)) return s;

  try {
    const u = new URL(s);

    // URLSearchParams трактует "&1767..." как key="1767..." value=""
    // Переносим такие ключи в нормальный параметр _ts
    const toMove: string[] = [];
    u.searchParams.forEach((value, key) => {
      if (/^\d{13}$/.test(key) && (value == null || value === "")) {
        toMove.push(key);
      }
    });

    if (toMove.length) {
      // оставим последний как _ts
      const last = toMove[toMove.length - 1];
      for (const k of toMove) u.searchParams.delete(k);
      u.searchParams.set("_ts", last);
    }

    s = u.toString();
  } catch {
    // Fallback regex если URL() не распарсился
    s = s.replace(/([?&])(\d{13})(?=(&|$))/g, "$1_ts=$2");
  }

  // подчистим мусор типа "?&" и хвостовые
  s = s.replace(/\?&/g, "?").replace(/[?&]$/g, "");
  return s;
}

// ===== DEBUG: логируем REST-запросы Supabase (web + phone) =====
const wrapFetchWithLog = (tag: string, baseFetch: typeof fetch): typeof fetch => {
  return async (input: any, init: any = {}) => {
    const originalUrl =
      typeof input === "string"
        ? input
        : input?.url
          ? String(input.url)
          : String(input);

    const fixedUrl = fixNakedTimestamp(originalUrl);

    // ✅ сначала предупреждение, если что-то починили
    if (DEBUG_SUPABASE_REST && fixedUrl !== originalUrl) {
      console.warn(`${tag} SUPABASE REST: fixed naked timestamp`, {
        before: originalUrl,
        after: fixedUrl,
      });
    }

    // ✅ потом лог запроса (только /rest/v1/)
    if (DEBUG_SUPABASE_REST && String(fixedUrl).includes("/rest/v1/")) {
      console.log(`${tag} SUPABASE REST:`, fixedUrl);
    }


    // если input был Request — пересоздаём Request с исправленным url
    let patchedInput: any = fixedUrl;
    if (typeof input !== "string" && input?.url) {
      try {
        patchedInput = new Request(fixedUrl, input);
      } catch {
        patchedInput = fixedUrl;
      }
    }
    return baseFetch(patchedInput, init);
  };
};

// если env битые — не создаём клиент (чтобы не спамить сетевыми ошибками)
function assertEnv() {
  const ok =
    SUPABASE_URL && /^https?:\/\//i.test(SUPABASE_URL) && resolvedSupabaseKey;
  const looksLikeTargetProject = SUPABASE_HOST?.startsWith(`${SUPABASE_PROJECT_REF}.`);

  if (ok && !looksLikeTargetProject) {
    console.warn(
      `[supabaseClient] SUPABASE_URL host ("${SUPABASE_HOST}") не совпадает с ref ${SUPABASE_PROJECT_REF}. Исправь .env.local и перезапусти bundler.`,
    );
  }
  if (!ok) {
    const msg =
      "[supabaseClient] Missing/invalid EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY. Проверь .env.local и перезапусти `expo start -c`.";
    if (process.env.NODE_ENV !== "production") console.warn(msg);
  }
  return ok;
}

// WEB fetch: твоя логика headers + timeout, просто оборачиваем логом
const supabaseFetch: typeof fetch | undefined = isWeb
  ? wrapFetchWithLog("🌐", (input: any, init: any = {}) => {
    const headers = new Headers(init.headers || {});

    if (resolvedSupabaseKey) {
      if (!headers.has("apikey")) headers.set("apikey", resolvedSupabaseKey);
      if (!headers.has("Authorization"))
        headers.set("Authorization", `Bearer ${resolvedSupabaseKey}`);
    }

    const controller = new AbortController();
    const timeoutMs = 20000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    return window
      .fetch(input, {
        ...init,
        headers,
        keepalive: false,
        cache: "no-store",
        signal: controller.signal,
      })
      .finally(() => clearTimeout(t));
  })
  : undefined;

// NATIVE fetch: логируем и чиним URL
const nativeFetch: typeof fetch = wrapFetchWithLog("📱", fetch);

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

// —–– CLIENT —––
export const isSupabaseEnvValid = assertEnv();
const authStorage = isWeb
  ? window.localStorage
  : isNodeRuntime
    ? undefined
    : tryLoadAsyncStorage();
export const supabase: SupabaseClient<Database> = isSupabaseEnvValid
  ? createClient<Database>(SUPABASE_URL, resolvedSupabaseKey, {
    auth: {
      persistSession: !useServiceRoleInNodeWorker,
      autoRefreshToken: !useServiceRoleInNodeWorker,
      detectSessionInUrl: isWeb,
      storage: authStorage,
    },
    realtime: { params: { eventsPerSecond: 5 } },
    global: {
      headers: { "x-client-info": "rik-expo-app" },
      fetch: (isWeb ? supabaseFetch : nativeFetch) as any,
    },
  })
  : createMissingSupabaseClient();

// —–– HELPERS —––
export async function ensureSignedIn(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const sess = await supabase.auth.getSession();
    if (sess?.data?.session?.user) return true;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ensureSignedIn] session check failed:", (e as any)?.message ?? e);
    }
  }

  if (!isNodeRuntime) {
    try {
      const mod = await import("expo-router");
      mod.router.replace("/auth/login");
    } catch {
      // Node worker / non-router runtimes: no-op redirect.
    }
  }
  return false;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const sess = await supabase.auth.getSession();
    return sess?.data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}
