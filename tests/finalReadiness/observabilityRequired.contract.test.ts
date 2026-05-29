import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires observability before final readiness GO", () => {
  expect(finalReadinessReport().matrix.observability_ready).toBe(true);
});

