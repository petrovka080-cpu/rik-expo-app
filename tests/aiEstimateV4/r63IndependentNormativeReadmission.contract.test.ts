import { jsonlLines, readJson } from "./postM1R2TestSupport";

test("keeps status, applicability, text and locator roles separated", () => {
  const roles = jsonlLines("03-normative/SOURCE_ROLE_RECOUNT.jsonl");
  const scan = readJson<any>("03-normative/NORMATIVE_CONTRADICTION_SCAN.json");
  expect(new Set(roles.map((entry) => entry.role))).toEqual(new Set(["KG_STATUS_OWNER", "KG_APPLICABILITY_OWNER", "TEXT_IDENTITY_OWNER", "AUTHENTICATED_TEXT_CARRIER", "CLAUSE_LOCATOR_MAP", "KG_ESTIMATE_RATE_PRIMARY", "KG_STANDARD_IDENTITY_STATUS", "EAEU_MANDATORY_SAFETY", "FOREIGN_COMPARATIVE_ONLY"]));
  expect(scan).toMatchObject({ selectedRoute: "B", unresolvedOfficialContradictions: 0, draftActiveOwners: 0, foreignPromotedToKgMandatory: 0, locatorCount: 423 });
});
