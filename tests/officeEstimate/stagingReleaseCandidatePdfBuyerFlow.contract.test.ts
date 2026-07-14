import { loadStagingReleaseCandidateCases, validateStagingReleaseCandidateCases } from "../../scripts/estimate/runAiEstimateStagingReleaseCandidateCases";

describe("staging release candidate PDF buyer flow corpus", () => {
  it("covers director buyer history PDF revision flows", () => {
    const summary = validateStagingReleaseCandidateCases();
    const fixture = loadStagingReleaseCandidateCases();

    expect(summary.director_cases_count).toBeGreaterThanOrEqual(10);
    expect(summary.buyer_cases_count).toBeGreaterThanOrEqual(10);
    expect(summary.history_pdf_revision_cases_count).toBeGreaterThanOrEqual(10);
    expect(fixture.cases.filter((testCase) => testCase.requires_pdf).length).toBeGreaterThanOrEqual(10);
    expect(fixture.cases.filter((testCase) => testCase.requires_buyer_package).length).toBeGreaterThanOrEqual(10);
  });
});
