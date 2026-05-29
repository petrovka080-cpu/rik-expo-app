import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires rollback readiness before final readiness GO", () => {
  expect(finalReadinessReport().matrix.rollback_ready).toBe(true);
});

