import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest output", () => {
  it("writes temporary output outside the repository before promotion", () => {
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'os.tmpdir()');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"rik-release"');
    expectFileNotToMatch("scripts/release/runFrozenFullJest.ts", /artifacts\/S_RELEASE_PIPELINE_STABILIZATION\/full_jest\.json/);
  });
});
