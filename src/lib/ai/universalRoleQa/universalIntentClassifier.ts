import {
  includesAnyNormalized,
  normalizeUniversalRoleQaQuestion,
} from "./universalQuestionNormalizer";
import { classifyEstimateIntent } from "../estimateRouting/estimateIntentClassifier";

export type UniversalRoleQaIntent =
  | "app_data_count"
  | "app_data_list"
  | "app_data_breakdown"
  | "app_data_trend"
  | "procurement_request_review"
  | "procurement_offer_selection"
  | "marketplace_supplier_search"
  | "marketplace_product_draft"
  | "warehouse_stock_review"
  | "warehouse_issue_trace"
  | "warehouse_deficit_review"
  | "finance_payment_review"
  | "finance_debt_review"
  | "finance_partial_payment_review"
  | "accounting_entry_help"
  | "field_work_review"
  | "field_work_closeout_help"
  | "contractor_acceptance_review"
  | "document_pdf_explanation"
  | "document_missing_links_review"
  | "document_payment_blocker_review"
  | "director_decision_summary"
  | "office_stuck_work_review"
  | "client_progress_review"
  | "construction_estimate"
  | "construction_material_calculation"
  | "construction_technology"
  | "construction_norm_reference"
  | "navigation_help"
  | "draft_action"
  | "unknown";

export function classifyUniversalRoleQaIntent(
  questionRu: string,
  role?: string,
): UniversalRoleQaIntent {
  const estimateRoute = classifyEstimateIntent(questionRu);
  if (estimateRoute.shouldCallEstimateTool) {
    return "construction_estimate";
  }

  const text = normalizeUniversalRoleQaQuestion(questionRu);

  if (includesAnyNormalized(text, ["что в этом pdf", "что в pdf", "что в документе", "что в этом пдф"])) {
    return "document_pdf_explanation";
  }
  if (includesAnyNormalized(text, ["с чем связан счет", "счет связан", "покажи pdf по заявке"])) {
    return "document_pdf_explanation";
  }
  if (includesAnyNormalized(text, ["какой документ блокирует", "блокирует оплат", "документов не хватает", "документы без связи", "документов без связи"])) {
    return text.includes("оплат") ? "document_payment_blocker_review" : "document_missing_links_review";
  }
  if (includesAnyNormalized(text, ["платежи без документов", "платеж без документов", "что мешает оплат", "платежи риск", "счетов к оплате"])) {
    return "finance_payment_review";
  }
  if (includesAnyNormalized(text, ["что проверить бухгалтеру"])) {
    return "finance_payment_review";
  }
  if (includesAnyNormalized(text, ["частичные оплат", "частичная оплат"])) return "finance_partial_payment_review";
  if (includesAnyNormalized(text, ["долг", "задолжен"])) return "finance_debt_review";
  if (includesAnyNormalized(text, ["проводк", "учитывать аванс", "статье отнести", "налог", "бухгалтер"])) {
    return "accounting_entry_help";
  }
  if (includesAnyNormalized(text, ["куда ушел", "куда ушла", "кому выдали", "что выдали", "выдача", "ушел гкл", "ушел профиль"])) {
    return "warehouse_issue_trace";
  }
  if (includesAnyNormalized(text, ["дефицит", "надо докупить", "не хватает материалов"])) return "warehouse_deficit_review";
  if (includesAnyNormalized(text, ["что есть на складе", "по складу", "остаток", "остатки"])) return "warehouse_stock_review";
  if (includesAnyNormalized(text, ["найди поставщиков", "поставщиков", "сравни поставщиков", "аналоги", "подбери варианты"])) {
    return "marketplace_supplier_search";
  }
  if (includesAnyNormalized(text, ["подготовь карточку", "добавь товар", "определи товар", "карточку товара"])) {
    return "marketplace_product_draft";
  }
  if (includesAnyNormalized(text, ["что купить по заявке", "подбери варианты по заявке"])) {
    return "procurement_offer_selection";
  }
  if (includesAnyNormalized(text, ["что купить снабженцу", "что купить"])) {
    return "procurement_request_review";
  }
  if (includesAnyNormalized(text, ["какие заявки пришли", "заявки без поставщика", "утвержденные заявки", "ждут утверждения", "заявки ждут"])) {
    return "procurement_request_review";
  }
  if (includesAnyNormalized(text, ["дай смету", "смету на", "смета на", "черновой расчет", "посчитай стоимость"])) {
    return "construction_estimate";
  }
  if (includesAnyNormalized(text, ["расход", "сколько нужно", "посчитай бетон", "сколько брусчатки", "сколько гкл"])) {
    return "construction_material_calculation";
  }
  if (includesAnyNormalized(text, ["как правильно", "как принять", "как проверить", "этапы монтажа", "технология"])) {
    return text.includes("норм") || text.includes("снип") ? "construction_norm_reference" : "construction_technology";
  }
  if (includesAnyNormalized(text, ["сколько", "количество", "за май", "за апрель", "за месяц"])) {
    return "app_data_count";
  }
  if (includesAnyNormalized(text, ["покажи", "выдай", "список", "какие заявки", "какие работы", "какие счета", "какие акты"])) {
    return "app_data_list";
  }
  if (includesAnyNormalized(text, ["разбивка", "по объектам", "по статусам"])) return "app_data_breakdown";
  if (includesAnyNormalized(text, ["динамика", "тренд", "по дням"])) return "app_data_trend";
  if (includesAnyNormalized(text, ["что мне решить", "что решить сегодня"])) return "director_decision_summary";
  if (includesAnyNormalized(text, ["что мне сделать", "что закрыть", "мои работы", "закрыть сегодня"])) {
    if (role === "director") return "director_decision_summary";
    if (role === "accountant") return "finance_payment_review";
    if (role === "buyer") return "procurement_request_review";
    if (role === "warehouse") return "warehouse_stock_review";
    if (role === "contractor") return "contractor_acceptance_review";
    return "field_work_review";
  }
  if (includesAnyNormalized(text, ["что блокирует", "что блокирует объект", "что застряло", "застряло"])) return "office_stuck_work_review";
  if (includesAnyNormalized(text, ["прогресс клиента", "что видит клиент"])) return "client_progress_review";
  if (includesAnyNormalized(text, ["закрытию работы", "закрыть работу", "акты не готовы"])) return "field_work_closeout_help";
  if (includesAnyNormalized(text, ["приемк", "замечания по мне", "мешает подрядчику"])) return "contractor_acceptance_review";
  if (includesAnyNormalized(text, ["открой", "где открыть", "перейди"])) return "navigation_help";
  if (includesAnyNormalized(text, ["подготовь", "черновик", "сформируй"])) return "draft_action";

  return "unknown";
}
