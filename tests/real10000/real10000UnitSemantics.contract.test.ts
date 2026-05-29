import { real10000Evaluation } from "./real10000TestHelpers";

test("real 10000 unit semantics pass for every case", () => {
  expect(real10000Evaluation().cases.every((item) => item.unitSemanticsPassed)).toBe(true);
});
