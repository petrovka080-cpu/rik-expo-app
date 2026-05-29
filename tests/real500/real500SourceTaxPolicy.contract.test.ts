import { real500Evaluation } from "./real500TestHelpers";

test("real 500 priced rows have source evidence and tax or local warning", () => {
  const results = real500Evaluation().cases;
  expect(results.every((item) => item.sourceEvidencePassed)).toBe(true);
  expect(results.every((item) => item.taxWarningPassed)).toBe(true);
});
