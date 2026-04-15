const mockResolveMode = jest.fn();
const mockInvokeDirectorPdfBackend = jest.fn();
const mockBoundarySuccess = jest.fn();
const mockBoundaryError = jest.fn();
const mockBeginCanonicalPdfBoundary = jest.fn();

jest.mock("../documents/pdfRenderRollout", () => ({
  resolvePdfRenderRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
}));

jest.mock("../supabaseClient", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
}));

jest.mock("./directorPdfBackendInvoker", () => ({
  invokeDirectorPdfBackend: (...args: unknown[]) => mockInvokeDirectorPdfBackend(...args),
}));

jest.mock("../pdf/canonicalPdfObservability", () => ({
  beginCanonicalPdfBoundary: (...args: unknown[]) => mockBeginCanonicalPdfBoundary(...args),
}));

type DirectorBackendCase = {
  label: string;
  modulePath:
    | "./directorFinanceSupplierPdfBackend.service"
    | "./directorProductionReportPdfBackend.service"
    | "./directorSubcontractReportPdfBackend.service";
  exportName:
    | "generateDirectorFinanceSupplierSummaryPdfViaBackend"
    | "generateDirectorProductionReportPdfViaBackend"
    | "generateDirectorSubcontractReportPdfViaBackend";
  input: Record<string, unknown>;
  expectedDocumentType: "supplier_summary" | "director_report";
  expectedDocumentKind: "supplier_summary" | "production_report" | "subcontract_report";
  expectedRenderBranch:
    | "backend_supplier_summary_v1"
    | "backend_production_report_v1"
    | "backend_subcontract_report_v1";
};

const cases: DirectorBackendCase[] = [
  {
    label: "supplier summary",
    modulePath: "./directorFinanceSupplierPdfBackend.service",
    exportName: "generateDirectorFinanceSupplierSummaryPdfViaBackend",
    input: {
      version: "v1",
      supplier: "Supplier A",
      kindName: "materials",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      dueDaysDefault: 7,
      criticalDays: 14,
    },
    expectedDocumentType: "supplier_summary",
    expectedDocumentKind: "supplier_summary",
    expectedRenderBranch: "backend_supplier_summary_v1",
  },
  {
    label: "production report",
    modulePath: "./directorProductionReportPdfBackend.service",
    exportName: "generateDirectorProductionReportPdfViaBackend",
    input: {
      version: "v1",
      companyName: "GOX",
      generatedBy: "Director User",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object A",
      preferPriceStage: "priced",
    },
    expectedDocumentType: "director_report",
    expectedDocumentKind: "production_report",
    expectedRenderBranch: "backend_production_report_v1",
  },
  {
    label: "subcontract report",
    modulePath: "./directorSubcontractReportPdfBackend.service",
    exportName: "generateDirectorSubcontractReportPdfViaBackend",
    input: {
      version: "v1",
      companyName: "GOX",
      generatedBy: "Director User",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object B",
    },
    expectedDocumentType: "director_report",
    expectedDocumentKind: "subcontract_report",
    expectedRenderBranch: "backend_subcontract_report_v1",
  },
];

describe("director role PDF backends", () => {
  beforeEach(() => {
    jest.resetModules();
    mockResolveMode.mockReset();
    mockInvokeDirectorPdfBackend.mockReset();
    mockBoundarySuccess.mockReset();
    mockBoundaryError.mockReset();
    mockBeginCanonicalPdfBoundary.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockBeginCanonicalPdfBoundary.mockReturnValue({
      success: (...args: unknown[]) => mockBoundarySuccess(...args),
      error: (...args: unknown[]) => mockBoundaryError(...args),
    });
  });

  it.each(cases)("records canonical backend stages for $label", async (testCase) => {
    mockInvokeDirectorPdfBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/director.pdf",
      },
      signedUrl: "https://example.com/director.pdf",
      bucketId: "director_pdf_exports",
      storagePath: `director/${testCase.expectedDocumentKind}/file.pdf`,
      fileName: `${testCase.expectedDocumentKind}.pdf`,
      expiresInSeconds: 3600,
      renderVersion: "v1",
      renderBranch: testCase.expectedRenderBranch,
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      documentKind: testCase.expectedDocumentKind,
      telemetry:
        testCase.expectedDocumentKind === "supplier_summary"
          ? {
              documentKind: "director_finance_supplier_summary",
              sourceKind: "remote-url",
              financeRows: 1,
              spendRows: 1,
              detailRows: 1,
              kindRows: 1,
              fetchDurationMs: 10,
              renderDurationMs: 20,
              totalDurationMs: 30,
              htmlLengthEstimate: 100,
              payloadSizeEstimate: 200,
            }
          : null,
    });

     
    const subject = require(testCase.modulePath) as Record<string, (...args: unknown[]) => Promise<unknown>>;
    const result = await subject[testCase.exportName](testCase.input);

    expect(result).toMatchObject({
      signedUrl: "https://example.com/director.pdf",
      source: {
        kind: "remote-url",
        uri: "https://example.com/director.pdf",
      },
    });
    expect(mockBeginCanonicalPdfBoundary).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        role: "director",
        documentType: testCase.expectedDocumentType,
      }),
    );
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "payload_ready",
      expect.objectContaining({
        sourceKind: "backend_payload",
      }),
    );
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_start",
      expect.objectContaining({
        sourceKind: "backend_invoke",
      }),
    );
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        sourceKind: "remote-url",
      }),
    );
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "pdf_storage_uploaded",
      expect.objectContaining({
        sourceKind: "remote-url",
      }),
    );
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "signed_url_received",
      expect.objectContaining({
        sourceKind: "remote-url",
      }),
    );
  });

  it.each(cases)("surfaces backend failures for $label without silent fallback", async (testCase) => {
    mockInvokeDirectorPdfBackend.mockRejectedValue(new Error(`${testCase.expectedDocumentKind} failed`));

     
    const subject = require(testCase.modulePath) as Record<string, (...args: unknown[]) => Promise<unknown>>;

    await expect(subject[testCase.exportName](testCase.input)).rejects.toThrow(`${testCase.expectedDocumentKind} failed`);
    expect(mockBoundaryError).toHaveBeenCalledWith(
      "backend_invoke_failure",
      expect.any(Error),
      expect.objectContaining({
        sourceKind: "backend_invoke",
        errorStage: "backend_invoke",
      }),
    );
  });
});
