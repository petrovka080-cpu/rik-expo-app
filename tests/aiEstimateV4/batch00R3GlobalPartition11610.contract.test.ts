import { readJson } from "./batch00R3TestSupport";

test("keeps the 11610 partition exact and disjoint", () => {
  const value = readJson("01-population/M5_4005_POOL_PARTITION_PROOF.json");
  expect([value.globalCount, value.m1GlobalCount, value.m5Count, value.cumulativeCount, value.m6Count]).toEqual([11610, 55, 4005, 4060, 7550]);
  expect(value.intersections).toEqual({ m1M5: 0, m5M6: 0, cumulativeM6: 0 });
  expect([value.union, value.unassigned]).toEqual([11610, 0]);
});
