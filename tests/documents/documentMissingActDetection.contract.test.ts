import { documentMatrix } from "./documentTestFixtures";

test("missing act is detected for invoice 45", () => {
  expect(documentMatrix().missing_act_detected).toBe(true);
});
