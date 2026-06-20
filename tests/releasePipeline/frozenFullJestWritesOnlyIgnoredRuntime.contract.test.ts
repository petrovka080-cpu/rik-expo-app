import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest runtime output", () => {
  it("writes only ignored runtime files", () => {
    expectFileToContain(".gitignore", ".release-runtime/");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"full-jest"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"result.json"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"summary.json"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"exit_code.txt"');
    expectFileNotToMatch("scripts/release/runFrozenFullJest.ts", /artifacts\//);
  });
});
