import type {
  AiExternalKnowledgeIntent,
  AiExternalKnowledgeRequest,
} from "./aiExternalKnowledgeRequest";
import type { AiExternalKnowledgeSourceType } from "./aiExternalKnowledgeSourceTypes";

export const AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE =
  "S_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE_POINT_OF_NO_RETURN";
export const AI_VERIFIED_EXTERNAL_KNOWLEDGE_PREFIX =
  "S_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE";
export const AI_VERIFIED_EXTERNAL_KNOWLEDGE_GREEN_STATUS =
  "GREEN_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE_READY";

export type AiExternalKnowledgePolicy = {
  externalSourceCanProveInternalFact: false;
  externalSourceCanBeProjectFact: false;
  internalQuestionsUsePublicWeb: false;
  publicWebRequiresUrl: true;
  publicWebRequiresCheckedAt: true;
  controlledExternalSourceMayBePresentedAsLiveWeb: false;
  generalKnowledgeMustBeDraft: true;
  accountingRequiresCountry: true;
  accountingRequiresHumanReview: true;
  taxRequiresOfficialOrTrustedSource: true;
  supplierSearchInternalFirst: true;
  answerPathMayMutate: false;
};

export const AI_EXTERNAL_KNOWLEDGE_POLICY: AiExternalKnowledgePolicy = {
  externalSourceCanProveInternalFact: false,
  externalSourceCanBeProjectFact: false,
  internalQuestionsUsePublicWeb: false,
  publicWebRequiresUrl: true,
  publicWebRequiresCheckedAt: true,
  controlledExternalSourceMayBePresentedAsLiveWeb: false,
  generalKnowledgeMustBeDraft: true,
  accountingRequiresCountry: true,
  accountingRequiresHumanReview: true,
  taxRequiresOfficialOrTrustedSource: true,
  supplierSearchInternalFirst: true,
  answerPathMayMutate: false,
};

export const AI_EXTERNAL_INTERNAL_ONLY_INTENTS = new Set<string>([
  "app_data_count",
  "app_data_list",
  "app_data_breakdown",
  "warehouse_issue_trace",
  "finance_payment_review",
  "document_pdf_explanation",
  "document_missing_links_review",
  "document_payment_blocker_review",
]);

export const AI_EXTERNAL_ACCOUNTING_INTENTS: AiExternalKnowledgeIntent[] = [
  "accounting_entry_help",
  "tax_reference",
  "finance_reference",
  "document_requirement_reference",
];

export const AI_EXTERNAL_SOURCE_PREFERENCE_BY_INTENT: Record<
  AiExternalKnowledgeIntent,
  AiExternalKnowledgeSourceType[]
> = {
  construction_estimate: [
    "official_regulation",
    "manufacturer_manual",
    "technical_card",
    "external_marketplace",
    "price_reference",
    "trusted_construction_reference",
    "general_knowledge",
  ],
  construction_material_calculation: [
    "manufacturer_manual",
    "technical_card",
    "trusted_construction_reference",
    "general_knowledge",
  ],
  construction_technology: [
    "official_regulation",
    "manufacturer_manual",
    "technical_card",
    "trusted_construction_reference",
    "general_knowledge",
  ],
  construction_norm_reference: [
    "official_regulation",
    "manufacturer_manual",
    "trusted_construction_reference",
  ],
  marketplace_supplier_search: [
    "external_marketplace",
    "supplier_site",
    "price_reference",
    "trusted_construction_reference",
  ],
  market_price_reference: [
    "external_marketplace",
    "supplier_site",
    "price_reference",
  ],
  accounting_entry_help: [
    "official_accounting_source",
    "official_tax_source",
    "trusted_accounting_reference",
    "general_knowledge",
  ],
  tax_reference: [
    "official_tax_source",
    "trusted_accounting_reference",
  ],
  finance_reference: [
    "official_finance_source",
    "trusted_finance_reference",
    "official_accounting_source",
  ],
  document_requirement_reference: [
    "official_accounting_source",
    "official_tax_source",
    "trusted_accounting_reference",
  ],
};

export function isAiExternalKnowledgeInternalOnlyIntent(intent: string): boolean {
  return AI_EXTERNAL_INTERNAL_ONLY_INTENTS.has(intent);
}

export function requestRequiresAiExternalReview(request: AiExternalKnowledgeRequest): boolean {
  return AI_EXTERNAL_ACCOUNTING_INTENTS.includes(request.intent) ||
    request.sourcePreference.some((sourceType) =>
      sourceType === "official_tax_source" || sourceType === "trusted_accounting_reference",
    );
}
