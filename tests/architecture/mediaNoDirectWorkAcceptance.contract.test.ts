import { mediaMatrix } from "../media/mediaTestFixtures";

test("AI media cannot accept or close work", () => {
  expect(mediaMatrix().work_closed_by_ai).toBe(false);
});
