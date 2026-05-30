import { evaluateRealUsageSessions } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("real usage evaluation blocks object misclassification", () => {
  const result = evaluateRealUsageSessions([{
    classification: "OBJECT_SCOPE_MISCLASSIFIED",
    failures: ["OBJECT_SCOPE_MISCLASSIFIED"],
    telemetryValid: true,
    feedbackValid: true,
  }]);
  expect(result.passed).toBe(false);
  expect(result.issues).toContain("OBJECT_MISCLASSIFICATION_FOUND");
});
