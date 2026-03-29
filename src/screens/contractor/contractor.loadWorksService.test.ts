import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { loadContractorWorksBundle } from "./contractor.loadWorksService";

const buildScopeEnvelope = (params?: {
  rows?: Array<Record<string, unknown>>;
  subcontractCards?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}) => ({
  document_type: "contractor_works_bundle_scope",
  version: "v1",
  rows: params?.rows ?? [],
  subcontract_cards: params?.subcontractCards ?? [],
  meta: params?.meta ?? {},
});

const buildParams = (supabaseClient: {
  rpc: jest.Mock;
  from: jest.Mock;
}) => ({
  supabaseClient,
  normText: (value: unknown) => String(value ?? "").trim(),
  looksLikeUuid: (value: string) => /^[0-9a-f-]{8,}$/i.test(String(value ?? "").trim()),
  pickWorkProgressRow: (row: { id?: string | null; progress_id?: string | null }) =>
    String(row.id ?? row.progress_id ?? "").trim(),
  myContractorId: "contractor-1",
  myUserId: "user-1",
  myContractorInn: "12345678901234",
  myContractorCompany: "Scoped Contractor",
  myContractorFullName: "Scoped Contractor",
  isStaff: false,
  isExcludedWorkCode: () => false,
  isApprovedForOtherStatus: () => false,
});

describe("contractor.loadWorksService", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("loads contractor works bundle from rpc_scope_v1 without legacy enrich fallback", async () => {
    const rpc = jest.fn(async () => ({
      data: buildScopeEnvelope({
        rows: [
          {
            progress_id: "progress-1",
            created_at: "2026-03-30T10:00:00.000Z",
            purchase_item_id: null,
            work_code: "WORK-1",
            work_name: "Scoped Work",
            object_name: "Object A",
            contractor_org: "Scoped Contractor",
            contractor_inn: "12345678901234",
            contractor_phone: null,
            request_id: "request-1",
            request_status: "approved",
            contractor_job_id: "sub-1",
            uom_id: "pcs",
            qty_planned: 5,
            qty_done: 1,
            qty_left: 4,
            unit_price: 120,
            work_status: "ready",
            contractor_id: "contractor-1",
            started_at: null,
            finished_at: null,
          },
        ],
        subcontractCards: [
          {
            id: "sub-1",
            status: "approved",
            object_name: "Object A",
            work_type: "Scoped Work",
            qty_planned: 5,
            uom: "pcs",
            contractor_org: "Scoped Contractor",
            contractor_inn: "12345678901234",
            contractor_phone: null,
            contract_number: "C-1",
            contract_date: "2026-03-30",
            created_at: "2026-03-30T10:00:00.000Z",
            created_by: "user-1",
          },
        ],
        meta: {
          total_approved: 1,
        },
      }),
      error: null,
    }));
    const from = jest.fn(() => {
      throw new Error("legacy enrich path must not be used");
    });

    const result = await loadContractorWorksBundle(buildParams({ rpc, from }));

    expect(result.rows).toHaveLength(1);
    expect(result.subcontractCards).toHaveLength(1);
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:contractor_works_bundle_scope_v1",
      rowParityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(from).not.toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "contractor",
          surface: "works_bundle",
          event: "load_works_bundle",
          result: "success",
          sourceKind: "rpc:contractor_works_bundle_scope_v1",
          fallbackUsed: false,
        }),
      ]),
    );
  });

  it("keeps an empty rpc result as honest empty state without legacy fallback", async () => {
    const rpc = jest.fn(async () => ({
      data: buildScopeEnvelope(),
      error: null,
    }));
    const from = jest.fn(() => {
      throw new Error("legacy enrich path must not be used");
    });

    const result = await loadContractorWorksBundle(buildParams({ rpc, from }));

    expect(result.rows).toEqual([]);
    expect(result.subcontractCards).toEqual([]);
    expect(result.sourceMeta.fallbackUsed).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("keeps rpc subcontract cards scoped by created_by when contractor name and inn do not match", async () => {
    const rpc = jest.fn(async () => ({
      data: buildScopeEnvelope({
        rows: [
          {
            progress_id: "progress-created-by",
            created_at: "2026-03-30T10:00:00.000Z",
            purchase_item_id: null,
            work_code: "WORK-3",
            work_name: "Created By Work",
            object_name: "Object C",
            contractor_org: "Foreign Snapshot",
            contractor_inn: "00000000000000",
            contractor_phone: null,
            request_id: "request-3",
            request_status: "approved",
            contractor_job_id: "sub-created-by",
            uom_id: "pcs",
            qty_planned: 2,
            qty_done: 0,
            qty_left: 2,
            unit_price: 75,
            work_status: "ready",
            contractor_id: null,
            started_at: null,
            finished_at: null,
          },
        ],
        subcontractCards: [
          {
            id: "sub-created-by",
            status: "approved",
            object_name: "Object C",
            work_type: "Created By Work",
            qty_planned: 2,
            uom: "pcs",
            contractor_org: "Foreign Snapshot",
            contractor_inn: "00000000000000",
            contractor_phone: null,
            contract_number: "C-3",
            contract_date: "2026-03-30",
            created_at: "2026-03-30T10:00:00.000Z",
            created_by: "user-1",
          },
        ],
      }),
      error: null,
    }));
    const from = jest.fn(() => {
      throw new Error("legacy enrich path must not be used");
    });

    const result = await loadContractorWorksBundle(buildParams({ rpc, from }));

    expect(result.rows).toHaveLength(1);
    expect(result.subcontractCards).toHaveLength(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("surfaces rpc failure without returning to legacy client enrich", async () => {
    const rpc = jest.fn(async () => ({
      data: null,
      error: new Error("forced_contract_works_scope_failure"),
    }));
    const from = jest.fn(() => {
      throw new Error("legacy enrich path must not be used");
    });

    await expect(loadContractorWorksBundle(buildParams({ rpc, from }))).rejects.toThrow(
      "forced_contract_works_scope_failure",
    );

    expect(from).not.toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "contractor",
          surface: "works_bundle",
          event: "load_works_bundle_primary_rpc",
          result: "error",
          sourceKind: "rpc:contractor_works_bundle_scope_v1",
          fallbackUsed: false,
          errorStage: "load_works_bundle_rpc",
        }),
        expect.objectContaining({
          screen: "contractor",
          surface: "works_bundle",
          event: "load_works_bundle",
          result: "error",
          sourceKind: "rpc:contractor_works_bundle_scope_v1",
          fallbackUsed: false,
          errorStage: "load_works_bundle_rpc",
        }),
      ]),
    );
  });

  it("filters unscoped rpc rows instead of silently falling back to legacy enrich", async () => {
    const rpc = jest.fn(async () => ({
      data: buildScopeEnvelope({
        rows: [
          {
            progress_id: "progress-foreign",
            created_at: "2026-03-30T10:00:00.000Z",
            purchase_item_id: null,
            work_code: "WORK-2",
            work_name: "Foreign Work",
            object_name: "Object B",
            contractor_org: "Foreign Contractor",
            contractor_inn: "99999999999999",
            contractor_phone: null,
            request_id: "request-2",
            request_status: "approved",
            contractor_job_id: "sub-2",
            uom_id: "pcs",
            qty_planned: 1,
            qty_done: 0,
            qty_left: 1,
            unit_price: 50,
            work_status: "ready",
            contractor_id: "contractor-foreign",
            started_at: null,
            finished_at: null,
          },
        ],
        subcontractCards: [
          {
            id: "sub-2",
            status: "approved",
            object_name: "Object B",
            work_type: "Foreign Work",
            qty_planned: 1,
            uom: "pcs",
            contractor_org: "Foreign Contractor",
            contractor_inn: "99999999999999",
            contractor_phone: null,
            contract_number: "C-2",
            contract_date: "2026-03-30",
            created_at: "2026-03-30T10:00:00.000Z",
            created_by: "user-2",
          },
        ],
      }),
      error: null,
    }));
    const from = jest.fn(() => {
      throw new Error("legacy enrich path must not be used");
    });

    const result = await loadContractorWorksBundle(buildParams({ rpc, from }));

    expect(from).not.toHaveBeenCalled();
    expect(result.rows).toEqual([]);
    expect(result.subcontractCards).toEqual([]);
    expect(result.sourceMeta).toEqual({
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:contractor_works_bundle_scope_v1",
      rowParityStatus: "not_checked",
      backendFirstPrimary: true,
    });
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "contractor",
          surface: "works_bundle",
          event: "load_works_bundle_scope_guard",
          result: "success",
          sourceKind: "rpc:contractor_works_bundle_scope_v1",
          fallbackUsed: false,
          rowCount: 0,
          extra: expect.objectContaining({
            filteredOutRows: 1,
            filteredOutSubcontractCards: 1,
            scopeGuardApplied: true,
          }),
        }),
      ]),
    );
  });
});
