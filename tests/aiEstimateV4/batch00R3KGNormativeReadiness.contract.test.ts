import { readJson, readJsonl } from "./batch00R3TestSupport";

test("uses active KG status/rate routes with no draft owner", () => {
  const registry = readJson("04-normative-kg/OFFICIAL_KG_SOURCE_CANDIDATE_REGISTRY.json");
  const profiles = readJsonl("04-normative-kg/KG_NORMATIVE_READINESS_PROFILES_V3.jsonl");
  expect(registry.sources.map((row: any) => row.sourceId)).toEqual(expect.arrayContaining(["KG_SP_KR_65_101_2025", "KG_KRER_10_05_011"]));
  expect([registry.draftActiveOwnerCount, profiles.length]).toEqual([0, 3]);
  expect(profiles.every((row) => row.foreignMandatoryPromotionCount === 0 && row.readiness.startsWith("READY"))).toBe(true);
});
