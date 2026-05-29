import { real10000Evaluation } from "./real10000TestHelpers";

test("real 10000 material rows use catalog binding", () => {
  expect(real10000Evaluation().cases.every((item) => item.catalogBindingPassed)).toBe(true);
});
