import { listBuyerInbox } from "../../src/lib/api/buyer";
import { supabase as mockedSupabase } from "../../src/lib/supabaseClient";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../src/lib/observability/platformObservability";

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const mockSupabase = mockedSupabase as unknown as {
  rpc: jest.Mock;
  from: jest.Mock;
};

const makeInboxRow = (index: number) => ({
  request_id: `request-${index}`,
  request_item_id: `item-${index}`,
  name_human: `item ${index}`,
  qty: 1,
  status: "approved",
});

const buildPagedQuery = (
  rangeImpl: (from: number, to: number) => Promise<unknown>,
) => {
  const chain = {
    select: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn(rangeImpl),
  };
  chain.select.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
};

const installRequestsStatusRead = () => {
  const requestsQuery = buildPagedQuery(async () => ({
    data: [{ id: "request-1", status: "approved" }],
    error: null,
  }));
  mockSupabase.from.mockImplementation((table: string) => {
    if (table !== "requests") throw new Error(`Unexpected table ${table}`);
    return requestsQuery;
  });
  return requestsQuery;
};

describe("buyer legacy inbox API bounded routing", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockSupabase.rpc.mockReset();
    mockSupabase.from.mockReset();
  });

  it("routes listBuyerInbox through the typed window scope instead of unwindowed list_buyer_inbox", async () => {
    const requestsQuery = installRequestsStatusRead();
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        document_type: "buyer_summary_inbox_scope_v1",
        version: "1",
        rows: [makeInboxRow(1)],
        meta: {
          total_group_count: 1,
          returned_group_count: 1,
          has_more: false,
        },
      },
      error: null,
    });

    await expect(listBuyerInbox()).resolves.toEqual([
      expect.objectContaining({
        request_id: "request-1",
        request_item_id: "item-1",
      }),
    ]);

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "buyer_summary_inbox_scope_v1",
      {
        p_offset: 0,
        p_limit: 100,
        p_search: null,
        p_company_id: null,
      },
    );
    expect(mockSupabase.rpc).not.toHaveBeenCalledWith(
      "list_buyer_inbox",
      expect.anything(),
    );
    expect(requestsQuery.range).toHaveBeenCalledWith(0, 99);
  });

  it("fails closed when the typed window scope exceeds the legacy compatibility ceiling", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        document_type: "buyer_summary_inbox_scope_v1",
        version: "1",
        rows: [makeInboxRow(1)],
        meta: {
          total_group_count: 5001,
          returned_group_count: 1,
          has_more: true,
        },
      },
      error: null,
    });

    await expect(listBuyerInbox()).rejects.toThrow("max groups ceiling");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("request_items");
  });

  it("fails closed when the request_items compatibility fallback exceeds maxRows", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("scope unavailable"),
    });

    const requestItemsQuery = buildPagedQuery(async (from, to) => ({
      data:
        from >= 5000
          ? [makeInboxRow(from)]
          : Array.from({ length: to - from + 1 }, (_, offset) =>
              makeInboxRow(from + offset),
            ),
      error: null,
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table !== "request_items")
        throw new Error(`Unexpected table ${table}`);
      return requestItemsQuery;
    });

    await expect(listBuyerInbox()).rejects.toThrow("max row ceiling");
    expect(requestItemsQuery.range).toHaveBeenCalledWith(5000, 5000);
  });

  it("records buyer inbox fallback exhaustion before preserving the empty-list contract", async () => {
    const rpcError = new Error("scope unavailable");
    const fallbackError = new Error("request_items unavailable");
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: rpcError,
    });

    const requestItemsQuery = buildPagedQuery(async () => ({
      data: null,
      error: fallbackError,
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table !== "request_items")
        throw new Error(`Unexpected table ${table}`);
      return requestItemsQuery;
    });

    await expect(listBuyerInbox()).resolves.toEqual([]);

    const events = getPlatformObservabilityEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "inbox_window",
          event: "buyer_inbox_scope_rpc_failed",
          result: "error",
          fallbackUsed: true,
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
          errorStage: "scope_rpc",
          extra: expect.objectContaining({
            fallbackReason: "request_items_compatibility_fallback",
          }),
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "inbox_window",
          event: "buyer_inbox_compatibility_fallback_failed",
          result: "error",
          fallbackUsed: true,
          sourceKind: "table:request_items",
          errorStage: "compatibility_fallback",
          extra: expect.objectContaining({
            fallbackReason: "empty_list_legacy_contract",
          }),
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "inbox_window",
          event: "load_buyer_inbox",
          result: "error",
          fallbackUsed: true,
          sourceKind: "table:request_items",
          errorStage: "fallback_exhausted",
          rowCount: 0,
          extra: expect.objectContaining({
            publishState: "empty_after_fallback_error",
          }),
        }),
      ]),
    );
  });

  it("rejects malformed fallback rows before buyer inbox mapping", async () => {
    const rpcError = new Error("scope unavailable");
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: rpcError,
    });

    const requestItemsQuery = buildPagedQuery(async () => ({
      data: [42],
      error: null,
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table !== "request_items")
        throw new Error(`Unexpected table ${table}`);
      return requestItemsQuery;
    });

    await expect(listBuyerInbox()).resolves.toEqual([]);

    expect(requestItemsQuery.range).toHaveBeenCalledWith(0, 99);
    const events = getPlatformObservabilityEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "inbox_window",
          event: "buyer_inbox_compatibility_fallback_failed",
          result: "error",
          sourceKind: "table:request_items",
          errorStage: "compatibility_fallback",
        }),
      ]),
    );
  });
});
