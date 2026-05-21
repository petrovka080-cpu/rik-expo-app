import type { UniversalRoleQaFilters } from "./universalFilterExtractor";
import type { UniversalRoleQaEntity } from "./universalEntityExtractor";
import type { UniversalRoleQaIntent } from "./universalIntentClassifier";
import type {
  UniversalRoleContext,
  UniversalRoleQaSourceOrigin,
} from "./universalRoleContextResolver";
import type { UniversalScreenContext } from "./universalScreenContextResolver";
import {
  planAiExternalKnowledgeFromSourcePlan,
  type AiExternalKnowledgePlan,
} from "../externalKnowledge";
import { normalizeUniversalRoleQaQuestion, uniqueUniversalStrings } from "./universalQuestionNormalizer";

export type UniversalRoleQaSourcePlan = {
  questionRu: string;
  normalizedQuestionRu: string;
  role: string;
  screenId: string;
  intent: UniversalRoleQaIntent;
  entity: UniversalRoleQaEntity;
  filters: UniversalRoleQaFilters;
  sourceOrder: UniversalRoleQaSourceOrigin[];
  internetAllowed: boolean;
  appDataRequired: boolean;
  pdfRequired: boolean;
  marketplaceFirst: boolean;
  permissionScopeRequired: boolean;
  boundedQueryRequired: boolean;
  reasonRu: string;
  forbiddenSources: UniversalRoleQaSourceOrigin[];
  externalKnowledgePlan?: AiExternalKnowledgePlan;
};

export type UniversalExternalWebRequest = {
  queryRu: string;
  role: string;
  intent:
    | "construction_estimate"
    | "construction_material_calculation"
    | "construction_technology"
    | "construction_norm_reference"
    | "market_price_reference"
    | "supplier_search"
    | "accounting_reference"
    | "tax_reference"
    | "finance_reference";
  countryCode?: string;
  cityOrRegion?: string;
  preferredSourceTypes: (
    | "official_regulation"
    | "manufacturer_manual"
    | "external_marketplace"
    | "supplier_site"
    | "accounting_reference"
    | "tax_reference"
    | "trusted_article"
  )[];
  maxResults: number;
  blockedDomains?: string[];
};

export type UniversalExternalWebResult = {
  id: string;
  titleRu: string;
  snippetRu: string;
  url: string;
  domain: string;
  checkedAt: string;
  sourceType:
    | "official_regulation"
    | "manufacturer_manual"
    | "external_marketplace"
    | "supplier_site"
    | "accounting_reference"
    | "tax_reference"
    | "trusted_article"
    | "unknown";
  topic:
    | "construction"
    | "market_price"
    | "supplier"
    | "accounting"
    | "tax"
    | "finance";
  confidence: "high" | "medium" | "low";
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
  warningRu?: string;
};

const internalIntents: UniversalRoleQaIntent[] = [
  "app_data_count",
  "app_data_list",
  "app_data_breakdown",
  "app_data_trend",
  "procurement_request_review",
  "warehouse_stock_review",
  "warehouse_issue_trace",
  "warehouse_deficit_review",
  "finance_payment_review",
  "finance_debt_review",
  "finance_partial_payment_review",
  "field_work_review",
  "field_work_closeout_help",
  "contractor_acceptance_review",
  "document_pdf_explanation",
  "document_missing_links_review",
  "document_payment_blocker_review",
  "director_decision_summary",
  "office_stuck_work_review",
  "client_progress_review",
];

function isPublicQuestion(intent: UniversalRoleQaIntent): boolean {
  return [
    "construction_estimate",
    "construction_material_calculation",
    "construction_technology",
    "construction_norm_reference",
    "accounting_entry_help",
    "marketplace_supplier_search",
  ].includes(intent);
}

function buildSourceOrder(intent: UniversalRoleQaIntent): UniversalRoleQaSourceOrigin[] {
  if (intent === "marketplace_supplier_search" || intent === "procurement_offer_selection") {
    return [
      "app_context_graph",
      "app_data",
      "internal_marketplace",
      "approved_vendor",
      "supplier_history",
      "purchase_history",
      "external_marketplace",
      "public_web",
    ];
  }

  if (intent === "construction_estimate" || intent === "construction_material_calculation") {
    return [
      "app_context_graph",
      "app_data",
      "pdf_document",
      "internal_marketplace",
      "purchase_history",
      "external_marketplace",
      "official_regulation",
      "manufacturer_manual",
      "public_web",
      "general_construction_knowledge",
    ];
  }

  if (intent === "construction_technology" || intent === "construction_norm_reference") {
    return ["pdf_document", "official_regulation", "manufacturer_manual", "public_web", "general_construction_knowledge"];
  }

  if (intent === "accounting_entry_help") {
    return ["app_context_graph", "app_data", "pdf_document", "accounting_reference", "tax_reference", "official_regulation", "public_web"];
  }

  if (intent.startsWith("document_")) return ["app_context_graph", "pdf_document", "app_data"];

  return ["app_context_graph", "app_data", "pdf_document"];
}

export function planUniversalRoleQaSources(input: {
  questionRu: string;
  roleContext: UniversalRoleContext;
  screenContext: UniversalScreenContext;
  intent: UniversalRoleQaIntent;
  entity: UniversalRoleQaEntity;
  filters: UniversalRoleQaFilters;
}): UniversalRoleQaSourcePlan {
  const normalizedQuestionRu = normalizeUniversalRoleQaQuestion(input.questionRu);
  const sourceOrder = buildSourceOrder(input.intent);
  const internalQuestion = internalIntents.includes(input.intent);
  const internetAllowed = !internalQuestion &&
    isPublicQuestion(input.intent) &&
    input.roleContext.canUsePublicWebForPublicQuestions;
  const forbiddenSources = internalQuestion
    ? ["public_web", "external_marketplace", "official_regulation", "manufacturer_manual", "accounting_reference", "tax_reference"] as UniversalRoleQaSourceOrigin[]
    : input.roleContext.canUsePublicWebForPublicQuestions
      ? []
      : ["public_web", "external_marketplace"] as UniversalRoleQaSourceOrigin[];

  const plan: UniversalRoleQaSourcePlan = {
    questionRu: input.questionRu,
    normalizedQuestionRu,
    role: input.roleContext.role,
    screenId: input.screenContext.screenId,
    intent: input.intent,
    entity: input.entity,
    filters: input.filters,
    sourceOrder: uniqueUniversalStrings(sourceOrder) as UniversalRoleQaSourceOrigin[],
    internetAllowed,
    appDataRequired: internalQuestion || sourceOrder.includes("app_context_graph") || sourceOrder.includes("app_data"),
    pdfRequired: input.intent.startsWith("document_") || sourceOrder.includes("pdf_document"),
    marketplaceFirst: input.intent === "marketplace_supplier_search" || input.intent === "procurement_offer_selection",
    permissionScopeRequired: true,
    boundedQueryRequired: internalQuestion || input.intent.startsWith("app_data"),
    reasonRu: internalQuestion
      ? "Вопрос про внутренние данные приложения: интернет запрещен, нужны app context graph/app data/PDF."
      : "Вопрос допускает справочные источники: сначала проверяются внутренние данные, затем разрешенные внешние источники.",
    forbiddenSources,
  };
  return {
    ...plan,
    externalKnowledgePlan: planAiExternalKnowledgeFromSourcePlan(plan),
  };
}
