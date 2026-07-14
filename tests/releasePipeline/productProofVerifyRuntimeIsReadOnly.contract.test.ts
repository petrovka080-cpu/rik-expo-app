import { expectFileToContain, expectFileToMatch } from "./releasePipelineContractUtils";

describe("product proof verify-runtime read-only boundary", () => {
  it("checks runtime evidence without writing during verify-runtime", () => {
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "VERIFY_RUNTIME");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "releaseVerifyStrictSnapshot()");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "diffReleaseVerifyStrictSnapshots(snapshotBefore, snapshotAfter)");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "product_proof_runtime_verified_read_only: true");
    expectFileToMatch("scripts/release/runProductProofRuntimeGate.ts", /export function verifyProductProofRuntimeEvidence[\s\S]*readJsonObject\(reportPath\)[\s\S]*diffReleaseVerifyStrictSnapshots/);
  });
});
