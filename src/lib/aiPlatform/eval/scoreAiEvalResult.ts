import type { AiEvalActual, AiEvalCase, AiEvalScoreBreakdown } from "./AiEvalContract";

function ratio(matched: number, total: number): number {
  return total === 0 ? 1 : matched / total;
}

function containsCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value);
}

export function scoreAiEvalResult(testCase: AiEvalCase, actual: AiEvalActual, input: {
  piiRedactionPassed: boolean;
  rawInternalIdsVisible: boolean;
  deterministicContractPassed: boolean;
  groundingPassed: boolean;
}): AiEvalScoreBreakdown {
  const required = testCase.expected.requiredParameterKeys ?? [];
  const forbidden = testCase.expected.forbiddenParameterKeys ?? [];
  const expectedBoq = testCase.expected.expectedBoqFamilies ?? [];
  const expectedMissing = testCase.expected.expectedMissingQuestionsRu ?? [];
  const mustContain = testCase.expected.mustContainRu ?? [];
  const mustNotContain = testCase.expected.mustNotContainRu ?? [];
  const requiredMatched = required.filter((key) => actual.parameterKeys.includes(key)).length;
  const forbiddenAbsent = forbidden.filter((key) => !actual.parameterKeys.includes(key)).length;
  const boqMatched = expectedBoq.filter((family) => actual.boqFamilies.includes(family)).length;
  const missingMatched = expectedMissing.filter((question) => actual.missingQuestionsRu.includes(question)).length;
  const mustContainMatched = mustContain.filter((text) => actual.userVisibleAnswerRu.includes(text)).length;
  const mustNotContainAbsent = mustNotContain.filter((text) => !actual.userVisibleAnswerRu.includes(text)).length;
  const parameterScore = (ratio(requiredMatched, required.length) + ratio(forbiddenAbsent, forbidden.length)) / 2;
  return {
    work_classification_score: testCase.expected.workFamily ? Number(actual.workFamily === testCase.expected.workFamily) : 1,
    parameter_extraction_score: parameterScore,
    parameter_passport_score: parameterScore,
    missing_input_score: ratio(missingMatched, expectedMissing.length),
    boq_dependency_score: ratio(boqMatched, expectedBoq.length),
    quantity_trace_score: required.length === 0 ? 1 : Number(requiredMatched === required.length),
    russian_ui_score: containsCyrillic(actual.userVisibleAnswerRu) || actual.userVisibleAnswerRu.length === 0 ? 1 : 0,
    policy_compliance_score: testCase.expected.expectedPolicyStatus ? Number(actual.policyStatus === testCase.expected.expectedPolicyStatus) : 1,
    pii_redaction_score: Number(input.piiRedactionPassed && !input.rawInternalIdsVisible && input.groundingPassed && ratio(mustContainMatched, mustContain.length) === 1 && ratio(mustNotContainAbsent, mustNotContain.length) === 1),
    determinism_score: Number(input.deterministicContractPassed),
  };
}

export function totalAiEvalScore(breakdown: AiEvalScoreBreakdown): number {
  const scores = Object.values(breakdown);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
