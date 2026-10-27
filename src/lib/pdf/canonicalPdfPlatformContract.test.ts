import {
  normalizeCanonicalPdfSuccessPayload,
} from "./canonicalPdfPlatformContract";

describe("canonicalPdfPlatformContract", () => {
  it("normalizes a canonical warehouse success payload", () => {
    const result = normalizeCanonicalPdfSuccessPayload({
      value: {
        ok: true,
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_register",
        sourceKind: "remote-url",
        bucketId: "role_pdf_exports",
        storagePath: "warehouse/register/file.pdf",
        signedUrl: "https://example.com/file.pdf",
        fileName: "file.pdf",
        mimeType: "application/pdf",
        generatedAt: "2026-04-04T00:00:00.000Z",
        renderBranch: "backend_warehouse_pdf_v1",
        renderer: "browserless_puppeteer",
        telemetry: {
          functionName: "warehouse-pdf",
        },
      },
      expectedRole: "warehouse",
      expectedDocumentType: "warehouse_register",
      expectedRenderBranch: "backend_warehouse_pdf_v1",
    });

    expect(result.signedUrl).toBe("https://example.com/file.pdf");
    expect(result.sourceKind).toBe("remote-url");
    expect(result.telemetry).toEqual({
      functionName: "warehouse-pdf",
    });
  });

  it("fails when required success fields are missing", () => {
    expect(() =>
      normalizeCanonicalPdfSuccessPayload({
        value: {
          ok: true,
          version: "v1",
          role: "warehouse",
          documentType: "warehouse_register",
          sourceKind: "remote-url",
          bucketId: "",
          storagePath: "warehouse/register/file.pdf",
          signedUrl: "https://example.com/file.pdf",
          fileName: "file.pdf",
          mimeType: "application/pdf",
          generatedAt: "2026-04-04T00:00:00.000Z",
          renderBranch: "backend_warehouse_pdf_v1",
          renderer: "browserless_puppeteer",
        },
        expectedRole: "warehouse",
        expectedDocumentType: "warehouse_register",
        expectedRenderBranch: "backend_warehouse_pdf_v1",
      }),
    ).toThrow("canonical pdf backend missing required success fields");
  });
});
