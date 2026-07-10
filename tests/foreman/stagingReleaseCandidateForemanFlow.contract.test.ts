import { validateStagingReleaseCandidateCases } from "../../scripts/estimate/runAiEstimateStagingReleaseCandidateCases";

describe("staging release candidate foreman flow corpus", () => {
  it("covers materials and subcontracts foreman flows", () => {
    const summary = validateStagingReleaseCandidateCases();

    expect(summary.foreman_materials_cases_count).toBeGreaterThanOrEqual(10);
    expect(summary.foreman_subcontracts_cases_count).toBeGreaterThanOrEqual(10);
  });
});
