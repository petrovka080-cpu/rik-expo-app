const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockRefreshCanonicalPdfSessionOnce = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock("./canonicalPdfAuth.transport", () => ({
  refreshCanonicalPdfSessionOnce: (...args: unknown[]) =>
    mockRefreshCanonicalPdfSessionOnce(...args),
}));

const loadSubject = () =>
  require("./directorPdfBackendInvoker") as typeof import("./directorPdfBackendInvoker");

describe("directorPdfBackendInvoker", () => {
  beforeEach(() => {
    jest.resetModules();
    mockInvoke.mockReset();
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockRefreshCanonicalPdfSessionOnce.mockReset();
    mockRefreshCanonicalPdfSessionOnce.mockResolvedValue(false);
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it("normalizes canonical remote-url success payloads", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        renderVersion: "v1",
        renderBranch: "backend_production_report_v1",
        renderer: "local_browser_puppeteer",
        sourceKind: "remote-url",
        documentKind: "production_report",
        signedUrl: "https://example.com/production.pdf",
        bucketId: "director_pdf_exports",
        storagePath: "director/production/file.pdf",
        fileName: "production.pdf",
        expiresInSeconds: 3600,
      },
      error: null,
    });

    const { invokeDirectorPdfBackend } = loadSubject();
    const result = await invokeDirectorPdfBackend({
      functionName: "director-production-report-pdf",
      payload: { version: "v1" },
      expectedDocumentKind: "production_report",
      expectedRenderBranch: "backend_production_report_v1",
      allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
      errorPrefix: "director production report pdf backend failed",
    });

    expect(result).toMatchObject({
      signedUrl: "https://example.com/production.pdf",
      renderer: "local_browser_puppeteer",
      sourceKind: "remote-url",
      documentKind: "production_report",
      source: {
        kind: "remote-url",
        uri: "https://example.com/production.pdf",
      },
    });
  });

  it("classifies typed auth failures from edge responses", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: false,
        renderVersion: "v1",
        errorCode: "auth_failed",
        error: "Forbidden.",
      },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { invokeDirectorPdfBackend, DirectorPdfTransportError } = loadSubject();

    await expect(
      invokeDirectorPdfBackend({
        functionName: "director-pdf-render",
        payload: { version: "v1" },
        expectedDocumentKind: "management_report",
        expectedRenderBranch: "edge_render_v1",
        allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
        errorPrefix: "director-pdf-render failed",
      }),
    ).rejects.toMatchObject<Partial<InstanceType<typeof DirectorPdfTransportError>>>({
      name: "DirectorPdfTransportError",
      code: "auth_failed",
      functionName: "director-pdf-render",
      serverErrorCode: "auth_failed",
    });
  });

  it("classifies malformed success payloads as invalid_response", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        renderVersion: "v1",
        renderBranch: "backend_subcontract_report_v1",
        renderer: "browserless_puppeteer",
        sourceKind: "remote-url",
        documentKind: "subcontract_report",
        bucketId: "director_pdf_exports",
        storagePath: "director/subcontract/file.pdf",
        fileName: "subcontract.pdf",
      },
      error: null,
    });

    const { invokeDirectorPdfBackend } = loadSubject();

    await expect(
      invokeDirectorPdfBackend({
        functionName: "director-subcontract-report-pdf",
        payload: { version: "v1" },
        expectedDocumentKind: "subcontract_report",
        expectedRenderBranch: "backend_subcontract_report_v1",
        allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
        errorPrefix: "director subcontract report pdf backend failed",
      }),
    ).rejects.toMatchObject({
      name: "DirectorPdfTransportError",
      code: "invalid_response",
      functionName: "director-subcontract-report-pdf",
    });
  });

  it("refreshes the current session once and retries on auth_failed payloads", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: {
          ok: false,
          renderVersion: "v1",
          errorCode: "auth_failed",
          error: "Forbidden.",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          renderVersion: "v1",
          renderBranch: "backend_supplier_summary_v1",
          renderer: "local_browser_puppeteer",
          sourceKind: "remote-url",
          documentKind: "supplier_summary",
          signedUrl: "https://example.com/supplier.pdf",
          bucketId: "director_pdf_exports",
          storagePath: "director/supplier/file.pdf",
          fileName: "supplier.pdf",
          expiresInSeconds: 3600,
        },
        error: null,
      });
    mockRefreshCanonicalPdfSessionOnce.mockResolvedValue(true);

    const { invokeDirectorPdfBackend } = loadSubject();
    const result = await invokeDirectorPdfBackend({
      functionName: "director-finance-supplier-summary-pdf",
      payload: { version: "v1" },
      expectedDocumentKind: "supplier_summary",
      expectedRenderBranch: "backend_supplier_summary_v1",
      allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"],
      errorPrefix: "director finance supplier pdf backend failed",
    });

    expect(mockRefreshCanonicalPdfSessionOnce).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.signedUrl).toBe("https://example.com/supplier.pdf");
  });
});
