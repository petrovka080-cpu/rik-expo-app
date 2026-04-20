import { buildForemanRequestPdfDescriptor } from "./foreman.requestPdf.service";

const mockGenerateForemanRequestPdfViaBackend = jest.fn();

jest.mock("../../lib/api/foremanRequestPdfBackend.service", () => ({
  generateForemanRequestPdfViaBackend: (...args: unknown[]) =>
    mockGenerateForemanRequestPdfViaBackend(...args),
}));

describe("foreman.requestPdf.service", () => {
  beforeEach(() => {
    mockGenerateForemanRequestPdfViaBackend.mockReset();
    mockGenerateForemanRequestPdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/foreman-request.pdf",
      },
      bucketId: "role_pdf_exports",
      storagePath: "foreman/request/artifacts/v1/version/file.pdf",
      signedUrl: "https://example.com/foreman-request.pdf",
      fileName: "request_123.pdf",
      mimeType: "application/pdf",
      generatedAt: "2026-04-04T00:00:00.000Z",
      version: "v1",
      renderBranch: "backend_foreman_request_v1",
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      telemetry: null,
    });
  });

  it("builds a generated foreman descriptor from the canonical backend result", async () => {
    const descriptor = await buildForemanRequestPdfDescriptor({
      requestId: "123",
      generatedBy: "Ivan",
      displayNo: "REQ-123",
      status: "pending",
      createdAt: "2026-04-04T00:00:00.000Z",
      updatedAt: "2026-04-04T00:00:00.000Z",
      objectName: "Tower A",
      title: "Request REQ-123",
    });

    expect(mockGenerateForemanRequestPdfViaBackend).toHaveBeenCalledWith({
      version: "v1",
      role: "foreman",
      documentType: "request",
      requestId: "123",
      generatedBy: "Ivan",
      clientSourceFingerprint: expect.stringMatching(/^frq_client_v1_/),
    });
    expect(descriptor.originModule).toBe("foreman");
    expect(descriptor.documentType).toBe("request");
    expect(descriptor.fileSource.kind).toBe("remote-url");
    expect(descriptor.uri).toBe("https://example.com/foreman-request.pdf");
    expect(descriptor.fileName).toBe("request_123.pdf");
    expect(descriptor.title).toBe("Request REQ-123");
  });
});
