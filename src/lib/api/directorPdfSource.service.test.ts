const mockRpc = jest.fn();
const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockRecordCatchDiscipline = jest.fn();
const mockLoadDirectorReportTransportScope = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("../documents/pdfRpcRollout", () => ({
  getPdfRpcRolloutAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  recordPdfRpcRolloutBranch: (...args: unknown[]) => mockRecordBranch(...args),
  registerPdfRpcRolloutPath: (...args: unknown[]) => mockRegisterPath(...args),
  resolvePdfRpcRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
  setPdfRpcRolloutAvailability: (...args: unknown[]) => mockSetAvailability(...args),
}));

jest.mock("../observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

jest.mock("./directorReportsTransport.service", () => ({
  loadDirectorReportTransportScope: (...args: unknown[]) => mockLoadDirectorReportTransportScope(...args),
}));

jest.mock("../../screens/director/director.finance", () => ({
  mapToFinanceRow: (row: Record<string, unknown>) => ({
    id: String(row.id ?? "row"),
    amount: Number(row.amount ?? 0),
  }),
  normalizeFinSpendRows: (rows: unknown) => (Array.isArray(rows) ? rows : []),
}));

jest.mock("./director_reports.adapters", () => ({
  adaptCanonicalMaterialsPayload: (value: unknown) => value,
  adaptCanonicalWorksPayload: (value: unknown) => value,
}));

const loadSubject = () =>
  require("./directorPdfSource.service") as typeof import("./directorPdfSource.service");

describe("directorPdfSource.service", () => {
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

  it("loads Director finance PDF source from canonical rpc", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        document_type: "director_finance_report",
        version: "v1",
        finance_rows: [{ id: "row-1", amount: 1000 }],
        spend_rows: [{ proposal_id: "proposal-1" }],
      },
      error: null,
    });

    const { getDirectorFinancePdfSource } = loadSubject();
    const result = await getDirectorFinancePdfSource({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
    });

    expect(result.source).toBe("rpc:pdf_director_finance_source_v1");
    expect(result.branchMeta).toEqual({
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    });
    expect(mockSetAvailability).toHaveBeenCalledWith("director_finance_source_v1", "available");
    expect(mockRecordCatchDiscipline).not.toHaveBeenCalled();
  });

  it("surfaces source load failure for Director production PDF", async () => {
    mockLoadDirectorReportTransportScope.mockRejectedValueOnce(new Error("transport failed"));

    const { getDirectorProductionPdfSource } = loadSubject();

    await expect(
      getDirectorProductionPdfSource({
        periodFrom: "2026-03-01",
        periodTo: "2026-03-30",
        objectName: "Object A",
      }),
    ).rejects.toThrow("transport failed");

    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        surface: "director_pdf_source",
        event: "director_pdf_source_failed",
        kind: "critical_fail",
        errorStage: "source_load",
        extra: expect.objectContaining({
          pdfSourceFamily: "director_production_source_v1",
          fallbackUsed: false,
        }),
      }),
    );
  });
});
