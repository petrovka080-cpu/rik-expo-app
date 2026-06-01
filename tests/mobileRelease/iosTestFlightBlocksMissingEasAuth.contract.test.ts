import { buildPreflightFinalStatus } from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA EAS auth gate", () => {
  it("blocks when the Expo/EAS session is unavailable", () => {
    expect(
      buildPreflightFinalStatus({
        sourceIncludesProductHotfix: true,
        worktreeClean: true,
        releaseCoreBaselineGreen: true,
        productQualityAcceptanceGreen: true,
        concretePedestalRegressionGreen: true,
        easCliAvailable: true,
        easAuthenticated: false,
        appStoreConnectAccessAvailable: true,
        bundleIdentifierPresent: true,
        iosBuildNumberBumpReady: true,
        internalProfilePresent: true,
        submitProfilePresent: true,
        appReviewSubmitted: false,
        publicBetaEnabled: false,
        productionRolloutEnabled: false,
        externalTestflightBetaReviewSubmitted: false,
      }),
    ).toBe("BLOCKED_EAS_NOT_AUTHENTICATED");
  });
});
