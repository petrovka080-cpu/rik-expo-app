// src/lib/supabaseClient.ts
// 1) Полный полифилл URL/Blob и т.п. для RN/Web/Hermes
import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * .env (в корне проекта):
 * EXPO_PUBLIC_SUPABASE_URL=https://mbrbtwynytjschvfvktp.supabase.co
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * EXPO_PUBLIC_SUPABASE_EMAIL=petrovka080@gmail.com
 * EXPO_PUBLIC_SUPABASE_PASSWORD=SuperPass123!
 */

// 2) Читаем публичные ENV (Expo пробрасывает ТОЛЬКО с префиксом EXPO_PUBLIC_)
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// 3) Диагностические логи (видны в DevTools/консоли браузера)
console.log('[SUPABASE_URL]', SUPABASE_URL || '(empty)');
console.log('[SUPABASE_ANON_KEY..12]', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 12) + '...' : '(empty)');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabaseClient] Missing EXPO_PUBLIC_SUPABASE_URL or _ANON_KEY in .env (did you `expo start -c`?)');
}

// 4) Создаём клиент. Второй аргумент = anon key → библиотека сама добавляет apikey/Authorization
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // веб хранит сессию в localStorage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: { params: { eventsPerSecond: 5 } },
  global: {
    headers: {
      'x-client-info': 'rik-expo-app',
    },
  },
});

/**
 * Проверяем наличие сессии; если её нет — логинимся почтой/паролем из .env.
 */
export async function ensureSignedIn(): Promise<void> {
  // получить текущую сессию
  const sess = await supabase.auth.getSession();
  if (sess?.data?.session?.user) return;

  const email = (process.env.EXPO_PUBLIC_SUPABASE_EMAIL || '').trim();
  const password = (process.env.EXPO_PUBLIC_SUPABASE_PASSWORD || '').trim();

  if (!email || !password) {
    const msg =
      'ensureSignedIn: no session AND EXPO_PUBLIC_SUPABASE_EMAIL/_PASSWORD not set. ' +
      'Either enable anonymous sign-in in Supabase Auth or configure credentials in .env and restart with `expo start -c`.';
    console.warn('[ensureSignedIn]', msg);
    throw new Error(msg);
  }

  console.log(`[ensureSignedIn] signInWithPassword for ${email}`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const hint = 'signInWithPassword failed: ' + (error.message || String(error));
    console.warn('[ensureSignedIn]', hint);
    throw new Error(hint);
  }
  if (!data?.session?.user) throw new Error('ensureSignedIn: signIn returned no session/user');
}

/** Удобно получить userId (или null) */
export async function currentUserId(): Promise<string | null> {
  try {
    const sess = await supabase.auth.getSession();
    return sess?.data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

