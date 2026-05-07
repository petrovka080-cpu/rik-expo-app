import { Platform } from "react-native";
import { invokeCanonicalPdfBackend } from "./canonicalPdfBackendInvoker";

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
      body: JSON.stringify({ requestId: "req-1" }),
    });
    expect(result.signedUrl).toBe("https://example.com/request.pdf");
    expect(result.sourceKind).toBe("remote-url");
  });

  it("passes caller abort signal into native direct fetch", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });

    const controller = new AbortController();
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

    await invokeCanonicalPdfBackend({
      functionName: "foreman-request-pdf",
      payload: { requestId: "req-signal" },
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: "backend_foreman_request_v1",
      errorPrefix: "foreman request pdf backend failed",
      signal: controller.signal,
    });

    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
    });
  });

  it("rejects before transport when caller signal is already aborted", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });

    const controller = new AbortController();
    controller.abort("screen disposed");

    await expect(
      invokeCanonicalPdfBackend({
        functionName: "foreman-request-pdf",
        payload: { requestId: "req-aborted" },
        expectedRole: "foreman",
        expectedDocumentType: "request",
        expectedRenderBranch: "backend_foreman_request_v1",
        errorPrefix: "foreman request pdf backend failed",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
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
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      "foreman-request-pdf",
      expect.objectContaining({
        body: { requestId: "req-2" },
        headers: {
          Accept: "application/json",
        },
      }),
    );
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(result.fileName).toBe("request.pdf");
  });

  it("refreshes the current session once and retries web invoke on auth-like 403 errors", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });

    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Forbidden.",
          context: { status: 403 },
        },
      })
      .mockResolvedValueOnce({
        data: successPayload,
        error: null,
      });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "refreshed-session-token",
        },
      },
      error: null,
    });

    const result = await invokeCanonicalPdfBackend({
      functionName: "foreman-request-pdf",
      payload: { requestId: "req-403" },
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: "backend_foreman_request_v1",
      errorPrefix: "foreman request pdf backend failed",
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2);
    expect(result.signedUrl).toBe(successPayload.signedUrl);
  });

  it("does not retry web invoke after caller aborts during auth refresh", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });

    const controller = new AbortController();
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Forbidden.",
        context: { status: 403 },
      },
    });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    mockRefreshSession.mockImplementation(async () => {
      controller.abort("screen disposed");
      return {
        data: {
          session: {
            access_token: "refreshed-session-token",
          },
        },
        error: null,
      };
    });

    await expect(
      invokeCanonicalPdfBackend({
        functionName: "foreman-request-pdf",
        payload: { requestId: "req-403-web-abort" },
        expectedRole: "foreman",
        expectedDocumentType: "request",
        expectedRenderBranch: "backend_foreman_request_v1",
        errorPrefix: "foreman request pdf backend failed",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
  });

  it("refreshes the current session once and retries native direct fetch on auth-like 403 responses", async () => {
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
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "refreshed-session-token",
        },
      },
      error: null,
    });
    mockFetchWithRequestTimeout
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errorCode: "auth_failed",
            error: "Forbidden.",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(successPayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

    const result = await invokeCanonicalPdfBackend({
      functionName: "foreman-request-pdf",
      payload: { requestId: "req-403-native" },
      expectedRole: "foreman",
      expectedDocumentType: "request",
      expectedRenderBranch: "backend_foreman_request_v1",
      errorPrefix: "foreman request pdf backend failed",
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(result.sourceKind).toBe("remote-url");
  });

  it("does not retry native direct fetch after caller aborts during auth refresh", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });

    const controller = new AbortController();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
    mockRefreshSession.mockImplementation(async () => {
      controller.abort("screen disposed");
      return {
        data: {
          session: {
            access_token: "refreshed-session-token",
          },
        },
        error: null,
      };
    });
    mockFetchWithRequestTimeout.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          errorCode: "auth_failed",
          error: "Forbidden.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await expect(
      invokeCanonicalPdfBackend({
        functionName: "foreman-request-pdf",
        payload: { requestId: "req-403-native-abort" },
        expectedRole: "foreman",
        expectedDocumentType: "request",
        expectedRenderBranch: "backend_foreman_request_v1",
        errorPrefix: "foreman request pdf backend failed",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });
});
