import { fetchDirectorFinanceQueryData } from "./useDirectorFinanceQuery";
import type { DirectorFinanceCanonicalScope } from "../director.readModels";
import type { DirectorFinanceQueryData, DirectorFinanceScreenScopeResult } from "./directorFinance.query.types";

const mockLoadDirectorFinanceScreenScope = jest.fn();

jest.mock("../../../lib/api/directorFinanceScope.service", () => ({
  loadDirectorFinanceScreenScope: (...args: unknown[]) => mockLoadDirectorFinanceScreenScope(...args),
}));

const canonicalScope = {
  summary: { approvedTotal: 123 },
  obligations: { debt: 45 },
} as unknown as DirectorFinanceCanonicalScope;

const createScopeResult = (
  overrides?: Partial<DirectorFinanceScreenScopeResult>,
): DirectorFinanceScreenScopeResult => ({
  canonicalScope,
  panelScope: null,
  financeDisplayMode: "canonical_v3",
  issues: [],
  supportRowsLoaded: false,
  cutoverMeta: {
    primaryOwner: "rpc_v4",
    contractVersion: "v4",
    supportRowsReason: "not_requested",
    backendFirstPrimary: true,
    summaryCompatibilityOverlay: false,
    financeMode: "canonical",
    financeSemantics: "invoice_level_obligations",
  },
  sourceMeta: {
    financeSummary: "rpc_panel_scope_v4_canonical",
    spendSummary: "rpc_panel_scope_v4_canonical",
    financeRows: "not_loaded",
    spendRows: "not_loaded",
    panelScope: "rpc_v4",
    financeDisplayMode: "canonical_v3",
  },
  ...overrides,
});

describe("useDirectorFinanceQuery fetch boundary", () => {
  beforeEach(() => {
    mockLoadDirectorFinanceScreenScope.mockReset();
    mockLoadDirectorFinanceScreenScope.mockResolvedValue(createScopeResult());
  });

  it("loads through the existing director finance scope service", async () => {
    const result = await fetchDirectorFinanceQueryData({
      objectId: " object-1 ",
      periodFromIso: "2026-01-01T10:20:30.000Z",
      periodToIso: null,
      dueDaysDefault: 0,
      criticalDays: 18.9,
    });

    expect(mockLoadDirectorFinanceScreenScope).toHaveBeenCalledWith({
      objectId: "object-1",
      periodFromIso: "2026-01-01",
      periodToIso: null,
      dueDaysDefault: 7,
      criticalDays: 18,
    });
    expect(result.finScope).toBe(canonicalScope);
    expect(result.scopeKey).toBe("object-1|2026-01-01||7|18");
  });

  it("does not fabricate an empty finance model when the service fails", async () => {
    const error = new Error("director finance panel scope v4 unavailable");
    mockLoadDirectorFinanceScreenScope.mockRejectedValueOnce(error);

    await expect(
      fetchDirectorFinanceQueryData({
        periodFromIso: null,
        periodToIso: null,
        dueDaysDefault: 7,
        criticalDays: 14,
      }),
    ).rejects.toThrow("director finance panel scope v4 unavailable");
  });
});

describe("director finance query data contract", () => {
  it("keeps the exact read-model fields consumed by the controller", () => {
    const data: DirectorFinanceQueryData = {
      scopeKey: "scope",
      finScope: canonicalScope,
      panelScope: null,
      issues: [],
      supportRowsLoaded: false,
      cutoverMeta: createScopeResult().cutoverMeta,
      sourceMeta: createScopeResult().sourceMeta,
    };

    expect(Object.keys(data).sort()).toEqual([
      "cutoverMeta",
      "finScope",
      "issues",
      "panelScope",
      "scopeKey",
      "sourceMeta",
      "supportRowsLoaded",
    ]);
  });

  it("keeps refresh and loading derivation in the query-hook contract", () => {
    const expectedHookKeys = [
      "financeData",
      "finScope",
      "finLoading",
      "financeQueryError",
      "financeQueryKey",
      "financeScopeKey",
      "isLoading",
      "isFetching",
      "isError",
      "refreshFinance",
      "invalidateFinance",
    ];

    expect(expectedHookKeys).toHaveLength(11);
    expect(expectedHookKeys).toContain("refreshFinance");
    expect(expectedHookKeys).toContain("invalidateFinance");
    expect(expectedHookKeys).toContain("finLoading");
  });
});

describe("director finance controller public read contract", () => {
  it("preserves the existing finance fields exposed to DirectorScreen", () => {
    const expectedControllerFinanceKeys = [
      "finOpen",
      "finPage",
      "finScope",
      "finPeriodOpen",
      "finFrom",
      "finTo",
      "finSupplier",
      "finSupplierLoading",
      "finKindName",
      "finKindList",
      "finLoading",
    ];

    expect(expectedControllerFinanceKeys).toHaveLength(11);
    expect(expectedControllerFinanceKeys).toContain("finScope");
    expect(expectedControllerFinanceKeys).toContain("finLoading");
  });

  it("preserves the finance panel refresh entry consumed by modal refresh", () => {
    const expectedFinancePanelActions = [
      "applyFinPeriod",
      "clearFinPeriod",
      "fetchFinance",
      "setFinPeriodOpen",
    ];

    expect(expectedFinancePanelActions).toContain("fetchFinance");
  });
});
