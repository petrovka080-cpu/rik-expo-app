import { expectFileNotToContain, expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("pipeline promotion artifact allowlist", () => {
  it("writes only final immutable evidence files", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "source_freeze.json");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "full_jest_summary.json");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "CLOSEOUT_PROOF.json");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "stdout.log");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "stderr.log");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "screenshots");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "Metro");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "process.pid");
    expectFileNotToContain("scripts/release/promoteVerifiedArtifact.ts", "pid_file");
    expectFileNotToMatch("scripts/release/promoteVerifiedArtifact.ts", /["'][^"']*\.pid["']/i);
  });
});
