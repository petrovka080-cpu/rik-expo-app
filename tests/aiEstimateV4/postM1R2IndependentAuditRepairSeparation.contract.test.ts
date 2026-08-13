import { readJson } from "./postM1R2TestSupport";

test("keeps frozen target and repair verdict ownership separated", () => {
  const admission = readJson<any>("06-provisional/FINAL_PRE_REBASE_INDEPENDENT_ADMISSION.json");
  expect(admission.auditorTargetMutation).toBe(0);
  expect(admission.candidateWorktreeClean).toBe(true);
  expect(admission.rawEvidence.scope).toMatch(/^01-scope\//u);
});
