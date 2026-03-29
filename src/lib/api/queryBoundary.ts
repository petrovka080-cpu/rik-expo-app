type RpcTransport = {
  rpc: unknown;
};
type UnsafeRpcInvoker = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{
  data: unknown;
  error: unknown;
}>;

export type RpcBoundaryResult<TData> = {
  data: TData | null;
  error: NullableRpcErrorLike;
};

const asUnsafeRpcInvoker = (client: RpcTransport): UnsafeRpcInvoker =>
  client.rpc as unknown as UnsafeRpcInvoker;

export type RpcErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} & Error;

export type NullableRpcErrorLike = RpcErrorLike | null;

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

// Allowed suppression zone: generated Supabase RPC typings lag behind deployed RPC names.
// Keep the cast containment here instead of spreading `as never` across feature code.
export async function runContainedRpc<TData>(
  client: RpcTransport,
  fn: string,
  args?: Record<string, unknown>,
): Promise<RpcBoundaryResult<TData>> {
  const invoke = asUnsafeRpcInvoker(client);
  const result = args == null ? await invoke(fn) : await invoke(fn, args);
  return {
    data: (result.data ?? null) as TData | null,
    error: asRpcErrorLike(result.error),
  };
}
