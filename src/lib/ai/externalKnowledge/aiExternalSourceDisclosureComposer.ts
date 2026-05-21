import type { AiExternalKnowledgeResult } from "./aiExternalKnowledgeRequest";
import type { AiExternalKnowledgeSourceRef } from "./aiExternalKnowledgeSourceTypes";

export function composeAiExternalSourceDisclosure(
  sources: AiExternalKnowledgeSourceRef[],
): AiExternalKnowledgeResult["sourceDisclosure"] {
  return {
    officialSourcesUsed: sources.some((source) =>
      source.sourceType === "official_regulation" ||
      source.sourceType === "official_tax_source" ||
      source.sourceType === "official_accounting_source" ||
      source.sourceType === "official_finance_source",
    ),
    manufacturerSourcesUsed: sources.some((source) =>
      source.sourceType === "manufacturer_manual" || source.sourceType === "technical_card",
    ),
    marketplaceSourcesUsed: sources.some((source) =>
      source.sourceType === "external_marketplace" || source.sourceType === "price_reference",
    ),
    publicWebUsed: sources.some((source) => source.origin === "public_web"),
    generalKnowledgeUsed: sources.some((source) => source.sourceType === "general_knowledge"),
    controlledExternalSourceUsed: sources.some((source) => source.sourceType === "controlled_external_source"),
  };
}
