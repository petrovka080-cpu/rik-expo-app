import { readJson } from "./batch00R3TestSupport";

test("forbids execution and all outside-manifest scope", () => {
  const value = readJson("09-manifest/BATCH001_SCOPE_GUARD_V3.json");
  expect(value.AUTHORIZED_GROUP_IDS).toHaveLength(3);
  expect(value.AUTHORIZED_CATALOG_IDS).toHaveLength(16);
  expect([value.OUTSIDE_SCOPE_MUTATION, value.NEXT_BATCH_SELECTION, value.M6_ELECTRICAL, value.EXECUTION_WITHOUT_EXACT_AUTHORIZATION]).toEqual(["FORBIDDEN", "FORBIDDEN", "FORBIDDEN", "FORBIDDEN"]);
  expect(value.executionStarted).toBe(false);
});
