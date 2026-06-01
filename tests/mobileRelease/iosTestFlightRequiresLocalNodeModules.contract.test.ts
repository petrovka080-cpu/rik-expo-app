import {
  buildLocalDependencyResolutionReport,
  buildPreflightFinalStatus,
  type RuntimeFingerprintResolution,
} from "../../scripts/release/iosTestFlightInternalQaCore";

const stableRuntimeFingerprint: RuntimeFingerprintResolution = {
  command: "npx expo-updates runtimeversion:resolve --platform ios",
  command_ok: true,
  status: 0,
  runtime_version: "74a280d2882c3ef76937c8704da2fba8dca7d739",
  fingerprint_sources_count: 1,
  stderr: "",
};

describe("iOS TestFlight local node_modules guard", () => {
  it("blocks before EAS when this checkout has no local node_modules", () => {
    const report = buildLocalDependencyResolutionReport({
      rootDir: process.cwd(),
      projectNodeModulesRealpath: null,
      packageJsonResolutions: {
        expo: null,
        "@expo/fingerprint": null,
      },
      runtimeFingerprint: stableRuntimeFingerprint,
    });

    expect(report.ready).toBe(false);
    expect(report.node_modules_present).toBe(false);
    expect(
      buildPreflightFinalStatus({
        sourceIncludesProductHotfix: true,
        worktreeClean: true,
        releaseCoreBaselineGreen: true,
        productQualityAcceptanceGreen: true,
        concretePedestalRegressionGreen: true,
        easCliAvailable: true,
        easAuthenticated: true,
        appStoreConnectAccessAvailable: true,
        localDependencyResolutionReady: report.ready,
        bundleIdentifierPresent: true,
        iosBuildNumberBumpReady: true,
        internalProfilePresent: true,
        submitProfilePresent: true,
        appReviewSubmitted: false,
        publicBetaEnabled: false,
        productionRolloutEnabled: false,
        externalTestflightBetaReviewSubmitted: false,
      }),
    ).toBe("BLOCKED_IOS_LOCAL_DEPENDENCY_RESOLUTION_OUTSIDE_WORKTREE");
  });
});
