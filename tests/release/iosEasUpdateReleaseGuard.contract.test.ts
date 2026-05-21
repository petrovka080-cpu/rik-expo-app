import {
  RELEASE_GUARD_IOS_EAS_UPDATE_FAST_QA_POLICY,
  REQUIRED_RELEASE_GATES,
} from "../../scripts/release/releaseGuard.shared";

describe("iOS EAS Update release guard integration", () => {
  it("keeps the native-impact classifier in release verify gates", () => {
    expect(REQUIRED_RELEASE_GATES).toEqual(
      expect.arrayContaining([
        {
          name: "ios-eas-update-native-impact-classifier",
          command: "npx tsx scripts/release/classifyNativeRuntimeImpact.ts --json",
        },
      ]),
    );
  });

  it("documents the fast QA rule in the release guard policy", () => {
    expect(RELEASE_GUARD_IOS_EAS_UPDATE_FAST_QA_POLICY.wave).toBe(
      "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_GATE_POINT_OF_NO_RETURN",
    );
    expect(RELEASE_GUARD_IOS_EAS_UPDATE_FAST_QA_POLICY.nativeImpactFalse).toContain("iOS build is forbidden");
    expect(RELEASE_GUARD_IOS_EAS_UPDATE_FAST_QA_POLICY.physicalIphoneProofRequired).toContain("iPhone QA green");
  });
});
