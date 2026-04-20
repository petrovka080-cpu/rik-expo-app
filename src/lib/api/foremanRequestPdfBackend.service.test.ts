import { generateForemanRequestPdfViaBackend } from "./foremanRequestPdfBackend.service";
import { buildForemanRequestManifestContract } from "../pdf/foremanRequestPdf.shared";

const mockInvokeCanonicalPdfBackend = jest.fn();
const mockBoundarySuccess = jest.fn();
const mockBoundaryError = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();

jest.mock("../pdf/canonicalPdfObservability", () => ({
  beginCanonicalPdfBoundary: () => ({
    success: (...args: unknown[]) => mockBoundarySuccess(...args),
    error: (...args: unknown[]) => mockBoundaryError(...args),
  }),
}));

jest.mock("./canonicalPdfBackendInvoker", () => ({
  invokeCanonicalPdfBackend: (...args: unknown[]) => mockInvokeCanonicalPdfBackend(...args),
}));

jest.mock("../storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("../supabaseClient", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
}));

const backendResult = {
  source: { kind: "remote-url", uri: "https://example.com/foreman-request.pdf" },
  signedUrl: "https://example.com/foreman-request.pdf",
  bucketId: "role_pdf_exports",
  storagePath: "foreman/request/artifacts/v1/version/request.pdf",
  fileName: "request.pdf",
  mimeType: "application/pdf" as const,
  generatedAt: "2026-04-20T00:00:00.000Z",
  version: "v1" as const,
  renderBranch: "backend_foreman_request_v1",
  renderer: "artifact_cache" as const,
  sourceKind: "remote-url" as const,
  role: "foreman" as const,
  documentType: "request" as const,
  telemetry: {
    cacheStatus: "artifact_hit",
    sourceVersion: "server_source_v1",
    artifactVersion: "server_artifact_v1",
  },
};

let uniqueIndex = 0;
const uniqueFingerprint = (label: string) => `fp-${label}-${Date.now()}-${uniqueIndex++}`;

const buildRequest = (fingerprint: string) => ({
  version: "v1" as const,
  role: "foreman" as const,
  documentType: "request" as const,
  requestId: "req-123",
  generatedBy: "Foreman User",
  clientSourceFingerprint: fingerprint,
});

async function waitForBackendInvokeCount(expected: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (mockInvokeCanonicalPdfBackend.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("foremanRequestPdfBackend.service PDF-Z4 reuse", () => {
  beforeEach(() => {
    mockInvokeCanonicalPdfBackend.mockReset();
    mockBoundarySuccess.mockReset();
    mockBoundaryError.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockInvokeCanonicalPdfBackend.mockResolvedValue(backendResult);
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
  });

  it("reuses a Foreman request PDF for the same client source fingerprint", async () => {
    const fingerprint = uniqueFingerprint("cache");
    const first = await generateForemanRequestPdfViaBackend(buildRequest(fingerprint));
    const second = await generateForemanRequestPdfViaBackend(buildRequest(fingerprint));

    expect(first.signedUrl).toBe("https://example.com/foreman-request.pdf");
    expect(second.signedUrl).toBe("https://example.com/foreman-request.pdf");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "manifest_version_hit",
          requestId: "req-123",
        }),
      }),
    );
  });

  it("does not reuse the client cache after meaningful request data changes", async () => {
    const base = uniqueFingerprint("change");
    await generateForemanRequestPdfViaBackend(buildRequest(`${base}-a`));
    await generateForemanRequestPdfViaBackend(buildRequest(`${base}-b`));

    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent identical Foreman request PDF requests into one backend call", async () => {
    const fingerprint = uniqueFingerprint("concurrent");
    let resolveBackend!: (value: typeof backendResult) => void;
    mockInvokeCanonicalPdfBackend.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBackend = resolve;
        }),
    );

    const first = generateForemanRequestPdfViaBackend(buildRequest(fingerprint));
    const second = generateForemanRequestPdfViaBackend(buildRequest(fingerprint));

    await waitForBackendInvokeCount(1);
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    resolveBackend(backendResult);

    await expect(first).resolves.toMatchObject({ signedUrl: "https://example.com/foreman-request.pdf" });
    await expect(second).resolves.toMatchObject({ signedUrl: "https://example.com/foreman-request.pdf" });
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted signed artifact handoff for a same-version warm open", async () => {
    const fingerprint = uniqueFingerprint("persistent");
    const request = buildRequest(fingerprint);
    const manifest = await buildForemanRequestManifestContract({
      requestId: request.requestId,
      clientSourceFingerprint: request.clientSourceFingerprint,
    });
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      sourceVersion: manifest.sourceVersion,
      value: backendResult,
    });

    const result = await generateForemanRequestPdfViaBackend(request);

    expect(result.signedUrl).toBe("https://example.com/foreman-request.pdf");
    expect(mockInvokeCanonicalPdfBackend).not.toHaveBeenCalled();
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "persistent_manifest_hit",
          requestId: "req-123",
        }),
      }),
    );
  });
});
