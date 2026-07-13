import { validateAiEstimateRevisionEngineV2 } from "../../src/lib/estimate/revision/validateAiEstimateRevisionEngineV2";

describe("AI estimate revision engine v2", () => {
  it("keeps revisions immutable and invalidates stale artifacts", () => {
    const result = validateAiEstimateRevisionEngineV2();

    expect(result.ok).toBe(true);
    expect(result.revisionIsImmutable).toBe(true);
    expect(result.manualOverrideCreatesNewRevision).toBe(true);
    expect(result.revisionChainPreserved).toBe(true);
    expect(result.pdfMarkedStaleAfterRevisionChange).toBe(true);
    expect(result.buyerPackageMarkedStaleAfterRevisionChange).toBe(true);
  }, 300_000);
});
