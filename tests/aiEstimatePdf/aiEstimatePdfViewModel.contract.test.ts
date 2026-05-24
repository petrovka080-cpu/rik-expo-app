import { buildAiEstimatePdfViewModel } from "../../src/lib/aiEstimatePdf";
import { buildSafeIntegrationEstimate } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF view model", () => {
  it("maps GlobalEstimateResult rows without recalculating them", () => {
    const estimate = buildSafeIntegrationEstimate();
    const viewModel = buildAiEstimatePdfViewModel({
      estimate,
      runtimeTraceId: "view-model-contract",
      route: "/chat",
      generatedAt: "2026-05-24T00:00:00.000Z",
      documentMode: "estimate",
    });
    expect(viewModel.rows).toHaveLength(estimate.sections.flatMap((section) => section.rows).length);
    expect(viewModel.estimateId).toBe(estimate.estimateId);
    expect(viewModel.runtimeTraceId).toBe("view-model-contract");
  });
});
