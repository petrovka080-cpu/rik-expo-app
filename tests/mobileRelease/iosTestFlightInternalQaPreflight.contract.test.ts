import {
  buildPreflightFinalStatus,
  readInternalTestFlightConfig,
} from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA preflight contract", () => {
  it("allows only internal TestFlight QA scope when all prerequisites are present", () => {
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
        bundleIdentifierPresent: true,
        iosBuildNumberBumpReady: true,
        internalProfilePresent: true,
        submitProfilePresent: true,
        appReviewSubmitted: false,
        publicBetaEnabled: false,
        productionRolloutEnabled: false,
        externalTestflightBetaReviewSubmitted: false,
      }),
    ).toBe("GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREFLIGHT_READY");
  });

  it("keeps the EAS profile store-distributed and internal-channel scoped", () => {
    const config = readInternalTestFlightConfig();

    expect(config.buildProfilePresent).toBe(true);
    expect(config.submitProfilePresent).toBe(true);
    expect(config.distribution).toBe("store");
    expect(config.channel).toBe("testflight-internal");
    expect(config.autoIncrement).toBe(true);
    expect(config.appVersionSource).toBe("remote");
    expect(config.ascAppId).toBe("6759552514");
  });
});
