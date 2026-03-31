const asyncStorageMock = require("@react-native-async-storage/async-storage/jest/async-storage-mock");

const mockCreateClient = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();
const mockRouterReplace = jest.fn();

const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
const originalDocument = (globalThis as typeof globalThis & { document?: unknown }).document;
const originalProcess = (globalThis as typeof globalThis & { process?: unknown }).process;

type LoadedSupabaseModule = {
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
};

const loadSupabaseModule = (options: {
  web: boolean;
  sessionResult?: unknown;
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
      fetch: jest.fn(),
    } as any;
    runtime.document = {} as any;
    runtime.process = originalProcess as any;
  } else {
    delete runtime.window;
    delete runtime.document;
    runtime.process = {
      env: process.env,
      versions: {},
    } as any;
  }

  const mockSupabase = {
    auth: {
      getSession: options.sessionError
        ? jest.fn().mockRejectedValue(options.sessionError)
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
        event: "ensure_signed_in_session_check_failed",
        fallbackUsed: true,
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
        event: "current_user_id_session_check_failed",
        fallbackUsed: true,
      }),
    );
  });
});
