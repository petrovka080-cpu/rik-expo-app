import { recordPlatformObservability } from "../observability/platformObservability";

type RpcTransport = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: unknown;
  }>;
};

export type RpcBoundaryResult<TData> = {
  data: TData | null;
  error: NullableRpcErrorLike;
};

export type RpcBoundaryContext = {
  screen: "buyer" | "contractor";
  surface: string;
  owner: string;
  sourceKind: string;
};

export type RpcErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} & Error;

export type NullableRpcErrorLike = RpcErrorLike | null;

export class RpcTransportBoundaryError extends Error {
  code: string | null;

  constructor(message: string, code = "rpc_transport_invalid") {
    super(message);
    this.name = "RpcTransportBoundaryError";
    this.code = code;
  }
}

const asRpcErrorLike = (value: unknown): NullableRpcErrorLike => {
  if (!value) return null;
  if (value instanceof Error) {
    return value as RpcErrorLike;
  }
  if (typeof value !== "object") {
    return new Error(String(value ?? "rpc_error")) as RpcErrorLike;
  }

  const error = value as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };
  const wrapped = new Error(
    typeof error.message === "string" && error.message.trim()
      ? error.message
      : "rpc_error",
  ) as RpcErrorLike;
  wrapped.details = typeof error.details === "string" ? error.details : null;
  wrapped.hint = typeof error.hint === "string" ? error.hint : null;
  wrapped.code = typeof error.code === "string" ? error.code : null;
  return wrapped;
};

const asRpcTransport = (client: unknown): RpcTransport | null => {
  if (!client || typeof client !== "object") return null;
  const maybeRpc = (client as { rpc?: unknown }).rpc;
  if (typeof maybeRpc !== "function") return null;
  return client as RpcTransport;
};

const recordBoundaryFailure = (
  context: RpcBoundaryContext | undefined,
  fn: string,
  error: RpcErrorLike,
  errorStage: "rpc_transport_guard" | "rpc_transport_call",
) => {
  if (!context) return;
  recordPlatformObservability({
    screen: context.screen,
    surface: context.surface,
    category: "fetch",
    event: "rpc_transport_boundary_fail",
    result: "error",
    sourceKind: context.sourceKind,
    errorStage,
    errorClass: error.name,
    errorMessage: error.message,
    extra: {
      owner: context.owner,
      rpcName: fn,
    },
  });
};

// Allowed suppression zone: generated Supabase RPC typings lag behind deployed RPC names.
// Keep the cast containment here instead of spreading `as never` across feature code.
export async function runContainedRpc<TData>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown>,
  context?: RpcBoundaryContext,
): Promise<RpcBoundaryResult<TData>> {
  const transport = asRpcTransport(client);
  if (!transport) {
    const error = new RpcTransportBoundaryError(
      `RPC transport owner is unavailable for ${fn}`,
    ) as RpcErrorLike;
    recordBoundaryFailure(context, fn, error, "rpc_transport_guard");
    return {
      data: null,
      error,
    };
  }

  try {
    const result = args == null ? await transport.rpc(fn) : await transport.rpc(fn, args);
    return {
      data: (result.data ?? null) as TData | null,
      error: asRpcErrorLike(result.error),
    };
  } catch (error) {
    const normalizedError =
      asRpcErrorLike(error) ??
      (new RpcTransportBoundaryError(`RPC invocation failed for ${fn}`) as RpcErrorLike);
    recordBoundaryFailure(context, fn, normalizedError, "rpc_transport_call");
    return {
      data: null,
      error: normalizedError,
    };
  }
}
