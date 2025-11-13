// src/lib/supabaseClient.ts
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = typeof window !== 'undefined';

// —–– ENV —––
const rawUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/^['"]|['"]$/g, '');
const rawKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().replace(/^['"]|['"]$/g, '');

// нормализуем URL: убираем хвостовой слеш и сразу валидируем
function normUrl(u: string): string {
  if (!u) return '';
  const url = new URL(u);
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export const SUPABASE_URL = rawUrl ? normUrl(rawUrl) : '';
export const SUPABASE_ANON_KEY = rawKey;
export const SUPABASE_HOST = (() => {
  try { return SUPABASE_URL ? new URL(SUPABASE_URL).host : ''; } catch { return ''; }
})();

if (process.env.NODE_ENV !== 'production') {
  console.log('[SUPABASE_URL]', SUPABASE_URL || '(empty)');
  console.log('[SUPABASE_HOST]', SUPABASE_HOST || '(empty)');
  console.log('[SUPABASE_ANON_KEY..12]', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 12) + '...' : '(empty)');
}

// если env битые — не создаём клиент (чтобы не спамить сетевыми ошибками)
function assertEnv() {
  const ok = SUPABASE_URL && /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_ANON_KEY;
  if (!ok) {
    const msg = '[supabaseClient] Missing/invalid EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY. Проверь .env.local и перезапусти `expo start -c`.';
    if (process.env.NODE_ENV !== 'production') console.warn(msg);
  }
  return ok;
}

// —–– CLIENT —––
export const supabase: SupabaseClient = assertEnv()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: isWeb,              // web: обрабатываем фрагменты
        storage: isWeb ? window.localStorage : AsyncStorage,
      },
      realtime: { params: { eventsPerSecond: 5 } },
      global: { headers: { 'x-client-info': 'rik-expo-app' } },
    })
  // заглушка, чтобы не падали импорты до того, как поправишь .env
  : (undefined as unknown as SupabaseClient);

// —–– HELPERS —––
export async function ensureSignedIn(): Promise<void> {
  if (!supabase) return; // .env не готов
  try {
    const sess = await supabase.auth.getSession();
    if (sess?.data?.session?.user) return;
  } catch { /* ignore */ }

  const email = String(process.env.EXPO_PUBLIC_SUPABASE_EMAIL ?? '').trim();
  const password = String(process.env.EXPO_PUBLIC_SUPABASE_PASSWORD ?? '').trim();
  if (!email || !password) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ensureSignedIn] нет сессии и не заданы EXPO_PUBLIC_SUPABASE_EMAIL/_PASSWORD — пропускаю автологин.');
    }
    return;
  }
  try {
    if (process.env.NODE_ENV !== 'production') console.log(`[ensureSignedIn] signInWithPassword for ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data?.session?.user) throw new Error('signIn returned no session/user');
  } catch (e: any) {
    console.warn('[ensureSignedIn] signInWithPassword failed:', e?.message ?? String(e));
  }
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const sess = await supabase.auth.getSession();
    return sess?.data?.session?.user?.id ?? null;
  } catch { return null; }
}
