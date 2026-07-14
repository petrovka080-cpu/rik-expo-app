import { createAiRuntimeKernel } from "../kernel/createAiRuntimeKernel";
import { AI_RUNTIME_KERNEL_VERSION } from "../kernel/AiRuntimeKernelContract";
import { InMemoryAiModelProvider } from "../providers/InMemoryAiModelProvider";
import type { AiEvalCase, AiEvalResult, AiEvalRunnerOptions } from "./AiEvalContract";
import { extractAiEvalActual, inferAiEvalPolicyStatus } from "./extractAiEvalActual";
import { explainAiEvalScoreRu } from "./explainAiEvalScore";
import { scoreAiEstimateEvalResult } from "./scoreAiEstimateEvalResult";
import { validateAiEvalCaseShape } from "./AiEvalCase";
import { validateAiGrounding } from "./validateAiGrounding";

export const AI_EVAL_PROMPT_VERSION = "ai-platform-evalops-prompt-v1" as const;

export async function runAiEvalCase(testCase: AiEvalCase, options: AiEvalRunnerOptions): Promise<AiEvalResult> {
  const shape = validateAiEvalCaseShape(testCase);
  if (!shape.ok) {
    const now = new Date().toISOString();
    return {
      evalRunId: options.evalRunId,
      caseId: testCase.caseId,
      caseVersion: testCase.version,
      sourceSha: options.sourceSha,
      runtimeVersion: options.runtimeVersion,
      promptVersion: options.promptVersion,
      providerKey: options.providerKey ?? "blocked",
      modelKey: options.modelKey ?? "blocked",
      surface: testCase.surface,
      role: testCase.role,
      status: "blocked",
      score: 0,
      scoreBreakdown: {
        work_classification_score: 0,
        parameter_extraction_score: 0,
        parameter_passport_score: 0,
        missing_input_score: 0,
        boq_dependency_score: 0,
        quantity_trace_score: 0,
        russian_ui_score: 0,
        policy_compliance_score: 0,
        pii_redaction_score: 0,
        determinism_score: 0,
      },
      scoreExplanationRu: "Eval case некорректен.",
      actual: {
        parameterKeys: [],
        boqFamilies: [],
        missingQuestionsRu: [],
        policyStatus: inferAiEvalPolicyStatus(testCase),
        userVisibleAnswerRu: "",
        durationMs: 0,
        providerKey: options.providerKey ?? "blocked",
        modelKey: options.modelKey ?? "blocked",
      },
      expected: testCase.expected,
      groundingPassed: false,
      piiRedactionPassed: false,
      rawInternalIdsVisible: false,
      deterministicContractPassed: false,
      driftDetected: false,
      blockers: shape.blockers,
      cost: { durationMs: 0 },
      createdAt: now,
    };
  }

  const providerKey = options.providerKey ?? "eval_in_memory_provider";
  const modelKey = options.modelKey ?? "eval-contract-model";
  const kernel = createAiRuntimeKernel({ provider: new InMemoryAiModelProvider(providerKey) });
  const started = Date.now();
  const result = await kernel.run({
    flowId: `${options.evalRunId}:${testCase.caseId}`,
    role: testCase.role,
    surface: testCase.surface,
    intent: `eval:${testCase.caseId}`,
    userText: testCase.input.userText,
    contextRef: testCase.input.contextRefs,
    mode: inferAiEvalPolicyStatus(testCase),
    sourceSha: options.sourceSha,
    runtimeVersion: options.runtimeVersion,
  });
  const durationMs = Math.max(1, Date.now() - started);
  const answer = result.userVisibleAnswerRu ?? "Нужно уточнить исходные данные для сметы.";
  const actual = extractAiEvalActual(testCase, {
    answerRu: answer,
    durationMs,
    providerKey: result.diagnostics?.providerKey ?? providerKey,
    modelKey: result.diagnostics?.modelKey ?? modelKey,
    outputTokens: result.diagnostics?.budgetUsed.inputChars ? 16 : undefined,
  });
  const grounding = validateAiGrounding({
    text: answer,
    missingPrice: testCase.tags?.includes("missing_price"),
    insufficientInput: Boolean(testCase.expected.expectedMissingQuestionsRu?.length),
  });
  const piiRedactionPassed = !/(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d|sk-[A-Za-z0-9_-]{12,})/i.test(answer);
  const rawInternalIdsVisible = !grounding.raw_internal_ids_not_visible;
  const deterministicContractPassed = Boolean(result.flowId && result.status && actual.policyStatus);
  const scored = scoreAiEstimateEvalResult(testCase, actual, {
    piiRedactionPassed,
    rawInternalIdsVisible,
    deterministicContractPassed,
    groundingPassed: grounding.ok,
  });
  const blockers = [
    scored.score >= testCase.qualityGates.minScore ? "" : "score_below_min",
    testCase.qualityGates.requiresGrounding && !grounding.ok ? "grounding_failed" : "",
    testCase.qualityGates.requiresNoPiiLeak && !piiRedactionPassed ? "pii_leak" : "",
    testCase.qualityGates.requiresNoRawInternalIds && rawInternalIdsVisible ? "raw_internal_ids_visible" : "",
    testCase.qualityGates.requiresDeterministicContract && !deterministicContractPassed ? "determinism_failed" : "",
  ].filter(Boolean);
  return {
    evalRunId: options.evalRunId,
    caseId: testCase.caseId,
    caseVersion: testCase.version,
    sourceSha: options.sourceSha,
    runtimeVersion: options.runtimeVersion || AI_RUNTIME_KERNEL_VERSION,
    promptVersion: options.promptVersion || AI_EVAL_PROMPT_VERSION,
    providerKey: actual.providerKey,
    modelKey: actual.modelKey,
    surface: testCase.surface,
    role: testCase.role,
    status: blockers.length === 0 ? "passed" : "failed",
    score: scored.score,
    scoreBreakdown: scored.scoreBreakdown,
    scoreExplanationRu: explainAiEvalScoreRu(scored.score, scored.scoreBreakdown),
    actual,
    expected: testCase.expected,
    groundingPassed: grounding.ok,
    piiRedactionPassed,
    rawInternalIdsVisible,
    deterministicContractPassed,
    driftDetected: false,
    blockers,
    cost: {
      inputTokens: actual.inputTokens,
      outputTokens: actual.outputTokens,
      estimatedCost: ((actual.inputTokens ?? 0) + (actual.outputTokens ?? 0)) / 1_000_000,
      durationMs,
    },
    createdAt: new Date().toISOString(),
  };
}

export async function runAiEvalCases(cases: readonly AiEvalCase[], options: AiEvalRunnerOptions): Promise<AiEvalResult[]> {
  const results: AiEvalResult[] = [];
  for (const testCase of cases) results.push(await runAiEvalCase(testCase, options));
  return results;
}
