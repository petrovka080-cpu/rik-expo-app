import { mediaMatrix } from "../media/mediaTestFixtures";

test("AI media cannot mutate warehouse stock", () => {
  expect(mediaMatrix().warehouse_stock_mutated_by_ai).toBe(false);
});
