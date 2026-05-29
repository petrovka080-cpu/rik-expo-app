import { real500Evaluation } from "./real500TestHelpers";

test("real 500 material rows are bound to catalog item keys", () => {
  expect(real500Evaluation().cases.every((item) => item.catalogBindingPassed)).toBe(true);
});
