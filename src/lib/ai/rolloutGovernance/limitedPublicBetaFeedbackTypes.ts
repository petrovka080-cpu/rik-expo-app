import type { AiEstimateLimitedPublicBetaEntrypoint } from "./limitedPublicBetaExecutionTypes";
import type { AiEstimateLimitedPublicBetaCohort } from "./limitedPublicBetaCohorts";

export type AiEstimateLimitedPublicBetaFeedbackCategory =
  | "wrong_work"
  | "too_few_rows"
  | "wrong_materials"
  | "wrong_units"
  | "wrong_price"
  | "missing_required_position"
  | "pdf_problem"
  | "unclear_estimate"
  | "other";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_FEEDBACK_LABELS_RU: Record<AiEstimateLimitedPublicBetaFeedbackCategory, string> =
  Object.freeze({
    wrong_work: "\u041d\u0435 \u0442\u0430 \u0440\u0430\u0431\u043e\u0442\u0430",
    too_few_rows: "\u041c\u0430\u043b\u043e \u0441\u0442\u0440\u043e\u043a",
    wrong_materials: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
    wrong_units: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u0435\u0434\u0438\u043d\u0438\u0446\u044b",
    wrong_price: "\u041d\u0435\u0432\u0435\u0440\u043d\u0430\u044f \u0446\u0435\u043d\u0430",
    missing_required_position: "\u041d\u0435\u0442 \u043d\u0443\u0436\u043d\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438",
    pdf_problem: "\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u0430 \u0441 PDF",
    unclear_estimate: "\u041d\u0435\u043f\u043e\u043d\u044f\u0442\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430",
    other: "\u0414\u0440\u0443\u0433\u043e\u0435",
  });

export type AiEstimateLimitedPublicBetaFeedbackPayload = {
  runtimeTraceId: string;
  entrypoint: AiEstimateLimitedPublicBetaEntrypoint;
  userCohort: AiEstimateLimitedPublicBetaCohort;
  domain: string;
  object: string;
  operation: string;
  workTitle: string;
  rowCount: number;
  pdfGenerated: boolean;
  feedbackCategory: AiEstimateLimitedPublicBetaFeedbackCategory;
  optionalComment?: string;
  createdAt: string;
};
