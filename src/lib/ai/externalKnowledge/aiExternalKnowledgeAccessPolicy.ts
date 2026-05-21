import type { AiExternalKnowledgeIntent } from "./aiExternalKnowledgeRequest";

export type AiExternalKnowledgeAccessPolicy = {
  enabledForAllScreens: true;
  allowedForIntents: AiExternalKnowledgeIntent[];
  appFactsStillRequireAppSource: true;
  externalKnowledgeCanSupplementInternalAnswers: true;
  externalKnowledgeCannotInventInternalAppFacts: true;
};

export const AI_EXTERNAL_KNOWLEDGE_ACCESS_POLICY: AiExternalKnowledgeAccessPolicy = {
  enabledForAllScreens: true,
  allowedForIntents: [
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
  ],
  appFactsStillRequireAppSource: true,
  externalKnowledgeCanSupplementInternalAnswers: true,
  externalKnowledgeCannotInventInternalAppFacts: true,
};

export function canUseAiExternalKnowledgeOnScreen(intent: AiExternalKnowledgeIntent): boolean {
  return AI_EXTERNAL_KNOWLEDGE_ACCESS_POLICY.enabledForAllScreens &&
    AI_EXTERNAL_KNOWLEDGE_ACCESS_POLICY.allowedForIntents.includes(intent);
}
