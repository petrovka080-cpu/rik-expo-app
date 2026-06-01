import {
  buildPreflightFinalStatus,
  classifyDirtyFilesForIosInternalQa,
} from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA dirty scope", () => {
  it("reports product paths as blocked dirty scope without allowing them into the build", () => {
    const classified = classifyDirtyFilesForIosInternalQa(" M src/lib/ai/globalEstimate/foo.ts\n M app.json\n");

    expect(classified.allowedDirtyFiles).toEqual(["app.json"]);
    expect(classified.disallowedDirtyFiles).toEqual(["src/lib/ai/globalEstimate/foo.ts"]);
    expect(
      buildPreflightFinalStatus({
        sourceIncludesProductHotfix: true,
        worktreeClean: false,
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
    ).toBe("BLOCKED_IOS_TESTFLIGHT_WORKTREE_NOT_CLEAN");
  });
});
