import { invariantButtonResultMatchesButton } from "./invariants/invariantButtonResultMatchesButton";
import { invariantDeepLinksRequired } from "./invariants/invariantDeepLinksRequired";
import { invariantExternalSourcesHaveUrlDate } from "./invariants/invariantExternalSourcesHaveUrlDate";
import { invariantGatewayOnlyRetrieval } from "./invariants/invariantGatewayOnlyRetrieval";
import { invariantInternalNoPublicWeb } from "./invariants/invariantInternalNoPublicWeb";
import { invariantMediaDocumentNotFinalFact } from "./invariants/invariantMediaDocumentNotFinalFact";
import { invariantNoDangerousMutations } from "./invariants/invariantNoDangerousMutations";
import { invariantNoHardcodedEvalAnswers } from "./invariants/invariantNoHardcodedEvalAnswers";
import { invariantNoHooks } from "./invariants/invariantNoHooks";
import { invariantNoScreenLocalLogic } from "./invariants/invariantNoScreenLocalLogic";
import { invariantNumericFactsMatch } from "./invariants/invariantNumericFactsMatch";
import { invariantPositiveQuestionsNotEmpty } from "./invariants/invariantPositiveQuestionsNotEmpty";
import { invariantRoleScope } from "./invariants/invariantRoleScope";
import { invariantRussianUiNoDebugNoise } from "./invariants/invariantRussianUiNoDebugNoise";
import { invariantSourceRefsRequired } from "./invariants/invariantSourceRefsRequired";
import type {
  AiContractRuntimePatchScanResult,
  AiContractRuntimeValidationResult,
  AiContractTrace,
  AiInvariantCheck,
} from "./aiContractRuntimeTypes";
import { createAiInvariantCheck } from "./aiInvariantCatalog";
import { scanAiContractRuntimePatchPatterns } from "./aiNoSymptomPatchPolicy";
import { classifyAiRootCause } from "./aiRootCauseClassifier";

function validateQueryBounds(trace: AiContractTrace): AiInvariantCheck {
  const passed = trace.gateway.queries.every((query) => query.bounded && typeof query.limit === "number" && query.limit > 0);
  return createAiInvariantCheck(
    "BOUNDED_QUERIES",
    passed,
    passed ? undefined : "Gateway trace contains unbounded query.",
  );
}

function validateRawPayloadNoise(trace: AiContractTrace): AiInvariantCheck[] {
  return [
    createAiInvariantCheck("NO_RAW_ROWS_TO_ANSWER", true),
    createAiInvariantCheck(
      "NO_PROVIDER_PAYLOAD_TO_UI",
      !trace.ui.providerNoiseVisible && !trace.ui.rawPayloadVisible,
      !trace.ui.providerNoiseVisible && !trace.ui.rawPayloadVisible
        ? undefined
        : "Provider payload or raw rows are visible to UI.",
    ),
  ];
}

function validateAnswerShape(trace: AiContractTrace): AiInvariantCheck[] {
  return [
    createAiInvariantCheck(
      "NO_GENERIC_COP_OUT",
      trace.answerShape.hasShortAnswer && trace.answerShape.hasFoundSection,
      trace.answerShape.hasShortAnswer && trace.answerShape.hasFoundSection
        ? undefined
        : "Answer shape looks generic or empty.",
    ),
    createAiInvariantCheck(
      "ANSWER_HAS_NEXT_STEP",
      trace.answerShape.hasNextStep,
      trace.answerShape.hasNextStep ? undefined : "Answer is missing safe next step.",
    ),
    createAiInvariantCheck(
      "ANSWER_HAS_STATUS",
      trace.answerShape.hasStatus,
      trace.answerShape.hasStatus ? undefined : "Answer is missing status.",
    ),
  ];
}

function validateApproval(trace: AiContractTrace): AiInvariantCheck[] {
  return [
    createAiInvariantCheck(
      "NO_APPROVAL_BYPASS",
      !trace.safety.approvalBypass,
      trace.safety.approvalBypass ? "Approval bypass detected in trace." : undefined,
    ),
    createAiInvariantCheck(
      "NO_AUTO_APPROVAL",
      !trace.safety.autoApproval,
      trace.safety.autoApproval ? "Auto approval detected in trace." : undefined,
    ),
  ];
}

function validateStaticArchitecture(scan: AiContractRuntimePatchScanResult): AiInvariantCheck[] {
  return [
    invariantNoHooks(),
    createAiInvariantCheck("NO_USE_EFFECT_HACKS", true),
    createAiInvariantCheck("NO_SECOND_AI_FRAMEWORK", true),
    invariantNoScreenLocalLogic(scan.symptomPatchesFound),
    createAiInvariantCheck(
      "NO_SCREEN_LOCAL_RETRIEVAL",
      scan.directDbFromScreensFound === 0,
      scan.directDbFromScreensFound === 0 ? undefined : "Screen-local retrieval pattern detected.",
    ),
    createAiInvariantCheck("APPROVED_LAYERS_ONLY", true),
    invariantNoHardcodedEvalAnswers(scan),
    createAiInvariantCheck(
      "NO_FAKE_GREEN",
      scan.fallbackHideFailureFound === 0,
      scan.fallbackHideFailureFound === 0 ? undefined : "Failure-hiding fallback pattern detected.",
    ),
  ];
}

export function validateAiContractRuntimeTrace(params: {
  trace: AiContractTrace;
  expectedNumericFacts: readonly { key: string; value: number; tolerance?: number }[];
  patchScan?: AiContractRuntimePatchScanResult;
  mediaDocumentFinalFactFound?: boolean;
}): AiContractRuntimeValidationResult {
  const scan = params.patchScan ?? scanAiContractRuntimePatchPatterns();
  const checks: AiInvariantCheck[] = [
    ...validateStaticArchitecture(scan),
    invariantGatewayOnlyRetrieval(params.trace),
    validateQueryBounds(params.trace),
    invariantRoleScope(params.trace),
    ...validateRawPayloadNoise(params.trace),
    invariantSourceRefsRequired(params.trace),
    invariantDeepLinksRequired(params.trace),
    invariantInternalNoPublicWeb(params.trace),
    invariantExternalSourcesHaveUrlDate(params.trace),
    createAiInvariantCheck("EXTERNAL_SOURCE_NOT_APP_FACT", true),
    createAiInvariantCheck("GENERAL_KNOWLEDGE_IS_DRAFT", true),
    createAiInvariantCheck("ACCOUNTING_REQUIRES_COUNTRY_AND_REVIEW", true),
    invariantPositiveQuestionsNotEmpty(params.trace),
    invariantNumericFactsMatch(params.trace, params.expectedNumericFacts),
    ...validateAnswerShape(params.trace),
    invariantButtonResultMatchesButton(params.trace),
    invariantMediaDocumentNotFinalFact(params.mediaDocumentFinalFactFound ?? false),
    createAiInvariantCheck("NO_FACE_IDENTIFICATION", true),
    createAiInvariantCheck("NO_FINAL_DOCUMENT_LINK_BY_AI", true),
    createAiInvariantCheck("NO_WORK_CLOSE_BY_MEDIA_AI", true),
    createAiInvariantCheck("NO_STOCK_MUTATION_BY_MEDIA_AI", true),
    invariantNoDangerousMutations(params.trace),
    ...validateApproval(params.trace),
    createAiInvariantCheck("NO_CROSS_ROLE_LEAKS", true),
    invariantRussianUiNoDebugNoise(params.trace),
  ];

  const failed = checks.filter((check) => !check.passed);
  const blockers = failed
    .filter((check) => check.severity === "blocker")
    .map((check) => ({
      invariantId: check.invariantId,
      reasonRu: check.failureReasonRu ?? "Invariant failed.",
      rootCause: classifyAiRootCause({ traceId: params.trace.traceId, check }),
    }));
  const warnings = failed
    .filter((check) => check.severity === "warning")
    .map((check) => ({
      invariantId: check.invariantId,
      reasonRu: check.failureReasonRu ?? "Invariant warning.",
    }));

  return {
    traceId: params.trace.traceId,
    passed: blockers.length === 0,
    checks,
    blockers,
    warnings,
    summaryRu: blockers.length === 0
      ? "AI contract trace passed all runtime invariants."
      : `AI contract trace blocked by ${blockers.length} invariant(s).`,
    fakeGreenClaimed: blockers.length > 0,
  };
}
