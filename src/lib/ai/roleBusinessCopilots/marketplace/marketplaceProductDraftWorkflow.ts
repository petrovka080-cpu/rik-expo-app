import { makeAiRoleWorkflowAnswer } from "../aiRoleWorkflowAnswerComposer";
import { makeAiRoleWorkflowOpenLinks } from "../aiRoleWorkflowContextBuilder";
import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowRequest,
} from "../aiRoleWorkflowTypes";

export function buildMarketplaceProductDraftWorkflowAnswer(
  context: AiRoleWorkflowContext,
  request: AiRoleWorkflowRequest,
): AiRoleWorkflowAnswer {
  const { dataset, sourceRefIds } = context;
  const missingFields = 7;

  return makeAiRoleWorkflowAnswer({
    context,
    request,
    workflowId: request.workflowId,
    role: "marketplace_user",
    shortAnswerRu: "Похоже, на фото металлический профиль для гипсокартонных конструкций. Я подготовил только черновик карточки.",
    businessState: {
      currentStatusRu: "Карточка не опубликована.",
      blockerRu: "Нужны точные характеристики, цена, остаток и поставщик.",
      priorityRu: "Проверить характеристики перед публикацией.",
    },
    facts: [
      {
        textRu: "Черновик: профиль металлический для ГКЛ, категория - строительные материалы, подкатегория - гипсокартонные системы.",
        sourceRefIds: [sourceRefIds.marketplaceProduct],
        numericFacts: [
          { key: "similar_internal_products", value: dataset.marketplace.internalMarketplaceOptions },
          { key: "missing_product_fields", value: missingFields },
        ],
      },
      {
        textRu: `Применение: перегородки, облицовка стен, потолки; связан с работой "${dataset.procurement.mainRequest.workRu}" и заявкой №${dataset.procurement.mainRequest.number}.`,
        sourceRefIds: [sourceRefIds.marketplaceProduct, sourceRefIds.workGkl, sourceRefIds.request124],
        numericFacts: [{ key: "linked_work_requests", value: 2 }],
      },
      {
        textRu: "Цена, размер и производитель не определены по evidence, поэтому не заполняются как факт.",
        sourceRefIds: [sourceRefIds.marketplaceProduct, sourceRefIds.supplier],
        numericFacts: [{ key: "invented_price", value: 0 }],
      },
    ],
    chain: [
      { stepRu: "Определить товар по фото как черновик", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "draft" },
      { stepRu: "Сопоставить с категорией ГКЛ", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "done" },
      { stepRu: "Проверить похожие товары", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "pending" },
      { stepRu: "Публикация запрещена без подтверждения", sourceRefIds: [sourceRefIds.marketplaceProduct], status: "blocked" },
    ],
    openLinks: makeAiRoleWorkflowOpenLinks(context, [
      sourceRefIds.marketplaceProduct,
      sourceRefIds.supplier,
      sourceRefIds.workGkl,
      sourceRefIds.request124,
    ]),
    draft: {
      titleRu: "Черновик карточки товара",
      bodyRu: "Название: Профиль металлический для ГКЛ. Категория: Строительные материалы. Единица: штука / метр. Применение: перегородки, облицовка стен, потолки.",
      draftType: "marketplace_product_draft",
      finalSubmitAllowed: false,
    },
    missingData: ["точный тип профиля", "размер", "длина", "толщина металла", "производитель", "цена", "остаток", "поставщик"],
    nextStepRu: "Проверить характеристики и отправить карточку на публикацию только после подтверждения человеком.",
    statusRu: "Черновик подготовлен",
  });
}
