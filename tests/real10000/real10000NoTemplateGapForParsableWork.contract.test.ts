import { real10000Evaluation } from "./real10000TestHelpers";

test("real 10000 has no template gap for parsable work", () => {
  expect(real10000Evaluation().cases.some((item) => item.failures.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK"))).toBe(false);
});
