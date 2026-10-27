import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildContractorAcceptanceWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "contractor",
    shortAnswerRu: `У вас ${dataset.contractor.openWorks} открытые работы. ${dataset.contractor.needsPhoto} требуют фото, ${dataset.contractor.needsAct} требует акт, ${dataset.contractor.openRemarks} имеет открытое замечание.`,
    businessState: {
      currentStatusRu: "Показан только scope подрядчика.",
      blockerRu: "Фото, акт и открытое замечание мешают приемке.",
      priorityRu: "Закрыть evidence перед запросом приемки.",
    },
    facts: [
      {
        textRu: `Работа "Штукатурка" - нужно фото после выполнения.`,
        sourceRefIds: [sourceRefIds.workPlaster, sourceRefIds.contractor],
        numericFacts: [
          { key: "contractor_open_works", value: dataset.contractor.openWorks },
          { key: "contractor_needs_photo", value: dataset.contractor.needsPhoto },
        ],
      },
      {
        textRu: `Работа "Гидроизоляция" - нужно фото подтверждения.`,
        sourceRefIds: [sourceRefIds.workWaterproofing, sourceRefIds.contractor],
        numericFacts: [{ key: "contractor_photo_work", value: 1 }],
      },
      {
        textRu: `Работа "Электрика" - нужен акт скрытых работ.`,
        sourceRefIds: [sourceRefIds.workElectrical, sourceRefIds.contractor],
        numericFacts: [{ key: "contractor_needs_act", value: dataset.contractor.needsAct }],
      },
      {
        textRu: `Работа "ГКЛ" - есть ${dataset.contractor.openRemarks} открытое замечание.`,
        sourceRefIds: [sourceRefIds.workGkl, sourceRefIds.contractor],
        numericFacts: [{ key: "contractor_open_remarks", value: dataset.contractor.openRemarks }],
      },
    ],
    chain: [
      { stepRu: "Проверить свои открытые работы", sourceRefIds: [sourceRefIds.contractor], status: "done" },
      { stepRu: "Загрузить 2 фото", sourceRefIds: [sourceRefIds.workPlaster, sourceRefIds.workWaterproofing], status: "pending" },
      { stepRu: "Подготовить акт по электрике", sourceRefIds: [sourceRefIds.workElectrical], status: "pending" },
      { stepRu: "Ответить по замечанию ГКЛ", sourceRefIds: [sourceRefIds.workGkl], status: "draft" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.workPlaster,
      sourceRefIds.workWaterproofing,
      sourceRefIds.workElectrical,
      sourceRefIds.workGkl,
      sourceRefIds.contractor,
    ]),
    draft: {
      titleRu: "Черновик ответа прорабу",
      bodyRu: "Готов загрузить недостающие фото и подготовить акт по электрике. Прошу подтвердить список замечаний по работе ГКЛ.",
      draftType: "contractor_message",
      finalSubmitAllowed: false,
    },
    missingData: ["2 фото", "акт скрытых работ", "подтверждение замечания по ГКЛ"],
    nextStepRu: "Загрузить 2 фото и подготовить черновик акта; работы не закрывать автоматически.",
    statusRu: "Доступ ограничен",
  });
}
