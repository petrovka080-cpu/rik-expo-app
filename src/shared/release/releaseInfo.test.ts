import {
  buildReleaseConfigSummary,
  buildReleaseDiagnostics,
  buildReleaseDiagnosticsText,
  buildReleaseDecisionSummary,
  normalizeReleaseChangeClass,
  recommendReleaseDelivery,
} from "./releaseInfo";
import type { RuntimeReleaseSnapshot } from "./releaseInfo.types";

type SnapshotOverrides = {
  nowMs?: RuntimeReleaseSnapshot["nowMs"];
  config?: Partial<RuntimeReleaseSnapshot["config"]>;
  native?: Partial<RuntimeReleaseSnapshot["native"]>;
  update?: Partial<RuntimeReleaseSnapshot["update"]>;
  envMetadata?: Partial<NonNullable<RuntimeReleaseSnapshot["envMetadata"]>>;
};

function createSnapshot(overrides: SnapshotOverrides = {}): RuntimeReleaseSnapshot {
  const base: RuntimeReleaseSnapshot = {
    nowMs: Date.parse("2026-04-02T12:00:00.000Z"),
    config: {
      appVersion: "1.0.0",
      configuredIosBuildNumber: "13",
      configuredAndroidVersionCode: "13",
      runtimeVersion: "1.0.0",
      updatesEnabled: true,
      updatesUrl: "https://u.expo.dev/project-id",
      projectId: "project-id",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 30000,
      appVersionSource: "remote",
    },
    native: {
      appVersion: "1.0.0",
      nativeBuildVersion: "21",
    },
    update: {
      channel: "production",
      updateId: "update-123",
      createdAt: "2026-04-02T11:00:00.000Z",
      isEmbeddedLaunch: false,
      manifestMetadata: {
        releaseLabel: "prod-hotfix",
        gitCommit: "abc123",
        updateGroupId: "group-123",
        updateMessage: "runtime-safe ota",
      },
      runtimeVersion: "1.0.0",
      isStartupProcedureRunning: false,
      isUpdateAvailable: false,
      isUpdatePending: false,
      isChecking: false,
      isDownloading: false,
      availableUpdateId: "",
      availableUpdateCreatedAt: "",
      downloadedUpdateId: "",
      downloadedUpdateCreatedAt: "",
      checkError: "",
      downloadError: "",
      lastCheckForUpdateTimeSinceRestart: "2026-04-02T11:30:00.000Z",
    },
    envMetadata: {},
  };

  return {
    ...base,
    ...overrides,
    config: {
      ...base.config,
      ...overrides.config,
    },
    native: {
      ...base.native,
      ...overrides.native,
    },
    update: {
      ...base.update,
      ...overrides.update,
      manifestMetadata: {
        ...(base.update.manifestMetadata ?? {}),
        ...((overrides.update?.manifestMetadata as Record<string, unknown> | undefined) ?? {}),
      },
    },
    envMetadata: {
      ...base.envMetadata,
      ...overrides.envMetadata,
    },
  };
}

describe("releaseInfo", () => {
  it("builds a release config summary for fingerprint runtime policy and warns that remote build numbers are authoritative", () => {
    const summary = buildReleaseConfigSummary({
      appName: "rik-expo-app",
      appSlug: "rik-expo-app",
      appVersion: "1.0.0",
      configuredIosBuildNumber: "13",
      configuredAndroidVersionCode: "13",
      runtimeVersion: "policy:fingerprint",
      runtimePolicy: "policy:fingerprint",
      runtimeVersionStrategy: "fingerprint",
      runtimePolicyValid: true,
      runtimePolicyReason: "runtimeVersion uses the fingerprint policy.",
      runtimeProofConsistent: true,
      runtimeProofReason: "release extra truth matches the configured runtime policy.",
      updatesEnabled: true,
      updatesUrl: "https://u.expo.dev/project-id",
      projectId: "project-id",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 30000,
      appVersionSource: "remote",
      buildProfiles: [
        { name: "development", channel: "development", distribution: "internal", autoIncrement: false },
        { name: "preview", channel: "preview", distribution: "internal", autoIncrement: false },
        { name: "production", channel: "production", distribution: "store", autoIncrement: true },
      ],
      gitBranch: "main",
      gitCommit: "abc123",
      gitDirty: false,
    });

    expect(summary.branchByChannel.production).toBe("production");
    expect(summary.risks).toContain(
      "appVersionSource=remote means local ios.buildNumber/android.versionCode are not authoritative for shipped binaries; EAS Build owns the real counters.",
    );
    expect(summary.risks).toContain(
      "runtimeVersion uses the fingerprint policy. Native/runtime-affecting changes require fresh builds before publishing compatible OTA updates.",
    );
    expect(summary.startupPolicyValid).toBe(true);
    expect(summary.startupPolicyReason).toBe("Release startup policy is ON_LOAD with fallbackToCacheTimeout=30000.");
    expect(summary.risks).not.toContain(
      "runtimeVersion is pinned. OTA remains valid only while the native host stays compatible; changing the runtime policy requires new builds.",
    );
  });

  it("keeps the fixed-runtime warning explicit for pinned runtimes", () => {
    const summary = buildReleaseConfigSummary({
      appName: "rik-expo-app",
      appSlug: "rik-expo-app",
      appVersion: "1.0.0",
      configuredIosBuildNumber: "13",
      configuredAndroidVersionCode: "13",
      runtimeVersion: "1.0.0",
      runtimePolicy: "fixed(1.0.0)",
      runtimeVersionStrategy: "fixed",
      runtimePolicyValid: false,
      runtimePolicyReason:
        'Static runtimeVersion strings are invalid for this repo. Use expo.runtimeVersion = { "policy": "fingerprint" }.',
      runtimeProofConsistent: true,
      runtimeProofReason: "release extra truth matches the configured runtime policy.",
      updatesEnabled: true,
      updatesUrl: "https://u.expo.dev/project-id",
      projectId: "project-id",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 30000,
      appVersionSource: "remote",
      buildProfiles: [
        { name: "development", channel: "development", distribution: "internal", autoIncrement: false },
        { name: "preview", channel: "preview", distribution: "internal", autoIncrement: false },
        { name: "production", channel: "production", distribution: "store", autoIncrement: true },
      ],
      gitBranch: "main",
      gitCommit: "abc123",
      gitDirty: false,
    });

    expect(summary.risks).toContain(
      "runtimeVersion is pinned. OTA remains valid only while the native host stays compatible; changing the runtime policy requires new builds.",
    );
    expect(summary.risks).toContain(
      'Static runtimeVersion strings are invalid for this repo. Use expo.runtimeVersion = { "policy": "fingerprint" }.',
    );
    expect(summary.startupPolicyValid).toBe(true);
  });

  it("classifies a healthy OTA-applied runtime lineage as ok", () => {
    const diagnostics = buildReleaseDiagnostics(createSnapshot());

    expect(diagnostics.verdict).toBe("ok");
    expect(diagnostics.updateAvailabilityState).toBe("no-update");
    expect(diagnostics.releaseLabel).toBe("prod-hotfix");
    expect(diagnostics.gitCommit).toBe("abc123");
    expect(diagnostics.reasons).toContain("Update applied successfully within the current runtime lineage.");
  });

  it("surfaces embedded stale lineage as warning with actionable reasons", () => {
    const diagnostics = buildReleaseDiagnostics(
      createSnapshot({
        update: {
          isEmbeddedLaunch: true,
          createdAt: "2026-03-31T12:00:00.000Z",
          isUpdateAvailable: true,
          lastCheckForUpdateTimeSinceRestart: "2026-04-02T11:30:00.000Z",
        },
      }),
    );

    expect(diagnostics.verdict).toBe("warning");
    expect(diagnostics.isEmbeddedLaunch).toBe(true);
    expect(diagnostics.updateAvailabilityState).toBe("available");
    expect(diagnostics.reasons).toContain("The current launch is still using the embedded bundle.");
    expect(diagnostics.actions).toContain('Confirm that the latest update was published to branch "production".');
  });

  it("surfaces missing runtime/config identity as error", () => {
    const diagnostics = buildReleaseDiagnostics(
      createSnapshot({
        config: {
          projectId: "unknown",
          updatesUrl: "unknown",
        },
        update: {
          channel: "unknown",
          runtimeVersion: "unknown",
          lastCheckForUpdateTimeSinceRestart: "",
        },
      }),
    );

    expect(diagnostics.verdict).toBe("error");
    expect(diagnostics.isRuntimeMismatchSuspected).toBe(true);
    expect(diagnostics.reasons).toContain("Runtime version could not be determined.");
  });

  it("degrades conflicting lineage to unknown instead of pretending the launch is ota", () => {
    const diagnostics = buildReleaseDiagnostics(
      createSnapshot({
        native: {
          nativeBuildVersion: "unknown",
        },
        update: {
          channel: "unknown",
          updateId: "",
          runtimeVersion: "unknown",
          isEmbeddedLaunch: false,
          lastCheckForUpdateTimeSinceRestart: "2026-04-02T11:30:00.000Z",
        },
      }),
    );

    expect(diagnostics.updateId).toBe("unknown");
    expect(diagnostics.launchSource).toBe("unknown");
    expect(diagnostics.reasons).toContain("Native build version could not be determined.");
    expect(diagnostics.reasons).toContain(
      "Launch source could not be proven from the current release identity.",
    );
  });

  it("keeps the OTA vs build decision matrix explicit", () => {
    expect(normalizeReleaseChangeClass("js-ui")).toBe("js-ui");
    expect(normalizeReleaseChangeClass("made-up")).toBeNull();
    expect(recommendReleaseDelivery("js-ui").delivery).toBe("ota");
    expect(recommendReleaseDelivery("expo-plugin").delivery).toBe("new-build");

    const decision = buildReleaseDecisionSummary({
      changeClass: "native-module",
      targetChannel: "production",
      configWarnings: ["remote build numbers"],
    });

    expect(decision.expectedBranch).toBe("production");
    expect(decision.decision.delivery).toBe("new-build");
    expect(decision.configWarnings).toContain("remote build numbers");
  });

  it("prints diagnostics text with lineage fields", () => {
    const text = buildReleaseDiagnosticsText(buildReleaseDiagnostics(createSnapshot()));

    expect(text).toContain("appVersion: 1.0.0");
    expect(text).toContain("nativeBuildVersion: 21");
    expect(text).toContain("channel: production");
    expect(text).toContain("releaseLabel: prod-hotfix");
    expect(text).toContain("updateGroupId: group-123");
  });
});
