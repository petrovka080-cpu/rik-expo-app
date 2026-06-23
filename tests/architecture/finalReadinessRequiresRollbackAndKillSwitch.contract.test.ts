import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "../finalReadiness/finalReadinessTestHelpers";

it("requires rollback and kill switch readiness together", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.rollback_ready).toBe(false);
    expect(matrix.kill_switch_ready).toBe(false);
    return;
  }

  expect(matrix.rollback_ready).toBe(true);
  expect(matrix.kill_switch_ready).toBe(true);
});
