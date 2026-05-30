import type { AiEstimateCanaryEntrypoint } from "./aiEstimateCanaryConfig";

export type AiEstimateUserFeedbackCategory =
  | "wrong_work"
  | "too_few_rows"
  | "wrong_materials"
  | "wrong_units"
  | "wrong_price"
  | "pdf_problem"
  | "missing_work"
  | "missing_logistics_or_equipment"
  | "other";

export type AiEstimateUserFeedbackPayload = {
  runtimeTraceId: string;
  entrypoint: AiEstimateCanaryEntrypoint;
  workTitle: string;
  domain: string;
  object: string;
  operation: string;
  rowCount: number;
  pdfGenerated: boolean;
  userFeedbackCategory: AiEstimateUserFeedbackCategory;
  optionalComment?: string;
  createdAt: string;
};

export const AI_ESTIMATE_USER_FEEDBACK_LABELS_RU: Record<AiEstimateUserFeedbackCategory, string> = Object.freeze({
  wrong_work: "\u041d\u0435 \u0442\u0430 \u0440\u0430\u0431\u043e\u0442\u0430",
  too_few_rows: "\u041c\u0430\u043b\u043e \u0441\u0442\u0440\u043e\u043a",
  wrong_materials: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  wrong_units: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u0435\u0434\u0438\u043d\u0438\u0446\u044b",
  wrong_price: "\u041d\u0435\u0432\u0435\u0440\u043d\u0430\u044f \u0446\u0435\u043d\u0430",
  pdf_problem: "\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u0430 \u0441 PDF",
  missing_work: "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0440\u0430\u0431\u043e\u0442",
  missing_logistics_or_equipment: "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438/\u0442\u0435\u0445\u043d\u0438\u043a\u0438",
  other: "\u0414\u0440\u0443\u0433\u043e\u0435",
});
