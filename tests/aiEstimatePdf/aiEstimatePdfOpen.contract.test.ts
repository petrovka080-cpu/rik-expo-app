import { generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF open contract", () => {
  it("returns the existing /pdf-viewer route as open boundary", () => {
    const result = generateAiEstimatePdf({ source: buildAiEstimatePdfSourceFixture(), userConfirmed: true });

    expect(result.openAction.route).toBe("/pdf-viewer");
    expect(result.openAction.sourceKind).toBe("signed-url");
  });
});
