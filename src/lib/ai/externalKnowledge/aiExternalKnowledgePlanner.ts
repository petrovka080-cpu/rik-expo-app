import {
  AI_EXTERNAL_SOURCE_PREFERENCE_BY_INTENT,
  isAiExternalKnowledgeInternalOnlyIntent,
  requestRequiresAiExternalReview,
} from "./aiExternalKnowledgePolicy";
import type {
  AiExternalKnowledgeEntity,
  AiExternalKnowledgeIntent,
  AiExternalKnowledgeRequest,
  AiExternalKnowledgeRole,
} from "./aiExternalKnowledgeRequest";
import type { AiExternalKnowledgeSourceType } from "./aiExternalKnowledgeSourceTypes";

export type AiExternalKnowledgePlan = {
  enabled: boolean;
  reasonRu: string;
  request: AiExternalKnowledgeRequest;
  allowedSourceTypes: AiExternalKnowledgeSourceType[];
  forbiddenSourceTypes: AiExternalKnowledgeSourceType[];
  requiresOfficialSource: boolean;
  requiresManufacturerSource: boolean;
  requiresMarketplaceCheck: boolean;
  requiresCountryContext: boolean;
  requiresHumanReview: boolean;
  fallbackMode:
    | "no_external_needed"
    | "official_only"
    | "marketplace_then_web"
    | "manufacturer_then_reference"
    | "general_draft_only"
    | "blocked";
};

export type AiExternalKnowledgePlanInput = {
  requestId?: string;
  questionRu: string;
  normalizedQuestionRu?: string;
  role: string;
  screenId: string;
  intent: string;
  entity: string;
  countryCode?: string;
  cityOrRegion?: string;
  currency?: string;
  quantity?: {
    value: number;
    unit: string;
  };
  workType?: string;
  materialNameRu?: string;
  maxResults?: number;
  internalContextSummaryRu?: string;
  sourceOrder?: string[];
  internetAllowed?: boolean;
};

function toRole(role: string): AiExternalKnowledgeRole {
  if ([
    "director",
    "foreman",
    "buyer",
    "accountant",
    "warehouse",
    "contractor",
    "office",
    "client",
    "marketplace_user",
    "admin",
  ].includes(role)) return role as AiExternalKnowledgeRole;
  return "foreman";
}

function toIntent(intent: string): AiExternalKnowledgeIntent {
  if (intent === "procurement_offer_selection") return "marketplace_supplier_search";
  if (intent === "accounting_reference") return "accounting_entry_help";
  if ([
    "construction_estimate",
    "construction_material_calculation",
    "construction_technology",
    "construction_norm_reference",
    "marketplace_supplier_search",
    "market_price_reference",
    "accounting_entry_help",
    "tax_reference",
    "finance_reference",
    "document_requirement_reference",
  ].includes(intent)) return intent as AiExternalKnowledgeIntent;
  return "construction_estimate";
}

function toEntity(entity: string): AiExternalKnowledgeEntity {
  if ([
    "construction_work_type",
    "material",
    "supplier",
    "marketplace_product",
    "payment",
    "invoice",
    "act",
    "contract",
    "accounting_entry",
    "document",
    "unknown",
  ].includes(entity)) return entity as AiExternalKnowledgeEntity;
  return "unknown";
}

function fallbackModeFor(input: {
  enabled: boolean;
  intent: AiExternalKnowledgeIntent;
  allowedSourceTypes: AiExternalKnowledgeSourceType[];
}): AiExternalKnowledgePlan["fallbackMode"] {
  if (!input.enabled) return "blocked";
  if (input.intent === "marketplace_supplier_search" || input.intent === "market_price_reference") {
    return "marketplace_then_web";
  }
  if (input.intent === "construction_technology" || input.intent === "construction_material_calculation") {
    return input.allowedSourceTypes.includes("manufacturer_manual")
      ? "manufacturer_then_reference"
      : "general_draft_only";
  }
  if (input.intent === "tax_reference" || input.intent === "finance_reference") return "official_only";
  if (input.allowedSourceTypes.every((sourceType) => sourceType === "general_knowledge")) {
    return "general_draft_only";
  }
  return "manufacturer_then_reference";
}

export function planAiExternalKnowledge(input: AiExternalKnowledgePlanInput): AiExternalKnowledgePlan {
  const intent = toIntent(input.intent);
  const sourcePreference = AI_EXTERNAL_SOURCE_PREFERENCE_BY_INTENT[intent];
  const internalOnly = isAiExternalKnowledgeInternalOnlyIntent(input.intent);
  const internetAllowed = input.internetAllowed !== false;
  const enabled = !internalOnly && internetAllowed;
  const request: AiExternalKnowledgeRequest = {
    requestId: input.requestId ?? `external-knowledge:${input.screenId}:${intent}`,
    questionRu: input.questionRu,
    normalizedQuestionRu: input.normalizedQuestionRu ?? input.questionRu.toLowerCase(),
    role: toRole(input.role),
    screenId: input.screenId,
    intent,
    entity: toEntity(input.entity),
    countryCode: input.countryCode,
    cityOrRegion: input.cityOrRegion,
    currency: input.currency,
    quantity: input.quantity,
    workType: input.workType,
    materialNameRu: input.materialNameRu,
    sourcePreference,
    maxResults: input.maxResults ?? 5,
    internalContextSummaryRu: input.internalContextSummaryRu,
    reasonRu: internalOnly
      ? "Вопрос относится к внутренним данным приложения: внешний источник заблокирован."
      : "Внешние источники разрешены только как справка после проверки app/PDF/marketplace контекста.",
  };
  const forbiddenSourceTypes: AiExternalKnowledgeSourceType[] = enabled ? ["unknown"] : sourcePreference;
  return {
    enabled,
    reasonRu: request.reasonRu,
    request,
    allowedSourceTypes: enabled ? sourcePreference : [],
    forbiddenSourceTypes,
    requiresOfficialSource: ["construction_norm_reference", "tax_reference", "finance_reference"].includes(intent),
    requiresManufacturerSource: ["construction_material_calculation", "construction_technology"].includes(intent),
    requiresMarketplaceCheck: ["marketplace_supplier_search", "market_price_reference", "construction_estimate"].includes(intent),
    requiresCountryContext: ["accounting_entry_help", "tax_reference", "finance_reference", "document_requirement_reference"].includes(intent),
    requiresHumanReview: requestRequiresAiExternalReview(request),
    fallbackMode: fallbackModeFor({ enabled, intent, allowedSourceTypes: sourcePreference }),
  };
}

export function planAiExternalKnowledgeFromSourcePlan(sourcePlan: {
  questionRu: string;
  normalizedQuestionRu: string;
  role: string;
  screenId: string;
  intent: string;
  entity: string;
  sourceOrder: string[];
  internetAllowed: boolean;
  filters?: {
    quantity?: {
      value: number;
      unit: string;
    };
    material?: {
      normalizedNameRu?: string;
      nameRu?: string;
    };
    workType?: {
      key?: string;
      labelRu?: string;
    };
  };
}): AiExternalKnowledgePlan {
  return planAiExternalKnowledge({
    questionRu: sourcePlan.questionRu,
    normalizedQuestionRu: sourcePlan.normalizedQuestionRu,
    role: sourcePlan.role,
    screenId: sourcePlan.screenId,
    intent: sourcePlan.intent,
    entity: sourcePlan.entity,
    sourceOrder: sourcePlan.sourceOrder,
    internetAllowed: sourcePlan.internetAllowed,
    quantity: sourcePlan.filters?.quantity,
    materialNameRu: sourcePlan.filters?.material?.normalizedNameRu ?? sourcePlan.filters?.material?.nameRu,
    workType: sourcePlan.filters?.workType?.key ?? sourcePlan.filters?.workType?.labelRu,
  });
}
