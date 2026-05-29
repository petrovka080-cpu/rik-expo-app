import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not enable production rollout in final readiness", () => {
  expect(finalReadinessReport().matrix.production_rollout_enabled).toBe(false);
});

