import { real10000Evaluation } from "./real10000TestHelpers";

test("real 10000 priced rows and estimates carry source and tax policy", () => {
  const cases = real10000Evaluation().cases;
  expect(cases.every((item) => item.sourceEvidencePassed)).toBe(true);
  expect(cases.every((item) => item.taxWarningPassed)).toBe(true);
});
