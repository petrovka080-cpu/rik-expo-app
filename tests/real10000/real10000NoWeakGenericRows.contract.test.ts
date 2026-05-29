import { real10000Evaluation } from "./real10000TestHelpers";

test("real 10000 has no weak generic BOQ rows", () => {
  expect(real10000Evaluation().cases.some((item) => item.failures.includes("WEAK_GENERIC_BOQ_ROWS"))).toBe(false);
});
