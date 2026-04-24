import {
  buildReleaseConfigSummary,
  evaluateReleaseRuntimePolicyTruth,
} from "../../src/shared/release/releaseInfo";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("releaseConfig.shared", () => {
  it("accepts the fingerprint runtime policy when release extra matches", () => {
    const truth = evaluateReleaseRuntimePolicyTruth({
      runtimeVersion: {
        policy: "fingerprint",
      },
      releaseExtra: {
        runtimePolicy: "policy:fingerprint",
        runtimeStabilizationProof: {
          runtimeVersionStrategy: "fingerprint",
          wave: "OTA_RUNTIME_VERSION_FINGERPRINT_REPO_SAFE",
        },
      },
    });

    expect(truth.runtimeVersionStrategy).toBe("fingerprint");
    expect(truth.runtimePolicyValid).toBe(true);
    expect(truth.runtimeProofConsistent).toBe(true);
  });

  it("rejects any static runtimeVersion string", () => {
    const truth = evaluateReleaseRuntimePolicyTruth({
      runtimeVersion: "2.5.9",
      releaseExtra: {
        runtimePolicy: "fixed(2.5.9)",
        runtimeStabilizationProof: {
          runtimeVersionStrategy: "fixed",
          fixedRuntime: "2.5.9",
        },
      },
    });

    expect(truth.runtimeVersionStrategy).toBe("fixed");
    expect(truth.runtimePolicyValid).toBe(false);
    expect(truth.runtimePolicyReason).toContain("Static runtimeVersion strings are invalid");
  });

  it("fails stale runtime policy or proof mismatches", () => {
    const truth = evaluateReleaseRuntimePolicyTruth({
      runtimeVersion: {
        policy: "fingerprint",
      },
      releaseExtra: {
        runtimePolicy: "fixed(1.0.0)",
        runtimeStabilizationProof: {
          runtimeVersionStrategy: "fixed",
          fixedRuntime: "1.0.0",
        },
      },
    });

    expect(truth.runtimePolicyValid).toBe(true);
    expect(truth.runtimeProofConsistent).toBe(false);
    expect(truth.runtimeProofReason).toContain('extra.release.runtimePolicy must equal "policy:fingerprint"');
  });

  it("keeps the checked-in app config truth-consistent with fingerprint policy", () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, "app.json"), "utf8"),
    ) as {
      expo?: {
        name?: unknown;
        slug?: unknown;
        version?: unknown;
        runtimeVersion?: unknown;
        updates?: {
          enabled?: unknown;
          url?: unknown;
          checkAutomatically?: unknown;
          fallbackToCacheTimeout?: unknown;
        };
        extra?: {
          eas?: {
            projectId?: unknown;
          };
          release?: {
            runtimePolicy?: unknown;
            runtimeStabilizationProof?: unknown;
          };
        };
        ios?: {
          buildNumber?: unknown;
        };
        android?: {
          versionCode?: unknown;
        };
      };
    };
    const expo = appJson.expo ?? {};
    const truth = evaluateReleaseRuntimePolicyTruth({
      runtimeVersion: expo.runtimeVersion,
      releaseExtra: expo.extra?.release,
    });
    const summary = buildReleaseConfigSummary({
      appName: String(expo.name ?? ""),
      appSlug: String(expo.slug ?? ""),
      appVersion: String(expo.version ?? ""),
      configuredIosBuildNumber: String(expo.ios?.buildNumber ?? ""),
      configuredAndroidVersionCode: String(expo.android?.versionCode ?? ""),
      runtimeVersion: truth.resolvedRuntimeVersion,
      runtimePolicy: truth.runtimePolicy,
      runtimeVersionStrategy: truth.runtimeVersionStrategy,
      runtimePolicyValid: truth.runtimePolicyValid,
      runtimePolicyReason: truth.runtimePolicyReason,
      runtimeProofConsistent: truth.runtimeProofConsistent,
      runtimeProofReason: truth.runtimeProofReason,
      updatesEnabled: expo.updates?.enabled === true,
      updatesUrl: String(expo.updates?.url ?? ""),
      projectId: String(expo.extra?.eas?.projectId ?? ""),
      checkAutomatically: expo.updates?.checkAutomatically === "ON_LOAD" ? "ON_LOAD" : "unknown",
      fallbackToCacheTimeout:
        typeof expo.updates?.fallbackToCacheTimeout === "number" ? expo.updates.fallbackToCacheTimeout : null,
      appVersionSource: "remote",
      buildProfiles: [],
      gitBranch: "main",
      gitCommit: "head",
      gitDirty: false,
    });

    expect(summary.runtimeVersion).toBe("policy:fingerprint");
    expect(summary.runtimePolicy).toBe("policy:fingerprint");
    expect(summary.runtimeVersionStrategy).toBe("fingerprint");
    expect(summary.runtimePolicyValid).toBe(true);
    expect(summary.runtimeProofConsistent).toBe(true);
  });
});
