import { readJson } from "./batch00R3TestSupport";

test("binds every production projection to a current exact owner", () => {
  const value = readJson("08-architecture/BATCH001_PRODUCTION_OWNER_MAP_V3.json");
  expect(value.owners.length).toBeGreaterThanOrEqual(11);
  expect(value.owners.every((row: any) => row.path && /^[a-f0-9]{64}$/u.test(row.sha256) && row.mutationAuthorizedInBatch00 === false)).toBe(true);
  expect([value.ownerGapCount, value.contentMutationCount]).toEqual([0, 0]);
});
