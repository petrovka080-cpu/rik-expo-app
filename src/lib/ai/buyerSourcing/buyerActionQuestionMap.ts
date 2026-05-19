import type { BuyerActionQuestion } from "./buyerSourcingTypes";

export const BUYER_ACTION_QUESTION_MAP: readonly BuyerActionQuestion[] = [
  {
    screenId: "buyer.request.detail",
    actionId: "find_5_10_suppliers",
    labelRu: "Найти 5-10 вариантов",
    concreteQuestionRu:
      "Найди 5-10 реальных вариантов поставки по утвержденной заявке: сначала наш marketplace, затем approved vendors, история закупок, supplier offers, внешние marketplace и интернет-источники, если подключены.",
    requiredContext: ["approved_request", "request_line"],
    allowedSources: ["warehouse_stock", "own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    screenId: "buyer.request.detail",
    actionId: "check_warehouse_before_buy",
    labelRu: "Проверить склад",
    concreteQuestionRu:
      "Проверь, есть ли материал на складе или в incoming, и посчитай дефицит перед закупкой.",
    requiredContext: ["request_line"],
    allowedSources: ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "buyer_request"],
    answerMode: "read",
  },
  {
    screenId: "buyer.request.detail",
    actionId: "compare_suppliers",
    labelRu: "Сравнить цены и сроки",
    concreteQuestionRu:
      "Сравни найденных поставщиков по цене, сроку, наличию, доставке, соответствию спецификации и рискам.",
    requiredContext: ["request_line"],
    allowedSources: ["own_marketplace", "approved_vendor", "supplier_history", "supplier_offer", "external_marketplace", "internet_source"],
    answerMode: "read",
  },
  {
    screenId: "buyer.request.detail",
    actionId: "find_analogs",
    labelRu: "Найти аналоги",
    concreteQuestionRu:
      "Найди допустимые аналоги материала или услуги на основании спецификации, сметы, проекта и marketplace-источников.",
    requiredContext: ["request_line"],
    allowedSources: ["project_pdf", "estimate_line", "pdf_chunk", "own_marketplace", "approved_vendor", "external_marketplace"],
    answerMode: "read",
  },
  {
    screenId: "buyer.request.detail",
    actionId: "prepare_shortlist",
    labelRu: "Подготовить shortlist",
    concreteQuestionRu:
      "Подготовь shortlist из 3 лучших вариантов с причинами выбора, рисками и тем, что нужно проверить перед согласованием.",
    requiredContext: ["approved_request", "request_line"],
    allowedSources: ["buyer_request", "warehouse_stock", "own_marketplace", "supplier_offer", "approved_vendor", "supplier_history", "external_marketplace"],
    answerMode: "draft",
  },
  {
    screenId: "buyer.request.detail",
    actionId: "prepare_approval_handoff",
    labelRu: "Отправить на согласование",
    concreteQuestionRu:
      "Подготовь маршрут согласования по выбранному shortlist без создания заказа и без автоматического approval.",
    requiredContext: ["approved_request", "request_line"],
    allowedSources: ["buyer_request", "supplier_offer", "approval"],
    answerMode: "approval_route",
  },
  {
    screenId: "buyer.main",
    actionId: "urgent_delivery_options",
    labelRu: "Открыть срочные",
    concreteQuestionRu:
      "Покажи срочные заявки, которые блокируют работы, и что нужно сделать первым.",
    requiredContext: ["none"],
    allowedSources: ["buyer_request", "request_line", "warehouse_stock", "approval"],
    answerMode: "read",
  },
  {
    screenId: "buyer.main",
    actionId: "approved_request_sourcing",
    labelRu: "Найти поставщиков",
    concreteQuestionRu:
      "По утвержденным заявкам собери реальные варианты поставки из склада, нашего marketplace, approved vendors и истории закупок.",
    requiredContext: ["approved_request"],
    allowedSources: ["buyer_request", "warehouse_stock", "own_marketplace", "approved_vendor", "supplier_history"],
    answerMode: "read",
  },
  {
    screenId: "buyer.requests",
    actionId: "approved_request_sourcing",
    labelRu: "Подобрать по утвержденным",
    concreteQuestionRu:
      "Сгруппируй утвержденные заявки и покажи, где уже можно запускать sourcing.",
    requiredContext: ["approved_request"],
    allowedSources: ["buyer_request", "request_line", "warehouse_stock", "own_marketplace", "approval"],
    answerMode: "read",
  },
  {
    screenId: "buyer.requests",
    actionId: "missing_procurement_data",
    labelRu: "Показать без спецификации",
    concreteQuestionRu:
      "Покажи заявки, где не хватает спецификации, региона доставки, даты или бюджета для честного подбора.",
    requiredContext: ["none"],
    allowedSources: ["buyer_request", "request_line", "project_pdf", "pdf_chunk"],
    answerMode: "clarifying",
  },
  {
    screenId: "procurement.copilot",
    actionId: "prepare_rfq_draft",
    labelRu: "Подготовить RFQ",
    concreteQuestionRu:
      "Подготовь черновик запроса КП поставщикам по заявке, без финальной отправки.",
    requiredContext: ["request_line"],
    allowedSources: ["buyer_request", "request_line", "own_marketplace", "approved_vendor", "supplier_offer"],
    answerMode: "draft",
  },
  {
    screenId: "market.home",
    actionId: "own_marketplace_search",
    labelRu: "Найти по заявке",
    concreteQuestionRu:
      "Найди совместимые товары и услуги в нашем marketplace по текущей заявке.",
    requiredContext: ["request_line", "marketplace"],
    allowedSources: ["buyer_request", "request_line", "own_marketplace"],
    answerMode: "read",
  },
  {
    screenId: "supplier.showcase",
    actionId: "supplier_risk_check",
    labelRu: "Показать риски",
    concreteQuestionRu:
      "Покажи, какие заявки поставщик может закрыть, какие есть риски, история и что запросить перед shortlist.",
    requiredContext: ["supplier"],
    allowedSources: ["approved_vendor", "supplier_history", "supplier_offer"],
    answerMode: "read",
  },
] as const;

export function getBuyerActionQuestion(actionId: string, screenId?: string): BuyerActionQuestion | null {
  return BUYER_ACTION_QUESTION_MAP.find((action) =>
    action.actionId === actionId && (!screenId || action.screenId === screenId),
  ) ?? null;
}
