import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const marketplaceDomainProvider: AiDomainProvider = {
  domain: "marketplace",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "draft_context"],
  canHandle: (query) => query.domain === "marketplace",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.marketplaceGkl, AI_DOMAIN_GATEWAY_SOURCE_REFS.supplierStroymat, AI_DOMAIN_GATEWAY_SOURCE_REFS.request124);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "marketplace",
      summaryRu: "По ГКЛ 12.5 мм сначала проверены внутренний marketplace и история закупок: 2 внутренних варианта и 1 поставщик из истории.",
      sourceRefs,
      numericFacts: [
        fact("internal_marketplace_options", dataset.marketplace.internalMarketplaceOptions, "Внутренние варианты marketplace", [sourceRefs[0].id]),
        fact("supplier_history_options", dataset.marketplace.supplierHistoryOptions, "Поставщики из истории", [sourceRefs[1].id]),
        fact("external_options_when_connected", dataset.marketplace.externalOptionsWhenConnected, "Внешние варианты при подключенном provider", [sourceRefs[0].id]),
      ],
      factsRu: [
        {
          textRu: "Gateway не идет во внешний web до проверки внутреннего marketplace и supplier history.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[1].id],
        },
      ],
      checkedSources: [
        { sourceRu: "internal marketplace", status: "used" },
        { sourceRu: "supplier history", status: "used" },
      ],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
