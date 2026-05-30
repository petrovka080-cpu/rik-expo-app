import { evaluateRealUsageSessions } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("real usage evaluation blocks weak generic rows", () => {
  const result = evaluateRealUsageSessions([{
    classification: "WEAK_GENERIC_ROWS_FOUND",
    failures: ["WEAK_GENERIC_ROWS_FOUND"],
    telemetryValid: true,
    feedbackValid: true,
  }]);
  expect(result.passed).toBe(false);
  expect(result.issues).toContain("WEAK_GENERIC_ROWS_FOUND");
});
