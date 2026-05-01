const mockFetchRequestScopeRows = jest.fn();
const mockGetProgressIdsForSubcontract = jest.fn();
const mockLoadConsumedByCode = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("./contractor.data", () => ({
  fetchRequestScopeRows: (...args: unknown[]) => mockFetchRequestScopeRows(...args),
  getProgressIdsForSubcontract: (...args: unknown[]) => mockGetProgressIdsForSubcontract(...args),
  loadConsumedByCode: (...args: unknown[]) => mockLoadConsumedByCode(...args),
}));

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

const REQUEST_UUID = "11111111-1111-4111-8111-111111111111";
const JOB_UUID = "22222222-2222-4222-8222-222222222222";
const PROGRESS_UUID = "33333333-3333-4333-8333-333333333333";

const normText = (value: unknown) => String(value ?? "").trim();

const makeEqMaybeSingle = (result: unknown) => ({
  eq: jest.fn(() => ({
    maybeSingle: jest.fn().mockResolvedValue(result),
  })),
});

const makeLimitQuery = (result: unknown) => ({
  limit: jest.fn().mockResolvedValue(result),
});

const makePagedEqQuery = (result: unknown) => ({
  eq: jest.fn(() => ({
    order: jest.fn(function order() {
      return {
        order,
        range: jest.fn().mockResolvedValue(result),
      };
    }),
  })),
});

const makePagedInQuery = (result: unknown) => ({
  in: jest.fn(() => ({
    order: jest.fn(function order() {
      return {
        order,
        range: jest.fn().mockResolvedValue(result),
      };
    }),
  })),
});

const makeEqOrderLimitMaybeSingle = (result: unknown) => ({
  eq: jest.fn(() => ({
    order: jest.fn(() => ({
      limit: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue(result),
      })),
    })),
  })),
});

describe("contractor.workModalService", () => {
  let service: typeof import("./contractor.workModalService");

  beforeEach(() => {
    jest.resetModules();
    mockFetchRequestScopeRows.mockReset();
    mockGetProgressIdsForSubcontract.mockReset();
    mockLoadConsumedByCode.mockReset();
    mockRecordPlatformObservability.mockReset();
    service = require("./contractor.workModalService");
  });

  it("shapes request-backed header data when contractor job id is unavailable", async () => {
    const supabaseClient = {
      from: jest.fn((table: string) => {
        if (table === "requests") {
          return {
            select: jest.fn(() =>
              makeEqMaybeSingle({
                data: {
                  display_no: "REQ-42",
                  object_type_code: "OBJ",
                  level_code: "L1",
                  system_code: "SYS",
                  contractor_org: " Build Team ",
                  contractor_phone: " +996 555 000 111 ",
                },
                error: null,
              }),
            ),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await service.loadContractorJobHeaderData({
      supabaseClient: supabaseClient as never,
      row: {
        progress_id: PROGRESS_UUID,
        work_name: "Монтаж",
        qty_planned: 12,
        uom_id: "m2",
      },
      resolveContractorJobId: async () => "",
      resolveRequestId: async () => REQUEST_UUID,
      normText,
    });

    expect(result).toEqual({
      header: expect.objectContaining({
        contractor_org: "Build Team",
        contractor_phone: "+996 555 000 111",
        contract_number: "REQ-42",
        object_name: "OBJ / L1 / SYS",
        work_type: "Монтаж",
        zone: "L1",
        level_name: "L1",
        qty_planned: 12,
        uom: "m2",
        unit_price: null,
      }),
      objectNameOverride: "OBJ / L1 / SYS",
    });
  });

  it("shapes subcontract-backed header data when contractor job id is valid", async () => {
    const supabaseClient = {
      from: jest.fn((table: string) => {
        if (table === "subcontracts") {
          return {
            select: jest.fn(() =>
              makeEqMaybeSingle({
                data: {
                  contractor_org: "Scoped Contractor",
                  contractor_inn: "1234567890",
                  contractor_rep: "Иван",
                  contractor_phone: " +996700123456 ",
                  contract_number: "SC-1",
                  contract_date: "2026-03-30",
                  object_name: "Object A",
                  work_type: "Concrete",
                  work_zone: "Zone 7",
                  qty_planned: 7,
                  uom: "m3",
                  price_per_unit: 1200,
                  total_price: 8400,
                  date_start: "2026-03-01",
                  date_end: "2026-03-31",
                },
                error: null,
              }),
            ),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await service.loadContractorJobHeaderData({
      supabaseClient: supabaseClient as never,
      row: {
        progress_id: PROGRESS_UUID,
      },
      resolveContractorJobId: async () => JOB_UUID,
      resolveRequestId: async () => REQUEST_UUID,
      normText,
    });

    expect(result).toEqual({
      header: expect.objectContaining({
        contractor_org: "Scoped Contractor",
        contractor_inn: "1234567890",
        contractor_rep: "Иван",
        contractor_phone: "+996700123456",
        contract_number: "SC-1",
        contract_date: "2026-03-30",
        object_name: "Object A",
        work_type: "Concrete",
        zone: "Zone 7",
        qty_planned: 7,
        uom: "m3",
        unit_price: 1200,
        total_price: 8400,
      }),
      objectNameOverride: "Object A",
    });
  });

  it("records request_no probe fallback but still returns issued items and linked request cards", async () => {
    mockFetchRequestScopeRows.mockResolvedValue([{ id: REQUEST_UUID, status: "approved" }]);
    mockGetProgressIdsForSubcontract.mockReturnValue([PROGRESS_UUID]);
    mockLoadConsumedByCode.mockResolvedValue(new Map([["MAT-1", 2]]));

    const supabaseClient = {
      from: jest.fn((table: string) => {
        if (table === "requests") {
          return {
            select: jest.fn((selection: string) => {
              if (selection === "id, request_no") {
                return makeLimitQuery({
                  data: null,
                  error: new Error("request_no probe failed"),
                });
              }
              if (selection === "id, display_no, status") {
                return makePagedInQuery({
                  data: [{ id: REQUEST_UUID, display_no: "REQ-100", status: "PARTIAL" }],
                  error: null,
                });
              }
              throw new Error(`Unexpected requests select: ${selection}`);
            }),
          };
        }
        if (table === "warehouse_issues") {
          return {
            select: jest.fn(() =>
              makePagedInQuery({
                data: [{ id: "issue-1", request_id: REQUEST_UUID, base_no: "ISS-100" }],
                error: null,
              }),
            ),
          };
        }
        if (table === "v_wh_issue_req_heads_ui") {
          return {
            select: jest.fn(() =>
              makePagedInQuery({
                data: [
                  {
                    request_id: REQUEST_UUID,
                    submitted_at: "2026-03-31T08:30:00.000Z",
                    issue_status: "PARTIAL",
                    qty_issued_sum: 8,
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        if (table === "v_wh_issue_req_items_ui") {
          return {
            select: jest.fn(() =>
              makePagedInQuery({
                data: [
                  {
                    request_item_id: "item-1",
                    rik_code: "MAT-1",
                    request_id: REQUEST_UUID,
                    name_human: "Цемент",
                    uom: "kg",
                    qty_issued: 8,
                    price: 12,
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await service.loadIssuedTodayData({
      supabaseClient: supabaseClient as never,
      row: {
        progress_id: PROGRESS_UUID,
      },
      allRows: [{ progress_id: PROGRESS_UUID }],
      resolveContractorJobId: async () => JOB_UUID,
      resolveRequestId: async () => REQUEST_UUID,
      isRejectedOrCancelledRequestStatus: () => false,
      toLocalDateKey: () => "2026-03-31",
      normText,
    });

    expect(result.issuedHint).toBe("");
    expect(result.issuedItems).toEqual([
      expect.objectContaining({
        issue_item_id: "item-1",
        mat_code: "MAT-1",
        title: "Цемент",
        unit: "kg",
        qty: 8,
        qty_used: 2,
        qty_left: 6,
        price: 12,
      }),
    ]);
    expect(result.linkedReqCards).toEqual([
      {
        request_id: REQUEST_UUID,
        req_no: "REQ-100",
        status: "PARTIAL",
        issue_nos: ["ISS-100"],
      },
    ]);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "contractor",
        surface: "work_modal_service",
        event: "request_no_probe_failed",
        fallbackUsed: true,
      }),
    );
  });

  it("keeps empty state honest when there are no approved request ids in scope", async () => {
    mockFetchRequestScopeRows.mockResolvedValue([
      { id: REQUEST_UUID, status: "cancelled" },
      { id: "bad-id", status: "approved" },
    ]);

    const result = await service.loadIssuedTodayData({
      supabaseClient: { from: jest.fn() } as never,
      row: {
        progress_id: PROGRESS_UUID,
      },
      allRows: [],
      resolveContractorJobId: async () => JOB_UUID,
      resolveRequestId: async () => REQUEST_UUID,
      isRejectedOrCancelledRequestStatus: (status) => String(status) === "cancelled",
      toLocalDateKey: () => "2026-03-31",
      normText,
    });

    expect(result).toEqual({
      issuedItems: [],
      linkedReqCards: [],
      issuedHint: "Нет утвержденных заявок для подтягивания материалов.",
    });
  });

  it("restores work materials from the latest progress log before falling back to defaults", async () => {
    const supabaseClient = {
      from: jest.fn((table: string) => {
        if (table === "work_progress_log") {
          return {
            select: jest.fn(() =>
              makeEqOrderLimitMaybeSingle({
                data: {
                  id: "log-1",
                  qty: 3,
                  work_uom: "kg",
                  stage_note: null,
                  note: null,
                },
                error: null,
              }),
            ),
          };
        }
        if (table === "work_progress_log_materials") {
          return {
            select: jest.fn(() =>
              makePagedEqQuery({
                data: [{ mat_code: "MAT-1", uom_mat: "kg", qty_fact: 3 }],
                error: null,
              }),
            ),
          };
        }
        if (table === "catalog_items") {
          return {
            select: jest.fn(() =>
              makePagedInQuery({
                data: [{ rik_code: "MAT-1", name_human_ru: "Цемент", uom_code: "kg" }],
                error: null,
              }),
            ),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc: jest.fn(),
    };

    const result = await service.loadInitialWorkMaterialsForModal({
      supabaseClient: supabaseClient as never,
      row: {
        progress_id: PROGRESS_UUID,
        work_code: "WORK-1",
        uom_id: "kg",
      },
    });

    expect(result).toEqual([
      {
        material_id: null,
        qty: 3,
        mat_code: "MAT-1",
        name: "Цемент",
        uom: "kg",
        available: 0,
        qty_fact: 3,
      },
    ]);
    expect(supabaseClient.rpc).not.toHaveBeenCalled();
  });
});
