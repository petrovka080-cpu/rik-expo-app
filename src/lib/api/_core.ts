import { supabase } from "../supabaseClient";
import type {
  AppSupabaseClient,
  PublicFunctionArgs,
  PublicFunctionName,
} from "../../types/contracts/shared";

type RpcName = PublicFunctionName;
type RpcArgs<TName extends RpcName> = PublicFunctionArgs<TName>;
type RpcVariantMap = {
  [TName in RpcName]: undefined extends RpcArgs<TName>
    ? { fn: TName; args?: RpcArgs<TName> }
    : { fn: TName; args: RpcArgs<TName> };
};

export const client: AppSupabaseClient = supabase;

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  code?: unknown;
};

type RpcVariant<TName extends RpcName = RpcName> = RpcVariantMap[TName];

export type RpcCompatErrorKind =
  | "missing_function"
  | "permission"
  | "auth"
  | "validation"
  | "transient"
  | "unknown";

export type RpcCompatErrorDecision = {
  kind: RpcCompatErrorKind;
  allowNextVariant: boolean;
  reason: string;
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

const errorMessageLower = (error: unknown) => parseErr(error).toLowerCase();

const errorCodeLower = (error: unknown) =>
  String(asErrorLike(error)?.code ?? "")
    .trim()
    .toLowerCase();

export function classifyRpcCompatError(error: unknown): RpcCompatErrorDecision {
  const msg = errorMessageLower(error);
  const code = errorCodeLower(error);

  if (
    code === "pgrst302" ||
    msg.includes("could not find") ||
    (msg.includes("/rpc/") && msg.includes("404")) ||
    (msg.includes("function") && msg.includes("does not exist")) ||
    msg.includes("schema cache")
  ) {
    return {
      kind: "missing_function",
      allowNextVariant: true,
      reason: "rpc_missing_or_incompatible",
    };
  }

  if (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security")
  ) {
    return {
      kind: "permission",
      allowNextVariant: false,
      reason: "permission_denied",
    };
  }

  if (
    code === "pgrst301" ||
    msg.includes("jwt") ||
    msg.includes("not authorized") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid token") ||
    msg.includes("auth")
  ) {
    return {
      kind: "auth",
      allowNextVariant: false,
      reason: "auth_error",
    };
  }

  if (
    code.startsWith("22") ||
    code.startsWith("23") ||
    msg.includes("violates") ||
    msg.includes("invalid input") ||
    msg.includes("null value") ||
    msg.includes("must not") ||
    msg.includes("validation")
  ) {
    return {
      kind: "validation",
      allowNextVariant: false,
      reason: "validation_or_invariant_error",
    };
  }

  if (
    code.startsWith("08") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("connection")
  ) {
    return {
      kind: "transient",
      allowNextVariant: false,
      reason: "transient_transport_error",
    };
  }

  return {
    kind: "unknown",
    allowNextVariant: false,
    reason: "semantic_or_unknown_error",
  };
}

// rpcCompat как у тебя, но “в ядре”
export async function rpcCompat<T = unknown>(
  variants: readonly RpcVariant[],
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
      const decision = classifyRpcCompatError(error);
      if (decision.allowNextVariant) continue;
      throw error;
    } catch (e: unknown) {
      lastErr = e;
      const decision = classifyRpcCompatError(e);
      if (decision.allowNextVariant) continue;
      throw e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as unknown as T;
}
