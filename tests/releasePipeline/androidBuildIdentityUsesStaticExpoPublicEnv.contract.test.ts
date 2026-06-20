import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android build identity env injection", () => {
  it("uses static EXPO_PUBLIC env reads that Expo can inline into the release bundle", () => {
    const filePath = "src/lib/release/buildIdentity.ts";
    expectFileToContain(filePath, "process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH");
    expectFileToContain(filePath, "process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH");
    expectFileToContain(filePath, "process.env.EXPO_PUBLIC_RELEASE_CANDIDATE_HASH");
    expectFileToContain(filePath, "process.env.EXPO_PUBLIC_RELEASE_APK_BUILD_KEY");
    expectFileToContain(filePath, "process.env.EXPO_PUBLIC_BUILD_COMMIT");
    expectFileNotToMatch(filePath, /process\.env\[[^\]]*EXPO_PUBLIC_RELEASE/);
    expectFileNotToMatch(filePath, /publicEnv\("EXPO_PUBLIC_/);
  });
});
