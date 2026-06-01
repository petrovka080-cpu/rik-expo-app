import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "./finalReadinessTestHelpers";

it("requires rollback readiness before final readiness GO", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.rollback_ready).toBe(false);
    return;
  }

  expect(matrix.rollback_ready).toBe(true);
});
