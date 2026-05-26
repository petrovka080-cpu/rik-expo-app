import {
  REQUEST_PROMPTS,
  estimateForRequest,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("shared estimate presentation view model", () => {
  it("normalizes GlobalEstimateResult sections into visible rows with metadata", () => {
    const viewModel = presentationForEstimate(estimateForRequest(REQUEST_PROMPTS.laminate));
    expect(viewModel.sections.length).toBeGreaterThanOrEqual(2);
    expect(viewModel.rows.length).toBeGreaterThan(8);
    expect(viewModel.rows.every((row) => row.sourceId && row.rateKey && row.displayTotal)).toBe(true);
    expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
    expect(viewModel.tax.taxLabel || viewModel.tax.warning).toBeTruthy();
  });
});
