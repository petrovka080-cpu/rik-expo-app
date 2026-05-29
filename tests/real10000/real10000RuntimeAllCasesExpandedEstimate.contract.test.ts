import { real10000Evaluation, real10000Summary } from "./real10000TestHelpers";

test("real 10000 runtime returns expanded estimates for all cases", () => {
  const evaluation = real10000Evaluation();
  const summary = real10000Summary();
  expect(summary.cases_total).toBe(10_000);
  expect(summary.cases_passed).toBe(10_000);
  expect(evaluation.failures).toEqual([]);
});
