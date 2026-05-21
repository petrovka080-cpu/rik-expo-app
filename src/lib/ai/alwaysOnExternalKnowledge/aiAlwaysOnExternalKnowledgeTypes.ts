import type { AiQuestionKnowledgeMode, ConstructionEstimateAnswer } from "../estimateEngine";
import type { AiAnswerFirstGuardResult } from "../estimateEngine/estimateAnswerFirstGuard";

export type AiRealAnswerMode =
  | "app_fact_answer"
  | "external_knowledge_answer"
  | "hybrid_app_external_answer"
  | "construction_estimate_table"
  | "material_consumption_table"
  | "supplier_market_search"
  | "accounting_reference_answer"
  | "technology_checklist_answer";

export type AiAlwaysOnExternalKnowledgeInput = {
  questionRu: string;
  screenId: string;
  role: string;
  context?: string;
  countryCode?: string;
  cityOrRegion?: string;
  currency?: string;
};

export type AiAlwaysOnExternalKnowledgeAnswer = {
  handled: boolean;
  questionMode?: AiQuestionKnowledgeMode;
  realAnswerMode?: AiRealAnswerMode;
  answerTextRu?: string;
  estimate?: ConstructionEstimateAnswer;
  guard?: AiAnswerFirstGuardResult;
  sourceSummaryHiddenByDefault: true;
  externalKnowledgeAvailable: boolean;
};
