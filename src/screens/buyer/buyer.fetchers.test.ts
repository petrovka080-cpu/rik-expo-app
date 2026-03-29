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

const buildScopeEnvelope = (params: {
  rows: Array<Record<string, unknown>>;
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
  pending?: Array<Record<string, unknown>>;
  approved?: Array<Record<string, unknown>>;
  rejected?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}) => ({
  document_type: "buyer_summary_buckets_scope_v1",
  version: "1",
  pending: params.pending ?? [],
  approved: params.approved ?? [],
  rejected: params.rejected ?? [],
  meta: params.meta ?? {},
});

describe("buyer inbox fetchers", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
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
      (event) => event.screen === "buyer" && event.surface === "summary_buckets",
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
