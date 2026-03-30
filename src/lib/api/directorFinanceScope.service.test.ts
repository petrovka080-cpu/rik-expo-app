const mockRpc = jest.fn();
const mockListAccountantInbox = jest.fn();
const mockFetchDirectorFinancePanelScopeV3ViaRpc = jest.fn();
const mockMapToFinanceRow = jest.fn();
const mockNormalizeFinSpendRows = jest.fn();
const mockBeginPlatformObservability = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("./accountant", () => ({
  listAccountantInbox: (...args: unknown[]) => mockListAccountantInbox(...args),
}));

jest.mock("../../screens/director/director.finance", () => ({
  fetchDirectorFinancePanelScopeV3ViaRpc: (...args: unknown[]) =>
    mockFetchDirectorFinancePanelScopeV3ViaRpc(...args),
  mapToFinanceRow: (...args: unknown[]) => mockMapToFinanceRow(...args),
  normalizeFinSpendRows: (...args: unknown[]) => mockNormalizeFinSpendRows(...args),
}));

jest.mock("../observability/platformObservability", () => ({
  beginPlatformObservability: (...args: unknown[]) => mockBeginPlatformObservability(...args),
}));

const loadSubject = () =>
  require("./directorFinanceScope.service") as typeof import("./directorFinanceScope.service");

const buildPanelScopeV3 = (): import("../../screens/director/director.finance").DirectorFinancePanelScopeV3 => ({
  summary: {
    approved: 1000,
    paid: 700,
    partialPaid: 100,
    toPay: 300,
    overdueCount: 1,
    overdueAmount: 300,
    criticalCount: 0,
    criticalAmount: 0,
    partialCount: 1,
    debtCount: 1,
  },
  report: {
    suppliers: [
      {
        supplier: "Supplier A",
        count: 1,
        approved: 1000,
        paid: 700,
        toPay: 300,
        overdueCount: 1,
        criticalCount: 0,
      },
    ],
  },
  spend: {
    header: {
      approved: 1000,
      paid: 700,
      toPay: 300,
      overpay: 0,
    },
    kindRows: [
      {
        kind: "materials",
        approved: 1000,
        paid: 700,
        overpay: 0,
        toPay: 300,
        suppliers: [],
      },
    ],
    overpaySuppliers: [],
  },
  rows: [],
  pagination: {
    limit: 50,
    offset: 0,
    total: 1,
  },
  summaryV2: {
    totalAmount: 1000,
    totalPaid: 700,
    totalDebt: 300,
    overdueAmount: 300,
    bySupplier: [
      {
        supplierId: "supplier-1",
        supplierName: "Supplier A",
        debt: 300,
      },
    ],
  },
  summaryV3: {
    totalPayable: 1000,
    totalApproved: 1000,
    totalPaid: 700,
    totalDebt: 300,
    totalOverpayment: 0,
    overdueAmount: 300,
    criticalAmount: 0,
    overdueCount: 1,
    criticalCount: 0,
    debtCount: 1,
    partialCount: 1,
    partialPaid: 100,
    rowCount: 1,
    supplierRowCount: 1,
  },
  supplierRows: [
    {
      id: "supplier-row-1",
      supplierId: "supplier-1",
      supplierName: "Supplier A",
      payable: 1000,
      paid: 700,
      debt: 300,
      overpayment: 0,
      overdueAmount: 300,
      criticalAmount: 0,
      invoiceCount: 1,
      debtCount: 1,
      overdueCount: 1,
      criticalCount: 0,
    },
  ],
  meta: {
    owner: "backend",
    generatedAt: "2026-03-30T12:00:00.000Z",
    sourceVersion: "director_finance_panel_scope_v3",
    payloadShapeVersion: "v3",
    filtersEcho: {
      objectId: null,
      dateFrom: null,
      dateTo: null,
      dueDays: 7,
      criticalDays: 14,
    },
  },
  displayMode: "canonical_v3",
});

describe("directorFinanceScope.service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRpc.mockReset();
    mockListAccountantInbox.mockReset();
    mockFetchDirectorFinancePanelScopeV3ViaRpc.mockReset();
    mockMapToFinanceRow.mockReset();
    mockNormalizeFinSpendRows.mockReset();
    mockBeginPlatformObservability.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockBeginPlatformObservability.mockReturnValue({
      success: (...args: unknown[]) => mockSuccess(...args),
      error: (...args: unknown[]) => mockError(...args),
    });
    mockFetchDirectorFinancePanelScopeV3ViaRpc.mockResolvedValue(buildPanelScopeV3());
    mockNormalizeFinSpendRows.mockReturnValue([]);
  });

  it("marks finance scope as backend-owned without compatibility overlay", async () => {
    const { loadDirectorFinanceScreenScope } = loadSubject();

    const result = await loadDirectorFinanceScreenScope({
      periodFromIso: null,
      periodToIso: null,
    });

    expect(result.cutoverMeta.primaryOwner).toBe("rpc_v3");
    expect(result.cutoverMeta.backendFirstPrimary).toBe(true);
    expect(result.cutoverMeta.summaryCompatibilityOverlay).toBe(false);
    expect(result.supportRowsLoaded).toBe(false);
    expect(result.sourceMeta.financeSummary).toBe("rpc_panel_scope_v3_canonical");
    expect(result.finRep.summary.approved).toBe(1000);
    expect(result.finRep.summary.toPay).toBe(300);
    expect(mockSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: false,
        extra: expect.objectContaining({
          summaryCompatibilityOverlay: false,
          primaryOwner: "rpc_v3",
          supportRowsLoaded: false,
        }),
      }),
    );
  });
});
