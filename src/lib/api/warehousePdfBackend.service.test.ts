import { generateWarehousePdfViaBackend } from "./warehousePdfBackend.service";
import {
  buildWarehouseIssueRegisterManifestContract,
  buildWarehouseIncomingRegisterManifestContract,
} from "../pdf/warehousePdf.shared";

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

const buildIncomingRegisterRequest = (fingerprint: string) => ({
  version: "v1" as const,
  role: "warehouse" as const,
  documentType: "warehouse_register" as const,
  documentKind: "incoming_register" as const,
  periodFrom: "2026-04-01",
  periodTo: "2026-04-30",
  generatedBy: "Warehouse User",
  companyName: "GOX",
  warehouseName: "Склад",
  clientSourceFingerprint: fingerprint,
});

const buildIssueRegisterRequest = (fingerprint: string) => ({
  version: "v1" as const,
  role: "warehouse" as const,
  documentType: "warehouse_register" as const,
  documentKind: "issue_register" as const,
  periodFrom: "2026-04-01",
  periodTo: "2026-04-30",
  generatedBy: "Warehouse User",
  companyName: "GOX",
  warehouseName: "РЎРєР»Р°Рґ",
  clientSourceFingerprint: fingerprint,
});

let uniqueIndex = 0;
const uniqueFingerprint = (label: string) => `fp-${label}-${Date.now()}-${uniqueIndex++}`;

async function waitForBackendInvokeCount(expected: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (mockInvokeCanonicalPdfBackend.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const backendResult = {
  source: { kind: "remote-url", uri: "https://example.com/warehouse.pdf" },
  signedUrl: "https://example.com/warehouse.pdf",
  bucketId: "role_pdf_exports",
  storagePath: "warehouse/incoming_register/artifacts/v1/version/file.pdf",
  fileName: "warehouse_register_incoming_register_all.pdf",
  mimeType: "application/pdf" as const,
  generatedAt: "2026-04-20T00:00:00.000Z",
  version: "v1" as const,
  renderBranch: "backend_warehouse_pdf_v1",
  renderer: "artifact_cache" as const,
  sourceKind: "remote-url" as const,
  role: "warehouse" as const,
  documentType: "warehouse_register" as const,
  telemetry: {
    cacheStatus: "artifact_hit",
    sourceVersion: "server_source_v1",
    artifactVersion: "server_artifact_v1",
  },
};

describe("warehousePdfBackend.service PDF-Z3 reuse", () => {
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

  it("reuses an incoming register PDF for the same client source fingerprint", async () => {
    const fingerprint = uniqueFingerprint("cache");
    const first = await generateWarehousePdfViaBackend(buildIncomingRegisterRequest(fingerprint));
    const second = await generateWarehousePdfViaBackend(buildIncomingRegisterRequest(fingerprint));

    expect(first.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(second.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "manifest_version_hit",
          documentKind: "incoming_register",
        }),
      }),
    );
  });

  it("passes caller abort signal into the canonical PDF backend", async () => {
    const fingerprint = uniqueFingerprint("signal");
    const controller = new AbortController();

    await generateWarehousePdfViaBackend(buildIncomingRegisterRequest(fingerprint), {
      signal: controller.signal,
    });

    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "warehouse-pdf",
        signal: controller.signal,
      }),
    );
  });

  it("rejects before cache or transport work when caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort("screen disposed");

    await expect(
      generateWarehousePdfViaBackend(buildIncomingRegisterRequest(uniqueFingerprint("aborted")), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(mockReadStoredJson).not.toHaveBeenCalled();
    expect(mockInvokeCanonicalPdfBackend).not.toHaveBeenCalled();
  });

  it("does not reuse the client cache after meaningful incoming data changes", async () => {
    const base = uniqueFingerprint("change");
    await generateWarehousePdfViaBackend(buildIncomingRegisterRequest(`${base}-a`));
    await generateWarehousePdfViaBackend(buildIncomingRegisterRequest(`${base}-b`));

    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent identical incoming register requests into one backend call", async () => {
    const fingerprint = uniqueFingerprint("concurrent");
    let resolveBackend!: (value: typeof backendResult) => void;
    mockInvokeCanonicalPdfBackend.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBackend = resolve;
        }),
    );

    const first = generateWarehousePdfViaBackend(buildIncomingRegisterRequest(fingerprint));
    const second = generateWarehousePdfViaBackend(buildIncomingRegisterRequest(fingerprint));

    await waitForBackendInvokeCount(1);
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    resolveBackend(backendResult);

    await expect(first).resolves.toMatchObject({ signedUrl: "https://example.com/warehouse.pdf" });
    await expect(second).resolves.toMatchObject({ signedUrl: "https://example.com/warehouse.pdf" });
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted signed artifact handoff for a same-version warm open", async () => {
    const fingerprint = uniqueFingerprint("persistent");
    const request = buildIncomingRegisterRequest(fingerprint);
    const manifest = await buildWarehouseIncomingRegisterManifestContract({
      periodFrom: request.periodFrom,
      periodTo: request.periodTo,
      companyName: request.companyName,
      warehouseName: request.warehouseName,
      clientSourceFingerprint: request.clientSourceFingerprint,
    });
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      sourceVersion: manifest.sourceVersion,
      value: backendResult,
    });

    const result = await generateWarehousePdfViaBackend(request);

    expect(result.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(mockInvokeCanonicalPdfBackend).not.toHaveBeenCalled();
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "persistent_manifest_hit",
          documentKind: "incoming_register",
        }),
      }),
    );
  });

  it("reuses an issue register PDF for the same client source fingerprint", async () => {
    const fingerprint = uniqueFingerprint("issue-cache");
    const first = await generateWarehousePdfViaBackend(buildIssueRegisterRequest(fingerprint));
    const second = await generateWarehousePdfViaBackend(buildIssueRegisterRequest(fingerprint));

    expect(first.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(second.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "manifest_version_hit",
          documentKind: "issue_register",
        }),
      }),
    );
  });

  it("coalesces concurrent identical issue register requests into one backend call", async () => {
    const fingerprint = uniqueFingerprint("issue-concurrent");
    let resolveBackend!: (value: typeof backendResult) => void;
    mockInvokeCanonicalPdfBackend.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBackend = resolve;
        }),
    );

    const first = generateWarehousePdfViaBackend(buildIssueRegisterRequest(fingerprint));
    const second = generateWarehousePdfViaBackend(buildIssueRegisterRequest(fingerprint));

    await waitForBackendInvokeCount(1);
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
    resolveBackend(backendResult);

    await expect(first).resolves.toMatchObject({ signedUrl: "https://example.com/warehouse.pdf" });
    await expect(second).resolves.toMatchObject({ signedUrl: "https://example.com/warehouse.pdf" });
    expect(mockInvokeCanonicalPdfBackend).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted signed artifact handoff for a same-version issue register warm open", async () => {
    const fingerprint = uniqueFingerprint("issue-persistent");
    const request = buildIssueRegisterRequest(fingerprint);
    const manifest = await buildWarehouseIssueRegisterManifestContract({
      periodFrom: request.periodFrom,
      periodTo: request.periodTo,
      companyName: request.companyName,
      warehouseName: request.warehouseName,
      clientSourceFingerprint: request.clientSourceFingerprint,
    });
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      sourceVersion: manifest.sourceVersion,
      value: backendResult,
    });

    const result = await generateWarehousePdfViaBackend(request);

    expect(result.signedUrl).toBe("https://example.com/warehouse.pdf");
    expect(mockInvokeCanonicalPdfBackend).not.toHaveBeenCalled();
    expect(mockBoundarySuccess).toHaveBeenCalledWith(
      "backend_invoke_success",
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheStatus: "persistent_manifest_hit",
          documentKind: "issue_register",
        }),
      }),
    );
  });
});
