import { supabase } from "../supabaseClient";
import { callRateLimitedSupabaseRpc } from "./supabaseRpcAdapter";
import type {
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

export type RpcCompatTransportVariant<TName extends RpcName = RpcName> =
  RpcVariantMap[TName];

export type RpcCompatTransportResult = {
  data: unknown;
  error: unknown;
};

export async function runUntypedRpcTransport(
  fn: string,
  args?: Record<string, unknown>,
): Promise<RpcCompatTransportResult> {
  const variant = args === undefined ? { fn } : { fn, args };
  return runRpcCompatTransportVariant(variant as RpcCompatTransportVariant);
}

export async function runRpcCompatTransportVariant<TName extends RpcName>(
  variant: RpcCompatTransportVariant<TName>,
): Promise<RpcCompatTransportResult> {
  if ("args" in variant && variant.args !== undefined) {
    const args = variant.args ?? undefined;
    return (await callRateLimitedSupabaseRpc(
      supabase,
      variant.fn,
      args as Record<string, unknown>,
      {
        context: {
          owner: "core_rpc_compat_transport",
          caller: "runRpcCompatTransportVariant",
          source: "compat_transport",
        },
      },
    )) as RpcCompatTransportResult;
  }
  return (await callRateLimitedSupabaseRpc(
    supabase,
    variant.fn,
    undefined,
    {
      context: {
        owner: "core_rpc_compat_transport",
        caller: "runRpcCompatTransportVariant",
        source: "compat_transport",
      },
    },
  )) as RpcCompatTransportResult;
}
