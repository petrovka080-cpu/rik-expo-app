import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not add inline rows in screens for final readiness", () => {
  expect(finalReadinessReport().matrix.inline_rows_found).toBe(false);
});

