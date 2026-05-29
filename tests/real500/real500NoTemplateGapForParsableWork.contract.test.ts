import { real500Evaluation } from "./real500TestHelpers";

test("real 500 has no template gap for parsable work", () => {
  expect(real500Evaluation().cases.some((item) => item.failures.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK"))).toBe(false);
});
