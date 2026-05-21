import { mediaMatrix } from "../media/mediaTestFixtures";

test("AI media cannot publish marketplace product", () => {
  expect(mediaMatrix().marketplace_product_published_by_ai).toBe(false);
});
