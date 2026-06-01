import { buildPreflightFinalStatus } from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA App Store Connect gate", () => {
  it("blocks when App Store Connect access cannot be proven", () => {
    expect(
      buildPreflightFinalStatus({
        sourceIncludesProductHotfix: true,
        worktreeClean: true,
        releaseCoreBaselineGreen: true,
        productQualityAcceptanceGreen: true,
        concretePedestalRegressionGreen: true,
        easCliAvailable: true,
        easAuthenticated: true,
        appStoreConnectAccessAvailable: false,
        bundleIdentifierPresent: true,
        iosBuildNumberBumpReady: true,
        internalProfilePresent: true,
        submitProfilePresent: true,
        appReviewSubmitted: false,
        publicBetaEnabled: false,
        productionRolloutEnabled: false,
        externalTestflightBetaReviewSubmitted: false,
      }),
    ).toBe("BLOCKED_APP_STORE_CONNECT_ACCESS_NOT_AVAILABLE");
  });
});
