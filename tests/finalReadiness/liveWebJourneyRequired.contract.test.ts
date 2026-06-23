import {
  expectFinalReadinessScopedOutForCurrentIosTestFlight,
  finalReadinessReport,
} from "./finalReadinessTestHelpers";

it("requires live web journey proof before GO", () => {
  const matrix = finalReadinessReport().matrix;
  if (expectFinalReadinessScopedOutForCurrentIosTestFlight(matrix)) {
    expect(matrix.live_web_journey_passed).toBe(false);
    return;
  }

  expect(matrix.live_web_journey_passed).toBe(true);
});
