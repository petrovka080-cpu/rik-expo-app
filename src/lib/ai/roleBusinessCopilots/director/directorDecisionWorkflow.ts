import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildDirectorDecisionWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const decisionsCount = 6;
  const status = dataset.procurement.mainRequest.statusRu;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "director",
    shortAnswerRu: `Сегодня у директора ${decisionsCount} решений. Самое критичное - заявка №${dataset.procurement.mainRequest.number} по ГКЛ для первого этажа: без нее блокируется работа "${dataset.procurement.mainRequest.workRu}".`,
    businessState: {
      currentStatusRu: status,
      blockerRu: `Недостача ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ и отсутствующий акт по платежу №77.`,
      riskRu: `В риске платеж на ${dataset.finance.payments[0]?.amountKgs ?? 0} KGS без полного пакета документов.`,
      priorityRu: "Высокий приоритет: материалы первого этажа и документы оплаты.",
    },
    facts: [
      {
        textRu: `Заявка №${dataset.procurement.mainRequest.number} утверждена, но нужно докупить ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ.`,
        sourceRefIds: [sourceRefIds.request124, sourceRefIds.warehouseStock],
        numericFacts: [
          { key: "decisions_count", value: decisionsCount },
          { key: "shortage_gkl", value: dataset.warehouse.gkl.shortageSheets, unit: "листов" },
        ],
      },
      {
        textRu: `Платеж №77 на ${dataset.finance.payments[0]?.amountKgs ?? 0} KGS требует документов: PDF счета есть, акта нет.`,
        sourceRefIds: [sourceRefIds.payment77, sourceRefIds.pdfInvoice45],
        numericFacts: [{ key: "payment_risk_sum", value: dataset.finance.payments[0]?.amountKgs ?? 0, unit: "KGS" }],
      },
      {
        textRu: `На складе ${dataset.warehouse.deficitsTotal} дефицита, на первый этаж выдано ${dataset.warehouse.firstFloorIssues} позиций.`,
        sourceRefIds: [sourceRefIds.warehouseIssue, sourceRefIds.warehouseStock],
        numericFacts: [
          { key: "warehouse_deficits", value: dataset.warehouse.deficitsTotal },
          { key: "floor_issues", value: dataset.warehouse.firstFloorIssues },
        ],
      },
    ],
    chain: [
      { stepRu: `Заявка №${dataset.procurement.mainRequest.number} создана прорабом`, sourceRefIds: [sourceRefIds.request124], status: "done" },
      { stepRu: "Директор утвердил заявку", sourceRefIds: [sourceRefIds.request124], status: "done" },
      { stepRu: `${dataset.warehouse.gkl.issuedSheets} листов ГКЛ выданы со склада`, sourceRefIds: [sourceRefIds.warehouseIssue], status: "done" },
      { stepRu: `Остаток ГКЛ: ${dataset.warehouse.gkl.remainingSheets}`, sourceRefIds: [sourceRefIds.warehouseStock], status: "blocked" },
      { stepRu: `Недостача: ${dataset.warehouse.gkl.shortageSheets} листов`, sourceRefIds: [sourceRefIds.warehouseStock], status: "blocked" },
      { stepRu: "Черновик закупки еще нужно отправить на согласование", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "pending" },
      { stepRu: "Платеж №77 имеет PDF счета, но нет акта", sourceRefIds: [sourceRefIds.payment77, sourceRefIds.pdfInvoice45], status: "blocked" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.request124,
      sourceRefIds.workGkl,
      sourceRefIds.warehouseStock,
      sourceRefIds.payment77,
      sourceRefIds.pdfInvoice45,
    ]),
    missingData: ["акт по счету №45", "выбранный поставщик для недостающих 60 листов ГКЛ"],
    nextStepRu: `Открыть заявку №${dataset.procurement.mainRequest.number}, подготовить решение по закупке ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ и запросить акт по платежу №77.`,
    statusRu: "Данные не изменены",
    approvalRequired: true,
  });
}
