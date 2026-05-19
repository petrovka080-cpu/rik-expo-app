import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI grounded answers no generic copy", () => {
  it("rejects generic visible text for buttons and typed questions", () => {
    const matrix = groundedQaMatrix();
    expect(matrix.generic_answers_found).toBe(0);
    expect(matrix.ai_collects_this_block_copy_found).toBe(0);
    for (const entry of [...groundedButtonTrace(), ...groundedFreeTextTrace()]) {
      expect(entry.genericAnswer).toBe(false);
    }
  });
});
