const mockRpc = jest.fn();
const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockRecordCatchDiscipline = jest.fn();
const mockLoadDirectorReportTransportScope = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("../../src/lib/documents/pdfRpcRollout", () => ({
  getPdfRpcRolloutAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  recordPdfRpcRolloutBranch: (...args: unknown[]) => mockRecordBranch(...args),
  registerPdfRpcRolloutPath: (...args: unknown[]) => mockRegisterPath(...args),
  resolvePdfRpcRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
  setPdfRpcRolloutAvailability: (...args: unknown[]) => mockSetAvailability(...args),
}));

jest.mock("../../src/lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

jest.mock("../../src/lib/api/directorReportsTransport.service", () => ({
  loadDirectorReportTransportScope: (...args: unknown[]) => mockLoadDirectorReportTransportScope(...args),
}));

jest.mock("../../src/lib/api/director_reports.adapters", () => ({
  adaptCanonicalMaterialsPayload: (value: unknown) => value,
  adaptCanonicalWorksPayload: (value: unknown) => value,
}));

jest.mock("../../src/screens/director/director.finance", () => ({
  mapToFinanceRow: (row: Record<string, unknown>) => ({
    id: String(row.id ?? "row"),
    amount: Number(row.amount ?? 0),
  }),
  normalizeFinSpendRows: (rows: unknown) => (Array.isArray(rows) ? rows : []),
}));

const loadSubject = () =>
  require("../../src/lib/api/directorPdfSource.service") as typeof import("../../src/lib/api/directorPdfSource.service");

describe("directorPdfSource.service strict-null phase 3", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRpc.mockReset();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockRecordCatchDiscipline.mockReset();
    mockLoadDirectorReportTransportScope.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("unknown");
  });

  it("omits nullable finance RPC filters instead of sending null", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        document_type: "director_finance_report",
        version: "v1",
        finance_rows: [{ id: "row-1", amount: 10 }],
        spend_rows: [],
      },
      error: null,
    });

    const { getDirectorFinancePdfSource } = loadSubject();
    await getDirectorFinancePdfSource({
      periodFrom: null,
      periodTo: null,
      dueDaysDefault: undefined,
      criticalDays: undefined,
    });

    expect(mockRpc).toHaveBeenCalledWith("pdf_director_finance_source_v1", {
      p_from: undefined,
      p_to: undefined,
      p_due_days: 7,
      p_critical_days: 14,
    });
  });

  it("preserves explicit finance RPC filters", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        document_type: "director_finance_report",
        version: "v1",
        finance_rows: [{ id: "row-2", amount: 50 }],
        spend_rows: [],
      },
      error: null,
    });

    const { getDirectorFinancePdfSource } = loadSubject();
    await getDirectorFinancePdfSource({
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      dueDaysDefault: 5,
      criticalDays: 9,
    });

    expect(mockRpc).toHaveBeenCalledWith("pdf_director_finance_source_v1", {
      p_from: "2026-04-01",
      p_to: "2026-04-30",
      p_due_days: 5,
      p_critical_days: 9,
    });
  });

  it("omits nullable production and subcontract RPC filters instead of sending null", async () => {
    mockLoadDirectorReportTransportScope.mockResolvedValueOnce({
      report: { rows: [] },
      discipline: { works: [] },
      source: "rpc:director_report_transport_scope_v1",
      branchMeta: { rpcVersion: "v1" },
      reportMeta: null,
      disciplineMeta: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: {
        document_type: "director_subcontract_report",
        version: "v1",
        rows: [],
      },
      error: null,
    });

    const { getDirectorProductionPdfSource, getDirectorSubcontractPdfSource } = loadSubject();

    await getDirectorProductionPdfSource({
      periodFrom: null,
      periodTo: null,
      objectName: null,
      preferPriceStage: "priced",
    });

    expect(mockLoadDirectorReportTransportScope).toHaveBeenCalledWith({
      from: "",
      to: "",
      objectName: null,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: false,
    });

    await getDirectorSubcontractPdfSource({
      periodFrom: null,
      periodTo: null,
      objectName: null,
    });

    expect(mockRpc).toHaveBeenCalledWith("pdf_director_subcontract_source_v1", {
      p_from: undefined,
      p_to: undefined,
      p_object_name: undefined,
    });
  });

  it("preserves explicit subcontract RPC filters", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        document_type: "director_subcontract_report",
        version: "v1",
        rows: [{ id: "row-3" }],
      },
      error: null,
    });

    const { getDirectorSubcontractPdfSource } = loadSubject();
    await getDirectorSubcontractPdfSource({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      objectName: "Object A",
    });

    expect(mockRpc).toHaveBeenCalledWith("pdf_director_subcontract_source_v1", {
      p_from: "2026-03-01",
      p_to: "2026-03-31",
      p_object_name: "Object A",
    });
  });
});
