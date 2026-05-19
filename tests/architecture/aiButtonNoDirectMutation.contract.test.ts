import {
  buildAiRealUserButtonManifest,
  buildAiRealUserButtonResults,
  buildAiRealUserUiMatrix,
} from "../../scripts/ai/aiRealUserButtonProof";

describe("AI real-user buttons do not mutate directly", () => {
  it("keeps every button read-only, draft-only, approval-routed, blocked, or exact-blocked", () => {
    const matrix = buildAiRealUserUiMatrix({
      webProofPass: true,
      androidProofPass: true,
      webScreenshotsCaptured: true,
      androidScreenshotsCaptured: true,
    });

    expect(buildAiRealUserButtonManifest().every((entry) => entry.mustNotMutateData)).toBe(true);
    expect(buildAiRealUserButtonResults().every((entry) => !entry.dbWriteUsed && !entry.directMutationUsed)).toBe(true);
    expect(matrix.direct_dangerous_mutations).toBe(false);
    expect(matrix.db_writes_used).toBe(false);
  });
});
