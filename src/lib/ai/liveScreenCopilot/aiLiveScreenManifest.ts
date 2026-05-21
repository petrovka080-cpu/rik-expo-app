import type { AiLiveScreenActionMode } from "./aiLiveScreenButtonContract";

export type AiLiveScreenRole =
  | "director"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "office"
  | "documents"
  | "marketplace_user"
  | "client"
  | "admin"
  | "security";

export type AiLiveScreenDomain =
  | "procurement"
  | "warehouse"
  | "finance"
  | "field"
  | "documents"
  | "marketplace"
  | "reports"
  | "office"
  | "client"
  | "security"
  | "construction_knowledge"
  | "accounting_knowledge"
  | "public_web";

export type AiLiveScreenAnswerSection =
  | "short"
  | "found"
  | "links"
  | "chain"
  | "sources"
  | "missing"
  | "next_step"
  | "status";

export type AiLiveScreenManifest = {
  screenId: string;
  route: string;
  role: AiLiveScreenRole;
  titleRu: string;
  userGoalRu: string;
  defaultQuestionRu: string;
  allowedDomains: AiLiveScreenDomain[];
  requiredAiButtons: string[];
  requiredAnswerSections: AiLiveScreenAnswerSection[];
  normalUserForbiddenTextSignals: string[];
  allowedActionModes: AiLiveScreenActionMode[];
};

const REQUIRED_SECTIONS: AiLiveScreenAnswerSection[] = [
  "short",
  "found",
  "links",
  "chain",
  "sources",
  "missing",
  "next_step",
  "status",
];

export const AI_LIVE_SCREEN_FORBIDDEN_TEXT_SIGNALS = [
  "provider unavailable",
  "runtime",
  "debug",
  "trace",
  "intent",
  "entity",
  "source planner",
  "raw payload",
  "JSON",
  "policy internals",
  "semantic guard",
  "fallback",
  "screen manifest",
  "service_role",
] as const;

function manifest(input: Omit<AiLiveScreenManifest, "requiredAnswerSections" | "normalUserForbiddenTextSignals" | "allowedActionModes">): AiLiveScreenManifest {
  return {
    ...input,
    requiredAnswerSections: REQUIRED_SECTIONS,
    normalUserForbiddenTextSignals: [...AI_LIVE_SCREEN_FORBIDDEN_TEXT_SIGNALS],
    allowedActionModes: ["safe_read", "draft_only", "approval_required"],
  };
}

export const AI_LIVE_SCREEN_MANIFESTS: readonly AiLiveScreenManifest[] = [
  manifest({
    screenId: "director",
    route: "/ai?context=director",
    role: "director",
    titleRu: "Готово от AI · Решения сегодня",
    userGoalRu: "Показать решения, риски, approval, платежи, склад, работы и документы.",
    defaultQuestionRu: "Покажи, какие решения директор должен принять сегодня.",
    allowedDomains: ["procurement", "warehouse", "finance", "field", "documents", "reports", "office"],
    requiredAiButtons: [
      "director.today_decisions",
      "director.critical_risks",
      "director.pending_approvals",
      "director.risky_payments",
      "director.object_blockers",
      "director.unlinked_documents",
      "director.executive_summary",
    ],
  }),
  manifest({
    screenId: "foreman",
    route: "/ai?context=foreman",
    role: "foreman",
    titleRu: "Готово от AI · Работы сегодня",
    userGoalRu: "Показать работы, материалы, фото, акты и блокеры закрытия.",
    defaultQuestionRu: "Покажи, что прорабу нужно закрыть сегодня.",
    allowedDomains: ["field", "warehouse", "procurement", "documents", "construction_knowledge"],
    requiredAiButtons: [
      "foreman.close_today",
      "foreman.floor_works",
      "foreman.missing_photos",
      "foreman.issued_materials",
      "foreman.work_blockers",
      "foreman.act_draft",
      "foreman.work_estimate",
    ],
  }),
  manifest({
    screenId: "buyer",
    route: "/ai?context=buyer",
    role: "buyer",
    titleRu: "Готово от AI · Закупки",
    userGoalRu: "Показать заявки, склад, поставщиков, marketplace и черновики закупки.",
    defaultQuestionRu: "Покажи заявки, которые пришли в закупку.",
    allowedDomains: ["procurement", "warehouse", "marketplace", "documents", "public_web"],
    requiredAiButtons: [
      "buyer.requests_to_purchase",
      "buyer.options_by_request",
      "buyer.stock_before_purchase",
      "buyer.find_suppliers",
      "buyer.compare_offers",
      "buyer.purchase_draft",
      "buyer.requests_without_supplier",
    ],
  }),
  manifest({
    screenId: "accountant",
    route: "/ai?context=accountant",
    role: "accountant",
    titleRu: "Готово от AI · Платежи и документы",
    userGoalRu: "Показать платежи, счета, долги, документы и справки по учету.",
    defaultQuestionRu: "Покажи платежи без полного пакета документов.",
    allowedDomains: ["finance", "documents", "procurement", "field", "accounting_knowledge", "public_web"],
    requiredAiButtons: [
      "accountant.payments_without_docs",
      "accountant.invoices_to_pay",
      "accountant.partial_payments",
      "accountant.debts",
      "accountant.payment_docs_check",
      "accountant.accounting_entry_reference",
      "accountant.company_payments",
    ],
  }),
  manifest({
    screenId: "warehouse",
    route: "/ai?context=warehouse",
    role: "warehouse",
    titleRu: "Готово от AI · Склад сегодня",
    userGoalRu: "Показать остатки, дефициты, приходы, выдачи, резервы и связь с работами.",
    defaultQuestionRu: "Покажи, что есть на складе и куда ушли материалы.",
    allowedDomains: ["warehouse", "procurement", "field", "documents"],
    requiredAiButtons: [
      "warehouse.stock",
      "warehouse.deficits",
      "warehouse.item_trace",
      "warehouse.floor_issues",
      "warehouse.today_incoming",
      "warehouse.reservations",
      "warehouse.deficit_request_draft",
    ],
  }),
  manifest({
    screenId: "contractor",
    route: "/ai?context=contractor",
    role: "contractor",
    titleRu: "Готово от AI · Мои работы",
    userGoalRu: "Показать только свои работы, фото, замечания, акты и разрешенный статус оплаты.",
    defaultQuestionRu: "Покажи, что мешает закрыть мои работы.",
    allowedDomains: ["field", "documents", "client"],
    requiredAiButtons: [
      "contractor.close_my_work",
      "contractor.photos_needed",
      "contractor.open_remarks",
      "contractor.acceptance_blockers",
      "contractor.my_acts",
      "contractor.payment_blockers",
      "contractor.foreman_reply_draft",
    ],
  }),
  manifest({
    screenId: "documents",
    route: "/ai?context=documents",
    role: "documents",
    titleRu: "Готово от AI · Документы",
    userGoalRu: "Показать PDF, связи документа, недостающие документы и блокеры оплаты/работ.",
    defaultQuestionRu: "Покажи, что в этом PDF и с чем он связан.",
    allowedDomains: ["documents", "finance", "procurement", "field"],
    requiredAiButtons: [
      "documents.pdf_explain",
      "documents.linked_entities",
      "documents.missing_documents",
      "documents.payment_blocker",
      "documents.work_close_blocker",
      "documents.unlinked_documents",
      "documents.link_draft",
    ],
  }),
  manifest({
    screenId: "market",
    route: "/ai?context=market",
    role: "marketplace_user",
    titleRu: "Готово от AI · Карточка товара",
    userGoalRu: "Подготовить черновик карточки, категорию, характеристики и похожие товары.",
    defaultQuestionRu: "Подготовь черновик карточки товара.",
    allowedDomains: ["marketplace", "construction_knowledge", "public_web"],
    requiredAiButtons: [
      "market.product_from_photo",
      "market.product_card_draft",
      "market.category",
      "market.characteristics",
      "market.similar_products",
      "market.work_usage",
      "market.clarifications",
    ],
  }),
  manifest({
    screenId: "office",
    route: "/ai?context=office",
    role: "office",
    titleRu: "Готово от AI · Офис сегодня",
    userGoalRu: "Показать зависшие документы, просрочки, напоминания, approval и отчеты.",
    defaultQuestionRu: "Покажи, какие документы и задачи зависли в офисе.",
    allowedDomains: ["office", "documents", "reports", "procurement", "field"],
    requiredAiButtons: [
      "office.stuck_documents",
      "office.overdue_tasks",
      "office.reminders",
      "office.awaiting_approval",
      "office.reports_to_check",
      "office.reminder_draft",
    ],
  }),
  manifest({
    screenId: "client",
    route: "/ai?context=client",
    role: "client",
    titleRu: "Готово от AI · Прогресс проекта",
    userGoalRu: "Показать клиентский прогресс, фотоотчет, задержки и доступные документы.",
    defaultQuestionRu: "Покажи клиентский прогресс проекта.",
    allowedDomains: ["client", "field", "documents", "reports"],
    requiredAiButtons: [
      "client.progress",
      "client.photo_report",
      "client.weekly_done",
      "client.delays",
      "client.documents",
    ],
  }),
] as const;

export function listAiLiveScreenManifests(): AiLiveScreenManifest[] {
  return [...AI_LIVE_SCREEN_MANIFESTS];
}

export function getAiLiveScreenManifest(screenId: string): AiLiveScreenManifest {
  const found = AI_LIVE_SCREEN_MANIFESTS.find((manifestItem) => manifestItem.screenId === screenId);
  if (!found) throw new Error(`Unknown AI live screen manifest: ${screenId}`);
  return found;
}
