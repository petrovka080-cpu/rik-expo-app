import { getAiEstimateStorageSurfacePolicy } from "../../src/lib/estimate/ledger/AiEstimateSourceOfTruthPolicy";
import { validateAiEstimateSourceOfTruthPolicy } from "../../src/lib/estimate/ledger/validateAiEstimateSourceOfTruthPolicy";

describe("AI estimate source of truth policy", () => {
  it("keeps local/browser state out of the source-of-truth path", () => {
    const proof = validateAiEstimateSourceOfTruthPolicy();

    expect(proof.ok).toBe(true);
    expect(getAiEstimateStorageSurfacePolicy("estimate_ledger").sourceOfTruth).toBe(true);
    expect(getAiEstimateStorageSurfacePolicy("server_api").sourceOfTruth).toBe(true);
    expect(getAiEstimateStorageSurfacePolicy("browser_cache").sourceOfTruth).toBe(false);
    expect(getAiEstimateStorageSurfacePolicy("legacy_local_storage").mayServeHistory).toBe(false);
    expect(getAiEstimateStorageSurfacePolicy("ui_state").retention).toBe("transient");
  });
});
