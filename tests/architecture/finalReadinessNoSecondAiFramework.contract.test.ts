import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not create a second AI framework in final readiness", () => {
  expect(finalReadinessReport().matrix.second_ai_framework_created).toBe(false);
});

