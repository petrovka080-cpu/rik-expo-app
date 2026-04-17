const asyncStorageMock = require("@react-native-async-storage/async-storage/jest/async-storage-mock");

const mockCreateClient = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();
const mockRouterReplace = jest.fn();
const mockBaseFetch = jest.fn();

const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
const originalDocument = (globalThis as typeof globalThis & { document?: unknown }).document;
const originalProcess = (globalThis as typeof globalThis & { process?: unknown }).process;
const originalFetch = globalThis.fetch;

type LoadedSupabaseModule = {
  getSessionSafe: (extra?: Record<string, unknown>) => Promise<{
    session: unknown;
    degraded: boolean;
  }>;
  ensureSignedIn: () => Promise<boolean>;
  currentUserId: () => Promise<string | null>;
  supabase: {
    auth: {
      getSession: jest.Mock;
    };
  };
};

const restoreRuntimeGlobals = () => {
  const runtime = globalThis as any;

  if (typeof originalWindow === "undefined") {
    delete runtime.window;
  } else {
    runtime.window = originalWindow;
  }

  if (typeof originalDocument === "undefined") {
    delete runtime.document;
  } else {
    runtime.document = originalDocument;
  }

  if (typeof originalProcess === "undefined") {
    delete runtime.process;
  } else {
    runtime.process = originalProcess;
  }

  if (typeof originalFetch === "undefined") {
    delete runtime.fetch;
  } else {
    runtime.fetch = originalFetch;
  }
};

const loadSupabaseModule = (options: {
  web: boolean;
  sessionResult?: unknown;
  sessionPromise?: Promise<unknown>;
  sessionError?: Error | null;
}) => {
  jest.resetModules();
  mockCreateClient.mockReset();
  mockRecordPlatformObservability.mockReset();
  mockFetchWithRequestTimeout.mockReset().mockImplementation((_input, init) =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: init?.headers ?? {},
    }),
  );
  mockRouterReplace.mockReset();
  mockBaseFetch.mockReset().mockImplementation(async (_input, init) =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: init?.headers ?? {},
    }),
  );

  const runtime = globalThis as typeof globalThis & {
    window?: any;
    document?: any;
    process?: any;
  };

  if (options.web) {
    runtime.window = {
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      fetch: mockBaseFetch,
    } as any;
    runtime.document = {} as any;
    runtime.process = originalProcess as any;
    runtime.fetch = mockBaseFetch as unknown as typeof fetch;
  } else {
    delete runtime.window;
    delete runtime.document;
    runtime.process = {
      env: process.env,
      versions: {},
    } as any;
    runtime.fetch = mockBaseFetch as unknown as typeof fetch;
  }

  const mockSupabase = {
    auth: {
      getSession: options.sessionError
        ? jest.fn().mockRejectedValue(options.sessionError)
        : options.sessionPromise
          ? jest.fn().mockReturnValue(options.sessionPromise)
        : jest.fn().mockResolvedValue(
            options.sessionResult ?? {
              data: { session: null },
            },
          ),
    },
    realtime: {},
  };

  mockCreateClient.mockReturnValue(mockSupabase);

  jest.doMock("@supabase/supabase-js", () => ({
    createClient: (...args: any[]) => mockCreateClient(...args),
  }));
  jest.doMock("./env/clientSupabaseEnv", () => ({
    SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_HOST: "project.supabase.co",
    SUPABASE_PROJECT_REF: "project",
    SUPABASE_URL: "https://project.supabase.co",
    isClientSupabaseEnvValid: () => true,
  }));
  jest.doMock("./observability/platformObservability", () => ({
    recordPlatformObservability: (...args: any[]) => mockRecordPlatformObservability(...args),
  }));
  jest.doMock("./requestTimeoutPolicy", () => ({
    REQUEST_TIMEOUT_POLICY_MS: {
      lightweight_lookup: 8_000,
      ui_scope_load: 20_000,
      heavy_report_or_pdf_or_storage: 60_000,
      mutation_request: 30_000,
    },
    RequestTimeoutError: class RequestTimeoutError extends Error {
      constructor(params: { timeoutMs: number; owner: string; operation: string }) {
        super(`${params.owner}.${params.operation} request timed out after ${params.timeoutMs}ms`);
        this.name = "RequestTimeoutError";
      }
    },
    fetchWithRequestTimeout: (...args: any[]) => mockFetchWithRequestTimeout(...args),
  }));
  jest.doMock("@react-native-async-storage/async-storage", () => asyncStorageMock);
  jest.doMock("expo-router", () => ({
    router: {
      replace: (...args: any[]) => mockRouterReplace(...args),
    },
  }));

  const module = require("./supabaseClient") as LoadedSupabaseModule;
  return { module, mockSupabase };
};

describe("supabaseClient runtime contract", () => {
  afterEach(() => {
    jest.useRealTimers();
    restoreRuntimeGlobals();
    jest.resetModules();
  });

  it("uses localStorage and detectSessionInUrl on web", () => {
    loadSupabaseModule({ web: true });

    const options = mockCreateClient.mock.calls[0]?.[2];
    const runtime = globalThis as typeof globalThis & {
      window?: {
        localStorage: unknown;
      };
    };

    expect(options.auth.storage).toBe(runtime.window?.localStorage);
    expect(options.auth.detectSessionInUrl).toBe(true);
    expect(options.global.fetch).toEqual(expect.any(Function));
  });

  it("uses AsyncStorage and disables detectSessionInUrl in native-like runtime", () => {
    loadSupabaseModule({ web: false });

    const options = mockCreateClient.mock.calls[0]?.[2];

    expect(options.auth.storage).toBe(asyncStorageMock);
    expect(options.auth.detectSessionInUrl).toBe(false);
    expect(options.global.fetch).toEqual(expect.any(Function));
  });

  it("single-flights concurrent safe session reads", async () => {
    let resolveSession!: (value: unknown) => void;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });
    const { module, mockSupabase } = loadSupabaseModule({
      web: true,
      sessionPromise,
    });

    const first = module.getSessionSafe({ caller: "root_layout" });
    const second = module.getSessionSafe({ caller: "index_bootstrap" });

    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_session_gate",
        event: "auth_session_read_join_inflight",
        result: "skipped",
      }),
    );

    resolveSession({
      data: {
        session: {
          user: { id: "user-1" },
          access_token: "tok",
        },
      },
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        session: {
          user: { id: "user-1" },
          access_token: "tok",
        },
        degraded: false,
      },
      {
        session: {
          user: { id: "user-1" },
          access_token: "tok",
        },
        degraded: false,
      },
    ]);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_session_gate",
        event: "auth_session_read_success",
        result: "success",
      }),
    );
  });

  it("keeps timeout-safe session reads joined without a retry storm", async () => {
    jest.useFakeTimers();
    const neverSettles = new Promise<unknown>(() => undefined);
    const { module, mockSupabase } = loadSupabaseModule({
      web: true,
      sessionPromise: neverSettles,
    });

    const first = module.getSessionSafe({ caller: "root_layout" });
    const second = module.getSessionSafe({ caller: "office_route" });

    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(8_000);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { session: null, degraded: true },
      { session: null, degraded: true },
    ]);

    await expect(
      module.getSessionSafe({ caller: "warehouse_reentry" }),
    ).resolves.toEqual({ session: null, degraded: true });

    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_session_gate",
        event: "auth_session_read_timeout",
        result: "skipped",
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_session_gate",
        event: "auth_session_read_join_inflight",
        result: "skipped",
        extra: expect.objectContaining({
          inflightTimedOut: true,
        }),
      }),
    );
  });

  it("bypasses timeout discipline for auth token exchange and records transport markers", async () => {
    loadSupabaseModule({ web: false });

    const options = mockCreateClient.mock.calls[0]?.[2];
    const clientFetch = options.global.fetch as typeof fetch;

    await clientFetch("https://project.supabase.co/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        password: "secret",
      }),
    });

    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(mockBaseFetch).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "supabase_auth_token",
        event: "token_request_start",
        result: "skipped",
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "supabase_auth_token",
        event: "token_request_end",
        result: "success",
        durationMs: expect.any(Number),
      }),
    );
  });

  it("returns true from ensureSignedIn when a session user exists", async () => {
    const { module } = loadSupabaseModule({
      web: true,
      sessionResult: {
        data: {
          session: {
            user: { id: "user-1" },
          },
        },
      },
    });

    await expect(module.ensureSignedIn()).resolves.toBe(true);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("records auth bootstrap failure and returns false instead of false success", async () => {
    const { module } = loadSupabaseModule({
      web: true,
      sessionError: new Error("session failed"),
    });

    await expect(module.ensureSignedIn()).resolves.toBe(false);

    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "supabase_auth_bootstrap",
        event: "get_session_safe_failed",
        fallbackUsed: true,
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "auth_session_gate",
        event: "auth_session_read_result",
        result: "error",
      }),
    );
  });

  it("returns null from currentUserId and records the exact bootstrap failure", async () => {
    const { module } = loadSupabaseModule({
      web: true,
      sessionError: new Error("current user probe failed"),
    });

    await expect(module.currentUserId()).resolves.toBeNull();
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "supabase_auth_bootstrap",
        event: "get_session_safe_failed",
        fallbackUsed: true,
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "request",
        surface: "auth_session_gate",
        event: "auth_session_read_result",
        result: "error",
      }),
    );
  });
});
