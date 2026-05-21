import { mediaMatrix } from "../media/mediaTestFixtures";

test("AI media cannot final-link documents", () => {
  expect(mediaMatrix().document_final_linked_by_ai).toBe(false);
});
