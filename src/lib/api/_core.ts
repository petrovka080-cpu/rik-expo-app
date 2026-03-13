import { supabase } from "../supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export const client: SupabaseClient = supabase;

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  code?: unknown;
};

type RpcVariant = {
  fn: string;
  args?: Record<string, unknown>;
};

const asErrorLike = (value: unknown): ErrorLike | null =>
  value && typeof value === "object" ? (value as ErrorLike) : null;

export const parseErr = (e: unknown) =>
  String(
    asErrorLike(e)?.message ||
      asErrorLike(e)?.error_description ||
      (typeof e === "string"
        ? e
        : (() => {
            try {
              return JSON.stringify(e);
            } catch {
              return String(e);
            }
          })()),
  );

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
export async function rpcCompat<T = unknown>(
  variants: RpcVariant[],
): Promise<T> {
  let lastErr: unknown = null;
  for (const v of variants) {
    try {
      const { data, error } = await supabase.rpc(v.fn, v.args);
      if (!error) return data as T;
      lastErr = error;
      const msg = String(error?.message || "");
      if (msg.includes("Could not find") || asErrorLike(error)?.code === "PGRST302") continue;
    } catch (e: unknown) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as unknown as T;
}
