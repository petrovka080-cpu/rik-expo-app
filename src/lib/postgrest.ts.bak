const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SB_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const PG_HEADERS: Record<string, string> = {
  apikey: SB_ANON,
  Authorization: Bearer \,
  "Accept-Profile": "public",
  "Content-Profile": "public",
};

export function ensureSelect(url: string): string {
  if (!url.includes("/rest/v1/")) return url;
  const hasSelect = /[?&]select=/.test(url);
  if (hasSelect) return url;
  return url.includes("?") ? ${url}&select=* : ${url}?select=*;
}

export async function rest(url: string, init: RequestInit = {}) {
  const finalUrl = ensureSelect(url);
  const headers = { ...PG_HEADERS, ...(init.headers as any) };
  const res = await fetch(finalUrl, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(\REST \: \\);
  }
  return res;
}

export async function restJson<T = any>(url: string, init: RequestInit = {}) {
  const res = await rest(url, init);
  return (await res.json()) as T;
}

export const REST_BASE = ${SB_URL}/rest/v1;
