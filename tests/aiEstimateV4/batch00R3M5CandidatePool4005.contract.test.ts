import { readJson, readJsonl } from "./batch00R3TestSupport";

test("restores all 4005 M5 members before selecting", () => {
  const pool = readJson("01-population/M5_4005_GROUP_CANDIDATE_POOL.json");
  const members = readJsonl("01-population/M5_4005_MEMBER_INDEX.jsonl");
  expect(pool.memberCount).toBe(4005);
  expect(pool.groupCount).toBe(787);
  expect(new Set(members.map((row) => row.catalogId)).size).toBe(4005);
  expect(members.every((row) => row.passportHash && row.memberEvidenceHash)).toBe(true);
});
