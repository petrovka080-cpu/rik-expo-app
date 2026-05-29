import { real500Evaluation } from "./real500TestHelpers";

test("real 500 has no weak generic standalone BOQ rows", () => {
  expect(real500Evaluation().cases.some((item) => item.forbiddenRowsFound.length > 0)).toBe(false);
});
