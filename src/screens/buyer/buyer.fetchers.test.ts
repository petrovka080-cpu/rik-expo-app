import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import {
  loadBuyerBucketsData,
  loadBuyerBucketsDataRpc,
  loadBuyerInboxData,
  loadBuyerInboxWindowData,
} from "./buyer.fetchers";
import { RpcValidationError } from "../../lib/api/queryBoundary";

const buildScopeEnvelope = (params: {
  rows: Record<string, unknown>[];
  offsetGroups: number;
  limitGroups: number;
  returnedGroupCount: number;
  totalGroupCount: number;
  hasMore: boolean;
  search?: string | null;
}) => ({
  document_type: "buyer_summary_inbox_scope_v1",
  version: "1",
  rows: params.rows,
  meta: {
    offset_groups: params.offsetGroups,
    limit_groups: params.limitGroups,
    returned_group_count: params.returnedGroupCount,
    total_group_count: params.totalGroupCount,
    has_more: params.hasMore,
    search: params.search ?? null,
  },
});

const buildBucketsEnvelope = (params: {
  documentType?: string;
  pending?: Record<string, unknown>[];
  approved?: Record<string, unknown>[];
  rejected?: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}) => ({
  document_type: params.documentType ?? "buyer_summary_buckets_scope_v1",
  version: "1",
  pending: params.pending ?? [],
  approved: params.approved ?? [],
  rejected: params.rejected ?? [],
  meta: {
    pending_count: params.pending?.length ?? 0,
    approved_count: params.approved?.length ?? 0,
    rejected_count: params.rejected?.length ?? 0,
    ...(params.meta ?? {}),
  },
});

describe("buyer inbox fetchers", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("keeps the shared rpc transport bound so this.rest-backed buyers do not crash", async () => {
    const supabase = {
      rest: { schema: "public" },
      rpc: jest.fn(function (
        this: { rest?: { schema?: string } },
        _fn: string,
        args: Record<string, unknown>,
      ) {
        if (!this?.rest) {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'rest')",
          );
        }
        return Promise.resolve({
          data: buildScopeEnvelope({
            rows: [
              {
                request_id: "req-rest-1",
                request_id_old: 201,
                request_item_id: "item-rest-1",
                rik_code: "REST-001",
                name_human: "Bound transport row",
                qty: 1,
                uom: "pcs",
                app_code: "APP-REST-1",
                note: null,
                object_name: "Object Rest",
                status: "approved",
                created_at: "2026-03-30T13:00:00.000Z",
              },
            ],
            offsetGroups: Number(args.p_offset ?? 0),
            limitGroups: Number(args.p_limit ?? 12),
            returnedGroupCount: 1,
            totalGroupCount: 1,
            hasMore: false,
          }),
          error: null,
        });
      }),
    };

    const result = await loadBuyerInboxWindowData({
      supabase,
      offsetGroups: 0,
      limitGroups: 12,
      search: null,
      log: () => undefined,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.request_id).toBe("req-rest-1");
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not fallback to listBuyerInbox when the rpc scope fails", async () => {
    const listBuyerInbox = jest.fn(async () => []);
    const rpc = jest.fn(async () => ({
      data: null,
      error: new Error("buyer inbox rpc failed"),
    }));

    await expect(
      loadBuyerInboxWindowData({
        supabase: { rpc },
        listBuyerInbox,
        offsetGroups: 0,
        limitGroups: 12,
        search: "REQ",
        log: () => undefined,
      }),
    ).rejects.toThrow("buyer inbox rpc failed");

    expect(listBuyerInbox).not.toHaveBeenCalled();
    const events = getPlatformObservabilityEvents().filter(
      (event) => event.screen === "buyer" && event.surface === "summary_inbox",
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "load_inbox_primary_rpc",
          result: "error",
          fallbackUsed: false,
          errorStage: "load_inbox_rpc",
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
        }),
        expect.objectContaining({
          event: "load_inbox",
          result: "error",
          fallbackUsed: false,
          errorStage: "load_inbox_rpc",
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
        }),
      ]),
    );
  });

  it("fails closed when the inbox rpc returns a malformed rows envelope", async () => {
    const rpc = jest.fn(async () => ({
      data: {
        document_type: "buyer_summary_inbox_scope_v1",
        version: "1",
        rows: {},
        meta: {
          offset_groups: 0,
          limit_groups: 25,
          returned_group_count: 0,
          total_group_count: 0,
          has_more: false,
        },
      },
      error: null,
    }));

    await expect(
      loadBuyerInboxWindowData({
        supabase: { rpc },
        offsetGroups: 0,
        limitGroups: 25,
        search: null,
        log: () => undefined,
      }),
    ).rejects.toBeInstanceOf(RpcValidationError);
  });

  it("clamps oversized buyer inbox window limits before calling the hot rpc", async () => {
    const rpc = jest.fn(async (_fn: string, args: Record<string, unknown>) => ({
      data: buildScopeEnvelope({
        rows: [],
        offsetGroups: Number(args.p_offset ?? 0),
        limitGroups: Number(args.p_limit ?? 0),
        returnedGroupCount: 0,
        totalGroupCount: 0,
        hasMore: false,
        search: String(args.p_search ?? ""),
      }),
      error: null,
    }));

    const result = await loadBuyerInboxWindowData({
      supabase: { rpc },
      offsetGroups: 3,
      limitGroups: 500,
      search: "hot",
      log: () => undefined,
    });

    expect(rpc).toHaveBeenCalledWith("buyer_summary_inbox_scope_v1", {
      p_offset: 3,
      p_limit: 100,
      p_search: "hot",
      p_company_id: null,
    });
    expect(result.meta.limitGroups).toBe(100);
  });

  it("caps buyer inbox window rows to the requested page size after the rpc response", async () => {
    const rows = Array.from({ length: 26 }, (_value, index) => ({
      request_id: `req-${index + 1}`,
      request_id_old: 400 + index,
      request_item_id: `item-${index + 1}`,
      rik_code: `RIK-${index + 1}`,
      name_human: `Material ${index + 1}`,
      qty: 1,
      uom: "pcs",
      app_code: `APP-${index + 1}`,
      note: null,
      object_name: "Object A",
      status: "approved",
      created_at: "2026-03-30T10:00:00.000Z",
    }));
    const rpc = jest.fn(async () => ({
      data: buildScopeEnvelope({
        rows,
        offsetGroups: 0,
        limitGroups: 999,
        returnedGroupCount: 25,
        totalGroupCount: 50,
        hasMore: true,
      }),
      error: null,
    }));

    const result = await loadBuyerInboxWindowData({
      supabase: { rpc },
      offsetGroups: 0,
      limitGroups: 25,
      search: null,
      log: () => undefined,
    });

    expect(rpc).toHaveBeenCalledWith("buyer_summary_inbox_scope_v1", {
      p_offset: 0,
      p_limit: 25,
      p_search: null,
      p_company_id: null,
    });
    expect(result.rows).toHaveLength(25);
    expect(result.rows.map((row) => row.request_item_id)).toEqual(
      rows.slice(0, 25).map((row) => row.request_item_id),
    );
    expect(result.rows.some((row) => row.request_item_id === "item-26")).toBe(
      false,
    );
    expect(result.requestIds).toEqual(
      rows.slice(0, 25).map((row) => row.request_id),
    );
    expect(result.meta).toMatchObject({
      offsetGroups: 0,
      limitGroups: 25,
      returnedGroupCount: 25,
      totalGroupCount: 50,
      hasMore: true,
      search: null,
    });
  });

  it("fails closed on an undefined rest transport path instead of publishing empty data", async () => {
    const supabase = {
      rpc: jest.fn(function () {
        if (!(this as { rest?: unknown })?.rest) {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'rest')",
          );
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    await expect(
      loadBuyerInboxWindowData({
        supabase,
        offsetGroups: 0,
        limitGroups: 12,
        search: null,
        log: () => undefined,
      }),
    ).rejects.toThrow("Cannot read properties of undefined (reading 'rest')");

    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "summary_inbox",
          event: "rpc_transport_boundary_fail",
          result: "error",
          errorStage: "rpc_transport_call",
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "summary_inbox",
          event: "load_inbox_primary_rpc",
          result: "error",
          errorStage: "load_inbox_rpc",
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
        }),
      ]),
    );
  });

  it("loads the compatibility full scan via paged rpc scope reads", async () => {
    const rpc = jest.fn(async (_fn: string, args: Record<string, unknown>) => {
      const offset = Number(args.p_offset ?? 0);
      if (offset === 0) {
        return {
          data: buildScopeEnvelope({
            rows: [
              {
                request_id: "req-1",
                request_id_old: 101,
                request_item_id: "item-1",
                rik_code: "RIK-001",
                name_human: "Pipe",
                qty: 3,
                uom: "pcs",
                app_code: "APP-1",
                note: null,
                object_name: "Object A",
                status: "approved",
                created_at: "2026-03-30T10:00:00.000Z",
              },
            ],
            offsetGroups: 0,
            limitGroups: 100,
            returnedGroupCount: 1,
            totalGroupCount: 2,
            hasMore: true,
          }),
          error: null,
        };
      }

      return {
        data: buildScopeEnvelope({
          rows: [
            {
              request_id: "req-2",
              request_id_old: 102,
              request_item_id: "item-2",
              rik_code: "RIK-002",
              name_human: "Valve",
              qty: 1,
              uom: "pcs",
              app_code: "APP-2",
              note: null,
              object_name: "Object B",
              status: "approved",
              created_at: "2026-03-30T11:00:00.000Z",
            },
          ],
          offsetGroups: 1,
          limitGroups: 100,
          returnedGroupCount: 1,
          totalGroupCount: 2,
          hasMore: false,
        }),
        error: null,
      };
    });

    const result = await loadBuyerInboxData({
      supabase: { rpc },
      log: () => undefined,
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(result.rows).toHaveLength(2);
    expect(result.requestIds).toEqual(["req-1", "req-2"]);
    expect(result.meta).toEqual({
      offsetGroups: 0,
      limitGroups: 100,
      returnedGroupCount: 2,
      totalGroupCount: 2,
      hasMore: false,
      search: null,
    });
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:buyer_summary_inbox_scope_v1",
      parityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "load_inbox_full",
          result: "success",
          sourceKind: "rpc:buyer_summary_inbox_scope_v1",
          fallbackUsed: false,
        }),
      ]),
    );
  });

  it("fails closed when the compatibility full scan exceeds the group ceiling", async () => {
    const rpc = jest.fn(async (_fn: string, args: Record<string, unknown>) => ({
      data: buildScopeEnvelope({
        rows: [],
        offsetGroups: Number(args.p_offset ?? 0),
        limitGroups: Number(args.p_limit ?? 100),
        returnedGroupCount: 100,
        totalGroupCount: 5001,
        hasMore: true,
      }),
      error: null,
    }));

    await expect(
      loadBuyerInboxData({
        supabase: { rpc },
        log: () => undefined,
      }),
    ).rejects.toThrow("max group ceiling");

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the compatibility full scan does not complete within max pages", async () => {
    const rpc = jest.fn(async (_fn: string, args: Record<string, unknown>) => {
      const offset = Number(args.p_offset ?? 0);
      return {
        data: buildScopeEnvelope({
          rows: [
            {
              request_id: `req-page-${offset}`,
              request_id_old: 1000 + offset,
              request_item_id: `item-page-${offset}`,
              rik_code: "PAGE-CEILING",
              name_human: "Page ceiling row",
              qty: 1,
              uom: "pcs",
              app_code: "APP-PAGE",
              note: null,
              object_name: "Object Page",
              status: "approved",
              created_at: "2026-03-30T10:00:00.000Z",
            },
          ],
          offsetGroups: offset,
          limitGroups: Number(args.p_limit ?? 100),
          returnedGroupCount: 100,
          totalGroupCount: 5000,
          hasMore: true,
        }),
        error: null,
      };
    });

    await expect(
      loadBuyerInboxData({
        supabase: { rpc },
        log: () => undefined,
      }),
    ).rejects.toThrow("max page ceiling");

    expect(rpc).toHaveBeenCalledTimes(50);
  });

  it("supports repeated buyer inbox loads for refresh/reopen without reintroducing the rest crash", async () => {
    const supabase = {
      rest: { schema: "public" },
      rpc: jest.fn(function (
        this: { rest?: { schema?: string } },
        _fn: string,
        args: Record<string, unknown>,
      ) {
        if (!this?.rest) {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'rest')",
          );
        }
        return Promise.resolve({
          data: buildScopeEnvelope({
            rows: [
              {
                request_id: `req-repeat-${String(args.p_offset ?? 0)}`,
                request_id_old: 300 + Number(args.p_offset ?? 0),
                request_item_id: `item-repeat-${String(args.p_offset ?? 0)}`,
                rik_code: "REPEAT-001",
                name_human: "Repeat-safe row",
                qty: 1,
                uom: "pcs",
                app_code: "APP-REPEAT-1",
                note: null,
                object_name: "Object Repeat",
                status: "approved",
                created_at: "2026-03-30T14:00:00.000Z",
              },
            ],
            offsetGroups: Number(args.p_offset ?? 0),
            limitGroups: Number(args.p_limit ?? 12),
            returnedGroupCount: 1,
            totalGroupCount: 1,
            hasMore: false,
          }),
          error: null,
        });
      }),
    };

    const first = await loadBuyerInboxWindowData({
      supabase,
      offsetGroups: 0,
      limitGroups: 12,
      search: null,
      log: () => undefined,
    });
    const refresh = await loadBuyerInboxWindowData({
      supabase,
      offsetGroups: 0,
      limitGroups: 12,
      search: null,
      log: () => undefined,
    });

    expect(first.rows).toHaveLength(1);
    expect(refresh.rows).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("loads buyer buckets from the rpc scope without legacy ownership", async () => {
    const rpc = jest.fn(async () => ({
      data: buildBucketsEnvelope({
        pending: [
          {
            id: "proposal-pending",
            status: "На утверждении",
            submitted_at: "2026-03-30T10:00:00.000Z",
            total_sum: 1200,
            sent_to_accountant_at: null,
            items_cnt: 2,
          },
        ],
        approved: [
          {
            id: "proposal-approved",
            status: "Утверждено",
            submitted_at: "2026-03-29T10:00:00.000Z",
            total_sum: 800,
            sent_to_accountant_at: "2026-03-29T12:00:00.000Z",
            items_cnt: 1,
          },
        ],
        rejected: [
          {
            id: "proposal-rejected",
            status: "На доработке",
            submitted_at: "2026-03-28T10:00:00.000Z",
            items_cnt: 3,
          },
        ],
        meta: {
          generated_at: "2026-03-30T12:00:00.000Z",
        },
      }),
      error: null,
    }));

    const result = await loadBuyerBucketsDataRpc({
      supabase: { rpc } as never,
      log: () => undefined,
    });

    expect(result.pending).toHaveLength(1);
    expect(result.approved).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.counts).toEqual({
      pendingCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
    });
    expect(result.proposalIds).toEqual([
      "proposal-pending",
      "proposal-approved",
      "proposal-rejected",
    ]);
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:buyer_summary_buckets_scope_v1",
      parityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "summary_buckets",
          event: "load_buckets_rpc",
          result: "success",
          sourceKind: "rpc:buyer_summary_buckets_scope_v1",
          fallbackUsed: false,
        }),
      ]),
    );
  });

  it("accepts the current SQL document_type for buyer buckets without weakening row validation", async () => {
    const rpc = jest.fn(async () => ({
      data: buildBucketsEnvelope({
        documentType: "buyer_summary_buckets_scope",
        pending: [
          {
            id: "proposal-sql-shape",
            status: "pending",
            submitted_at: "2026-03-30T10:00:00.000Z",
            total_sum: 1200,
            sent_to_accountant_at: null,
            items_cnt: 2,
            ignored_extra_field: "ignored",
          },
        ],
        meta: {
          rows_source: "buyer_summary_buckets_scope_v1",
          payload_shape_version: "v1",
          pending_count: 1,
          approved_count: 0,
          rejected_count: 0,
        },
      }),
      error: null,
    }));

    const result = await loadBuyerBucketsDataRpc({
      supabase: { rpc } as never,
      log: () => undefined,
    });

    expect(result.pending).toEqual([
      expect.objectContaining({
        id: "proposal-sql-shape",
        status: "pending",
        items_cnt: 2,
      }),
    ]);
    expect(result.counts.pendingCount).toBe(1);
    expect(result.sourceMeta.sourceKind).toBe(
      "rpc:buyer_summary_buckets_scope_v1",
    );
  });

  it("redacts malformed buyer bucket validation errors before publication telemetry", async () => {
    const log = jest.fn();
    const rpc = jest.fn(async () => ({
      data: {
        document_type: "buyer_summary_buckets_scope",
        version: "1",
        pending: [],
        approved: [],
        rejected: [],
        meta: {
          pending_count: "not-a-count",
          approved_count: 0,
          rejected_count: 0,
        },
      },
      error: null,
    }));

    await expect(
      loadBuyerBucketsData({
        supabase: { rpc } as never,
        log,
      }),
    ).rejects.toBeInstanceOf(RpcValidationError);

    const logText = JSON.stringify(log.mock.calls);
    expect(logText).not.toContain("Invalid RPC response shape");
    expect(logText).not.toContain("src/screens/");
    expect(logText).not.toContain("loadBuyerBucketsDataRpcInternal");
    expect(logText).toContain("buyer buckets RPC validation failed");

    const eventMessages = getPlatformObservabilityEvents()
      .filter(
        (event) =>
          event.screen === "buyer" && event.surface === "summary_buckets",
      )
      .map((event) => String(event.errorMessage ?? ""));
    expect(
      eventMessages.some((message) =>
        message.includes("buyer buckets RPC validation failed"),
      ),
    ).toBe(true);
    expect(eventMessages.join(" ")).not.toContain("Invalid RPC response shape");
    expect(eventMessages.join(" ")).not.toContain("src/screens/");
  });

  it("does not fallback to legacy stitch when the buckets rpc fails", async () => {
    const rpc = jest.fn(async () => ({
      data: null,
      error: new Error("buyer buckets rpc failed"),
    }));

    await expect(
      loadBuyerBucketsData({
        supabase: { rpc } as never,
        log: () => undefined,
      }),
    ).rejects.toThrow("buyer buckets rpc failed");

    const events = getPlatformObservabilityEvents().filter(
      (event) =>
        event.screen === "buyer" && event.surface === "summary_buckets",
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "load_buckets_primary_rpc",
          result: "error",
          fallbackUsed: false,
          errorStage: "load_buckets_rpc",
          sourceKind: "rpc:buyer_summary_buckets_scope_v1",
        }),
        expect.objectContaining({
          event: "load_buckets",
          result: "error",
          fallbackUsed: false,
          errorStage: "load_buckets_rpc",
          sourceKind: "rpc:buyer_summary_buckets_scope_v1",
        }),
      ]),
    );
  });
});
