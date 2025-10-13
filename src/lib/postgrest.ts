const SB_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const SB_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!SB_URL || !SB_ANON) {
  throw new Error("REST env missing: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const REST_BASE = ${SB_URL}/rest/v1;

export const defaultHeaders: Record<string, string> = {
  apikey: SB_ANON,
  Authorization: Bearer ,
  "Content-Type": "application/json",
  "Accept-Profile": "public",
};

export function withSelect(url: string): string {
  return url.includes("?") ? ${url}&select=* : ${url}?select=*;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(REST : );
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function restGet<T>(path: string, search = "", init?: RequestInit): Promise<T> {
  const url = ${REST_BASE}/;
  const res = await fetch(url, { method: "GET", headers: defaultHeaders, ...init });
  return handle<T>(res);
}

export async function restPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const url = ${REST_BASE}/;
  const res = await fetch(url, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  return handle<T>(res);
}

export async function restPatch<T>(path: string, search: string, body: unknown, init?: RequestInit): Promise<T> {
  const url = ${REST_BASE}/;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...defaultHeaders, Prefer: "return=representation" },
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  return handle<T>(res);
}

export async function restDelete<T>(path: string, search: string, init?: RequestInit): Promise<T> {
  const url = ${REST_BASE}/;
  const res = await fetch(url, { method: "DELETE", headers: defaultHeaders, ...init });
  return handle<T>(res);
}