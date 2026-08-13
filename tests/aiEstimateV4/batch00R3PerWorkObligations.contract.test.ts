import { readJsonl } from "./batch00R3TestSupport";

test("creates three individually hashed obligation records per work", () => {
  const identity = readJsonl("07-obligations/BATCH001_WORK_IDENTITY_CONTEXT_INDEX.jsonl");
  const normative = readJsonl("07-obligations/BATCH001_WORK_NORMATIVE_PROOF_OBLIGATION_INDEX.jsonl");
  const professional = readJsonl("07-obligations/BATCH001_WORK_PROFESSIONAL_PROOF_OBLIGATION_INDEX.jsonl");
  const expectedScope = readJsonl("07-obligations/BATCH001_WORK_EXPECTED_SCOPE_RESEARCH_INDEX.jsonl");
  expect([identity.length, normative.length, professional.length, expectedScope.length]).toEqual([16, 16, 16, 16]);
  expect(new Set(normative.map((row) => row.catalogId))).toEqual(new Set(identity.map((row) => row.catalogId)));
  expect(professional.every((row) => row.obligationHash)).toBe(true);
});
