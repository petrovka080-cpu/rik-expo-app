import { real500Evaluation, real500Summary } from "./real500TestHelpers";

test("real 500 runtime returns expanded estimates for all cases", () => {
  const evaluation = real500Evaluation();
  const summary = real500Summary();
  expect(summary.cases_total).toBe(500);
  expect(summary.cases_passed).toBe(500);
  expect(evaluation.failures).toEqual([]);
});
