import type {
  SmartEstimatorAnalyzedInput,
  SmartEstimatorCandidate,
  SmartEstimatorClarification,
  SmartEstimatorClarificationReason,
  SmartEstimatorWorkResolution,
} from "./smartEstimatorTypes";

function questionFor(reason: SmartEstimatorClarificationReason): string {
  if (reason === "MISSING_REGION") {
    return "Уточните регион работ, чтобы применить правильную валюту и прайсбук.";
  }
  if (reason === "MISSING_QUANTITY") {
    return "Уточните объем работ и единицу измерения.";
  }
  if (reason === "WORK_NOT_SUPPORTED") {
    return "Работа не распознана как поддерживаемая. Уточните вид работ.";
  }
  return "Уточните конкретный вид работ из вариантов.";
}

export function buildSmartEstimatorClarification(input: {
  reason: SmartEstimatorClarificationReason;
  analysis: SmartEstimatorAnalyzedInput;
  workResolution?: SmartEstimatorWorkResolution | null;
  candidates?: readonly SmartEstimatorCandidate[];
}): SmartEstimatorClarification {
  const reason = input.reason;
  return {
    reason,
    question_ru: questionFor(reason),
    required_fields: reason === "MISSING_REGION"
      ? ["region"]
      : reason === "MISSING_QUANTITY"
        ? ["quantity"]
        : ["work"],
    candidates: [...(input.candidates ?? input.workResolution?.candidates ?? [])].slice(0, 8),
    fake_green_claimed: false,
  };
}
