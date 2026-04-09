const mockRpc = jest.fn();
const mockListAccountantInbox = jest.fn();
const mockFetchDirectorFinancePanelScopeV4ViaRpc = jest.fn();
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
  fetchDirectorFinancePanelScopeV4ViaRpc: (...args: unknown[]) =>
    mockFetchDirectorFinancePanelScopeV4ViaRpc(...args),
  mapToFinanceRow: (...args: unknown[]) => mockMapToFinanceRow(...args),
  normalizeFinSpendRows: (...args: unknown[]) => mockNormalizeFinSpendRows(...args),
}));

jest.mock("../observability/platformObservability", () => ({
  beginPlatformObservability: (...args: unknown[]) => mockBeginPlatformObservability(...args),
}));

const loadSubject = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./directorFinanceScope.service") as typeof import("./directorFinanceScope.service");
};

const buildPanelScopeV4 = (): import("../../screens/director/director.finance").DirectorFinancePanelScopeV4 => ({
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
  rows: [
    {
      requestId: "request-1",
      objectId: "00000000-0000-0000-0000-000000000111",
      objectCode: "OBJ-1",
      objectName: "Object One",
      supplierId: "supplier-1",
      supplierName: "Supplier A",
      proposalId: "proposal-1",
      invoiceNumber: "INV-1",
      amountTotal: 1000,
      amountPaid: 700,
      amountDebt: 300,
      dueDate: "2026-03-30",
      isOverdue: true,
      overdueDays: 10,
      status: "overdue",
    },
  ],
  pagination: {
    limit: 50,
    offset: 0,
    total: 1,
  },
  canonical: {
    summary: {
      approvedTotal: 1000,
      paidTotal: 700,
      debtTotal: 300,
      overpaymentTotal: 0,
      overdueCount: 1,
      overdueAmount: 300,
      criticalCount: 0,
      criticalAmount: 0,
      debtCount: 1,
      partialCount: 1,
      partialPaidTotal: 100,
    },
    suppliers: [
      {
        supplierId: "supplier-1",
        supplierName: "Supplier A",
        approvedTotal: 1000,
        paidTotal: 700,
        debtTotal: 300,
        overpaymentTotal: 0,
        invoiceCount: 1,
        debtCount: 1,
        overdueCount: 1,
        criticalCount: 0,
        overdueAmount: 300,
        criticalAmount: 0,
      },
    ],
    objects: [
      {
        objectKey: "OBJ-1",
        objectId: "00000000-0000-0000-0000-000000000111",
        objectCode: "OBJ-1",
        objectName: "Object One",
        approvedTotal: 1000,
        paidTotal: 700,
        debtTotal: 300,
        overpaymentTotal: 0,
        invoiceCount: 1,
        debtCount: 1,
        overdueCount: 1,
        criticalCount: 0,
        overdueAmount: 300,
        criticalAmount: 0,
      },
    ],
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
  },
  meta: {
    owner: "backend",
    generatedAt: "2026-03-30T12:00:00.000Z",
    sourceVersion: "director_finance_panel_scope_v4",
    payloadShapeVersion: "v4",
    identitySource: "request_object_identity_scope_v1",
    objectGroupingSource: "stable_object_refs",
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
    mockFetchDirectorFinancePanelScopeV4ViaRpc.mockReset();
    mockMapToFinanceRow.mockReset();
    mockNormalizeFinSpendRows.mockReset();
    mockBeginPlatformObservability.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockBeginPlatformObservability.mockReturnValue({
      success: (...args: unknown[]) => mockSuccess(...args),
      error: (...args: unknown[]) => mockError(...args),
    });
    mockFetchDirectorFinancePanelScopeV4ViaRpc.mockResolvedValue(buildPanelScopeV4());
    mockNormalizeFinSpendRows.mockReturnValue([]);
  });

  it("marks finance scope as backend-owned via canonical v4 without compatibility overlay", async () => {
    const { loadDirectorFinanceScreenScope } = loadSubject();

    const result = await loadDirectorFinanceScreenScope({
      periodFromIso: null,
      periodToIso: null,
    });

    expect(result.cutoverMeta.primaryOwner).toBe("rpc_v4");
    expect(result.cutoverMeta.contractVersion).toBe("v4");
    expect(result.cutoverMeta.backendFirstPrimary).toBe(true);
    expect(result.cutoverMeta.summaryCompatibilityOverlay).toBe(false);
    expect(result.supportRowsLoaded).toBe(false);
    expect(result.sourceMeta.financeSummary).toBe("rpc_panel_scope_v4_canonical");
    expect(result.canonicalScope.summary.approvedTotal).toBe(1000);
    expect(result.canonicalScope.obligations.approved).toBe(1000);
    expect(result.canonicalScope.obligations.debt).toBe(300);
    expect(result.canonicalScope.suppliers).toEqual([
      expect.objectContaining({
        supplierName: "Supplier A",
        approvedTotal: 1000,
        debtTotal: 300,
      }),
    ]);
    expect(result.canonicalScope.objects).toEqual([
      expect.objectContaining({
        objectCode: "OBJ-1",
        objectName: "Object One",
        debtTotal: 300,
      }),
    ]);
    expect(mockSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: false,
        extra: expect.objectContaining({
          summaryCompatibilityOverlay: false,
          primaryOwner: "rpc_v4",
          contractVersion: "v4",
          supportRowsLoaded: false,
        }),
      }),
    );
  });
});
