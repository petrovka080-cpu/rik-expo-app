import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI grounded answer sources", () => {
  it("shows source traces for every answer", () => {
    const matrix = groundedQaMatrix();
    expect(matrix.answers_without_sources_found).toBe(0);
    expect(matrix.source_chips_visible).toBe(true);
    for (const entry of [...groundedButtonTrace(), ...groundedFreeTextTrace()]) {
      expect(entry.hasSources).toBe(true);
      expect(entry.sourceSectionVisible).toBe(true);
      expect(entry.groundedAnswer.facts.length).toBeGreaterThan(0);
    }
  });
});
