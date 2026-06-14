import {
  isOperationObjectMatchingReleaseNeutralPath,
  OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS,
} from "../../scripts/release/operationObjectMatchingReleaseReusePolicy";

describe("operation object matching release reuse policy", () => {
  it("allows only the explicit P0 operation-object semantic proof surface", () => {
    for (const filePath of OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS) {
      const sample = filePath.endsWith("/") ? `${filePath}sample.json` : filePath;
      expect(isOperationObjectMatchingReleaseNeutralPath(sample)).toBe(true);
    }

    expect(isOperationObjectMatchingReleaseNeutralPath("app/(tabs)/request/index.tsx")).toBe(false);
    expect(isOperationObjectMatchingReleaseNeutralPath("src/lib/ai/globalEstimate/index.ts")).toBe(false);
    expect(isOperationObjectMatchingReleaseNeutralPath("src/lib/ai/builtInAi/index.ts")).toBe(false);
    expect(isOperationObjectMatchingReleaseNeutralPath("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts")).toBe(false);
  });
});
