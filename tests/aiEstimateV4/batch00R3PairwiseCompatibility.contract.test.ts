import { readJson } from "./batch00R3TestSupport";

test("all six unordered/self pairs are compatible", () => {
  const value = readJson("02-selection/BATCH00_R3_PAIRWISE_COMPATIBILITY_MATRIX.json");
  expect(value.entries).toHaveLength(6);
  expect(value.entries.every((row: any) => row.compatible)).toBe(true);
  expect(value.incompatiblePairs).toBe(0);
});
