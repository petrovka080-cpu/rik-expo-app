type DevGlobal = typeof globalThis & { __DEV__?: boolean };

const setNodeEnv = (value: string | undefined) => {
  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    value,
    writable: true,
  });
};

const originalNodeEnv = process.env.NODE_ENV;
const originalDev = (globalThis as DevGlobal).__DEV__;
const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const originalSentryEnvironment = process.env.SENTRY_ENVIRONMENT;

const restoreEnv = (key: string, value: string | undefined) => {
  if (typeof value === "string") {
    process.env[key] = value;
    return;
  }

  delete process.env[key];
};

function buildDiagnostics(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    releaseLabel: "prod-wave-1",
    gitCommit: "abc123",
    updateGroupId: "group-123",
    updateMessage: "release-safe ota",
    metadataSource: "manifest-metadata",
    metadataWarnings: [],
    appVersion: "1.0.0",
    nativeBuild: "13",
    nativeAppVersion: "1.0.0",
    nativeBuildVersion: "13",
    configuredAppVersion: "1.0.0",
    configuredIosBuildNumber: "23",
    configuredAndroidVersionCode: "13",
    runtimeVersion: "policy:fingerprint",
    channel: "preview",
    expectedBranch: "preview",
    updateId: "update-123",
    createdAt: "2026-04-27T00:00:00.000Z",
    isEmbeddedLaunch: false,
    launchSource: "ota",
    isEmergencyLaunch: false,
    emergencyLaunchReason: "not-provided",
    updatesUrl: "https://u.expo.dev/project",
    projectId: "project-id",
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 30000,
    appVersionSource: "remote",
    severity: "ok",
    verdict: "ok",
    issues: ["Update applied successfully within the current runtime lineage."],
    reasons: ["Update applied successfully within the current runtime lineage."],
    actions: ["Publish OTA to branch \"preview\" only."],
    lastUpdateAgeHours: 1,
    isProbablyOutdated: false,
    isChannelMismatch: false,
    isRuntimeMismatchSuspected: false,
    publishHint: "Publish OTA to branch \"preview\" only.",
    updateAvailabilityState: "no-update",
    updateAvailabilitySummary: "No newer update was found on this channel during this app session.",
    availableUpdateId: "not-provided",
    availableUpdateCreatedAt: "not-provided",
    downloadedUpdateId: "not-provided",
    downloadedUpdateCreatedAt: "not-provided",
    lastCheckForUpdateTimeSinceRestart: "2026-04-27T00:10:00.000Z",
    checkError: "not-provided",
    downloadError: "not-provided",
    ...overrides,
  };
}

function installModuleMocks(options?: {
  diagnostics?: Record<string, unknown>;
  platformOs?: string;
}) {
  const globalScope = {
    setTags: jest.fn(),
    setContext: jest.fn(),
  };
  const scopedCalls: {
    setLevel: jest.Mock;
    setTag: jest.Mock;
    setContext: jest.Mock;
  }[] = [];
  const sentryMock = {
    init: jest.fn(),
    getGlobalScope: jest.fn(() => globalScope),
    withScope: jest.fn((callback: (scope: (typeof scopedCalls)[number]) => void) => {
      const scope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setContext: jest.fn(),
      };
      scopedCalls.push(scope);
      callback(scope);
    }),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    wrap: jest.fn((Component: unknown) => Component),
  };

  jest.doMock("@sentry/react-native", () => sentryMock);
  jest.doMock("react-native", () => ({
    Platform: {
      OS: options?.platformOs ?? "android",
    },
  }));
  jest.doMock("../../src/lib/otaDiagnostics", () => ({
    getOtaDiagnostics: () => options?.diagnostics ?? buildDiagnostics(),
  }));

  return { sentryMock, globalScope, scopedCalls };
}

describe("observability/sentry", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("@sentry/react-native");
    jest.dontMock("react-native");
    jest.dontMock("../../src/lib/otaDiagnostics");
    jest.restoreAllMocks();
    setNodeEnv(originalNodeEnv);
    (globalThis as DevGlobal).__DEV__ = originalDev;
    restoreEnv("EXPO_PUBLIC_SENTRY_DSN", originalDsn);
    restoreEnv("SENTRY_ENVIRONMENT", originalSentryEnvironment);
  });

  it("stays disabled when the public DSN is missing", () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    setNodeEnv("production");
    (globalThis as DevGlobal).__DEV__ = false;
    const { sentryMock } = installModuleMocks();

    const { initializeSentry } = require("../../src/lib/observability/sentry") as typeof import("../../src/lib/observability/sentry");
    const status = initializeSentry();

    expect(status.enabled).toBe(false);
    expect(status.initialized).toBe(false);
    expect(status.dsnSource).toBe("missing");
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  it("attaches release metadata tags when Sentry is enabled", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@example.com/1";
    setNodeEnv("production");
    (globalThis as DevGlobal).__DEV__ = false;
    const { sentryMock, globalScope } = installModuleMocks();

    const { initializeSentry } = require("../../src/lib/observability/sentry") as typeof import("../../src/lib/observability/sentry");
    const status = initializeSentry();

    expect(status.enabled).toBe(true);
    expect(status.initialized).toBe(true);
    expect(sentryMock.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.com/1",
        environment: "preview",
        sendDefaultPii: false,
        attachStacktrace: true,
      }),
    );
    expect(globalScope.setTags).toHaveBeenCalledWith(
      expect.objectContaining({
        appVersion: "1.0.0",
        nativeBuildVersion: "13",
        runtimeVersion: "policy:fingerprint",
        updateId: "update-123",
        updateGroupId: "group-123",
        channel: "preview",
        gitCommit: "abc123",
        releaseLabel: "prod-wave-1",
        updateMessage: "release-safe ota",
        platform: "android",
        environment: "preview",
      }),
    );
    expect(globalScope.setContext).toHaveBeenCalledWith(
      "release_metadata",
      expect.objectContaining({
        appVersion: "1.0.0",
        nativeBuildVersion: "13",
        updateGroupId: "group-123",
        gitCommit: "abc123",
        releaseLabel: "prod-wave-1",
      }),
    );
  });

  it("redacts signed urls and tokens before captureException", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@example.com/1";
    setNodeEnv("production");
    (globalThis as DevGlobal).__DEV__ = false;
    const { sentryMock, scopedCalls } = installModuleMocks();

    const { captureLogErrorToSentry } = require("../../src/lib/observability/sentry") as typeof import("../../src/lib/observability/sentry");
    captureLogErrorToSentry({
      context: "pdf.fetch",
      error: new Error("failed https://storage.example.test/file.pdf?token=stack-secret"),
      message: "failed https://storage.example.test/file.pdf?token=message-secret",
      extra: {
        signedUrl: "https://storage.example.test/file.pdf?token=extra-secret",
        authorization: "Bearer bearer-secret",
      },
      platform: "android",
    });

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMock.captureMessage).not.toHaveBeenCalled();
    const capturedError = sentryMock.captureException.mock.calls[0]?.[0] as Error;
    expect(capturedError).toBeInstanceOf(Error);
    expect(capturedError.message).toContain("[redacted]");
    expect(capturedError.message).not.toContain("stack-secret");
    const scopedJson = JSON.stringify(scopedCalls.map((scope) => scope.setContext.mock.calls));
    expect(scopedJson).toContain("[redacted]");
    expect(scopedJson).not.toContain("message-secret");
    expect(scopedJson).not.toContain("extra-secret");
    expect(scopedJson).not.toContain("bearer-secret");
  });

  it("uses captureMessage for non-error payloads", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@example.com/1";
    setNodeEnv("production");
    (globalThis as DevGlobal).__DEV__ = false;
    const { sentryMock } = installModuleMocks();

    const { captureLogErrorToSentry } = require("../../src/lib/observability/sentry") as typeof import("../../src/lib/observability/sentry");
    captureLogErrorToSentry({
      context: "plain.failure",
      error: "Bearer string-secret",
      message: "plain failure Bearer message-secret",
      extra: null,
      platform: "android",
    });

    expect(sentryMock.captureException).not.toHaveBeenCalled();
    expect(sentryMock.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("[redacted]"),
      "error",
    );
    const captureJson = JSON.stringify(sentryMock.captureMessage.mock.calls);
    expect(captureJson).not.toContain("string-secret");
    expect(captureJson).not.toContain("message-secret");
  });
});
