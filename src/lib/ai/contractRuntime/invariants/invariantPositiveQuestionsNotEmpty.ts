import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantPositiveQuestionsNotEmpty(trace: AiContractTrace) {
  const anyCheckedEmpty = trace.gateway.queries.some((query) => query.resultStatus === "checked_empty");
  const passed =
    trace.answerShape.hasShortAnswer &&
    trace.answerShape.hasFoundSection &&
    trace.numericFacts.length > 0 &&
    !anyCheckedEmpty;
  return createAiInvariantCheck(
    "POSITIVE_QUESTIONS_NOT_EMPTY",
    passed,
    passed ? undefined : "Positive traced question returned empty, no facts, or checked_empty.",
  );
}
