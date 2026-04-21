import {
  assertCanonicalRemotePdfSource,
  canUsePdfDocumentDirectPreviewFallback,
  extractUriScheme,
  hasPdfDocumentPreviewRouter,
  requiresCanonicalRemotePdfSource,
} from "./pdfDocumentActionPreconditions";

describe("pdfDocumentActionPreconditions", () => {
  it("extracts local and remote URI schemes", () => {
    expect(extractUriScheme("file:///cache/document.pdf")).toBe("file");
    expect(extractUriScheme("https://example.com/document.pdf")).toBe("https");
  });

  it("returns empty string for missing or malformed URIs", () => {
    expect(extractUriScheme("")).toBe("");
    expect(extractUriScheme("document.pdf")).toBe("");
    expect(extractUriScheme(null)).toBe("");
  });

  it("detects canonical backend-owned PDF families", () => {
    expect(
      requiresCanonicalRemotePdfSource({
        documentType: "director_report",
        originModule: "director",
      }),
    ).toBe(true);
    expect(
      requiresCanonicalRemotePdfSource({
        documentType: "payment_order",
        originModule: "accountant",
      }),
    ).toBe(false);
  });

  it("enforces canonical remote-url source for protected families", () => {
    expect(() =>
      assertCanonicalRemotePdfSource(
        {
          documentType: "warehouse_document",
          originModule: "warehouse",
        },
        {
          kind: "local-file",
          uri: "file:///cache/warehouse.pdf",
        },
      ),
    ).toThrow("Canonical warehouse warehouse_document PDF must use backend remote-url source");

    expect(() =>
      assertCanonicalRemotePdfSource(
        {
          documentType: "warehouse_document",
          originModule: "warehouse",
        },
        {
          kind: "remote-url",
          uri: "https://example.com/warehouse.pdf",
        },
      ),
    ).not.toThrow();
  });

  it("maps router presence to preview eligibility helpers", () => {
    expect(hasPdfDocumentPreviewRouter({ push: jest.fn() })).toBe(true);
    expect(hasPdfDocumentPreviewRouter(undefined)).toBe(false);
    expect(canUsePdfDocumentDirectPreviewFallback({ hasRouter: false })).toBe(true);
    expect(canUsePdfDocumentDirectPreviewFallback({ hasRouter: true })).toBe(false);
  });
});

