import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 foreman route keeps estimate intent above role context", () => {
  const { matrix, results } = realWork1000Result();
  const foremanResults = results.filter((item) => item.route === "/ai?context=foreman");

  expect(matrix.foreman_cases_passed).toBe(500);
  expect(foremanResults).toHaveLength(500);
  expect(foremanResults.every((item) => item.estimateIntentPriorityPassed)).toBe(true);
  expect(foremanResults.every((item) => item.globalEstimateResultPresent && item.uiTableVisible)).toBe(true);
  expect(matrix.estimate_intent_lost_to_role_context).toBe(false);
});
