import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires every prerequisite matrix to be green in the final readiness ledger", () => {
  const report = finalReadinessReport();
  expect(report.matrix.matrix_ledger_passed).toBe(true);
  expect(report.matrix.all_prerequisites_green).toBe(true);
  expect(report.matrices.every((item) => item.green && !item.fake_green_claimed)).toBe(true);
});

