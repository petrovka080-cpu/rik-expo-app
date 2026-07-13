import { readProjectFile } from "./releasePipelineContractUtils";

describe("proof-only hook", () => {
  it("does not run full Jest", () => {
    const source = readProjectFile("scripts/release/runScopedPreCommit.ts");
    const proofBranch = source.slice(source.indexOf('classification.scope === "PROOF_ONLY"'), source.indexOf('classification.scope === "MIGRATION"'));
    expect(proofBranch).not.toMatch(/npm["\s,\[]+test|runFrozenFullJest|full-jest|--runInBand/);
  });
});
