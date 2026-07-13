import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "../finalReadiness/finalReadinessTestHelpers";

it("does not allow API36 as final readiness Android green", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.android_api34_passed).toBe(false);
    expect(matrix.api36_rejected).toBe(false);
    return;
  }

  expect(matrix.api36_rejected).toBe(true);
  expect(matrix.android_api34_passed).toBe(true);
});
