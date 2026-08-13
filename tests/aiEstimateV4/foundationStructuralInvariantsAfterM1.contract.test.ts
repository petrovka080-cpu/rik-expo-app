import { readJson } from "./postM1R2TestSupport";

test("preserves exact Foundation identity, taxonomy and passport structure", () => {
  const recount = readJson<any>("02-recount/FOUNDATION_STRUCTURAL_RECOUNT.json");
  expect(recount).toMatchObject({ identities: 11610, uniqueIdentities: 11610, semanticGroups: 2368, groupUnion: 11610, groupOverlap: 0, groupUnassigned: 0, passports: 11610 });
  expect(recount.identityRoles).toEqual({ ALIAS: 18, PRIMARY: 2395, VARIANT: 9197 });
});
