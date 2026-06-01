import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "./finalReadinessTestHelpers";

it("requires final PDF proof with readable structured output", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.pdf_final_proof_passed).toBe(false);
    expect(matrix.pdf_mojibake_found).toBe(false);
    return;
  }

  expect(matrix.pdf_final_proof_passed).toBe(true);
  expect(matrix.pdf_mojibake_found).toBe(false);
});
