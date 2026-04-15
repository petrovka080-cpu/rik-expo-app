const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockInvokeDirectorPdfBackend = jest.fn();
const mockBoundarySuccess = jest.fn();
const mockBoundaryError = jest.fn();
const mockBeginCanonicalPdfBoundary = jest.fn();
const mockRecordPlatformObservability = jest.fn();

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

jest.mock("../pdf/canonicalPdfObservability", () => ({
  beginCanonicalPdfBoundary: (...args: unknown[]) => mockBeginCanonicalPdfBoundary(...args),
}));

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

const loadSubject = () =>
   
  require("./directorPdfRender.service") as typeof import("./directorPdfRender.service");

const makeEdgeResult = (signedUrl: string) => ({
  signedUrl,
  bucketId: "director_pdf_exports",
  storagePath: "director/management/file.pdf",
  fileName: "director-report.pdf",
  sourceKind: "remote-url",
  renderer: "browserless_puppeteer",
});

describe("directorPdfRender.service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockInvokeDirectorPdfBackend.mockReset();
    mockBoundarySuccess.mockReset();
    mockBoundaryError.mockReset();
    mockBeginCanonicalPdfBoundary.mockReset();
    mockRecordPlatformObservability.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("unknown");
    mockBeginCanonicalPdfBoundary.mockReturnValue({
      success: (...args: unknown[]) => mockBoundarySuccess(...args),
      error: (...args: unknown[]) => mockBoundaryError(...args),
    });
  });

  it("uses canonical edge render without client fallback", async () => {
    mockInvokeDirectorPdfBackend.mockResolvedValue(makeEdgeResult("https://example.com/director-report.pdf"));

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
    expect(mockBeginCanonicalPdfBoundary).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        role: "director",
        documentType: "director_report",
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

// D-RENDERER-MIGRATION: Rendered PDF cache tests.
// These tests verify that the client-side cache correctly skips the Edge Function
// on reopen with identical HTML, and correctly invalidates on different HTML.
describe("directorPdfRender.service — rendered PDF cache", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockInvokeDirectorPdfBackend.mockReset();
    mockBoundarySuccess.mockReset();
    mockBoundaryError.mockReset();
    mockBeginCanonicalPdfBoundary.mockReset();
    mockRecordPlatformObservability.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("available");
    mockBeginCanonicalPdfBoundary.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
    });
  });

  it("returns cached signedUrl on second call with same HTML (cache hit)", async () => {
    mockInvokeDirectorPdfBackend.mockResolvedValue(
      makeEdgeResult("https://cdn.example.com/report-cached.pdf"),
    );

    const { renderDirectorPdf } = loadSubject();
    const html = "<html>cache-hit-test-content</html>";
    const args = {
      documentKind: "management_report" as const,
      documentType: "director_report" as const,
      html,
      source: "rpc:pdf_director_finance_source_v1",
    };

    // First call — cache miss, calls Edge
    const result1 = await renderDirectorPdf(args);
    expect(result1).toBe("https://cdn.example.com/report-cached.pdf");
    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(1);

    // Second call — same HTML → cache hit, no Edge call
    const result2 = await renderDirectorPdf(args);
    expect(result2).toBe("https://cdn.example.com/report-cached.pdf");
    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(1);

    // Should have emitted a cache hit observability event
    const cacheHitCalls = mockRecordPlatformObservability.mock.calls.filter(
      (call: unknown[]) =>
        call[0] &&
        typeof call[0] === "object" &&
        (call[0] as Record<string, unknown>).event === "rendered_pdf_cache_hit",
    );
    expect(cacheHitCalls.length).toBe(1);
  });

  it("calls Edge Function again when HTML changes (cache miss)", async () => {
    mockInvokeDirectorPdfBackend
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/v1.pdf"))
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/v2.pdf"));

    const { renderDirectorPdf } = loadSubject();
    const baseArgs = {
      documentKind: "management_report" as const,
      documentType: "director_report" as const,
      source: "rpc:pdf_director_finance_source_v1",
    };

    const result1 = await renderDirectorPdf({ ...baseArgs, html: "<html>params-A</html>" });
    expect(result1).toBe("https://cdn.example.com/v1.pdf");

    // Different HTML → different hash → cache miss
    const result2 = await renderDirectorPdf({ ...baseArgs, html: "<html>params-B</html>" });
    expect(result2).toBe("https://cdn.example.com/v2.pdf");

    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("cache miss when entry expires (TTL exceeded)", async () => {
    mockInvokeDirectorPdfBackend
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/old.pdf"))
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/fresh.pdf"));

    const { renderDirectorPdf } = loadSubject();
    const args = {
      documentKind: "management_report" as const,
      documentType: "director_report" as const,
      html: "<html>ttl-test</html>",
      source: "rpc:pdf_director_finance_source_v1",
    };

    const result1 = await renderDirectorPdf(args);
    expect(result1).toBe("https://cdn.example.com/old.pdf");

    // Fast-forward time past TTL (30 minutes)
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 31 * 60 * 1000;
    try {
      const result2 = await renderDirectorPdf(args);
      expect(result2).toBe("https://cdn.example.com/fresh.pdf");
      expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realDateNow;
    }
  });

  it("no wrong PDF reused — different data produces different HTML hash", async () => {
    mockInvokeDirectorPdfBackend
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/data-a.pdf"))
      .mockResolvedValueOnce(makeEdgeResult("https://cdn.example.com/data-b.pdf"));

    const { renderDirectorPdf } = loadSubject();

    await renderDirectorPdf({
      documentKind: "management_report",
      documentType: "director_report",
      html: "<html>finance-data-period-march</html>",
      source: "rpc:pdf_director_finance_source_v1",
    });

    const result = await renderDirectorPdf({
      documentKind: "management_report",
      documentType: "director_report",
      html: "<html>finance-data-period-april</html>",
      source: "rpc:pdf_director_finance_source_v1",
    });

    expect(result).toBe("https://cdn.example.com/data-b.pdf");
    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("failed render does not cache — retry triggers fresh Edge call", async () => {
    mockInvokeDirectorPdfBackend.mockRejectedValueOnce(new Error("Edge timeout"));

    const { renderDirectorPdf } = loadSubject();
    const args = {
      documentKind: "management_report" as const,
      documentType: "director_report" as const,
      html: "<html>fallback-test</html>",
      source: "rpc:pdf_director_finance_source_v1",
    };

    await expect(renderDirectorPdf(args)).rejects.toThrow("Edge timeout");

    // Retry should trigger fresh Edge call (no cache entry from failed render)
    mockInvokeDirectorPdfBackend.mockResolvedValue(
      makeEdgeResult("https://cdn.example.com/retried.pdf"),
    );

    const result = await renderDirectorPdf(args);
    expect(result).toBe("https://cdn.example.com/retried.pdf");
    expect(mockInvokeDirectorPdfBackend).toHaveBeenCalledTimes(2);
  });
});
