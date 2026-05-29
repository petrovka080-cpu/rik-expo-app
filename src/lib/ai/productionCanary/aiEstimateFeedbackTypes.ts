import type { AiEstimateCanaryEntrypoint } from "./aiEstimateCanaryConfig";

export type AiEstimateFeedbackReason =
  | "wrong_estimate"
  | "wrong_work"
  | "too_few_rows"
  | "wrong_materials"
  | "wrong_units"
  | "pdf_problem"
  | "other";

export type AiEstimateFeedbackPayload = {
  runtimeTraceId: string;
  entrypoint: AiEstimateCanaryEntrypoint;
  classification: string;
  visibleWorkTitle: string;
  rowCount: number;
  reason: AiEstimateFeedbackReason;
  optionalUserComment?: string;
};

export const AI_ESTIMATE_FEEDBACK_REASON_LABELS_RU: Record<AiEstimateFeedbackReason, string> = Object.freeze({
  wrong_estimate: "\u0421\u043c\u0435\u0442\u0430 \u043d\u0435\u0432\u0435\u0440\u043d\u0430\u044f",
  wrong_work: "\u041d\u0435 \u0442\u0430 \u0440\u0430\u0431\u043e\u0442\u0430",
  too_few_rows: "\u041c\u0430\u043b\u043e \u0441\u0442\u0440\u043e\u043a",
  wrong_materials: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  wrong_units: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u0435\u0434\u0438\u043d\u0438\u0446\u044b",
  pdf_problem: "\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u0430 \u0441 PDF",
  other: "\u0414\u0440\u0443\u0433\u043e\u0435",
});
