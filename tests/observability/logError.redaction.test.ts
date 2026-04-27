import { SENSITIVE_REDACTION_MARKER } from "../../src/lib/security/redaction";

type DevGlobal = typeof globalThis & { __DEV__?: boolean };

const setNodeEnv = (value: string | undefined) => {
  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    value,
    writable: true,
  });
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockObservabilitySentry = (implementation?: (...args: unknown[]) => unknown) => {
  const spy = implementation ? jest.fn(implementation) : jest.fn();
  jest.doMock("../../src/lib/observability/sentry", () => ({
    captureLogErrorToSentry: spy,
  }));
  return spy;
};

describe("logError redaction", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDev = (globalThis as DevGlobal).__DEV__;

  afterEach(() => {
    jest.resetModules();
    jest.dontMock("react-native");
    jest.dontMock("../../src/lib/observability/sentry");
    jest.dontMock("../../src/lib/supabaseClient");
    jest.restoreAllMocks();
    setNodeEnv(originalNodeEnv);
    (globalThis as DevGlobal).__DEV__ = originalDev;
  });

  it("redacts persisted production error payloads", () => {
    mockObservabilitySentry();
    jest.doMock("../../src/lib/supabaseClient", () => ({
      supabase: {
        from: jest.fn(),
      },
    }));
    const { buildLogErrorPayload } = require("../../src/lib/logError") as typeof import("../../src/lib/logError");
    const payload = buildLogErrorPayload(
      "signed-url-test",
      new Error("failed https://storage.example.test/file.pdf?token=error-secret"),
      {
        signedUrl: "https://storage.example.test/file.pdf?token=signed-secret",
        href: "/pdf-viewer?sessionId=session-1&openToken=open-secret",
      },
    );
    const payloadJson = JSON.stringify(payload);

    expect(payload).toMatchObject({
      context: "signed-url-test",
      message: `failed https://storage.example.test/file.pdf?token=${SENSITIVE_REDACTION_MARKER}`,
      extra: {
        signedUrl: SENSITIVE_REDACTION_MARKER,
        href: `/pdf-viewer?sessionId=session-1&openToken=${SENSITIVE_REDACTION_MARKER}`,
      },
      platform: expect.any(String),
    });
    expect(payloadJson).not.toContain("error-secret");
    expect(payloadJson).not.toContain("signed-secret");
    expect(payloadJson).not.toContain("open-secret");
  });

  it("redacts development console diagnostics", async () => {
    jest.resetModules();
    setNodeEnv("development");
    (globalThis as DevGlobal).__DEV__ = true;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    jest.doMock("react-native", () => ({ Platform: { OS: "web" } }));
    mockObservabilitySentry();
    jest.doMock("../../src/lib/supabaseClient", () => ({
      supabase: {
        from: jest.fn(),
      },
    }));

    const { logError } = require("../../src/lib/logError") as typeof import("../../src/lib/logError");
    logError("dev-signed-url-test", new Error("Bearer console-secret"), {
      signedUrl: "https://storage.example.test/file.pdf?token=signed-secret",
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const consoleJson = JSON.stringify(errorSpy.mock.calls);
    expect(consoleJson).toContain(`Bearer ${SENSITIVE_REDACTION_MARKER}`);
    expect(consoleJson).toContain(SENSITIVE_REDACTION_MARKER);
    expect(consoleJson).not.toContain("console-secret");
    expect(consoleJson).not.toContain("signed-secret");
  });

  it("keeps app_errors persistence alive when Sentry capture throws", async () => {
    jest.resetModules();
    setNodeEnv("production");
    (globalThis as DevGlobal).__DEV__ = false;

    const insert = jest.fn().mockResolvedValue({ error: null });
    jest.doMock("react-native", () => ({ Platform: { OS: "android" } }));
    jest.doMock("../../src/lib/supabaseClient", () => ({
      supabase: {
        from: jest.fn(() => ({
          insert,
        })),
      },
    }));
    const captureLogErrorToSentry = mockObservabilitySentry(() => {
      throw new Error("Sentry capture failed");
    });

    const { logError } = require("../../src/lib/logError") as typeof import("../../src/lib/logError");
    logError("prod-sentry-fallback", new Error("https://storage.example.test/file.pdf?token=app-secret"), {
      signedUrl: "https://storage.example.test/file.pdf?token=extra-secret",
    });

    await flushMicrotasks();

    expect(captureLogErrorToSentry).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    const insertJson = JSON.stringify(insert.mock.calls);
    expect(insertJson).toContain(SENSITIVE_REDACTION_MARKER);
    expect(insertJson).not.toContain("app-secret");
    expect(insertJson).not.toContain("extra-secret");
  });
});
