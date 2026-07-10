import path from "node:path";

import type { AiEvalResult } from "../../src/lib/aiPlatform/eval/AiEvalContract";
import { compareAiEvalRuns } from "../../src/lib/aiPlatform/eval/compareAiEvalRuns";
import { summarizeAiEvalResults } from "../../src/lib/aiPlatform/eval/AiEvalResult";
import { currentGitState, AI_PLATFORM_EVALOPS_ROOT, timestampForPath, writeJson } from "./evalOpsAuditUtils";

export const GREEN_AI_QUALITY_DRIFT_AUDIT = "GREEN_AI_QUALITY_DRIFT_AUDIT" as const;
export const STOP_AI_QUALITY_DRIFT_AUDIT_FAILED = "STOP_AI_QUALITY_DRIFT_AUDIT_FAILED" as const;

function baseResult(sourceSha: string): AiEvalResult {
  return {
    evalRunId: "drift-a",
    caseId: "drift-case",
    caseVersion: "v1",
    sourceSha,
    runtimeVersion: "ai-platform-kernel-v1",
    promptVersion: "ai-platform-evalops-prompt-v1",
    providerKey: "provider-a",
    modelKey: "model-a",
    surface: "estimate",
    role: "consumer",
    status: "passed",
    score: 1,
    scoreBreakdown: {
      work_classification_score: 1,
      parameter_extraction_score: 1,
      parameter_passport_score: 1,
      missing_input_score: 1,
      boq_dependency_score: 1,
      quantity_trace_score: 1,
      russian_ui_score: 1,
      policy_compliance_score: 1,
      pii_redaction_score: 1,
      determinism_score: 1,
    },
    scoreExplanationRu: "ok",
    actual: {
      workFamily: "fence",
      parameterKeys: ["length_m", "height_m"],
      boqFamilies: ["fence"],
      missingQuestionsRu: ["Уточните высоту"],
      policyStatus: "draft_only",
      userVisibleAnswerRu: "Черновик готов.",
      durationMs: 100,
      providerKey: "provider-a",
      modelKey: "model-a",
    },
    expected: {},
    groundingPassed: true,
    piiRedactionPassed: true,
    rawInternalIdsVisible: false,
    deterministicContractPassed: true,
    driftDetected: false,
    blockers: [],
    cost: { durationMs: 100 },
    createdAt: "2026-07-10T00:00:00.000Z",
  };
}

export function auditAiQualityDrift(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const previousResult = baseResult(git.source_sha);
  const nextResult: AiEvalResult = {
    ...previousResult,
    evalRunId: "drift-b",
    score: 0.8,
    actual: {
      ...previousResult.actual,
      workFamily: "road_construction",
      parameterKeys: ["width_m"],
      boqFamilies: ["road_construction"],
      missingQuestionsRu: ["Уточните ширину"],
      policyStatus: "approval_required",
      durationMs: 600,
    },
    cost: { durationMs: 600 },
  };
  const previous = summarizeAiEvalResults({
    evalRunId: "drift-a",
    sourceSha: git.source_sha,
    runtimeVersion: "ai-platform-kernel-v1",
    promptVersion: "ai-platform-evalops-prompt-v1",
    providerKey: "provider-a",
    modelKey: "model-a",
    results: [previousResult],
  });
  const next = summarizeAiEvalResults({
    evalRunId: "drift-b",
    sourceSha: git.source_sha,
    runtimeVersion: "ai-platform-kernel-v1",
    promptVersion: "ai-platform-evalops-prompt-v1",
    providerKey: "provider-a",
    modelKey: "model-a",
    results: [nextResult],
  });
  const comparison = compareAiEvalRuns(previous, next);
  const checks = {
    ai_quality_drift_detector_created: true,
    eval_run_comparison_created: comparison.eval_run_comparison_created,
    work_family_drift_detected: comparison.work_family_drift_detected,
    parameter_drift_detected: comparison.parameter_drift_detected,
    missing_question_drift_detected: comparison.missing_question_drift_detected,
    boq_drift_detected: comparison.boq_drift_detected,
    policy_drift_detected: comparison.policy_drift_detected,
    pdf_buyer_drift_detected: comparison.pdf_buyer_drift_detected,
    cost_latency_drift_detected: comparison.cost_latency_drift_detected,
    drift_requires_explicit_acceptance_or_stop: comparison.drift_requires_explicit_acceptance_or_stop,
  };
  const blockers = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_QUALITY_DRIFT_AUDIT : STOP_AI_QUALITY_DRIFT_AUDIT_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    ...checks,
    blockers,
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "quality-drift", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiQualityDrift({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_QUALITY_DRIFT_AUDIT) process.exitCode = 1;
}
