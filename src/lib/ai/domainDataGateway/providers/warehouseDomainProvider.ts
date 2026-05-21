import type { AiDomainProvider } from "../aiDomainProviderContract";
import { AI_DOMAIN_GATEWAY_SOURCE_REFS, createFoundAiDomainResult, fact, getAiDomainGatewayDataset, refs } from "../aiDomainReadModel";

export const warehouseDomainProvider: AiDomainProvider = {
  domain: "warehouse",
  capabilities: ["count", "list", "detail", "trace", "linked_objects", "breakdown", "missing_data", "draft_context"],
  canHandle: (query) => query.domain === "warehouse",
  execute: async (query) => {
    const dataset = getAiDomainGatewayDataset();
    const sourceRefs = refs(
      AI_DOMAIN_GATEWAY_SOURCE_REFS.warehouseIssue,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.warehouseStockGkl,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.request124,
      AI_DOMAIN_GATEWAY_SOURCE_REFS.workGkl,
    );
    return createFoundAiDomainResult({
      queryId: query.id,
      domain: "warehouse",
      summaryRu: "ГКЛ 12.5 мм выдан на Дом 1, этаж 1, работу ГКЛ перегородки: выдано 20 листов, остаток 0, недостача 60.",
      sourceRefs,
      numericFacts: [
        fact("gkl_required", dataset.warehouse.gkl.requiredSheets, "ГКЛ требуется", [sourceRefs[2].id], "листов"),
        fact("gkl_issued", dataset.warehouse.gkl.issuedSheets, "ГКЛ выдано", [sourceRefs[0].id], "листов"),
        fact("gkl_remaining", dataset.warehouse.gkl.remainingSheets, "Остаток ГКЛ", [sourceRefs[1].id], "листов"),
        fact("gkl_shortage", dataset.warehouse.gkl.shortageSheets, "Недостача ГКЛ", [sourceRefs[1].id, sourceRefs[2].id], "листов"),
        fact("warehouse_positions_total", dataset.warehouse.positionsTotal, "Складских позиций", [sourceRefs[1].id]),
        fact("warehouse_deficits_total", dataset.warehouse.deficitsTotal, "Дефицитов на складе", [sourceRefs[1].id]),
        fact("first_floor_issues", dataset.warehouse.firstFloorIssues, "Выдач на первый этаж", [sourceRefs[0].id]),
      ],
      factsRu: [
        {
          textRu: "Складская выдача №88 связана с заявкой №124 и работой ГКЛ перегородки.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[2].id, sourceRefs[3].id],
        },
        {
          textRu: "Профиль выдан: 80 м, остаток профиля: 40 м.",
          sourceRefIds: [sourceRefs[0].id, sourceRefs[1].id],
        },
      ],
      missingData: ["закупка на недостающие 60 листов ГКЛ еще не создана"],
      checkedSources: [{ sourceRu: "складские остатки и выдачи", status: "used" }],
    });
  },
  healthCheck: async () => ({ ready: true }),
};
