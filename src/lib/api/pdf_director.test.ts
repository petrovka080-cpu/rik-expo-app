const mockGetDirectorFinancePdfSource = jest.fn();
const mockGetDirectorProductionPdfSource = jest.fn();
const mockGetDirectorSubcontractPdfSource = jest.fn();
const mockRenderDirectorPdf = jest.fn();
const mockBuildDirectorFinancePreviewPdfModel = jest.fn();
const mockBuildDirectorManagementReportPdfModel = jest.fn();
const mockBuildDirectorProductionReportPdfModel = jest.fn();
const mockBuildDirectorSubcontractReportPdfModel = jest.fn();
const mockBuildDirectorSupplierSummaryPdfModel = jest.fn();
const mockRenderDirectorFinancePdfHtml = jest.fn();
const mockRenderDirectorManagementReportPdfHtml = jest.fn();
const mockRenderDirectorProductionReportPdfHtml = jest.fn();
const mockRenderDirectorSubcontractReportPdfHtml = jest.fn();
const mockRenderDirectorSupplierSummaryPdfHtml = jest.fn();

jest.mock("./directorPdfSource.service", () => ({
  getDirectorFinancePdfSource: (...args: unknown[]) => mockGetDirectorFinancePdfSource(...args),
  getDirectorProductionPdfSource: (...args: unknown[]) => mockGetDirectorProductionPdfSource(...args),
  getDirectorSubcontractPdfSource: (...args: unknown[]) => mockGetDirectorSubcontractPdfSource(...args),
}));

jest.mock("../pdf/pdf.builder", () => ({
  buildDirectorFinancePreviewPdfModel: (...args: unknown[]) => mockBuildDirectorFinancePreviewPdfModel(...args),
  buildDirectorManagementReportPdfModel: (...args: unknown[]) => mockBuildDirectorManagementReportPdfModel(...args),
  buildDirectorProductionReportPdfModel: (...args: unknown[]) => mockBuildDirectorProductionReportPdfModel(...args),
  buildDirectorSubcontractReportPdfModel: (...args: unknown[]) => mockBuildDirectorSubcontractReportPdfModel(...args),
  buildDirectorSupplierSummaryPdfModel: (...args: unknown[]) => mockBuildDirectorSupplierSummaryPdfModel(...args),
}));

jest.mock("./directorPdfRender.service", () => ({
  renderDirectorPdf: (...args: unknown[]) => mockRenderDirectorPdf(...args),
}));

jest.mock("../pdf/pdf.template", () => ({
  renderDirectorFinancePdfHtml: (...args: unknown[]) => mockRenderDirectorFinancePdfHtml(...args),
  renderDirectorManagementReportPdfHtml: (...args: unknown[]) => mockRenderDirectorManagementReportPdfHtml(...args),
  renderDirectorProductionReportPdfHtml: (...args: unknown[]) => mockRenderDirectorProductionReportPdfHtml(...args),
  renderDirectorSubcontractReportPdfHtml: (...args: unknown[]) => mockRenderDirectorSubcontractReportPdfHtml(...args),
  renderDirectorSupplierSummaryPdfHtml: (...args: unknown[]) => mockRenderDirectorSupplierSummaryPdfHtml(...args),
}));

const loadSubject = () => require("./pdf_director") as typeof import("./pdf_director");

describe("pdf_director exports", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetDirectorFinancePdfSource.mockReset();
    mockGetDirectorProductionPdfSource.mockReset();
    mockGetDirectorSubcontractPdfSource.mockReset();
    mockRenderDirectorPdf.mockReset();
    mockBuildDirectorFinancePreviewPdfModel.mockReset();
    mockBuildDirectorManagementReportPdfModel.mockReset();
    mockBuildDirectorProductionReportPdfModel.mockReset();
    mockBuildDirectorSubcontractReportPdfModel.mockReset();
    mockBuildDirectorSupplierSummaryPdfModel.mockReset();
    mockRenderDirectorFinancePdfHtml.mockReset();
    mockRenderDirectorManagementReportPdfHtml.mockReset();
    mockRenderDirectorProductionReportPdfHtml.mockReset();
    mockRenderDirectorSubcontractReportPdfHtml.mockReset();
    mockRenderDirectorSupplierSummaryPdfHtml.mockReset();
  });

  it("Director finance PDF works through source -> shaping -> render", async () => {
    mockGetDirectorFinancePdfSource.mockResolvedValue({
      financeRows: [{ id: "row-1", amount: 1000 }],
      spendRows: [{ proposal_id: "proposal-1" }],
      source: "rpc:pdf_director_finance_source_v1",
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: "v1",
        payloadShapeVersion: "v1",
      },
    });
    mockBuildDirectorManagementReportPdfModel.mockReturnValue({ title: "finance-model" });
    mockRenderDirectorManagementReportPdfHtml.mockReturnValue("<html>finance</html>");
    mockRenderDirectorPdf.mockResolvedValue("https://example.com/finance.pdf");

    const { exportDirectorManagementReportPdf } = loadSubject();
    const result = await exportDirectorManagementReportPdf({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    });

    expect(result).toBe("https://example.com/finance.pdf");
    expect(mockGetDirectorFinancePdfSource).toHaveBeenCalledWith({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    });
    expect(mockRenderDirectorPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "management_report",
        source: "rpc:pdf_director_finance_source_v1",
        sourceBranch: "rpc_v1",
      }),
    );
  });

  it("Director supplier summary PDF uses backend finance source contract without fallback args", async () => {
    mockGetDirectorFinancePdfSource.mockResolvedValue({
      financeRows: [{ id: "row-1", supplier: "Supplier A", amount: 1000 }],
      spendRows: [{ proposal_id: "proposal-1", supplier: "Supplier A" }],
      source: "rpc:pdf_director_finance_source_v1",
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: "v1",
        payloadShapeVersion: "v1",
      },
    });
    mockBuildDirectorSupplierSummaryPdfModel.mockReturnValue({ title: "supplier-model" });
    mockRenderDirectorSupplierSummaryPdfHtml.mockReturnValue("<html>supplier</html>");
    mockRenderDirectorPdf.mockResolvedValue("https://example.com/supplier.pdf");

    const { exportDirectorSupplierSummaryPdf } = loadSubject();
    const result = await exportDirectorSupplierSummaryPdf({
      supplier: "Supplier A",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
    });

    expect(result).toBe("https://example.com/supplier.pdf");
    expect(mockGetDirectorFinancePdfSource).toHaveBeenCalledWith({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
    });
    expect(mockRenderDirectorPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "supplier_summary",
        source: "rpc:pdf_director_finance_source_v1",
        sourceBranch: "rpc_v1",
      }),
    );
  });

  it("Director production PDF works through source -> shaping -> render", async () => {
    mockGetDirectorProductionPdfSource.mockResolvedValue({
      repData: { rows: [{ id: "material-1" }] },
      repDiscipline: { works: [{ id: "work-1" }] },
      source: "rpc:director_report_transport_scope_v1",
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: "v1",
        payloadShapeVersion: "v1",
      },
      priceStage: "priced",
      reportMeta: null,
      disciplineMeta: null,
    });
    mockBuildDirectorProductionReportPdfModel.mockReturnValue({ title: "production-model" });
    mockRenderDirectorProductionReportPdfHtml.mockReturnValue("<html>production</html>");
    mockRenderDirectorPdf.mockResolvedValue("https://example.com/production.pdf");

    const { exportDirectorProductionReportPdf } = loadSubject();
    const result = await exportDirectorProductionReportPdf({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object A",
    });

    expect(result).toBe("https://example.com/production.pdf");
    expect(mockGetDirectorProductionPdfSource).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: "Object A",
      }),
    );
    expect(mockRenderDirectorPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "production_report",
        source: "rpc:director_report_transport_scope_v1",
        sourceBranch: "rpc_v1",
      }),
    );
  });
});
