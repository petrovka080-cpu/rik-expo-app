import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "./finalReadinessTestHelpers";

it("requires Android API34 final smoke and rejects API36", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.android_api34_passed).toBe(false);
    expect(matrix.api36_rejected).toBe(false);
    return;
  }

  expect(matrix.android_api34_passed).toBe(true);
  expect(matrix.api36_rejected).toBe(true);
});
