import {
  RpcRateLimiter,
  RpcRuntimeRateLimitError,
} from "../../src/lib/api/rpcRateLimitedClient";
import { createRpcRateLimitedSupabaseClient } from "../../src/lib/api/supabaseRpcAdapter";

type FakeRpcResult = {
  data: unknown;
  error: null;
};

type FakeRpcBuilder = {
  abortSignal: jest.Mock;
  maybeSingle: jest.Mock;
  then: Promise<FakeRpcResult>["then"];
  catch: Promise<FakeRpcResult>["catch"];
  finally: Promise<FakeRpcResult>["finally"];
};

function createFakeBuilder(result: FakeRpcResult): FakeRpcBuilder {
  const promise = Promise.resolve(result);
  return {
    abortSignal: jest.fn(() => createFakeBuilder(result)),
    maybeSingle: jest.fn(() =>
      createFakeBuilder({
        data: { single: true, value: result.data },
        error: null,
      }),
    ),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
}

describe("api: rate-limited RPC client", () => {
  it("routes RPC calls through runtime limiter and preserves awaited Supabase result shape", async () => {
    const rpc = jest.fn((fn: string, args?: unknown) =>
      createFakeBuilder({ data: { fn, args }, error: null }),
    );
    const client = createRpcRateLimitedSupabaseClient({ rpc });

    const result = await client.rpc("get_my_role");

    expect(result).toEqual({ data: { fn: "get_my_role", args: undefined }, error: null });
    expect(rpc).toHaveBeenCalledWith("get_my_role");
  });

  it("preserves builder chaining such as maybeSingle before the rate-limited await", async () => {
    const rpc = jest.fn((fn: string, args?: unknown) =>
      createFakeBuilder({ data: { fn, args }, error: null }),
    );
    const client = createRpcRateLimitedSupabaseClient({ rpc });

    const result = await client
      .rpc("marketplace_item_scope_detail_v1", { p_listing_id: "listing-1" })
      .maybeSingle();

    expect(result).toEqual({
      data: {
        single: true,
        value: {
          fn: "marketplace_item_scope_detail_v1",
          args: { p_listing_id: "listing-1" },
        },
      },
      error: null,
    });
  });

  it("rejects unbounded bounded-list RPCs before the transport executes", async () => {
    const rpc = jest.fn((fn: string, args?: unknown) =>
      createFakeBuilder({ data: { fn, args }, error: null }),
    );
    const client = createRpcRateLimitedSupabaseClient({ rpc });

    await expect(client.rpc("marketplace_items_scope_page_v1", {})).rejects.toBeInstanceOf(
      RpcRuntimeRateLimitError,
    );
  });

  it("queues over-window calls instead of dropping business flows", async () => {
    let now = 0;
    const sleeps: number[] = [];
    const limiter = new RpcRateLimiter({
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });
    const rpc = jest.fn((fn: string, args?: unknown) =>
      createFakeBuilder({ data: { fn, args }, error: null }),
    );
    const client = createRpcRateLimitedSupabaseClient({ rpc }, { limiter });

    const calls = Array.from({ length: 121 }, () =>
      client.rpc("rpc_proposal_submit_v3", {
        p_request_id: "request-id",
        p_client_mutation_id: "client-mutation-id",
      }),
    );

    await Promise.all(calls);

    expect(rpc).toHaveBeenCalledTimes(121);
    expect(sleeps.some((ms) => ms > 0)).toBe(true);
  });
});
