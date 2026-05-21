import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildOfficeStuckWorkWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const stuckTasks = 7;
  const overdueTasks = 3;
  const docsTasks = 2;
  const approvalTasks = 2;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "office",
    shortAnswerRu: `В офисе ${stuckTasks} зависших задач. ${overdueTasks} просрочены, ${docsTasks} требуют документов, ${approvalTasks} ждут approval.`,
    businessState: {
      currentStatusRu: "Зависшие задачи собраны как safe-read обзор.",
      blockerRu: "Счет №45 ждет акт, платеж №77 требует документов, заявка №124 требует решения по закупке.",
      priorityRu: "Сначала документы и approval, затем напоминания.",
    },
    facts: [
      {
        textRu: `Счет №45 ждет акт, платеж №77 требует документов, заявка №${dataset.procurement.mainRequest.number} требует решения по закупке.`,
        sourceRefIds: [sourceRefIds.invoice45, sourceRefIds.payment77, sourceRefIds.request124],
        numericFacts: [
          { key: "stuck_tasks", value: stuckTasks },
          { key: "overdue_tasks", value: overdueTasks },
          { key: "document_tasks", value: docsTasks },
          { key: "approval_tasks", value: approvalTasks },
        ],
      },
      {
        textRu: "Акт по электрике не подготовлен, фото по двум работам нужно загрузить.",
        sourceRefIds: [sourceRefIds.workElectrical, sourceRefIds.workPlaster, sourceRefIds.workWaterproofing],
        numericFacts: [
          { key: "missing_act_tasks", value: dataset.contractor.needsAct },
          { key: "missing_photo_tasks", value: dataset.contractor.needsPhoto },
        ],
      },
    ],
    chain: [
      { stepRu: "Бухгалтер проверяет документы оплаты", sourceRefIds: [sourceRefIds.payment77], status: "pending" },
      { stepRu: "Прораб загружает фото", sourceRefIds: [sourceRefIds.workPlaster, sourceRefIds.workWaterproofing], status: "pending" },
      { stepRu: "Директор принимает решение по заявке", sourceRefIds: [sourceRefIds.request124], status: "pending" },
      { stepRu: "Снабженец готовит закупку ГКЛ", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "draft" },
      { stepRu: "Office готовит напоминание без финальной отправки", sourceRefIds: [sourceRefIds.invoice45], status: "draft" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.payment77,
      sourceRefIds.pdfInvoice45,
      sourceRefIds.request124,
      sourceRefIds.workElectrical,
      sourceRefIds.workPlaster,
      sourceRefIds.workWaterproofing,
    ]),
    draft: {
      titleRu: "Черновик напоминания",
      bodyRu: "Просьба загрузить акт по счету №45 и фото по работам первого этажа. Напоминание не отправлено.",
      draftType: "reminder_draft",
      finalSubmitAllowed: false,
    },
    missingData: ["акт по счету №45", "фото по двум работам", "подтверждение решения по закупке"],
    nextStepRu: "Проверить черновик напоминания и отправить его только после подтверждения ответственным пользователем.",
    statusRu: "Черновик подготовлен",
    approvalRequired: true,
  });
}
