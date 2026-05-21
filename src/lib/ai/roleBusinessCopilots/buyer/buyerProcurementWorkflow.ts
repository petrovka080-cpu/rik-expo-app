import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildBuyerProcurementWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const totalOptions = dataset.marketplace.totalOptionsWhenConnected;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "buyer",
    shortAnswerRu: `По заявке №${dataset.procurement.mainRequest.number} нужно докупить ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ 12.5 мм.`,
    businessState: {
      currentStatusRu: dataset.procurement.mainRequest.statusRu,
      blockerRu: `Склад выдал только ${dataset.warehouse.gkl.issuedSheets} из ${dataset.warehouse.gkl.requiredSheets} листов.`,
      priorityRu: "Сначала внутренний marketplace и история поставщиков, затем внешние источники.",
    },
    facts: [
      {
        textRu: `Заявка №${dataset.procurement.mainRequest.number}: требуется ${dataset.warehouse.gkl.requiredSheets}, выдано ${dataset.warehouse.gkl.issuedSheets}, остаток ${dataset.warehouse.gkl.remainingSheets}, недостача ${dataset.warehouse.gkl.shortageSheets}.`,
        sourceRefIds: [sourceRefIds.request124, sourceRefIds.warehouseIssue, sourceRefIds.warehouseStock],
        numericFacts: [
          { key: "request_quantity", value: dataset.warehouse.gkl.requiredSheets, unit: "листов" },
          { key: "warehouse_issued", value: dataset.warehouse.gkl.issuedSheets, unit: "листов" },
          { key: "warehouse_remaining", value: dataset.warehouse.gkl.remainingSheets, unit: "листов" },
          { key: "purchase_needed", value: dataset.warehouse.gkl.shortageSheets, unit: "листов" },
        ],
      },
      {
        textRu: `Варианты: внутренний marketplace - ${dataset.marketplace.internalMarketplaceOptions}, история закупок - ${dataset.marketplace.supplierHistoryOptions}, внешние источники - ${dataset.marketplace.externalOptionsWhenConnected} при подключенном provider.`,
        sourceRefIds: [sourceRefIds.marketplaceProduct, sourceRefIds.supplier],
        numericFacts: [
          { key: "internal_marketplace_options", value: dataset.marketplace.internalMarketplaceOptions },
          { key: "supplier_history_options", value: dataset.marketplace.supplierHistoryOptions },
          { key: "external_options_when_connected", value: dataset.marketplace.externalOptionsWhenConnected },
          { key: "total_options_when_connected", value: totalOptions },
        ],
      },
    ],
    chain: [
      { stepRu: "Заявка утверждена директором", sourceRefIds: [sourceRefIds.request124], status: "done" },
      { stepRu: "Склад проверен: остаток 0 листов", sourceRefIds: [sourceRefIds.warehouseStock], status: "done" },
      { stepRu: "Недостача 60 листов рассчитана по заявке и выдаче", sourceRefIds: [sourceRefIds.request124, sourceRefIds.warehouseIssue], status: "blocked" },
      { stepRu: "Marketplace и история поставщиков проверяются до внешних источников", sourceRefIds: [sourceRefIds.marketplaceProduct, sourceRefIds.supplier], status: "pending" },
      { stepRu: "Черновик закупки готовится без финального создания заказа", sourceRefIds: [sourceRefIds.request124], status: "draft" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.request124,
      sourceRefIds.marketplaceProduct,
      sourceRefIds.warehouseStock,
      sourceRefIds.supplier,
      sourceRefIds.workGkl,
    ]),
    draft: {
      titleRu: "Черновик закупки ГКЛ",
      bodyRu: `Товар: ГКЛ 12.5 мм. Количество: ${dataset.warehouse.gkl.shortageSheets} листов. Основание: заявка №${dataset.procurement.mainRequest.number}, Дом 1, этаж 1, работа "${dataset.procurement.mainRequest.workRu}".`,
      draftType: "purchase_draft",
      finalSubmitAllowed: false,
    },
    missingData: ["актуальная цена поставщика", "срок поставки", "подтверждение выбора поставщика"],
    nextStepRu: "Проверить цену и срок поставщика, затем отправить черновик закупки на согласование.",
    statusRu: "Черновик подготовлен",
    approvalRequired: true,
  });
}
