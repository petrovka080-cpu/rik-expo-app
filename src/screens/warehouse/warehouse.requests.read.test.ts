const mockBeginPlatformObservability = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockObservationSuccess = jest.fn();

jest.mock("../../lib/observability/platformObservability", () => ({
  beginPlatformObservability: mockBeginPlatformObservability as any,
  recordPlatformObservability: mockRecordPlatformObservability as any,
}));

const healthyState = {
  mode: "healthy",
  failureClass: null,
  freshness: "fresh",
  reason: null,
  message: null,
  cacheUsed: false,
  cooldownActive: false,
  cooldownReason: null,
};

jest.mock("./warehouse.reqHeads.state", () => ({
  createHealthyWarehouseReqHeadsIntegrityState: jest.fn(() => healthyState),
}));

describe("warehouse.requests.read canonical ownership", () => {
  let service: typeof import("./warehouse.requests.read");

  beforeEach(() => {
    jest.resetModules();
    mockObservationSuccess.mockReset();
    mockBeginPlatformObservability.mockReset().mockReturnValue({
      success: mockObservationSuccess,
    });
    mockRecordPlatformObservability.mockReset();
    service = require("./warehouse.requests.read");
  });

  it("loads request heads from the canonical server RPC without client fallback paths", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        version: "v4",
        rows: [
          {
            request_id: "req-rpc-1",
            display_no: "REQ-1",
            object_name: "Object A",
            level_code: "L1",
            system_code: "SYS",
            zone_code: "Z1",
            submitted_at: "2026-04-12T08:00:00.000Z",
            items_cnt: 2,
            ready_cnt: 2,
            done_cnt: 0,
            qty_limit_sum: 10,
            qty_issued_sum: 4,
            qty_left_sum: 6,
            qty_can_issue_now_sum: 5,
            issuable_now_cnt: 1,
            issue_status: "READY",
            visible_in_expense_queue: true,
            can_issue_now: true,
            waiting_stock: false,
            all_done: false,
          },
        ],
        meta: {
          total: 1,
          row_count: 1,
          generated_at: "2026-04-12T08:00:01.000Z",
          scope_key: "warehouse_issue_queue_scope_v4:0:80",
          payload_shape_version: "v4",
        },
      },
      error: null,
    });

    const result = await service.apiFetchReqHeadsWindow({ rpc } as never, 0, 80);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("warehouse_issue_queue_scope_v4", {
      p_offset: 0,
      p_limit: 80,
    });
    expect(result.sourceMeta).toEqual({
      primaryOwner: "canonical_issue_queue_rpc",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: "rpc:warehouse_issue_queue_scope_v4",
      contractVersion: "v4",
      reason: null,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        request_id: "req-rpc-1",
        items_cnt: 2,
        qty_left_sum: 6,
        qty_can_issue_now_sum: 5,
      }),
    ]);
    expect(result.metrics).toEqual({
      stage_a_ms: 0,
      stage_b_ms: 0,
      fallback_missing_ids_count: 0,
      enriched_rows_count: 0,
      page0_required_repair: false,
    });
    expect(mockObservationSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCount: 1,
        sourceKind: "rpc:warehouse_issue_queue_scope_v4",
        fallbackUsed: false,
      }),
    );
  });

  it("fails closed when the canonical request-head RPC fails", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: new Error("rpc down"),
    });

    await expect(service.apiFetchReqHeadsWindow({ rpc } as never, 0, 80)).rejects.toThrow("rpc down");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "fetch_req_heads_canonical_failed",
        fallbackUsed: false,
        errorStage: "fetch_req_heads_canonical_rpc",
      }),
    );
  });

  it("loads request items from the canonical server RPC without materializing local availability", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        version: "v1",
        rows: [
          {
            request_id: "req-1",
            request_item_id: "item-1",
            display_no: "REQ-1",
            object_name: "Object A",
            rik_code: "MAT-1",
            name_human: "Material 1",
            uom: "pcs",
            qty_limit: 5,
            qty_issued: 2,
            qty_left: 3,
            qty_available: 10,
            qty_can_issue_now: 3,
            note: "head note",
            comment: "head comment",
          },
        ],
        meta: {
          row_count: 1,
          scope_key: "warehouse_issue_items_scope_v1:req-1",
          generated_at: "2026-04-12T08:00:02.000Z",
        },
      },
      error: null,
    });

    const result = await service.apiFetchReqItemsDetailed({ rpc } as never, "req-1");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("warehouse_issue_items_scope_v1", {
      p_request_id: "req-1",
    });
    expect(result.sourceMeta).toEqual({
      primaryOwner: "canonical_issue_items_rpc",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: "rpc:warehouse_issue_items_scope_v1",
      contractVersion: "v1",
      reason: null,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        request_item_id: "item-1",
        qty_left: 3,
        qty_available: 10,
        qty_can_issue_now: 3,
      }),
    ]);
  });
});
