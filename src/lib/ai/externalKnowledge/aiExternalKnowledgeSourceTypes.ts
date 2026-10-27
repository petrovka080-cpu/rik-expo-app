export type AiExternalKnowledgeSourceType =
  | "official_regulation"
  | "official_tax_source"
  | "official_accounting_source"
  | "official_finance_source"
  | "manufacturer_manual"
  | "technical_card"
  | "external_marketplace"
  | "supplier_site"
  | "trusted_construction_reference"
  | "trusted_accounting_reference"
  | "trusted_finance_reference"
  | "price_reference"
  | "controlled_external_source"
  | "general_knowledge"
  | "unknown";

export type AiExternalKnowledgeOrigin =
  | "public_web"
  | "external_marketplace"
  | "official_regulation"
  | "official_tax_source"
  | "official_accounting_source"
  | "official_finance_source"
  | "manufacturer_manual"
  | "technical_card"
  | "supplier_site"
  | "trusted_reference"
  | "controlled_external_source"
  | "general_knowledge";

export type AiExternalKnowledgeTopic =
  | "construction_technology"
  | "construction_estimate"
  | "construction_norm"
  | "material_consumption"
  | "market_price"
  | "supplier_search"
  | "accounting"
  | "tax"
  | "finance"
  | "legal_reference";

export type AiExternalKnowledgeSourceRef = {
  id: string;
  origin: AiExternalKnowledgeOrigin;
  sourceType: AiExternalKnowledgeSourceType;
  titleRu: string;
  url?: string;
  domain?: string;
  checkedAt: string;
  countryCode?: string;
  cityOrRegion?: string;
  topic: AiExternalKnowledgeTopic;
  confidence: "high" | "medium" | "low";
  canBePresentedAsFact: boolean;
  canBeUsedAsProjectFact: false;
  requiresReview: boolean;
  warningRu?: string;
};

export const AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER: AiExternalKnowledgeSourceType[] = [
  "official_regulation",
  "official_tax_source",
  "official_accounting_source",
  "official_finance_source",
  "manufacturer_manual",
  "technical_card",
  "external_marketplace",
  "supplier_site",
  "trusted_construction_reference",
  "trusted_accounting_reference",
  "trusted_finance_reference",
  "price_reference",
  "general_knowledge",
  "controlled_external_source",
  "unknown",
];

export const AI_EXTERNAL_KNOWLEDGE_PUBLIC_SOURCE_TYPES: AiExternalKnowledgeSourceType[] = [
  "official_regulation",
  "official_tax_source",
  "official_accounting_source",
  "official_finance_source",
  "manufacturer_manual",
  "technical_card",
  "external_marketplace",
  "supplier_site",
  "trusted_construction_reference",
  "trusted_accounting_reference",
  "trusted_finance_reference",
  "price_reference",
];

export function getAiExternalKnowledgeTrustWeight(sourceType: AiExternalKnowledgeSourceType): number {
  const index = AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.indexOf(sourceType);
  return index === -1 ? 0 : AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.length - index;
}

export function inferAiExternalDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function makeAiExternalSourceRef(
  source: Omit<AiExternalKnowledgeSourceRef, "domain" | "canBeUsedAsProjectFact"> & {
    domain?: string;
  },
): AiExternalKnowledgeSourceRef {
  return {
    ...source,
    domain: source.domain ?? inferAiExternalDomain(source.url),
    canBeUsedAsProjectFact: false,
  };
}
