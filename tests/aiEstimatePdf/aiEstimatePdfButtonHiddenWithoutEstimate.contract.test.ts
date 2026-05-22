import { buildAiEstimatePdfActions } from "../../src/lib/ai/estimatePdf";

describe("AI estimate PDF hidden without estimate contract", () => {
  it("does not show PDF actions without structured estimate payload", () => {
    expect(buildAiEstimatePdfActions(null)).toEqual([]);
    expect(buildAiEstimatePdfActions(undefined)).toEqual([]);
  });
});
