import { supabase } from "../supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export const client: SupabaseClient = supabase;

export const parseErr = (e: any) =>
  e?.message ||
  e?.error_description ||
  (typeof e === "string"
    ? e
    : (() => {
        try { return JSON.stringify(e); } catch { return String(e); }
      })());

export const normStr = (s?: string | null) => String(s ?? "").trim().toLowerCase();

export const normalizeUuid = (raw: string | null | undefined) => {
  const s = String(raw ?? "").trim().replace(/^#/, "");
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(s) ? s : null;
};

// UUID-only, запрещаем timestamp/числа как id
export const toFilterId = (v: number | string) => {
  const raw = String(v ?? "").trim().replace(/^#/, "");
  if (!raw) return null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRe.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return null;
  return null;
};

export const toRpcId = (id: number | string) => String(id);

// rpcCompat как у тебя, но “в ядре”
export async function rpcCompat<T = any>(
  variants: Array<{ fn: string; args?: Record<string, any> }>
): Promise<T> {
  let lastErr: any = null;
  for (const v of variants) {
    try {
      const { data, error } = await supabase.rpc(v.fn as any, v.args as any);
      if (!error) return data as T;
      lastErr = error;
      const msg = String(error?.message || "");
      if (msg.includes("Could not find") || (error as any)?.code === "PGRST302") continue;
    } catch (e: any) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as unknown as T;
}
