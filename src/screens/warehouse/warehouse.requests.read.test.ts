const mockBeginPlatformObservability = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockObservationSuccess = jest.fn();

const mockIsRequestVisibleInWarehouseIssueQueue = jest.fn();

const mockLoadCanonicalRequestsWindow = jest.fn();
const mockLoadCanonicalRequestsByIds = jest.fn();
const mockLoadCanonicalRequestItemsByRequestId = jest.fn();

const mockAsUnknownRows = jest.fn((rows: unknown[]) => rows);
const mockFetchWarehouseFallbackStockRows = jest.fn();
const mockFetchWarehouseReqHeadTruthRows = jest.fn();
const mockFetchWarehouseRequestItemNoteRows = jest.fn();
const mockFetchWarehouseRequestMetaRows = jest.fn();

const mockAggregateWarehouseReqItemTruthRows = jest.fn();
const mockApplyWarehouseReqHeadTruth = jest.fn((row) => row);
const mockBuildWarehouseStockAvailabilityCodeKey = jest.fn((code) => String(code ?? "").trim());
const mockBuildWarehouseStockAvailabilityCodeUomKey = jest.fn(
  (code, uom) => `${String(code ?? "").trim()}::${String(uom ?? "").trim()}`,
);
const mockCompareWarehouseReqHeads = jest.fn(() => 0);
const mockMapWarehouseCanonicalRequestToReqHeadRow = jest.fn();
const mockMaterializeWarehouseFallbackReqItems = jest.fn();
const mockNormalizeWarehouseRequestItemFallbackRow = jest.fn((row) => ({
  request_item_id: row.id,
  request_id: row.request_id,
  rik_code: row.rik_code,
  name_human: row.name_human,
  uom: row.uom,
  qty_limit: row.qty,
  note: row.note ?? null,
}));
const mockToWarehouseTextOrNull = jest.fn((value) => {
  const text = String(value ?? "").trim();
  return text ? text : null;
});

const mockClearWarehouseRequestSourceTrace = jest.fn();
const mockReadWarehouseRequestSourceTrace = jest.fn();
const mockRecordWarehouseRequestSourceTrace = jest.fn();

const mockCompareWarehouseReqHeadsRepair = jest.fn(() => 0);
const mockRepairWarehouseReqHeadsPage0 = jest.fn((rows) => rows);
const mockClassifyWarehouseReqHeadsFailure = jest.fn(() => ({
  failureClass: "server_failure",
  reason: "compatibility_failed",
  message: "compatibility_failed",
}));

const mockCreateHealthyWarehouseReqHeadsIntegrityState = jest.fn();
const mockCreateWarehouseReqHeadsIntegrityState = jest.fn();

jest.mock("../../lib/observability/platformObservability", () => ({
  beginPlatformObservability: mockBeginPlatformObservability as any,
  recordPlatformObservability: mockRecordPlatformObservability as any,
}));

jest.mock("../../lib/requestStatus", () => ({
  isRequestVisibleInWarehouseIssueQueue: mockIsRequestVisibleInWarehouseIssueQueue as any,
}));

jest.mock("../../lib/api/requestCanonical.read", () => ({
  loadCanonicalRequestsWindow: mockLoadCanonicalRequestsWindow as any,
  loadCanonicalRequestsByIds: mockLoadCanonicalRequestsByIds as any,
  loadCanonicalRequestItemsByRequestId: mockLoadCanonicalRequestItemsByRequestId as any,
}));

jest.mock("./warehouse.api.repo", () => ({
  asUnknownRows: mockAsUnknownRows as any,
  fetchWarehouseFallbackStockRows: mockFetchWarehouseFallbackStockRows as any,
  fetchWarehouseReqHeadTruthRows: mockFetchWarehouseReqHeadTruthRows as any,
  fetchWarehouseRequestItemNoteRows: mockFetchWarehouseRequestItemNoteRows as any,
  fetchWarehouseRequestMetaRows: mockFetchWarehouseRequestMetaRows as any,
}));

jest.mock("./warehouse.adapters", () => ({
  aggregateWarehouseReqItemTruthRows: mockAggregateWarehouseReqItemTruthRows as any,
  applyWarehouseReqHeadTruth: mockApplyWarehouseReqHeadTruth as any,
  buildWarehouseStockAvailabilityCodeKey: mockBuildWarehouseStockAvailabilityCodeKey as any,
  buildWarehouseStockAvailabilityCodeUomKey: mockBuildWarehouseStockAvailabilityCodeUomKey as any,
  compareWarehouseReqHeads: mockCompareWarehouseReqHeads as any,
  mapWarehouseCanonicalRequestToReqHeadRow: mockMapWarehouseCanonicalRequestToReqHeadRow as any,
  materializeWarehouseFallbackReqItems: mockMaterializeWarehouseFallbackReqItems as any,
  normalizeWarehouseRequestItemFallbackRow: mockNormalizeWarehouseRequestItemFallbackRow as any,
  toWarehouseTextOrNull: mockToWarehouseTextOrNull as any,
}));

jest.mock("./warehouse.cache", () => ({
  clearWarehouseRequestSourceTrace: mockClearWarehouseRequestSourceTrace as any,
  readWarehouseRequestSourceTrace: mockReadWarehouseRequestSourceTrace as any,
  recordWarehouseRequestSourceTrace: mockRecordWarehouseRequestSourceTrace as any,
}));

jest.mock("./warehouse.reqHeads.repair", () => ({
  compareWarehouseReqHeads: mockCompareWarehouseReqHeadsRepair as any,
  repairWarehouseReqHeadsPage0: mockRepairWarehouseReqHeadsPage0 as any,
}));

jest.mock("./warehouse.reqHeads.failure", () => ({
  classifyWarehouseReqHeadsFailure: mockClassifyWarehouseReqHeadsFailure as any,
}));

jest.mock("./warehouse.reqHeads.state", () => ({
  createHealthyWarehouseReqHeadsIntegrityState: mockCreateHealthyWarehouseReqHeadsIntegrityState as any,
  createWarehouseReqHeadsIntegrityState: mockCreateWarehouseReqHeadsIntegrityState as any,
}));

const toReqHeadRow = (request: Record<string, unknown>) => ({
  request_id: String(request.id),
  request_no: null,
  display_no: String(request.display_no ?? ""),
  request_status: String(request.status ?? ""),
  object_id: null,
  object_name: String(request.object_name ?? "Object A"),
  level_code: null,
  system_code: null,
  zone_code: null,
  level_name: null,
  system_name: null,
  zone_name: null,
  contractor_name: null,
  contractor_phone: null,
  planned_volume: null,
  note: null,
  comment: String(request.comment ?? "") || null,
  submitted_at: String(request.submitted_at ?? "") || null,
  items_cnt: Number(request.items_cnt ?? 0),
  ready_cnt: Number(request.ready_cnt ?? 0),
  done_cnt: Number(request.done_cnt ?? 0),
  qty_limit_sum: Number(request.qty_limit_sum ?? 0),
  qty_issued_sum: Number(request.qty_issued_sum ?? 0),
  qty_left_sum: Number(request.qty_left_sum ?? 0),
  qty_can_issue_now_sum: Number(request.qty_can_issue_now_sum ?? 0),
  issuable_now_cnt: Number(request.issuable_now_cnt ?? 0),
  issue_status: "READY",
  visible_in_expense_queue: true,
  can_issue_now: true,
  waiting_stock: false,
  all_done: false,
});

describe("warehouse.requests.read", () => {
  let service: typeof import("./warehouse.requests.read");

  beforeEach(() => {
    jest.resetModules();

    mockObservationSuccess.mockReset();
    mockBeginPlatformObservability.mockReset().mockReturnValue({
      success: mockObservationSuccess,
    });
    mockRecordPlatformObservability.mockReset();
    mockIsRequestVisibleInWarehouseIssueQueue.mockReset().mockImplementation(
      (status: string) => status === "approved",
    );
    mockLoadCanonicalRequestsWindow.mockReset();
    mockLoadCanonicalRequestsByIds.mockReset();
    mockLoadCanonicalRequestItemsByRequestId.mockReset();
    mockAsUnknownRows.mockClear();
    mockFetchWarehouseFallbackStockRows.mockReset().mockResolvedValue({ data: [], error: null });
    mockFetchWarehouseReqHeadTruthRows.mockReset().mockResolvedValue({ data: [], error: null });
    mockFetchWarehouseRequestItemNoteRows.mockReset().mockResolvedValue({ data: [], error: null });
    mockFetchWarehouseRequestMetaRows.mockReset().mockResolvedValue({ data: [], error: null });
    mockAggregateWarehouseReqItemTruthRows.mockReset().mockReturnValue({});
    mockApplyWarehouseReqHeadTruth.mockReset().mockImplementation((row) => row);
    mockBuildWarehouseStockAvailabilityCodeKey.mockClear();
    mockBuildWarehouseStockAvailabilityCodeUomKey.mockClear();
    mockCompareWarehouseReqHeads.mockReset().mockReturnValue(0);
    mockMapWarehouseCanonicalRequestToReqHeadRow.mockReset().mockImplementation(toReqHeadRow);
    mockMaterializeWarehouseFallbackReqItems.mockReset().mockImplementation((rows) =>
      rows.map((row: Record<string, unknown>) => ({
        request_id: String(row.request_id),
        request_item_id: String(row.request_item_id),
        display_no: "REQ-1",
        object_name: "Object A",
        level_code: null,
        system_code: null,
        zone_code: null,
        rik_code: String(row.rik_code),
        name_human: String(row.name_human),
        uom: String(row.uom ?? ""),
        qty_limit: Number(row.qty_limit ?? 0),
        qty_issued: 0,
        qty_left: Number(row.qty_limit ?? 0),
        qty_available: 0,
        qty_can_issue_now: 0,
      })),
    );
    mockNormalizeWarehouseRequestItemFallbackRow.mockClear();
    mockToWarehouseTextOrNull.mockClear();
    mockClearWarehouseRequestSourceTrace.mockReset();
    mockReadWarehouseRequestSourceTrace.mockReset().mockReturnValue([]);
    mockRecordWarehouseRequestSourceTrace.mockReset();
    mockCompareWarehouseReqHeadsRepair.mockReset().mockReturnValue(0);
    mockRepairWarehouseReqHeadsPage0.mockReset().mockImplementation(
      ({ viewRows }: { viewRows: unknown[] }) => ({
        rows: viewRows,
        fallbackMissingIdsCount: 0,
        page0RequiredRepair: false,
        integrityState: {
          mode: "healthy",
          failureClass: null,
          freshness: "fresh",
          reason: null,
          message: null,
          cacheUsed: false,
          cooldownActive: false,
          cooldownReason: null,
        },
      }),
    );
    mockClassifyWarehouseReqHeadsFailure.mockReset().mockReturnValue({
      failureClass: "server_failure",
      reason: "compatibility_failed",
      message: "compatibility_failed",
    });
    mockCreateHealthyWarehouseReqHeadsIntegrityState.mockReset().mockReturnValue({
      mode: "healthy",
      failureClass: null,
      freshness: "fresh",
      reason: null,
      message: null,
      cacheUsed: false,
      cooldownActive: false,
      cooldownReason: null,
    });
    mockCreateWarehouseReqHeadsIntegrityState.mockReset().mockReturnValue({
      mode: "stale_last_known_good",
      failureClass: "server_failure",
      freshness: "stale",
      reason: "compatibility_failed",
      message: "compatibility_failed",
      cacheUsed: true,
      cooldownActive: false,
      cooldownReason: null,
    });

    service = require("./warehouse.requests.read");
  });

  it("keeps canonical req-head ownership and filters out non-visible requests", async () => {
    mockLoadCanonicalRequestsWindow.mockResolvedValue({
      rows: [
        { id: "req-approved", status: "approved", display_no: "REQ-1", object_name: "Object A" },
        { id: "req-draft", status: "draft", display_no: "REQ-2", object_name: "Object B" },
      ],
      meta: {
        generatedAt: "2026-03-31T12:00:00.000Z",
        contractVersion: "request_lookup_v2",
      },
    });

    const result = await service.apiFetchReqHeadsWindow({} as never, 0, 10);

    expect(result.sourceMeta).toEqual({
      primaryOwner: "canonical_requests",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: "table:requests",
      contractVersion: "request_lookup_v2",
      reason: null,
    });
    expect(result.rows).toEqual([expect.objectContaining({ request_id: "req-approved", display_no: "REQ-1" })]);
    expect(result.meta).toEqual(
      expect.objectContaining({
        page: 0,
        pageSize: 10,
        pageOffset: 0,
        scopeKey: "canonical:warehouse_req_heads:0:10",
        contractVersion: "request_lookup_v2",
      }),
    );
    expect(mockObservationSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCount: 1,
        sourceKind: "table:requests",
        fallbackUsed: false,
      }),
    );
  });

  it("falls back to compatibility rpc when canonical req-head loading fails", async () => {
    mockLoadCanonicalRequestsWindow.mockRejectedValue(new Error("canonical window failed"));
    const supabase = {
      rpc: jest.fn().mockResolvedValue({
        data: {
          version: "v4",
          rows: [
            {
              request_id: "req-rpc-1",
              display_no: "REQ-RPC-1",
              object_name: "Object RPC",
              level_code: "L1",
              system_code: "SYS",
              zone_code: "Z1",
              status: "approved",
              items_cnt: 2,
              ready_cnt: 2,
              done_cnt: 0,
              qty_limit_sum: 10,
              qty_issued_sum: 4,
              qty_left_sum: 6,
              qty_can_issue_now_sum: 6,
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
            generated_at: "2026-03-31T12:30:00.000Z",
          },
        },
        error: null,
      }),
    };

    const result = await service.apiFetchReqHeadsWindow(supabase as never, 0, 10);

    expect(result.sourceMeta).toEqual({
      primaryOwner: "compatibility_rpc_scope_v4",
      sourcePath: "compatibility",
      fallbackUsed: true,
      sourceKind: "rpc:warehouse_issue_queue_scope_v4",
      contractVersion: "v4",
      reason: "canonical window failed",
    });
    expect(result.rows).toEqual([expect.objectContaining({ request_id: "req-rpc-1", display_no: "REQ-RPC-1" })]);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "req_heads",
        event: "fetch_req_heads_canonical_failed",
        fallbackUsed: true,
      }),
    );
  });

  it("activates degraded repair chain when canonical and compatibility paths fail", async () => {
    mockLoadCanonicalRequestsWindow.mockRejectedValue(new Error("canonical window failed"));
    mockLoadCanonicalRequestsByIds.mockResolvedValue({
      rows: [{ id: "req-view-1", status: "approved" }],
      meta: {
        generatedAt: "2026-03-31T12:40:00.000Z",
        contractVersion: "request_lookup_v2",
      },
    });
    mockRepairWarehouseReqHeadsPage0.mockResolvedValue({
      rows: [
        {
          request_id: "req-view-1",
          request_no: null,
          display_no: "REQ-VIEW-1",
          request_status: null,
          object_id: null,
          object_name: "Object View",
          level_code: null,
          system_code: null,
          zone_code: null,
          level_name: null,
          system_name: null,
          zone_name: null,
          contractor_name: null,
          contractor_phone: null,
          planned_volume: null,
          note: null,
          comment: null,
          submitted_at: "2026-03-31T12:00:00.000Z",
          items_cnt: 1,
          ready_cnt: 1,
          done_cnt: 0,
          qty_limit_sum: 5,
          qty_issued_sum: 0,
          qty_left_sum: 5,
          qty_can_issue_now_sum: 5,
          issuable_now_cnt: 1,
          issue_status: "READY",
          visible_in_expense_queue: true,
          can_issue_now: true,
          waiting_stock: false,
          all_done: false,
        },
      ],
      fallbackMissingIdsCount: 1,
      page0RequiredRepair: true,
      integrityState: {
        mode: "healthy",
        failureClass: null,
        freshness: "fresh",
        reason: null,
        message: null,
        cacheUsed: false,
        cooldownActive: false,
        cooldownReason: null,
      },
    });

    const supabase = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: new Error("compatibility rpc failed"),
      }),
      from: jest.fn((table: string) => {
        if (table === "v_wh_issue_req_heads_ui") {
          return {
            select: jest.fn(() => ({
              order: jest.fn(() => ({
                order: jest.fn(() => ({
                  order: jest.fn(() => ({
                    range: jest.fn().mockResolvedValue({
                      data: [
                        {
                          request_id: "req-view-1",
                          display_no: "REQ-VIEW-1",
                          object_name: "Object View",
                          submitted_at: "2026-03-31T12:00:00.000Z",
                          items_cnt: 1,
                          ready_cnt: 1,
                          done_cnt: 0,
                          qty_limit_sum: 5,
                          qty_issued_sum: 0,
                          qty_left_sum: 5,
                          qty_can_issue_now_sum: 5,
                          issuable_now_cnt: 1,
                          issue_status: "READY",
                        },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await service.apiFetchReqHeadsWindow(supabase as never, 0, 10);

    expect(result.sourceMeta).toEqual({
      primaryOwner: "degraded_legacy_converged",
      sourcePath: "degraded",
      fallbackUsed: true,
      sourceKind: "converged:req_heads",
      contractVersion: "legacy_converged",
      reason: "compatibility rpc failed",
    });
    expect(result.metrics).toEqual(
      expect.objectContaining({
        fallback_missing_ids_count: 1,
        page0_required_repair: true,
      }),
    );
    expect(result.meta).toEqual(
      expect.objectContaining({
        scopeKey: "degraded:warehouse_req_heads:0:10",
        contractVersion: "legacy_converged",
      }),
    );
    expect(mockObservationSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCount: 1,
        sourceKind: "converged:req_heads",
        fallbackUsed: true,
      }),
    );
  });

  it("materializes canonical request items when the warehouse compatibility view is empty", async () => {
    mockLoadCanonicalRequestsByIds.mockResolvedValue({
      rows: [{ id: "req-1", status: "approved", display_no: "REQ-1", object_name: "Object A", comment: "head comment" }],
      meta: {
        generatedAt: "2026-03-31T13:00:00.000Z",
        contractVersion: "request_lookup_v2",
      },
    });
    mockLoadCanonicalRequestItemsByRequestId.mockResolvedValue([
      {
        id: "item-1",
        request_id: "req-1",
        rik_code: "MAT-1",
        name_human: "Цемент",
        uom: "kg",
        qty: 5,
        status: "approved",
        note: "item note",
      },
    ]);

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "v_wh_issue_req_items_ui") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await service.apiFetchReqItemsDetailed(supabase as never, "req-1");

    expect(result.sourceMeta).toEqual({
      primaryOwner: "canonical_requests",
      sourcePath: "canonical",
      fallbackUsed: false,
      sourceKind: "canonical:request_items_materialized",
      contractVersion: "request_items_materialized_v1",
      reason: "warehouse_view_missing_or_empty",
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        request_id: "req-1",
        request_item_id: "item-1",
        rik_code: "MAT-1",
        name_human: "Цемент",
        qty_left: 5,
        note: "item note",
        comment: "head comment",
      }),
    ]);
    expect(result.meta).toEqual(
      expect.objectContaining({
        requestId: "req-1",
        scopeKey: "canonical:warehouse_req_items:req-1",
        contractVersion: "request_items_materialized_v1",
      }),
    );
  });
});
