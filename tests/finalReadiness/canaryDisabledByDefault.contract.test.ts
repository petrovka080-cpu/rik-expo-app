import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("keeps internal canary disabled by default while proving readiness", () => {
  const matrix = finalReadinessReport().matrix;
  expect(matrix.internal_canary_ready).toBe(true);
  expect(matrix.internal_canary_enabled).toBe(false);
});

