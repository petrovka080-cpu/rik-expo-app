import { evaluateFeedbackFromSessions } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("feedback evaluation blocks confirmed wrong work feedback", () => {
  const result = evaluateFeedbackFromSessions([{
    feedbackIssues: ["wrong_work"],
    runtimeTraceId: "trace_feedback_wrong_work",
  }]);
  expect(result.passed).toBe(false);
  expect(result.recommended_action).toBe("NO_GO_ROLLBACK_AND_FIX");
  expect(result.issues).toContain("WRONG_WORK_FEEDBACK_CONFIRMED");
});
