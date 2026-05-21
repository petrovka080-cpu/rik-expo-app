import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildWarehouseMovementWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "warehouse",
    shortAnswerRu: `ГКЛ 12.5 мм выдан на Дом 1, этаж 1, работу "${dataset.procurement.mainRequest.workRu}".`,
    businessState: {
      currentStatusRu: "Складские данные прочитаны без списаний и выдач.",
      blockerRu: `Остаток ГКЛ ${dataset.warehouse.gkl.remainingSheets}, недостача ${dataset.warehouse.gkl.shortageSheets} листов.`,
      priorityRu: "Подготовить черновик заявки на дефицит.",
    },
    facts: [
      {
        textRu: `Заявка №${dataset.procurement.mainRequest.number}: требуется ${dataset.warehouse.gkl.requiredSheets} листов, выдано ${dataset.warehouse.gkl.issuedSheets}, получатель - ${dataset.warehouse.gkl.receiverRu}.`,
        sourceRefIds: [sourceRefIds.request124, sourceRefIds.warehouseIssue],
        numericFacts: [
          { key: "request_quantity", value: dataset.warehouse.gkl.requiredSheets, unit: "листов" },
          { key: "issued_quantity", value: dataset.warehouse.gkl.issuedSheets, unit: "листов" },
        ],
      },
      {
        textRu: `Остаток после выдачи: ${dataset.warehouse.gkl.remainingSheets} листов, недостача: ${dataset.warehouse.gkl.shortageSheets} листов.`,
        sourceRefIds: [sourceRefIds.warehouseStock],
        numericFacts: [
          { key: "remaining_stock", value: dataset.warehouse.gkl.remainingSheets, unit: "листов" },
          { key: "shortage", value: dataset.warehouse.gkl.shortageSheets, unit: "листов" },
        ],
      },
      {
        textRu: `Профиль выдан: ${dataset.warehouse.profile.issuedMeters} м, остаток: ${dataset.warehouse.profile.remainingMeters} м; саморезы - дефицит ${dataset.warehouse.screws.shortagePacks} упаковок; лента - дефицит ${dataset.warehouse.tape.shortageRolls} рулонов.`,
        sourceRefIds: [sourceRefIds.warehouseStock, sourceRefIds.warehouseIssue],
        numericFacts: [
          { key: "profile_issued", value: dataset.warehouse.profile.issuedMeters, unit: "м" },
          { key: "profile_remaining", value: dataset.warehouse.profile.remainingMeters, unit: "м" },
          { key: "screws_shortage", value: dataset.warehouse.screws.shortagePacks, unit: "упаковок" },
          { key: "tape_shortage", value: dataset.warehouse.tape.shortageRolls, unit: "рулонов" },
        ],
      },
    ],
    chain: [
      { stepRu: "Заявка №124 требует ГКЛ", sourceRefIds: [sourceRefIds.request124], status: "done" },
      { stepRu: "Склад выдал 20 листов на работу ГКЛ", sourceRefIds: [sourceRefIds.warehouseIssue, sourceRefIds.workGkl], status: "done" },
      { stepRu: "Остаток стал 0 листов", sourceRefIds: [sourceRefIds.warehouseStock], status: "blocked" },
      { stepRu: "Нужно подготовить черновик заявки на дефицит 60 листов", sourceRefIds: [sourceRefIds.request124], status: "draft" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.request124,
      sourceRefIds.warehouseIssue,
      sourceRefIds.workGkl,
      sourceRefIds.warehouseStock,
    ]),
    draft: {
      titleRu: "Черновик заявки на дефицит",
      bodyRu: `Запросить ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ 12.5 мм для заявки №${dataset.procurement.mainRequest.number}.`,
      draftType: "purchase_draft",
      finalSubmitAllowed: false,
    },
    missingData: ["подтвержденный поставщик", "срок поставки"],
    nextStepRu: "Подготовить черновик заявки на недостающие 60 листов и отправить на согласование.",
    statusRu: "Данные не изменены",
    approvalRequired: true,
  });
}
