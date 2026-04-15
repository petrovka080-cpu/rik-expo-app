const mockLoadDirectorReportTransportScope = jest.fn();
const mockLoadConstructionObjectCodesByNames = jest.fn();
const mockBeginPlatformObservability = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock("./directorReportsTransport.service", () => ({
  loadDirectorReportTransportScope: (...args: unknown[]) =>
    mockLoadDirectorReportTransportScope(...args),
}));

jest.mock("./constructionObjectIdentity.read", () => ({
  loadConstructionObjectCodesByNames: (...args: unknown[]) =>
    mockLoadConstructionObjectCodesByNames(...args),
}));

jest.mock("../supabaseClient", () => ({
  supabase: {},
}));

jest.mock("../observability/platformObservability", () => ({
  beginPlatformObservability: (...args: unknown[]) => mockBeginPlatformObservability(...args),
}));

const loadSubject = () => {
   
  return require("./directorReportsScope.service") as typeof import("./directorReportsScope.service");
};

const canonicalSummary = {
  objectCount: 42,
  objectCountLabel: "Objects from backend",
  objectCountExplanation: "Backend object explanation",
  confirmedWarehouseObjectCount: 42,
  displayObjectCount: 42,
  displayObjectCountLabel: "Objects from backend",
  displayObjectCountExplanation: "Backend display explanation",
  noWorkNameCount: 5,
  noWorkNameExplanation: "Backend no-work explanation",
  unresolvedNamesCount: 2,
};

const canonicalDiagnostics = {
  naming: {
    vrr: "ok",
    overrides: "missing",
    ledger: "ok",
    objectNamingSourceStatus: "ok",
    workNamingSourceStatus: "ok",
    balanceViewStatus: "ok",
    namesViewStatus: "ok",
    overridesStatus: "degraded",
    resolvedNames: 9,
    unresolvedCodes: ["A-001", "B-002"],
    lastProbeAt: "2026-04-12T00:00:00.000Z",
    probeCacheMode: "live",
  },
  objectCountSource: "warehouse_confirmed_issues",
  noWorkName: {
    workNameMissingCount: 1,
    workNameResolvedCount: 3,
    itemsWithoutWorkName: 5,
    locationsWithoutWorkName: 2,
    share: 12.5,
    source: "warehouse_issues",
    fallbackApplied: false,
    canResolveFromSource: false,
    explanation: "Backend no-work explanation",
  },
  backendOwnerPreserved: true,
  transportBranch: "rpc_scope_v1",
  pricedStage: "base",
};

const buildTransportResult = (overrides?: Record<string, unknown>) => ({
  options: {
    objects: ["Client visible object only"],
    objectIdByName: {},
  },
  report: {
    meta: {
      from: "2026-04-01",
      to: "2026-04-12",
      object_name: null,
    },
    kpi: {
      issues_total: 1,
      issues_no_obj: 0,
      items_total: 1,
      items_free: 0,
    },
    rows: [
      {
        rik_code: "CLIENT-UNRESOLVED-ONLY",
        name_human_ru: "CLIENT-UNRESOLVED-ONLY",
        uom: "pcs",
        qty_total: 1,
        docs_cnt: 1,
        qty_free: 0,
        docs_free: 0,
      },
    ],
  },
  discipline: {
    summary: {
      total_qty: 1,
      total_docs: 1,
      total_positions: 99,
      pct_without_work: 100,
      pct_without_level: 0,
      pct_without_request: 0,
      issue_cost_total: 0,
      purchase_cost_total: 0,
      issue_to_purchase_pct: 0,
      unpriced_issue_pct: 0,
    },
    works: [
      {
        id: "client-without-work",
        work_type_name: "without work client-only bucket",
        total_qty: 1,
        total_docs: 1,
        total_positions: 99,
        share_total_pct: 100,
        req_positions: 0,
        free_positions: 0,
        location_count: 99,
        levels: [],
      },
    ],
  },
  canonicalSummaryPayload: canonicalSummary,
  canonicalDiagnosticsPayload: canonicalDiagnostics,
  optionsMeta: { stage: "options" },
  reportMeta: { stage: "report" },
  disciplineMeta: { stage: "discipline", pricedStage: "base" },
  source: "transport:director_report_scope_rpc_v1",
  branchMeta: {
    transportBranch: "rpc_scope_v1",
    rpcVersion: "v1",
    pricedStage: "base",
  },
  fromCache: false,
  ...overrides,
});

describe("directorReportsScope.service canonical read truth", () => {
  beforeEach(() => {
    jest.resetModules();
    mockLoadDirectorReportTransportScope.mockReset();
    mockLoadConstructionObjectCodesByNames.mockReset();
    mockBeginPlatformObservability.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockBeginPlatformObservability.mockReturnValue({
      success: (...args: unknown[]) => mockSuccess(...args),
      error: (...args: unknown[]) => mockError(...args),
    });
    mockLoadConstructionObjectCodesByNames.mockResolvedValue(new Map());
  });

  it("uses backend canonical summary and diagnostics instead of recomputing from client rows", async () => {
    mockLoadDirectorReportTransportScope.mockResolvedValue(buildTransportResult());
    const { loadDirectorReportUiScope } = loadSubject();

    const result = await loadDirectorReportUiScope({
      from: "2026-04-01",
      to: "2026-04-12",
      objectName: null,
      includeDiscipline: true,
      skipDisciplinePrices: true,
    });

    expect(result.report?.summary).toEqual(canonicalSummary);
    expect(result.report?.diagnostics).toEqual(canonicalDiagnostics);
    expect(result.report?.summary?.displayObjectCount).toBe(42);
    expect(result.report?.summary?.noWorkNameCount).toBe(5);
    expect(result.report?.summary?.unresolvedNamesCount).toBe(2);
    expect(mockSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: false,
        extra: expect.objectContaining({
          objectCountLabel: "Objects from backend",
          unresolvedNamesCount: 2,
          noWorkNameCount: 5,
          objectCountSource: "warehouse_confirmed_issues",
        }),
      }),
    );
  });

  it("fails closed when the transport scope does not return canonical decorations", async () => {
    mockLoadDirectorReportTransportScope.mockResolvedValue(
      buildTransportResult({
        canonicalSummaryPayload: undefined,
        canonicalDiagnosticsPayload: undefined,
      }),
    );
    const { loadDirectorReportUiScope } = loadSubject();

    await expect(
      loadDirectorReportUiScope({
        from: "2026-04-01",
        to: "2026-04-12",
        objectName: null,
        includeDiscipline: true,
        skipDisciplinePrices: true,
      }),
    ).rejects.toThrow("missing canonical canonical_summary");

    expect(mockError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        errorStage: "load_report_scope",
      }),
    );
  });
});
