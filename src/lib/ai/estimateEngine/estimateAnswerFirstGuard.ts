import {
  hasAiDiagnosticsBeforeResult,
  startsWithForbiddenAiDiagnostic,
} from "../externalKnowledge/aiAnswerFirstPolicy";
import type { ConstructionEstimateAnswer } from "./estimateTypes";

export type AiAnswerFirstGuardResult = {
  passed: boolean;
  failureReason?:
    | "started_with_not_found"
    | "diagnostics_before_answer"
    | "missing_estimate_table"
    | "missing_numeric_quantities"
    | "missing_total_or_formula"
    | "generic_construction_work"
    | "external_knowledge_not_used_for_public_question";
};

export function guardConstructionEstimateAnswerFirst(
  answer: ConstructionEstimateAnswer,
  answerTextRu: string,
): AiAnswerFirstGuardResult {
  if (startsWithForbiddenAiDiagnostic(answerTextRu)) return { passed: false, failureReason: "started_with_not_found" };
  if (hasAiDiagnosticsBeforeResult(answerTextRu)) return { passed: false, failureReason: "diagnostics_before_answer" };
  if (!answerTextRu.includes("Смета:") && !answerTextRu.includes("Расчет:")) {
    return { passed: false, failureReason: "missing_estimate_table" };
  }
  if (![...answer.materials, ...answer.works].some((line) => line.quantity > 0)) {
    return { passed: false, failureReason: "missing_numeric_quantities" };
  }
  if (!answer.totals.grandTotal && !answer.totals.formulaRu) {
    return { passed: false, failureReason: "missing_total_or_formula" };
  }
  if (answer.workType === "unknown" || /строительная работа/i.test(answerTextRu)) {
    return { passed: false, failureReason: "generic_construction_work" };
  }
  if (!answer.sourceDisclosure.externalSourcesUsed || !answer.sourceDisclosure.referencePriceBookUsed) {
    return { passed: false, failureReason: "external_knowledge_not_used_for_public_question" };
  }
  return { passed: true };
}
