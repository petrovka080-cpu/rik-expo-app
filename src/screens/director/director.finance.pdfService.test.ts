const mockGenerateDirectorPdfDocument = jest.fn();
const mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend = jest.fn();
const mockExportDirectorManagementReportPdf = jest.fn();
const mockCreatePdfSource = jest.fn();

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  generateDirectorPdfDocument: (...args: unknown[]) => mockGenerateDirectorPdfDocument(...args),
}));

jest.mock("../../lib/api/directorFinanceSupplierPdfBackend.service", () => ({
  generateDirectorFinanceSupplierSummaryPdfViaBackend: (...args: unknown[]) =>
    mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend(...args),
}));

jest.mock("../../lib/api/pdf_director", () => ({
  exportDirectorManagementReportPdf: (...args: unknown[]) => mockExportDirectorManagementReportPdf(...args),
}));

jest.mock("../../lib/pdfFileContract", () => ({
  createPdfSource: (...args: unknown[]) => mockCreatePdfSource(...args),
}));

const loadSubject = () =>
   
  require("./director.finance.pdfService") as typeof import("./director.finance.pdfService");

describe("director.finance.pdfService", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGenerateDirectorPdfDocument.mockReset();
    mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend.mockReset();
    mockExportDirectorManagementReportPdf.mockReset();
    mockCreatePdfSource.mockReset();
    mockGenerateDirectorPdfDocument.mockImplementation(async (args: unknown) => args);
    mockCreatePdfSource.mockImplementation((uri: string) => ({
      kind: "remote-url",
      uri,
    }));
  });

  it("uses backend source for supplier summary PDF without local fallback", async () => {
    mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/supplier.pdf",
      },
      telemetry: {
        documentKind: "director_finance_supplier_summary",
        sourceKind: "remote-url",
        fetchSourceName: "pdf_director_finance_source_v1",
        financeRows: 4,
        spendRows: 3,
        detailRows: 4,
        kindRows: 1,
        fetchDurationMs: 20,
        renderDurationMs: 120,
        totalDurationMs: 140,
        htmlLengthEstimate: 1024,
        payloadSizeEstimate: 2048,
        fallbackUsed: false,
        openStrategy: "remote-url",
        materializationStrategy: "viewer_remote",
      },
    });

    const { buildDirectorSupplierSummaryPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorSupplierSummaryPdfDescriptor({
      supplier: "Supplier A",
      kindName: "materials",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    });

    expect(mockGenerateDirectorPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "supplier_summary",
        entityId: "Supplier A",
      }),
    );

    const source = await ((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource();

    expect(source).toEqual({
      kind: "remote-url",
      uri: "https://example.com/supplier.pdf",
    });
    expect(mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend).toHaveBeenCalledWith({
      version: "v1",
      supplier: "Supplier A",
      kindName: "materials",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    });
  });

  it("surfaces supplier backend failure instead of falling back to local render", async () => {
    mockGenerateDirectorFinanceSupplierSummaryPdfViaBackend.mockRejectedValue(new Error("backend failed"));

    const { buildDirectorSupplierSummaryPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorSupplierSummaryPdfDescriptor({
      supplier: "Supplier A",
      kindName: null,
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
    });

    await expect((((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource())).rejects.toThrow(
      "backend failed",
    );
  });

  it("builds management PDF descriptor on the canonical backend-owned contract", async () => {
    mockExportDirectorManagementReportPdf.mockResolvedValue("https://example.com/finance.pdf");

    const { buildDirectorManagementReportPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorManagementReportPdfDescriptor({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    });

    expect(mockGenerateDirectorPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "director_report",
        getSource: expect.any(Function),
      }),
    );
    expect(mockExportDirectorManagementReportPdf).not.toHaveBeenCalled();

    await expect((((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource())).resolves.toEqual({
      kind: "remote-url",
      uri: "https://example.com/finance.pdf",
    });
    expect(mockCreatePdfSource).toHaveBeenCalledWith("https://example.com/finance.pdf");
  });
});
