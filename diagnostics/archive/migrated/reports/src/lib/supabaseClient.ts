import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = typeof window !== 'undefined';

// —–– ENV —––
const isProd = process.env.NODE_ENV === 'production';
// Fallback values только для local/dev, чтобы не держать боевые ключи в коде
const FALLBACK_URL = isProd ? '' : 'https://hfhpminaxxzyosquorii.supabase.co';
const FALLBACK_KEY = isProd
  ? ''
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaHBtaW5heHh6eW9zcXVvcmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjM0MzQsImV4cCI6MjA4MjQ5OTQzNH0.9ayClLqjDBVt6cS0UISlEZmtRPGLfBJsCr8FaP2TMCE';

const rawUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL)
  .trim()
  .replace(/^['"]|['"]$/g, '');

const rawKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY)
  .trim()
  .replace(/^['"]|['"]$/g, '');

// нормализуем URL: убираем хвостовой слеш и сразу валидируем
function normUrl(u: string): string {
  if (!u) return '';
  try {
    const url = new URL(u);
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return '';
  }
}

export const SUPABASE_URL = rawUrl ? normUrl(rawUrl) : '';
export const SUPABASE_ANON_KEY = rawKey;

export const SUPABASE_HOST = (() => {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : '';
  } catch {
    return '';
  }
})();

// ✅ ref проекта берём из URL (никаких хардкодов)
export const SUPABASE_PROJECT_REF = (() => {
  try {
    const host = SUPABASE_URL ? new URL(SUPABASE_URL).host : '';
    // mtyyoikklghhbvzsbtuc.supabase.co -> mtyyoikklghhbvzsbtuc
    return host.split('.')[0]?.trim() ?? '';
  } catch {
    return '';
  }
})();

// если env битые — не создаём клиент (чтобы не спамить сетевыми ошибками)
function assertEnv() {
  const ok = SUPABASE_URL && /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_ANON_KEY;

  // для быстрой диагностики
  if (process.env.NODE_ENV !== 'production') {
    console.log('[supabase] url =', SUPABASE_URL);
    console.log('[supabase] host =', SUPABASE_HOST);
    console.log('[supabase] ref =', SUPABASE_PROJECT_REF);
  }

  const looksLikeTargetProject =
    SUPABASE_PROJECT_REF && SUPABASE_HOST?.startsWith(`${SUPABASE_PROJECT_REF}.`);

  if (ok && !looksLikeTargetProject) {
    console.warn(
      `[supabaseClient] SUPABASE_URL host ("${SUPABASE_HOST}") не совпадает с ref "${SUPABASE_PROJECT_REF}". ` +
      'Проверь .env.local и перезапусти bundler: npx expo start -c'
    );
  }

  if (!ok) {
    const msg =
      '[supabaseClient] Missing/invalid EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY. ' +
      'Проверь .env.local и перезапусти `npx expo start -c`.';
    if (process.env.NODE_ENV !== 'production') console.warn(msg);
  }

  return ok;
}

import { Database } from '../types/supabase';
export type { Database };

// —–– CLIENT —––
// NOTE: Using untyped client to avoid 'never' type errors from complex schema.
// Type safety is provided at the application layer through explicit type assertions.

const createSupabaseClient = () => {
  if (!assertEnv()) {
    return undefined as unknown as ReturnType<typeof createClient>;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isWeb,
      // Use localStorage directly for web, AsyncStorage for native
      ...(isWeb ? {} : { storage: AsyncStorage }),
      // Prevent deadlocks
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 5 } },
    global: { headers: { 'x-client-info': 'solto-app' } },
  });

  console.log('[supabase] Client created successfully');
  return client;
};

export const supabase = createSupabaseClient();

// —–– HELPERS —––
export async function ensureSignedIn(): Promise<boolean> {
  if (!supabase) return false; // .env не готов

  try {
    const sess = await supabase.auth.getSession();
    if (sess?.data?.session?.user) return true;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ensureSignedIn] session check failed:', (e as any)?.message ?? e);
    }
  }

  router.replace('/auth/login');
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
