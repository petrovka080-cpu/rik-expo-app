import { EMBEDDED_AI_PROMPTS, estimateForEmbeddedAi } from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("embedded AI estimate intent", () => {
  it("lets estimate intent win over foreman role context", () => {
    const estimate = estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.windows);
    expect(estimate.work.workKey).toBe("window_installation");
    expect(estimate.outputContract.format).toBe("professional_boq");
  });
});
