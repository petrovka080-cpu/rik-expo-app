import { assertAiEstimatePdfSource } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF structured payload contract", () => {
  it("uses sections and rows from structured estimate payload", () => {
    const source = buildAiEstimatePdfSourceFixture();

    assertAiEstimatePdfSource(source);
    expect(source.estimate.sections.length).toBeGreaterThanOrEqual(2);
    expect(source.estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThan(0);
  });
});
