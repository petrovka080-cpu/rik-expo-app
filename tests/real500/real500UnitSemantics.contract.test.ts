import { real500Evaluation } from "./real500TestHelpers";

test("real 500 unit semantics are valid", () => {
  expect(real500Evaluation().cases.every((item) => item.unitSemanticsPassed)).toBe(true);
});
