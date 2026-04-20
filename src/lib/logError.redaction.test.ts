import { SENSITIVE_REDACTION_MARKER } from "./security/redaction";

type DevGlobal = typeof globalThis & { __DEV__?: boolean };

const setNodeEnv = (value: string | undefined) => {
  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    value,
    writable: true,
  });
};

describe("logError redaction", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDev = (globalThis as DevGlobal).__DEV__;

  afterEach(() => {
    jest.resetModules();
    jest.dontMock("react-native");
    jest.dontMock("./supabaseClient");
    jest.restoreAllMocks();
    setNodeEnv(originalNodeEnv);
    (globalThis as DevGlobal).__DEV__ = originalDev;
  });

  it("redacts persisted production error payloads", () => {
    const { buildLogErrorPayload } = require("./logError") as typeof import("./logError");
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
    jest.doMock("./supabaseClient", () => ({
      supabase: {
        from: jest.fn(),
      },
    }));

    const { logError } = require("./logError") as typeof import("./logError");
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
});
