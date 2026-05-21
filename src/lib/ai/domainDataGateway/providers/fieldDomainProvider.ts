import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const fieldDomainProvider: AiDomainProvider = {
  domain: "field",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "missing_data", "risk_summary"],
  canHandle: (query) => query.domain === "field",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl, AI_DOMAIN_GATEWAY_SOURCE_REFS.request124, AI_DOMAIN_GATEWAY_SOURCE_REFS.warehouseStockGkl);
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "field",
      summaryRu: "Работа ГКЛ перегородки находится на Дом 1, этаж 1 и заблокирована материалами: не хватает 60 листов ГКЛ.",
      sourceRefs,
      numericFacts: [
        fact("field_work_floor", 1, "Этаж работы ГКЛ", [sourceRefs[0].id]),
        fact("gkl_shortage", dataset.warehouse.gkl.shortageSheets, "Недостача ГКЛ блокирует работу", [sourceRefs[0].id, sourceRefs[2].id], "листов"),
        fact("closable_today", 2, "Работы, которые можно закрыть сегодня", [sourceRefs[0].id]),
        fact("needs_photo", 2, "Работы требуют фото", [sourceRefs[0].id]),
        fact("needs_act", 1, "Работы требуют акт", [sourceRefs[0].id]),
      ],
      factsRu: [
        {
          textRu: "ГКЛ перегородки нельзя закрыть автоматически: требуется докупить 60 листов.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[2].id],
          status: "blocked",
        },
      ],
      missingData: ["материалы для работы ГКЛ", "акт скрытых работ по электрике", "фото по двум работам"],
      checkedSources: [{ sourceRu: "работы, этажи и блокеры", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
