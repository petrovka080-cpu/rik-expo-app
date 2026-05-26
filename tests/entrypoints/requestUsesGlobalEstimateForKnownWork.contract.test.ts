import {
  REQUEST_PROMPTS,
  estimateForRequest,
  presentationForEstimate,
  requestDraft,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request uses GlobalEstimateResult for known work", () => {
  it("creates structured estimates for P0 request prompts", () => {
    const cases = [
      [REQUEST_PROMPTS.laminate, "laminate_laying"],
      [REQUEST_PROMPTS.hydroTurbine, "micro_hydro_preparation"],
      [REQUEST_PROMPTS.roofWaterproofing, "roof_waterproofing"],
    ] as const;

    for (const [prompt, workKey] of cases) {
      const estimate = estimateForRequest(prompt);
      const draft = requestDraft(prompt);
      expect(estimate.work.workKey).toBe(workKey);
      expect(draft.estimatePresentation?.workKey).toBe(workKey);
      expect(presentationForEstimate(estimate).workKey).toBe(workKey);
    }
  });
});
