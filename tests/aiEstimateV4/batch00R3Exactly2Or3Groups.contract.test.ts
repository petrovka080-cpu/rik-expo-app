import { readJson } from "./batch00R3TestSupport";

test("selects exactly three groups and their exact union", () => {
  const value = readJson("02-selection/FIRST_BATCH_COMPOSITION_DECISION_R3.json");
  expect(value.orderedGroupIds).toHaveLength(3);
  expect(value.perGroupRecordCounts).toEqual([5, 5, 6]);
  expect(value.combinedRecordCount).toBe(16);
});
