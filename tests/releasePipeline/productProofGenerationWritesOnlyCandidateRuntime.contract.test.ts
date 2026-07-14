import { expectFileToContain } from "./releasePipelineContractUtils";

describe("product proof generation runtime boundary", () => {
  it("writes generated product proof evidence only under the candidate runtime tree", () => {
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "generate-runtime");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "GENERATE_RUNTIME");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "productProofRuntimeReportPath(candidate, gate.gateName)");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "assertInsideRuntime(candidate, reportPath)");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "trackedFileHashes()");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "PRODUCT_PROOF_GENERATE_MUTATED_WORKTREE");
    expectFileToContain("scripts/release/runProductProofRuntimeGate.ts", "writes_only_runtime: true");
    expectFileToContain("scripts/release/productProofRuntimeGate.shared.ts", `"product-gates", gateName`);
  });
});
