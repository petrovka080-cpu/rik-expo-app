import { generateForemanRequestPdfViaBackend } from "./foremanRequestPdfBackend.service";

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
  supabase: { auth: {
    getSession: async () => ({ data: { session: { user: { id: "actor" } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
  } },
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

describe("foremanRequestPdfBackend.service fresh authority", () => {
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

  it("rechecks backend authority for identical warm opens", async () => {
    const request = buildRequest(uniqueFingerprint("warm"));
    await generateForemanRequestPdfViaBackend(request);
    mockInvokeCanonicalPdfBackend.mockRejectedValueOnce(new Error("MFA_SECOND_FACTOR_REQUIRED"));
    await expect(generateForemanRequestPdfViaBackend(request)).rejects.toThrow("MFA_SECOND_FACTOR_REQUIRED");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(2);
    expect(mockReadStoredJson).not.toHaveBeenCalled();
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });

  it("passes caller abort signal into the canonical PDF backend", async () => {
    const fingerprint = uniqueFingerprint("signal");
    const controller = new AbortController();

    await generateForemanRequestPdfViaBackend(buildRequest(fingerprint), {
      signal: controller.signal,
    });

    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "foreman-request-pdf",
        signal: controller.signal,
      }),
    );
  });

  it("rejects before cache or transport work when caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort("screen disposed");

    await expect(
      generateForemanRequestPdfViaBackend(buildRequest(uniqueFingerprint("aborted")), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(mockReadStoredJson).not.toHaveBeenCalled();
    expect(mockInvokeCanonicalPdfBackend).not.toHaveBeenCalled();
  });

  it("does not reuse the client cache after meaningful request data changes", async () => {
    const base = uniqueFingerprint("change");
    await generateForemanRequestPdfViaBackend(buildRequest(`${base}-a`));
    await generateForemanRequestPdfViaBackend(buildRequest(`${base}-b`));

    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("does not coalesce calls across principal changes", async () => {
    const request = buildRequest(uniqueFingerprint("concurrent"));
    mockInvokeCanonicalPdfBackend.mockResolvedValueOnce(backendResult)
      .mockRejectedValueOnce(new Error("actor B forbidden"));
    const results = await Promise.allSettled([
      generateForemanRequestPdfViaBackend(request), generateForemanRequestPdfViaBackend(request),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("ignores persisted signed URLs and propagates revoked membership", async () => {
    mockReadStoredJson.mockResolvedValueOnce({ version: 1, sourceVersion: "old", value: backendResult });
    mockInvokeCanonicalPdfBackend.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(generateForemanRequestPdfViaBackend(buildRequest(uniqueFingerprint("persisted"))))
      .rejects.toThrow("Forbidden");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    expect(mockReadStoredJson).not.toHaveBeenCalled();
  });
});
