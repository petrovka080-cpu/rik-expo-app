import type {
  AiExternalKnowledgeRequest,
} from "./aiExternalKnowledgeRequest";
import type {
  AiExternalKnowledgeSourceRef,
  AiExternalKnowledgeSourceType,
} from "./aiExternalKnowledgeSourceTypes";
import {
  getAiAccountingReferenceSources,
  getAiConstructionReferenceSources,
  getAiExternalMarketplaceSources,
  getAiFinanceReferenceSources,
  getAiManufacturerManualSources,
  getAiOfficialRegulationSources,
  getAiSupplierSiteSources,
  getAiTaxReferenceSources,
} from "./providers/referenceProviders";

export type AiExternalKnowledgeProviderId =
  | "official_regulation"
  | "manufacturer_manual"
  | "external_marketplace"
  | "supplier_site"
  | "construction_reference"
  | "accounting_reference"
  | "tax_reference"
  | "finance_reference";

export type AiExternalKnowledgeProvider = {
  id: AiExternalKnowledgeProviderId;
  sourceTypes: AiExternalKnowledgeSourceType[];
  livePublicWebFetch: false;
  controlledSourceOnly: boolean;
  readOnly: true;
  answerPathMayMutate: false;
  retrieve: (request: AiExternalKnowledgeRequest) => AiExternalKnowledgeSourceRef[];
};

export const AI_EXTERNAL_KNOWLEDGE_PROVIDER_REGISTRY: AiExternalKnowledgeProvider[] = [
  {
    id: "official_regulation",
    sourceTypes: ["official_regulation"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiOfficialRegulationSources,
  },
  {
    id: "manufacturer_manual",
    sourceTypes: ["manufacturer_manual", "technical_card"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiManufacturerManualSources,
  },
  {
    id: "external_marketplace",
    sourceTypes: ["external_marketplace", "price_reference"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiExternalMarketplaceSources,
  },
  {
    id: "supplier_site",
    sourceTypes: ["supplier_site"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiSupplierSiteSources,
  },
  {
    id: "construction_reference",
    sourceTypes: ["trusted_construction_reference", "general_knowledge"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiConstructionReferenceSources,
  },
  {
    id: "accounting_reference",
    sourceTypes: ["official_accounting_source", "trusted_accounting_reference"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiAccountingReferenceSources,
  },
  {
    id: "tax_reference",
    sourceTypes: ["official_tax_source"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiTaxReferenceSources,
  },
  {
    id: "finance_reference",
    sourceTypes: ["official_finance_source", "trusted_finance_reference"],
    livePublicWebFetch: false,
    controlledSourceOnly: false,
    readOnly: true,
    answerPathMayMutate: false,
    retrieve: getAiFinanceReferenceSources,
  },
];

export function listAiExternalKnowledgeProviders(): AiExternalKnowledgeProvider[] {
  return AI_EXTERNAL_KNOWLEDGE_PROVIDER_REGISTRY;
}

export function retrieveAiExternalKnowledgeSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  const allowed = new Set(request.sourcePreference);
  return AI_EXTERNAL_KNOWLEDGE_PROVIDER_REGISTRY
    .filter((provider) => provider.sourceTypes.some((sourceType) => allowed.has(sourceType)))
    .flatMap((provider) => provider.retrieve(request))
    .filter((source) => allowed.has(source.sourceType))
    .slice(0, request.maxResults);
}
