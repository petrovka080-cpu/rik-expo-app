import { mapAiEstimatePdfSourceToExistingConsumerPdfModel } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF dangerous work safety contract", () => {
  it("carries specialist warning into PDF supplement for dangerous work", () => {
    const source = buildAiEstimatePdfSourceFixture();
    source.estimate.costIncreaseFactors.push("Опасные electrical/gas работы требуют specialist review.");

    const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(source);

    expect(model.supplement.safetyMessage).toContain("специалиста");
  });
});
