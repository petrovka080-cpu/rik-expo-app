import { Platform } from "react-native";

const mockFunctionsInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();

jest.mock("../supabaseClient", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

jest.mock("../requestTimeoutPolicy", () => ({
  fetchWithRequestTimeout: (...args: unknown[]) => mockFetchWithRequestTimeout(...args),
}));

let invokeCanonicalPdfBackend: typeof import("./canonicalPdfBackendInvoker").invokeCanonicalPdfBackend;

const originalPlatformOs = Platform.OS;

const successPayload = {
  ok: true,
  version: "v1" as const,
  role: "foreman" as const,
  documentType: "request" as const,
  sourceKind: "remote-url" as const,
  bucketId: "role_pdf_exports",
  storagePath: "foreman/request.pdf",
  signedUrl: "https://example.com/request.pdf",
  fileName: "request.pdf",
  mimeType: "application/pdf" as const,
  generatedAt: "2026-04-04T00:00:00.000Z",
  renderBranch: "backend_foreman_request_v1" as const,
  renderer: "browserless_puppeteer" as const,
  telemetry: {
    functionName: "foreman-request-pdf",
  },
};

describe("invokeCanonicalPdfBackend", () => {
  beforeAll(() => {
    ({ invokeCanonicalPdfBackend } = require("./canonicalPdfBackendInvoker") as typeof import("./canonicalPdfBackendInvoker"));
  });

  beforeEach(() => {
    mockFunctionsInvoke.mockReset();
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockFetchWithRequestTimeout.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("uses direct fetch on native and preserves canonical result mapping", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    mockFetchWithRequestTimeout.mockResolvedValue(
      new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const result = await invokeCanonicalPdfBackend({
      functionName: "foreman-request-pdf",
      payload: { requestId: "req-1" },
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: "backend_foreman_request_v1",
      errorPrefix: "foreman request pdf backend failed",
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[0]).toBe(
      "https://example.supabase.co/functions/v1/foreman-request-pdf",
    );
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer session-token",
        apikey: "anon-key",
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
    });
    expect(result.signedUrl).toBe("https://example.com/request.pdf");
    expect(result.sourceKind).toBe("remote-url");
  });

  it("keeps web on Supabase functions.invoke", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });

    mockFunctionsInvoke.mockResolvedValue({
      data: successPayload,
      error: null,
    });

    const result = await invokeCanonicalPdfBackend({
      functionName: "foreman-request-pdf",
      payload: { requestId: "req-2" },
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: "backend_foreman_request_v1",
      errorPrefix: "foreman request pdf backend failed",
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(result.fileName).toBe("request.pdf");
  });
});
