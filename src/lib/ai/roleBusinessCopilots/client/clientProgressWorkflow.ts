import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildClientProgressWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const completedTasks = 5;
  const delayedTasks = 2;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "client",
    shortAnswerRu: `По вашему объекту за неделю выполнено ${completedTasks} задач. ${delayedTasks} задачи задерживаются из-за материалов и документов.`,
    businessState: {
      currentStatusRu: "Показан клиентский прогресс без внутренних финансов.",
      blockerRu: "ГКЛ задерживается из-за материалов, электрика - из-за акта скрытых работ.",
      priorityRu: "Открыть фотоотчет за неделю.",
    },
    facts: [
      {
        textRu: "Выполнена часть работ по первому этажу, подготовлены фото по двум работам, часть материалов выдана на объект.",
        sourceRefIds: [sourceRefIds.clientReport, sourceRefIds.workPlaster, sourceRefIds.workWaterproofing],
        numericFacts: [
          { key: "client_completed_tasks", value: completedTasks },
          { key: "client_delayed_tasks", value: delayedTasks },
        ],
      },
      {
        textRu: `Работа ГКЛ задерживается: не хватает ${dataset.warehouse.gkl.shortageSheets} листов ГКЛ; электрика ждет акт скрытых работ.`,
        sourceRefIds: [sourceRefIds.clientReport, sourceRefIds.workGkl, sourceRefIds.workElectrical],
        numericFacts: [
          { key: "client_visible_gkl_shortage", value: dataset.warehouse.gkl.shortageSheets, unit: "листов" },
          { key: "client_visible_missing_act", value: 1 },
        ],
      },
    ],
    chain: [
      { stepRu: "Фотоотчет подготовлен для клиента", sourceRefIds: [sourceRefIds.clientReport], status: "done" },
      { stepRu: "Работы первого этажа частично выполнены", sourceRefIds: [sourceRefIds.workPlaster, sourceRefIds.workWaterproofing], status: "done" },
      { stepRu: "ГКЛ задерживается материалами", sourceRefIds: [sourceRefIds.workGkl], status: "blocked" },
      { stepRu: "Электрика задерживается актом", sourceRefIds: [sourceRefIds.workElectrical], status: "blocked" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.clientReport,
      sourceRefIds.workPlaster,
      sourceRefIds.workWaterproofing,
      sourceRefIds.workGkl,
      sourceRefIds.workElectrical,
    ]),
    missingData: ["поставка недостающего ГКЛ", "акт скрытых работ по электрике"],
    nextStepRu: "Открыть фотоотчет за неделю и посмотреть разрешенные документы.",
    statusRu: "Доступ ограничен",
  });
}
