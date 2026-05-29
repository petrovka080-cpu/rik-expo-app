import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not add screen-local calculation in final readiness", () => {
  expect(finalReadinessReport().matrix.screen_local_calculation_found).toBe(false);
});

