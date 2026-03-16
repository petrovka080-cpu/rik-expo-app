import { supabase } from "../supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type RpcFunctions = Database["public"]["Functions"];
type RpcName = keyof RpcFunctions;
type RpcArgs<TName extends RpcName> = RpcFunctions[TName]["Args"];
type RpcVariantMap = {
  [TName in RpcName]: undefined extends RpcArgs<TName>
    ? { fn: TName; args?: RpcArgs<TName> }
    : { fn: TName; args: RpcArgs<TName> };
};

export const client: SupabaseClient<Database> = supabase;

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  code?: unknown;
};

type RpcVariant<TName extends RpcName = RpcName> = RpcVariantMap[TName];

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
  variants: ReadonlyArray<RpcVariant>,
): Promise<T> {
  const runRpc = async <TName extends RpcName>(variant: RpcVariant<TName>) => {
    if ("args" in variant && variant.args !== undefined) {
      return (await supabase.rpc(variant.fn, variant.args)) as { data: unknown; error: unknown };
    }
    return (await supabase.rpc(variant.fn)) as { data: unknown; error: unknown };
  };

  let lastErr: unknown = null;
  for (const v of variants) {
    try {
      const { data, error } = await runRpc(v);
      if (!error) return data as T;
      lastErr = error;
      const msg = String(asErrorLike(error)?.message || "");
      if (msg.includes("Could not find") || asErrorLike(error)?.code === "PGRST302") continue;
    } catch (e: unknown) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as unknown as T;
}
