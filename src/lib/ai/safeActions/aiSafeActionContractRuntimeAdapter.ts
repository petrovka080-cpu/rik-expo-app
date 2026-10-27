import { validateAiContractRuntimeTrace, type AiContractTrace, type AiContractRuntimeValidationResult } from "../contractRuntime";
import type { AiSafeActionDraft } from "./aiSafeActionTypes";

export type AiSafeActionContractRuntimeAdapterResult = {
  actionDraftId: string;
  sourceTraceId?: string;
  contractTracePresent: boolean;
  contractRuntimePassed: boolean;
  answerPipelineReadOnly: true;
  actionPipelineDraftOnly: true;
};

export function validateAiSafeActionSourceTrace(params: {
  draft: AiSafeActionDraft;
  trace?: AiContractTrace;
}): AiSafeActionContractRuntimeAdapterResult & { validation?: AiContractRuntimeValidationResult } {
  const validation = params.trace
    ? validateAiContractRuntimeTrace({
        trace: params.trace,
        expectedNumericFacts: [],
      })
    : undefined;
  return {
    actionDraftId: params.draft.id,
    sourceTraceId: params.draft.sourceTraceId,
    contractTracePresent: Boolean(params.draft.sourceTraceId ?? params.trace?.traceId),
    contractRuntimePassed: validation?.passed ?? Boolean(params.draft.sourceTraceId),
    answerPipelineReadOnly: true,
    actionPipelineDraftOnly: true,
    validation,
  };
}
