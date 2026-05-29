import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires final PDF proof with readable structured output", () => {
  const matrix = finalReadinessReport().matrix;
  expect(matrix.pdf_final_proof_passed).toBe(true);
  expect(matrix.pdf_mojibake_found).toBe(false);
});

