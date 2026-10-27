import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildForemanCloseoutWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const closableToday = 2;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "foreman",
    shortAnswerRu: `Сегодня можно закрыть ${closableToday} работы. Еще ${dataset.contractor.needsPhoto} работы требуют фото, ${dataset.contractor.needsAct} работа требует акт, работа по ГКЛ заблокирована материалами.`,
    businessState: {
      currentStatusRu: "Закрытие работ возможно только после evidence и актов.",
      blockerRu: `По ГКЛ не хватает ${dataset.warehouse.gkl.shortageSheets} листов.`,
      priorityRu: "Сначала фото и акт скрытых работ, затем материалы ГКЛ.",
    },
    facts: [
      {
        textRu: `Штукатурка - Дом 1, этаж 1 - можно закрыть после фото.`,
        sourceRefIds: [sourceRefIds.workPlaster],
        numericFacts: [{ key: "closable_today", value: closableToday }],
      },
      {
        textRu: `Гидроизоляция санузла требует фото подтверждения; всего фото не хватает по ${dataset.contractor.needsPhoto} работам.`,
        sourceRefIds: [sourceRefIds.workWaterproofing],
        numericFacts: [{ key: "needs_photo", value: dataset.contractor.needsPhoto }],
      },
      {
        textRu: `Электрика требует акт скрытых работ; количество работ с актом: ${dataset.contractor.needsAct}.`,
        sourceRefIds: [sourceRefIds.workElectrical],
        numericFacts: [{ key: "needs_act", value: dataset.contractor.needsAct }],
      },
      {
        textRu: `ГКЛ требуется ${dataset.warehouse.gkl.requiredSheets} листов, выдано ${dataset.warehouse.gkl.issuedSheets}, остаток ${dataset.warehouse.gkl.remainingSheets}, недостача ${dataset.warehouse.gkl.shortageSheets}.`,
        sourceRefIds: [sourceRefIds.workGkl, sourceRefIds.warehouseIssue, sourceRefIds.request124],
        numericFacts: [
          { key: "gkl_required", value: dataset.warehouse.gkl.requiredSheets, unit: "листов" },
          { key: "gkl_issued", value: dataset.warehouse.gkl.issuedSheets, unit: "листов" },
          { key: "gkl_remaining", value: dataset.warehouse.gkl.remainingSheets, unit: "листов" },
          { key: "gkl_shortage", value: dataset.warehouse.gkl.shortageSheets, unit: "листов" },
          { key: "profile_issued", value: dataset.warehouse.profile.issuedMeters, unit: "м" },
          { key: "profile_remaining", value: dataset.warehouse.profile.remainingMeters, unit: "м" },
        ],
      },
    ],
    chain: [
      { stepRu: "Фото по штукатурке и гидроизоляции нужно загрузить", sourceRefIds: [sourceRefIds.workPlaster, sourceRefIds.workWaterproofing], status: "pending" },
      { stepRu: "Акт скрытых работ по электрике нужно подготовить", sourceRefIds: [sourceRefIds.workElectrical], status: "pending" },
      { stepRu: "ГКЛ перегородки заблокированы недостачей", sourceRefIds: [sourceRefIds.workGkl, sourceRefIds.warehouseStock], status: "blocked" },
      { stepRu: "Черновик запроса на закупку можно подготовить", sourceRefIds: [sourceRefIds.request124], status: "draft" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.workPlaster,
      sourceRefIds.workWaterproofing,
      sourceRefIds.workElectrical,
      sourceRefIds.workGkl,
      sourceRefIds.request124,
      sourceRefIds.warehouseIssue,
    ]),
    draft: {
      titleRu: "Черновик сообщения по ГКЛ",
      bodyRu: `Прошу подтвердить закупку недостающих ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ для работы "${dataset.procurement.mainRequest.workRu}", Дом 1, этаж 1.`,
      draftType: "act_draft",
      finalSubmitAllowed: false,
    },
    missingData: ["2 фото подтверждения", "акт скрытых работ по электрике", "60 листов ГКЛ"],
    nextStepRu: "Загрузить фото по двум работам и подготовить акт по электрике; работы не закрывать без подтверждения.",
    statusRu: "Черновик подготовлен",
  });
}
