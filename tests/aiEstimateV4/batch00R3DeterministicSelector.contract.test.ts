import { readJson } from "./batch00R3TestSupport";

test("uses frozen identity and dependency inputs, never regex ranking", () => {
  const policy = readJson("02-selection/BATCH00_R3_SELECTION_POLICY_V1.json");
  const queue = readJson("01-population/M5_4005_QUEUE_ORDER.json");
  expect(policy.keywordOrRegexSelectionPermitted).toBe(false);
  expect(queue.keywordSortingUsed).toBe(false);
  expect(queue.entries.slice(0, 2).map((row: any) => row.queuePosition)).toEqual([1, 2]);
});
