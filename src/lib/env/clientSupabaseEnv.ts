const normalizeEnvText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

export const SUPABASE_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";

export function normalizeSupabaseUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return "";
  }
}

export const EXPO_PUBLIC_SUPABASE_URL = normalizeEnvText(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const EXPO_PUBLIC_SUPABASE_ANON_KEY = normalizeEnvText(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const SUPABASE_URL = EXPO_PUBLIC_SUPABASE_URL
  ? normalizeSupabaseUrl(EXPO_PUBLIC_SUPABASE_URL)
  : "";
export const SUPABASE_ANON_KEY = EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_HOST = (() => {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : "";
  } catch {
    return "";
  }
})();

export const isClientSupabaseEnvValid = () =>
  Boolean(SUPABASE_URL && /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_ANON_KEY);
