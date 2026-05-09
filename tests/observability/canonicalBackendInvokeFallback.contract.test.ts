import { Platform } from "react-native";
import { invokeCanonicalPdfBackend } from "../../src/lib/api/canonicalPdfBackendInvoker";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../src/lib/observability/platformObservability";

const mockFunctionsInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
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

jest.mock("../../src/lib/requestTimeoutPolicy", () => ({
  fetchWithRequestTimeout: (...args: unknown[]) => mockFetchWithRequestTimeout(...args),
}));

const originalPlatformOs = Platform.OS;

const successPayload = {
  ok: true,
  version: "v1" as const,
  role: "foreman" as const,
  documentType: "request" as const,
  sourceKind: "remote-url" as const,
  bucketId: "role_exports",
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

describe("canonical backend invoke fallback observability", () => {
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    mockFunctionsInvoke.mockReset();
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockFetchWithRequestTimeout.mockReset();
    resetPlatformObservabilityEvents();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("records the native anon-token fallback when session lookup fails", async () => {
    mockGetSession.mockRejectedValueOnce(
      new Error("session lookup failed ?access_token=super-secret-token"),
    );
    mockFetchWithRequestTimeout.mockResolvedValue(
      new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await expect(
      invokeCanonicalPdfBackend({
        functionName: "foreman-request-pdf",
        payload: { requestId: "req-session-fallback" },
        expectedRole: "foreman",
        expectedDocumentType: "request",
        expectedRenderBranch: "backend_foreman_request_v1",
        errorPrefix: "foreman request backend failed",
      }),
    ).resolves.toMatchObject({
      signedUrl: successPayload.signedUrl,
    });

    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer anon-key",
      }),
    });
    const event = getPlatformObservabilityEvents().find(
      (item) => item.event === "canonical_pdf_backend_resolve_access_token_failed",
    );
    expect(event).toEqual(
      expect.objectContaining({
        screen: "request",
        surface: "canonical_pdf_backend",
        event: "canonical_pdf_backend_resolve_access_token_failed",
        result: "error",
        fallbackUsed: true,
        errorStage: "resolve_access_token_failed",
        errorClass: "Error",
        sourceKind: "canonical_pdf_function",
      }),
    );
    expect(event?.extra).toEqual(
      expect.objectContaining({
        diagnosticEvent: "resolve_access_token_failed",
        functionName: "foreman-request-pdf",
        platform: "android",
      }),
    );
    expect(JSON.stringify(event)).not.toContain("super-secret-token");
  });

  it("records native response body parse fallback before surfacing the transport error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    mockFetchWithRequestTimeout.mockResolvedValue(
      new Response("{not-json", {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await expect(
      invokeCanonicalPdfBackend({
        functionName: "foreman-request-pdf",
        payload: { requestId: "req-parse-fallback" },
        expectedRole: "foreman",
        expectedDocumentType: "request",
        expectedRenderBranch: "backend_foreman_request_v1",
        errorPrefix: "foreman request backend failed",
      }),
    ).rejects.toMatchObject({
      name: "CanonicalPdfTransportError",
      code: "transport_error",
      httpStatus: 500,
      transport: "direct_fetch",
    });

    expect(getPlatformObservabilityEvents()).toContainEqual(
      expect.objectContaining({
        screen: "request",
        surface: "canonical_pdf_backend",
        event: "canonical_pdf_backend_read_json_response_failed",
        result: "error",
        fallbackUsed: true,
        errorStage: "read_json_response_failed",
        sourceKind: "canonical_pdf_function",
        extra: expect.objectContaining({
          diagnosticEvent: "read_json_response_failed",
          functionName: "foreman-request-pdf",
          httpStatus: 500,
          platform: "android",
        }),
      }),
    );
  });
});
