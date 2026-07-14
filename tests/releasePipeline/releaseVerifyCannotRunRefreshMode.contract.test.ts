import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("release verify cannot run refresh mode", () => {
  it("keeps generation and refresh commands out of the general verify gate list", () => {
    expectFileToContain("scripts/release/releaseGuard.shared.ts", "--mode=verify-runtime");
    expectFileNotToContain("scripts/release/releaseGuard.shared.ts", "--mode=generate-runtime");
    expectFileNotToContain("scripts/release/releaseGuard.shared.ts", "--mode=refresh");
  });
});
