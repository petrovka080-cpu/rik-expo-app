import type { AiEvalCase } from "./AiEvalContract";

export const AI_EVAL_CASE_SCHEMA_VERSION = "ai-eval-case-v1" as const;

export function validateAiEvalCaseShape(testCase: AiEvalCase): { ok: boolean; blockers: string[] } {
  const blockers = [
    testCase.caseId ? "" : "case_id_missing",
    testCase.version ? "" : "case_version_missing",
    testCase.surface ? "" : "surface_missing",
    testCase.role ? "" : "role_missing",
    testCase.input.userText.trim() ? "" : "user_text_missing",
    Number.isFinite(testCase.qualityGates.minScore) ? "" : "min_score_missing",
  ].filter(Boolean);
  return { ok: blockers.length === 0, blockers };
}

export function aiEvalCasesAreVersioned(cases: readonly AiEvalCase[]): boolean {
  return cases.length > 0 && cases.every((testCase) => Boolean(testCase.version));
}
