import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "./finalReadinessTestHelpers";

it("requires AI estimate kill switches before final readiness GO", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.kill_switch_ready).toBe(false);
    return;
  }

  expect(matrix.kill_switch_ready).toBe(true);
});
