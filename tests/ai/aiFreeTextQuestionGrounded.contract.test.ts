import { groundedFreeTextTrace } from "./aiGroundedQaTestHarness";

describe("AI free text grounded answers", () => {
  it("answers direct and typo questions from grounded sources and clarifies ambiguous ones", () => {
    for (const entry of groundedFreeTextTrace()) {
      expect(entry.resultGrounded).toBe(true);
      expect(entry.hasSources).toBe(true);
      if (entry.kind === "ambiguous") {
        expect(entry.clarifyingQuestionShown).toBe(true);
      }
    }
  });
});
