const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockInvokeDirectorPdfBackend = jest.fn();

jest.mock("../supabaseClient", () => ({
  isSupabaseEnvValid: true,
}));

jest.mock("../documents/pdfRenderRollout", () => ({
  getPdfRenderRolloutAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  recordPdfRenderRolloutBranch: (...args: unknown[]) => mockRecordBranch(...args),
  registerPdfRenderRolloutPath: (...args: unknown[]) => mockRegisterPath(...args),
  resolvePdfRenderRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
  setPdfRenderRolloutAvailability: (...args: unknown[]) => mockSetAvailability(...args),
}));

jest.mock("./directorPdfBackendInvoker", () => ({
  invokeDirectorPdfBackend: (...args: unknown[]) => mockInvokeDirectorPdfBackend(...args),
}));

const loadSubject = () =>
  require("./directorPdfRender.service") as typeof import("./directorPdfRender.service");

describe("directorPdfRender.service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockInvokeDirectorPdfBackend.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("unknown");
  });

  it("uses canonical edge render without client fallback", async () => {
    mockInvokeDirectorPdfBackend.mockResolvedValue({
      signedUrl: "https://example.com/director-report.pdf",
    });

    const { renderDirectorPdf } = loadSubject();
    const result = await renderDirectorPdf({
      documentKind: "management_report",
      documentType: "director_report",
      html: "<html>report</html>",
      source: "rpc:pdf_director_finance_source_v1",
      sourceBranch: "rpc_v1",
    });

    expect(result).toBe("https://example.com/director-report.pdf");
    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "director-pdf-render",
        expectedRenderBranch: "edge_render_v1",
        expectedDocumentKind: "management_report",
      }),
    );
    expect(mockSetAvailability).toHaveBeenCalledWith("director_render_v1", "available");
    expect(mockRecordBranch).toHaveBeenCalledWith(
      "director_render_v1",
      expect.objectContaining({
        documentKind: "management_report",
        branchMeta: expect.objectContaining({
          renderBranch: "edge_render_v1",
        }),
      }),
    );
  });

  it("surfaces edge failure instead of falling back to client render", async () => {
    mockInvokeDirectorPdfBackend.mockRejectedValue(new Error("director-pdf-render failed: CORS preflight failed"));

    const { renderDirectorPdf } = loadSubject();

    await expect(
      renderDirectorPdf({
        documentKind: "production_report",
        documentType: "director_report",
        html: "<html>report</html>",
        source: "rpc:director_report_transport_scope_v1",
      }),
    ).rejects.toThrow("CORS preflight failed");
  });
});
