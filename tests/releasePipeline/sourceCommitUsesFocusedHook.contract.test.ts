import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("source commit hook scope", () => {
  it("runs focused checks through the scoped pre-commit runner", () => {
    expectFileToContain(".husky/pre-commit", "runScopedPreCommit.ts");
    expectFileToContain("scripts/release/runScopedPreCommit.ts", "focusedJestArgs");
    expectFileToContain("scripts/release/runScopedPreCommit.ts", "verify:typecheck");
    expectFileToContain("scripts/release/runScopedPreCommit.ts", "assertNoTestWeakening");
    expectFileNotToMatch("scripts/release/runScopedPreCommit.ts", /changedSince=HEAD~1/);
  });
});
