import {
  isSmartEstimatorReleaseNeutralPath,
  SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS,
} from "../../scripts/release/smartEstimatorReleaseReusePolicy";

describe("smart estimator release reuse policy", () => {
  it("allows only the explicit smart estimator and estimate quality backend, proof, and test surfaces", () => {
    for (const filePath of SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS) {
      const sample = filePath.endsWith("/") ? `${filePath}sample.ts` : filePath;
      expect(isSmartEstimatorReleaseNeutralPath(sample)).toBe(true);
    }

    expect(isSmartEstimatorReleaseNeutralPath("src/lib/ai/estimateQualityGate/estimateQualityGate.ts")).toBe(true);
    expect(isSmartEstimatorReleaseNeutralPath("tests/estimateQualityGate/qualityGateProtocol.contract.test.ts")).toBe(true);
    expect(isSmartEstimatorReleaseNeutralPath("artifacts/S_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE/matrix.json")).toBe(true);
    expect(isSmartEstimatorReleaseNeutralPath("app/(tabs)/request/index.tsx")).toBe(false);
    expect(isSmartEstimatorReleaseNeutralPath("src/lib/ai/globalEstimate/index.ts")).toBe(false);
    expect(isSmartEstimatorReleaseNeutralPath("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts")).toBe(false);
  });
});
