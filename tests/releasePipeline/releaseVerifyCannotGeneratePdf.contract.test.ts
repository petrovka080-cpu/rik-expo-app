import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("release verify does not generate PDFs", () => {
  it("routes churn-heavy PDF gates through runtime verification only", () => {
    const guard = "scripts/release/releaseGuard.shared.ts";
    expectFileToContain(guard, "runProductProofRuntimeGate.ts --gate=ai-estimate-pdf-safe-integration-proof --mode=verify-runtime");
    expectFileToContain(guard, "runProductProofRuntimeGate.ts --gate=built-in-ai-50000-phase1-governed-expansion-proof --mode=verify-runtime");
    expectFileToContain(guard, "runProductProofRuntimeGate.ts --gate=built-in-ai-50000-phase2-all-shards-runtime-proof --mode=verify-runtime");
    expectFileNotToContain(guard, "runAiEstimatePdfSafeIntegrationProof.ts");
    expectFileNotToContain(guard, "runBuiltInAi50000Phase1ShardMerge.ts --totalShards=5 --require-live-artifacts");
    expectFileNotToContain(guard, "runBuiltInAi50000Phase2ShardMerge.ts --totalShards=50 --require-live-artifacts");
  });
});
