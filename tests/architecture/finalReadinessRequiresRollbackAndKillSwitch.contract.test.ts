import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("requires rollback and kill switch readiness together", () => {
  const matrix = finalReadinessReport().matrix;
  expect(matrix.rollback_ready).toBe(true);
  expect(matrix.kill_switch_ready).toBe(true);
});
