import { mapAiEstimatePdfSourceToExistingConsumerPdfModel } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF model mapper contract", () => {
  it("maps structured estimate rows into the existing consumer PDF model", () => {
    const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(buildAiEstimatePdfSourceFixture());

    expect(model.draft.problemText).toContain("ламинат");
    expect(model.items.some((item) => item.itemType === "material")).toBe(true);
    expect(model.items.some((item) => item.itemType === "work")).toBe(true);
    expect(model.supplement.taxStatus).toContain("Налоговый статус");
  });
});
