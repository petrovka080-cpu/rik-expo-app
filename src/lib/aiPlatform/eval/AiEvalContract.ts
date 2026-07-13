import type { AiPlatformRole, AiPlatformSurface } from "../kernel/AiRuntimeKernelContract";

export type AiEvalSurface = Exclude<AiPlatformSurface, "office">;

export type AiEvalExpectedPolicyStatus =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiEvalCase = {
  caseId: string;
  version: string;
  surface: AiEvalSurface;
  role: AiPlatformRole;
  input: {
    userText: string;
    contextRefs?: Record<string, string>;
  };
  expected: {
    workFamily?: string;
    requiredParameterKeys?: string[];
    forbiddenParameterKeys?: string[];
    expectedBoqFamilies?: string[];
    expectedMissingQuestionsRu?: string[];
    expectedPolicyStatus?: AiEvalExpectedPolicyStatus;
    mustNotContainRu?: string[];
    mustContainRu?: string[];
  };
  qualityGates: {
    minScore: number;
    requiresGrounding: boolean;
    requiresNoPiiLeak: boolean;
    requiresNoRawInternalIds: boolean;
    requiresDeterministicContract: boolean;
  };
  tags?: string[];
};

export type AiEvalActual = {
  workFamily?: string;
  parameterKeys: string[];
  boqFamilies: string[];
  missingQuestionsRu: string[];
  policyStatus: AiEvalExpectedPolicyStatus;
  userVisibleAnswerRu: string;
  durationMs: number;
  providerKey: string;
  modelKey: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type AiEvalScoreBreakdown = {
  work_classification_score: number;
  parameter_extraction_score: number;
  parameter_passport_score: number;
  missing_input_score: number;
  boq_dependency_score: number;
  quantity_trace_score: number;
  russian_ui_score: number;
  policy_compliance_score: number;
  pii_redaction_score: number;
  determinism_score: number;
};

export type AiEvalResult = {
  evalRunId: string;
  caseId: string;
  caseVersion: string;
  sourceSha: string;
  runtimeVersion: string;
  promptVersion: string;
  providerKey: string;
  modelKey: string;
  surface: AiEvalSurface;
  role: AiPlatformRole;
  status: "passed" | "failed" | "blocked";
  score: number;
  scoreBreakdown: AiEvalScoreBreakdown;
  scoreExplanationRu: string;
  actual: AiEvalActual;
  expected: AiEvalCase["expected"];
  groundingPassed: boolean;
  piiRedactionPassed: boolean;
  rawInternalIdsVisible: boolean;
  deterministicContractPassed: boolean;
  driftDetected: boolean;
  blockers: string[];
  cost: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
    durationMs: number;
  };
  createdAt: string;
};

export type AiEvalRunSummary = {
  evalRunId: string;
  sourceSha: string;
  runtimeVersion: string;
  promptVersion: string;
  providerKey: string;
  modelKey: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  minScore: number;
  averageScore: number;
  p95DurationMs: number;
  results: AiEvalResult[];
};

export type AiEvalRunnerOptions = {
  evalRunId: string;
  sourceSha: string;
  runtimeVersion: string;
  promptVersion: string;
  providerKey?: string;
  modelKey?: string;
};
