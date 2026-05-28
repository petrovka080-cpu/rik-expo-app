import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no markdown as truth", () => {
  it("keeps PDF and UI on structured GlobalEstimateResult", () => {
    expect(readRepoFile("src/lib/estimatePdf/createEstimatePdf.ts")).toContain("structured GlobalEstimateResult");
    expect(readRepoFile("src/lib/ai/estimatePresentation/buildProfessionalEstimateTableViewModel.ts")).toContain("GlobalEstimateResult");
  });
});
