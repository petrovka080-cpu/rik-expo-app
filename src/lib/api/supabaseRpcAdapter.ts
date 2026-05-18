import {
  createRateLimitedRpcExecutor,
  defaultRpcRateLimiter,
  executeRateLimitedRpc,
  type RpcCallableClient,
  type RpcRateLimitContext,
  type RpcRateLimitedTransportResult,
  type RpcRateLimiter,
} from "./rpcRateLimitedClient";

const RATE_LIMITED_RPC_CLIENT = Symbol.for("rik.supabase.rateLimitedRpcClient");

type RateLimitedMarker = {
  [RATE_LIMITED_RPC_CLIENT]?: true;
};

type MaybeRpcCallableClient = Partial<RpcCallableClient> & object;

export type RateLimitedRpcClient<TClient extends RpcCallableClient> =
  TClient & RateLimitedMarker;

export type SupabaseRpcCallOptions = {
  context?: RpcRateLimitContext;
  limiter?: RpcRateLimiter;
};

const wrappedClients = new WeakMap<object, RpcCallableClient>();

function isRateLimitedRpcClient(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as RateLimitedMarker)[RATE_LIMITED_RPC_CLIENT] === true,
  );
}

export function createRpcRateLimitedSupabaseClient<TClient extends RpcCallableClient>(
  client: TClient,
  options?: SupabaseRpcCallOptions,
): RateLimitedRpcClient<TClient> {
  if (isRateLimitedRpcClient(client)) return client as RateLimitedRpcClient<TClient>;
  if (typeof (client as MaybeRpcCallableClient).rpc !== "function") {
    return client as RateLimitedRpcClient<TClient>;
  }

  const cached = wrappedClients.get(client as object);
  if (cached) return cached as RateLimitedRpcClient<TClient>;

  const limiter = options?.limiter ?? defaultRpcRateLimiter;
  const rawRpc = client.rpc.bind(client);
  const rateLimitedRpc = createRateLimitedRpcExecutor(rawRpc, limiter);

  const wrapped = new Proxy(client as object, {
    get(target, prop, receiver) {
      if (prop === RATE_LIMITED_RPC_CLIENT) return true;
      if (prop === "rpc") return rateLimitedRpc;

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") return value.bind(target);
      return value;
    },
  }) as RateLimitedRpcClient<TClient>;

  wrappedClients.set(client as object, wrapped);
  return wrapped;
}

export function callRateLimitedSupabaseRpc<
  TResult extends RpcRateLimitedTransportResult = RpcRateLimitedTransportResult,
>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown> | undefined,
  options?: SupabaseRpcCallOptions,
): Promise<TResult> {
  const limiter = options?.limiter ?? defaultRpcRateLimiter;
  const rpcClient = client as RpcCallableClient;
  const rawRpc = rpcClient.rpc.bind(rpcClient);
  return executeRateLimitedRpc(rawRpc, fn, args, undefined, limiter) as Promise<TResult>;
}

export function callRateLimitedSupabaseRpcBuilder<TBuilder>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown> | undefined,
  options?: SupabaseRpcCallOptions,
): TBuilder {
  return createRpcRateLimitedSupabaseClient(client as RpcCallableClient, options).rpc(fn, args) as TBuilder;
}
