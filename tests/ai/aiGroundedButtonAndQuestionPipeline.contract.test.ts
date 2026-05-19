import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("grounded button and question pipeline", () => {
  it("routes buttons and typed questions through one grounded answer pipeline", () => {
    const matrix = groundedQaMatrix();
    expect(matrix.existing_screenMagic_extended_only).toBe(true);
    expect(matrix.all_button_results_grounded).toBe(true);
    expect(matrix.free_text_questions_answered_from_grounding_pipeline).toBe(true);
    expect(groundedButtonTrace()).not.toHaveLength(0);
    expect(groundedFreeTextTrace()).not.toHaveLength(0);
  });
});
