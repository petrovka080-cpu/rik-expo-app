import { runCanaryEvaluationRollbackRedrill } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("canary evaluation requires rollback redrill", () => {
  const drill = runCanaryEvaluationRollbackRedrill();
  expect(drill.rollback_redrill_passed).toBe(true);
  expect(drill.manual_request_still_works).toBe(true);
  expect(drill.catalog_picker_still_works).toBe(true);
  expect(drill.pdf_route_does_not_crash).toBe(true);
});
