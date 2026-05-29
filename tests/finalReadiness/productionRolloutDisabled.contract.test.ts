import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("keeps public production rollout disabled at final readiness", () => {
  const matrix = finalReadinessReport().matrix;
  expect(matrix.production_rollout_enabled).toBe(false);
  expect(matrix.public_rollout_enabled).toBe(false);
});

