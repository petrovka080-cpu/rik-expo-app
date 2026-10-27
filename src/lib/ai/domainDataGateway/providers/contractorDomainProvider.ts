import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const contractorDomainProvider: AiDomainProvider = {
  domain: "contractors",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "missing_data"],
  canHandle: (query) => query.domain === "contractors",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.contractorScope, AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "contractors",
      summaryRu: "У подрядчика 4 открытые работы: 2 требуют фото, 1 требует акт, 1 имеет открытое замечание.",
      sourceRefs,
      numericFacts: [
        fact("contractor_open_works", dataset.contractor.openWorks, "Открытые работы подрядчика", [sourceRefs[0].id]),
        fact("contractor_needs_photo", dataset.contractor.needsPhoto, "Работы требуют фото", [sourceRefs[0].id]),
        fact("contractor_needs_act", dataset.contractor.needsAct, "Работы требуют акт", [sourceRefs[0].id]),
        fact("contractor_open_remarks", dataset.contractor.openRemarks, "Открытые замечания", [sourceRefs[0].id]),
      ],
      factsRu: [
        {
          textRu: "Contractor provider возвращает только собственный scope подрядчика.",
          sourceRefIds: [sourceRefs[0].id],
        },
      ],
      missingData: ["2 фото", "1 акт", "ответ по открытому замечанию"],
      checkedSources: [{ sourceRu: "contractor own scope", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
