import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const procurementDomainProvider: AiDomainProvider = {
  domain: "procurement",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "breakdown", "draft_context"],
  canHandle: (query) => query.domain === "procurement",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.request124, AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "procurement",
      summaryRu: "За май 2026 найдено 14 заявок. Заявка №124 по ГКЛ связана с Домом 1, этажом 1 и работой ГКЛ перегородки.",
      sourceRefs,
      numericFacts: [
        fact("may_2026_requests_total", dataset.procurement.may2026Total, "Заявок за май 2026", [sourceRefs[0].id]),
        fact("request_124_required_gkl", dataset.procurement.mainRequest.requiredSheets, "ГКЛ требуется по заявке №124", [sourceRefs[0].id], "листов"),
        fact("request_124_floor", dataset.procurement.mainRequest.floor, "Этаж заявки №124", [sourceRefs[0].id, sourceRefs[1].id]),
      ],
      factsRu: [
        {
          textRu: "Заявка №124 утверждена директором и относится к работе ГКЛ перегородки.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[1].id],
        },
        {
          textRu: "По первому этажу в golden dataset есть 7 заявок.",
          sourceRefIds: [sourceRefs[0].id],
        },
      ],
      linkedObjectRefs: sourceRefs.map((ref) => ref.id),
      checkedSources: [{ sourceRu: "заявки и строки заявок", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
