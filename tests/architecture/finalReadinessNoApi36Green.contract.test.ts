import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not allow API36 as final readiness Android green", () => {
  const matrix = finalReadinessReport().matrix;
  expect(matrix.api36_rejected).toBe(true);
  expect(matrix.android_api34_passed).toBe(true);
});

