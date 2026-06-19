import { readProjectFile } from "./releasePipelineContractUtils";

describe("proof-only hook Android isolation", () => {
  it("does not run Android proof or install steps", () => {
    const source = readProjectFile("scripts/release/runScopedPreCommit.ts");
    const proofBranch = source.slice(source.indexOf('classification.scope === "PROOF_ONLY"'), source.indexOf('classification.scope === "MIGRATION"'));
    expect(proofBranch).not.toMatch(/android:api34|adb|pm\s+install|emulator|playwright/);
  });
});
