import { readJson } from "./postM1R2TestSupport";

test("admits GREEN with no unresolved repairable defect", () => {
  const provisional = readJson<any>("06-provisional/PROVISIONAL_POST_M1_READMISSION_VERDICT_V2.json");
  expect(provisional.unresolvedRepairableDefects).toBe(0);
  expect(provisional.repairAttempts).toBe(0);
  expect(provisional.verdict).toBe("GREEN_A6_PROVISIONAL_INDEPENDENT_READMISSION");
});
