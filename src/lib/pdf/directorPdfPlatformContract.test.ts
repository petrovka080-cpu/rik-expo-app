import {
  classifyDirectorPdfTransportError,
  createDirectorPdfErrorResponse,
  createDirectorPdfOptionsResponse,
  createDirectorPdfSuccessResponse,
  extractDirectorPdfErrorPayload,
  normalizeDirectorPdfSuccessPayload,
} from "./directorPdfPlatformContract";

describe("directorPdfPlatformContract", () => {
  it("returns CORS headers for preflight options", () => {
    const response = createDirectorPdfOptionsResponse();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
  });

  it("keeps CORS headers on error responses", async () => {
    const response = createDirectorPdfErrorResponse({
      status: 500,
      errorCode: "backend_pdf_failed",
      error: "render failed",
      documentKind: "production_report",
      renderBranch: "backend_production_report_v1",
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({
      ok: false,
      renderVersion: "v1",
      errorCode: "backend_pdf_failed",
      error: "render failed",
      documentKind: "production_report",
      renderBranch: "backend_production_report_v1",
    });
  });

  it("normalizes a success payload with stable remote-url contract", async () => {
    const response = createDirectorPdfSuccessResponse({
      ok: true,
      renderVersion: "v1",
      renderBranch: "backend_subcontract_report_v1",
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      documentKind: "subcontract_report",
      signedUrl: "https://example.com/subcontract.pdf",
      bucketId: "director_pdf_exports",
      storagePath: "director/subcontract/file.pdf",
      fileName: "subcontract.pdf",
      expiresInSeconds: 3600,
    });
    const payload = await response.json();

    expect(
      normalizeDirectorPdfSuccessPayload({
        value: payload,
        expectedDocumentKind: "subcontract_report",
        expectedRenderBranch: "backend_subcontract_report_v1",
        allowedRenderers: ["browserless_puppeteer"],
      }),
    ).toEqual({
      ok: true,
      renderVersion: "v1",
      renderBranch: "backend_subcontract_report_v1",
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      documentKind: "subcontract_report",
      signedUrl: "https://example.com/subcontract.pdf",
      bucketId: "director_pdf_exports",
      storagePath: "director/subcontract/file.pdf",
      fileName: "subcontract.pdf",
      expiresInSeconds: 3600,
      telemetry: null,
    });
  });

  it("normalizes a production artifact-cache success payload", async () => {
    const response = createDirectorPdfSuccessResponse({
      ok: true,
      renderVersion: "v1",
      renderBranch: "backend_production_report_v1",
      renderer: "artifact_cache",
      sourceKind: "remote-url",
      documentKind: "production_report",
      signedUrl: "https://example.com/production.pdf",
      bucketId: "director_pdf_exports",
      storagePath: "director/production_report/artifacts/v1/source/production.pdf",
      fileName: "production.pdf",
      expiresInSeconds: 3600,
      telemetry: {
        cacheStatus: "artifact_hit",
      },
    });
    const payload = await response.json();

    expect(
      normalizeDirectorPdfSuccessPayload({
        value: payload,
        expectedDocumentKind: "production_report",
        expectedRenderBranch: "backend_production_report_v1",
        allowedRenderers: ["artifact_cache"],
      }),
    ).toMatchObject({
      ok: true,
      renderBranch: "backend_production_report_v1",
      renderer: "artifact_cache",
      documentKind: "production_report",
      telemetry: {
        cacheStatus: "artifact_hit",
      },
    });
  });

  it("extracts typed server error payload", () => {
    expect(
      extractDirectorPdfErrorPayload({
        ok: false,
        renderVersion: "v1",
        errorCode: "auth_failed",
        error: "Forbidden.",
      }),
    ).toEqual({
      ok: false,
      renderVersion: "v1",
      errorCode: "auth_failed",
      error: "Forbidden.",
    });
  });

  it("classifies web fetch failure as cors preflight failure", () => {
    expect(
      classifyDirectorPdfTransportError({
        message: "Failed to send a request to the Edge Function",
        status: null,
        serverErrorCode: null,
        isWeb: true,
      }),
    ).toBe("cors_preflight_failed");
  });

  it("classifies server auth failure distinctly", () => {
    expect(
      classifyDirectorPdfTransportError({
        message: "Forbidden.",
        status: 403,
        serverErrorCode: "auth_failed",
      }),
    ).toBe("auth_failed");
  });

  it("classifies backend render failure distinctly", () => {
    expect(
      classifyDirectorPdfTransportError({
        message: "Browserless WebSocket endpoint is not configured.",
        status: 503,
        serverErrorCode: "backend_pdf_failed",
      }),
    ).toBe("backend_pdf_failed");
  });
});
