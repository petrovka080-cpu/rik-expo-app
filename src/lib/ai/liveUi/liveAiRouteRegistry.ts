export const LIVE_AI_REAL_ANSWERS_WAVE =
  "S_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_RECOVERY_POINT_OF_NO_RETURN" as const;

export type LiveAiContextId =
  | "warehouse"
  | "director"
  | "foreman"
  | "contractor"
  | "buyer"
  | "accountant"
  | "office"
  | "documents"
  | "reports"
  | "chat"
  | "market"
  | "supplier"
  | "admin"
  | "security"
  | "runtime"
  | "client";

export type LiveAiPipelineKey =
  | "warehouseStock"
  | "directorCompany"
  | "foremanIntelligence"
  | "contractorAcceptance"
  | "buyerSourcing"
  | "accountantFinance"
  | "officeDocumentControl"
  | "documentsDocumentCore"
  | "reportsDocumentCore"
  | "chatExtraction"
  | "marketplaceIntake"
  | "adminOrgGovernance"
  | "securityRuntime"
  | "clientOwnerProgress";

export type LiveAiSafetyStatus =
  | "data_unchanged"
  | "draft_prepared"
  | "approval_required";

export type LiveAiAction = {
  id: string;
  labelRu: string;
  concreteQuestionRu: string;
  pipelineActionId: string;
  status: LiveAiSafetyStatus;
};

export type LiveAiRouteDefinition = {
  context: LiveAiContextId;
  routeAliases: string[];
  screenId: string;
  role: string;
  pipelineKey: LiveAiPipelineKey;
  defaultContextKind: string;
  defaultQuestionRu: string;
  checkedSourcesRu: string[];
  actions: LiveAiAction[];
};

const ACTIONS: Record<LiveAiContextId, LiveAiAction[]> = {
  warehouse: [
    {
      id: "critical_deficits",
      labelRu: "Показать дефицит",
      concreteQuestionRu:
        "Покажи критичные дефициты склада: какие материалы блокируют работы, сколько нужно, сколько доступно, что зарезервировано и какой следующий шаг.",
      pipelineActionId: "critical_deficits",
      status: "data_unchanged",
    },
    {
      id: "issue_readiness",
      labelRu: "Что можно выдать",
      concreteQuestionRu:
        "Проверь готовность выдачи по складской дневной сводке: остатки, резервы, заявки, объект, missing data и безопасный следующий шаг.",
      pipelineActionId: "issue_readiness",
      status: "data_unchanged",
    },
  ],
  director: [
    {
      id: "today_decision_queue",
      labelRu: "Открыть сводка",
      concreteQuestionRu:
        "Собери директорскую сводку по компании: approvals, финансы, закупки, склад, поле, документы, office, риски и следующий шаг без approve/reject.",
      pipelineActionId: "today_decision_queue",
      status: "approval_required",
    },
    {
      id: "warehouse_deficits",
      labelRu: "Риски по складу",
      concreteQuestionRu:
        "Покажи складские дефициты для директора: что блокирует объекты, какие источники проверены, чего не хватает и кому поручить следующий шаг.",
      pipelineActionId: "warehouse_deficits",
      status: "data_unchanged",
    },
  ],
  foreman: [
    {
      id: "daily_object_report",
      labelRu: "Подготовить отчёт",
      concreteQuestionRu:
        "Подготовь дневной отчёт прораба по работам, объектам, evidence, актам, документам, подрядчикам и материалам без финального закрытия работ.",
      pipelineActionId: "daily_object_report",
      status: "draft_prepared",
    },
    {
      id: "closeout_readiness",
      labelRu: "Что мешает закрыть",
      concreteQuestionRu:
        "Покажи, что мешает закрыть работы сегодня: missing evidence, акты, материалы, документы, sources и безопасный следующий шаг.",
      pipelineActionId: "closeout_readiness",
      status: "data_unchanged",
    },
  ],
  contractor: [
    {
      id: "acceptance_readiness",
      labelRu: "Что нужно сдать",
      concreteQuestionRu:
        "Покажи мои работы и что нужно сдать для приёмки: фото, документы, акт, подпись, ответы по замечаниям.",
      pipelineActionId: "acceptance_readiness",
      status: "data_unchanged",
    },
    {
      id: "acceptance_blockers",
      labelRu: "Что мешает приёмке",
      concreteQuestionRu:
        "Покажи, почему мои работы не приняты: missing evidence, открытые замечания, документы, подписи, approval.",
      pipelineActionId: "acceptance_blockers",
      status: "data_unchanged",
    },
    {
      id: "missing_photos_check",
      labelRu: "Каких фото не хватает",
      concreteQuestionRu:
        "Проверь мои работы и покажи, где не хватает фото до/после или другого evidence.",
      pipelineActionId: "missing_photos_check",
      status: "data_unchanged",
    },
    {
      id: "open_remarks_check",
      labelRu: "Какие замечания открыты",
      concreteQuestionRu:
        "Покажи открытые замечания по моим работам и что нужно приложить.",
      pipelineActionId: "open_remarks_check",
      status: "data_unchanged",
    },
    {
      id: "remark_response_draft",
      labelRu: "Подготовить ответ прорабу",
      concreteQuestionRu:
        "Подготовь черновик ответа прорабу по открытым замечаниям и missing evidence, без изменения статуса работы.",
      pipelineActionId: "remark_response_draft",
      status: "draft_prepared",
    },
    {
      id: "act_draft",
      labelRu: "Подготовить акт",
      concreteQuestionRu:
        "Подготовь черновик акта по моим работам, покажи что можно включить, что нельзя и чего не хватает.",
      pipelineActionId: "act_draft",
      status: "draft_prepared",
    },
    {
      id: "review_request_draft",
      labelRu: "Запросить повторную проверку",
      concreteQuestionRu:
        "Подготовь черновик запроса на повторную проверку после устранения замечаний, без смены статуса.",
      pipelineActionId: "review_request_draft",
      status: "approval_required",
    },
    {
      id: "limited_payment_status_check",
      labelRu: "Документы для оплаты",
      concreteQuestionRu:
        "Покажи, какие документы нужны для оплаты по моим работам, без раскрытия полного cashflow компании.",
      pipelineActionId: "limited_payment_status_check",
      status: "data_unchanged",
    },
    {
      id: "contractor_marketplace_service_draft",
      labelRu: "+ Добавить услугу",
      concreteQuestionRu:
        "Подготовь черновик карточки услуги для marketplace: тип работ, дисциплина, единица, регион, цена, документы, без публикации.",
      pipelineActionId: "contractor_marketplace_service_draft",
      status: "draft_prepared",
    },
  ],
  buyer: [
    {
      id: "find_5_10_suppliers",
      labelRu: "Найти поставщиков / варианты",
      concreteQuestionRu:
        "Найди варианты поставщиков по очереди закупки: approved requests, warehouse deficits, sourcing status, marketplace options, риски и следующий шаг.",
      pipelineActionId: "find_5_10_suppliers",
      status: "draft_prepared",
    },
    {
      id: "compare_suppliers",
      labelRu: "Сравнить варианты",
      concreteQuestionRu:
        "Сравни варианты закупки по цене, сроку, наличию, документам и рискам без создания заказа.",
      pipelineActionId: "compare_suppliers",
      status: "data_unchanged",
    },
  ],
  accountant: [
    {
      id: "critical_payments",
      labelRu: "Проверить критические",
      concreteQuestionRu:
        "Проверь критические платежи за период: счета, акты, missing docs, approvals, cashflow sources и следующий шаг без оплаты.",
      pipelineActionId: "critical_payments",
      status: "approval_required",
    },
    {
      id: "missing_documents_for_payment",
      labelRu: "Чего не хватает для оплаты",
      concreteQuestionRu:
        "Покажи, какие документы блокируют оплату, по каким источникам это видно и кому нужен следующий шаг.",
      pipelineActionId: "missing_documents_for_payment",
      status: "data_unchanged",
    },
  ],
  office: [
    {
      id: "stuck_today",
      labelRu: "Что застряло",
      concreteQuestionRu:
        "Покажи, что застряло сегодня: документы, approval packages, reminders, deadlines, unlinked PDFs, owner role, missing data и следующий шаг.",
      pipelineActionId: "stuck_today",
      status: "data_unchanged",
    },
    {
      id: "reminder_draft",
      labelRu: "Кому напомнить",
      concreteQuestionRu:
        "Подготовь черновик напоминания: кому, почему, что блокирует оплату/закрытие работ, sources и missing data, без финальной отправки.",
      pipelineActionId: "reminder_draft",
      status: "draft_prepared",
    },
  ],
  documents: [
    {
      id: "documents_to_process",
      labelRu: "Документы к обработке",
      concreteQuestionRu:
        "Проверь очередь документов: какие PDF или документы не связаны, что блокирует оплату/закрытие работ и какой следующий шаг.",
      pipelineActionId: "documents_to_process",
      status: "data_unchanged",
    },
    {
      id: "unlinked_documents",
      labelRu: "Несвязанные PDF",
      concreteQuestionRu:
        "Покажи несвязанные PDF/документы, что проверено, чего не хватает для связи и безопасный следующий шаг без финальной привязки.",
      pipelineActionId: "unlinked_documents",
      status: "data_unchanged",
    },
  ],
  reports: [
    {
      id: "document_evidence_gaps",
      labelRu: "Отчёты без evidence",
      concreteQuestionRu:
        "Проверь отчёты: где нет evidence, какие источники проверены, кто следующий owner и что подготовить.",
      pipelineActionId: "document_evidence_gaps",
      status: "data_unchanged",
    },
    {
      id: "daily_object_report",
      labelRu: "Сводка по отчётам",
      concreteQuestionRu:
        "Собери безопасную сводку отчётов: период, источники, missing evidence, next step и статус без публикации финального отчёта.",
      pipelineActionId: "daily_object_report",
      status: "draft_prepared",
    },
  ],
  chat: [
    {
      id: "chat_context_summary",
      labelRu: "Что важно из чата",
      concreteQuestionRu:
        "Вытащи из чата рабочие факты: что застряло, кто owner, какие документы/evidence упомянуты, источники и следующий шаг.",
      pipelineActionId: "chat_context_summary",
      status: "data_unchanged",
    },
    {
      id: "chat_task_draft",
      labelRu: "Черновик задачи",
      concreteQuestionRu:
        "Подготовь черновик задачи из чата с owner, missing data, sources и safe status без закрытия задачи.",
      pipelineActionId: "chat_task_draft",
      status: "draft_prepared",
    },
  ],
  market: [
    {
      id: "show_request_matches",
      labelRu: "Варианты рынка",
      concreteQuestionRu:
        "Покажи варианты marketplace для очереди закупки: совпадения, документы, риски, missing data и следующий шаг без заказа.",
      pipelineActionId: "show_request_matches",
      status: "data_unchanged",
    },
    {
      id: "marketplace_source_check",
      labelRu: "Проверить источники",
      concreteQuestionRu:
        "Проверь источники marketplace: карточки, документы, связи с заявками, риски и следующий шаг.",
      pipelineActionId: "marketplace_source_check",
      status: "data_unchanged",
    },
  ],
  supplier: [
    {
      id: "check_cards",
      labelRu: "Проверить витрину",
      concreteQuestionRu:
        "Проверь витрину поставщика: карточки, документы, missing data, риски модерации и следующий шаг без публикации.",
      pipelineActionId: "check_cards",
      status: "data_unchanged",
    },
    {
      id: "add_product_draft",
      labelRu: "Черновик позиции",
      concreteQuestionRu:
        "Подготовь безопасный черновик позиции поставщика из доступных источников без публикации и без fake price/availability.",
      pipelineActionId: "add_product_draft",
      status: "draft_prepared",
    },
  ],
  admin: [
    {
      id: "org_governance_snapshot",
      labelRu: "Проверить роли",
      concreteQuestionRu:
        "Проверь org governance snapshot: роли, pending owners, missing data, sources и следующий шаг без изменения прав.",
      pipelineActionId: "org_governance_snapshot",
      status: "approval_required",
    },
    {
      id: "owner_gap_report",
      labelRu: "Owner gaps",
      concreteQuestionRu:
        "Покажи задачи без owner и что нужно подготовить для admin/org review без изменения ролей.",
      pipelineActionId: "owner_gap_report",
      status: "data_unchanged",
    },
  ],
  security: [
    {
      id: "security_overview",
      labelRu: "Показать риски",
      concreteQuestionRu:
        "Покажи security risks: risky roles, forbidden attempts, suspicious approvals, policy gaps, debug leaks, privileged service and Auth Admin paths.",
      pipelineActionId: "security_overview",
      status: "data_unchanged",
    },
    {
      id: "forbidden_attempts_report",
      labelRu: "Forbidden attempts",
      concreteQuestionRu:
        "Покажи попытки запрещенных действий по ролям и экранам без раскрытия секретов и без мутации прав.",
      pipelineActionId: "forbidden_attempts_report",
      status: "data_unchanged",
    },
    {
      id: "role_policy_review",
      labelRu: "Проверить роли",
      concreteQuestionRu:
        "Проверь role policy и permission matrix: где роль видит больше, чем должна, или может unsafe action.",
      pipelineActionId: "role_policy_review",
      status: "data_unchanged",
    },
    {
      id: "approval_bypass_review",
      labelRu: "Проверить approval bypass",
      concreteQuestionRu:
        "Проверь, есть ли пути approve/reject/submit/payment/order/stock/work mutation без approval ledger.",
      pipelineActionId: "approval_bypass_review",
      status: "data_unchanged",
    },
    {
      id: "privileged_service_guard_report",
      labelRu: "Проверить service-role",
      concreteQuestionRu:
        "Проверь privileged service path: нет ли обходного пути через server admin, Auth Admin, listUsers, seed или fake green.",
      pipelineActionId: "privileged_service_guard_report",
      status: "data_unchanged",
    },
    {
      id: "auth_admin_guard_report",
      labelRu: "Проверить Auth Admin",
      concreteQuestionRu:
        "Проверь Auth Admin/listUsers path: нет ли green path через admin API, listUsers, seed or test-only privilege.",
      pipelineActionId: "auth_admin_guard_report",
      status: "data_unchanged",
    },
    {
      id: "debug_runtime_leak_review",
      labelRu: "Проверить debug leaks",
      concreteQuestionRu:
        "Проверь, видят ли normal users debug, diagnostics, provider copy, payloads, redacted settings or internal health details.",
      pipelineActionId: "debug_runtime_leak_review",
      status: "data_unchanged",
    },
    {
      id: "security_report_draft",
      labelRu: "Подготовить security report",
      concreteQuestionRu:
        "Подготовь черновик security report с рисками, источниками, missing data и safe remediation steps без изменения прав.",
      pipelineActionId: "security_report_draft",
      status: "draft_prepared",
    },
  ],
  runtime: [
    {
      id: "runtime_diagnosis",
      labelRu: "Runtime health",
      concreteQuestionRu:
        "Покажи sanitized health, release status, transport binding, fallback entries and exact blockers without exposing secrets.",
      pipelineActionId: "runtime_diagnosis",
      status: "data_unchanged",
    },
    {
      id: "release_verify_report",
      labelRu: "Release verify",
      concreteQuestionRu:
        "Покажи release verify status, failed gates and exact blockers from artifacts without exposing secret values.",
      pipelineActionId: "release_verify_report",
      status: "data_unchanged",
    },
    {
      id: "failed_runner_report",
      labelRu: "Failed runner",
      concreteQuestionRu:
        "Покажи failed runner, last status, artifact and non-destructive verification command.",
      pipelineActionId: "failed_runner_report",
      status: "data_unchanged",
    },
    {
      id: "artifact_integrity_report",
      labelRu: "Artifacts",
      concreteQuestionRu:
        "Проверь required artifacts: exists, stale, missing and exact reason without raw payload.",
      pipelineActionId: "artifact_integrity_report",
      status: "data_unchanged",
    },
    {
      id: "ios_signoff_report",
      labelRu: "iOS signoff",
      concreteQuestionRu:
        "Покажи iOS signoff status: required, not required, stale or missing, with artifact source.",
      pipelineActionId: "ios_signoff_report",
      status: "data_unchanged",
    },
    {
      id: "safe_repair_suggestion",
      labelRu: "Safe repair check",
      concreteQuestionRu:
        "Предложи только safe non-destructive repair/check commands. Do not suggest destructive commands.",
      pipelineActionId: "safe_repair_suggestion",
      status: "draft_prepared",
    },
  ],
  client: [
    {
      id: "client_project_snapshot",
      labelRu: "Сводка проекта",
      concreteQuestionRu:
        "Покажи client-visible project snapshot: прогресс, документы, upcoming steps, missing data и next step без внутренних финансов/склада.",
      pipelineActionId: "client_project_snapshot",
      status: "data_unchanged",
    },
    {
      id: "client_document_gap",
      labelRu: "Документы клиента",
      concreteQuestionRu:
        "Покажи клиентские document gaps и что подготовить офису без раскрытия внутренних runtime/security данных.",
      pipelineActionId: "client_document_gap",
      status: "data_unchanged",
    },
  ],
};

export const LIVE_AI_ROUTE_REGISTRY: readonly LiveAiRouteDefinition[] = [
  {
    context: "warehouse",
    routeAliases: ["warehouse", "warehouse.main", "warehouseStock"],
    screenId: "warehouse.main",
    role: "warehouse",
    pipelineKey: "warehouseStock",
    defaultContextKind: "warehouse.day_snapshot",
    defaultQuestionRu: ACTIONS.warehouse[0].concreteQuestionRu,
    checkedSourcesRu: ["stock overview", "critical deficits", "incoming", "issue queue", "reservations", "material blockers"],
    actions: ACTIONS.warehouse,
  },
  {
    context: "director",
    routeAliases: ["director", "director.dashboard", "company"],
    screenId: "director.dashboard",
    role: "director",
    pipelineKey: "directorCompany",
    defaultContextKind: "director.company_decision_snapshot",
    defaultQuestionRu: ACTIONS.director[0].concreteQuestionRu,
    checkedSourcesRu: ["approvals", "finance", "procurement", "warehouse", "field", "documents", "office", "safe security summary"],
    actions: ACTIONS.director,
  },
  {
    context: "foreman",
    routeAliases: ["foreman", "foreman.main", "field"],
    screenId: "foreman.main",
    role: "foreman",
    pipelineKey: "foremanIntelligence",
    defaultContextKind: "foreman.workday_snapshot",
    defaultQuestionRu: ACTIONS.foreman[0].concreteQuestionRu,
    checkedSourcesRu: ["works today", "objects", "evidence", "acts", "reports", "contractors", "material blockers"],
    actions: ACTIONS.foreman,
  },
  {
    context: "contractor",
    routeAliases: ["contractor", "contractor.main"],
    screenId: "contractor.main",
    role: "contractor",
    pipelineKey: "contractorAcceptance",
    defaultContextKind: "contractor.own_works_snapshot",
    defaultQuestionRu: ACTIONS.contractor[0].concreteQuestionRu,
    checkedSourcesRu: ["own works", "own remarks", "own evidence", "own acts", "own documents", "limited payment status"],
    actions: ACTIONS.contractor,
  },
  {
    context: "buyer",
    routeAliases: ["buyer", "procurement", "buyer.main"],
    screenId: "buyer.main",
    role: "buyer",
    pipelineKey: "buyerSourcing",
    defaultContextKind: "buyer.procurement_queue",
    defaultQuestionRu: ACTIONS.buyer[0].concreteQuestionRu,
    checkedSourcesRu: ["approved requests", "pending requests", "warehouse deficits", "sourcing status", "marketplace options"],
    actions: ACTIONS.buyer,
  },
  {
    context: "accountant",
    routeAliases: ["accountant", "finance", "accountant.main"],
    screenId: "accountant.main",
    role: "accountant",
    pipelineKey: "accountantFinance",
    defaultContextKind: "accountant.finance_period_snapshot",
    defaultQuestionRu: ACTIONS.accountant[0].concreteQuestionRu,
    checkedSourcesRu: ["payments", "invoices", "acts", "missing docs", "approvals", "cashflow"],
    actions: ACTIONS.accountant,
  },
  {
    context: "office",
    routeAliases: ["office", "office.hub"],
    screenId: "office.hub",
    role: "office",
    pipelineKey: "officeDocumentControl",
    defaultContextKind: "office.stuck_work_document_queue",
    defaultQuestionRu: ACTIONS.office[0].concreteQuestionRu,
    checkedSourcesRu: ["documents to process", "approval packages", "reminders", "deadlines", "unlinked docs"],
    actions: ACTIONS.office,
  },
  {
    context: "documents",
    routeAliases: ["documents", "documents.main", "document"],
    screenId: "documents.main",
    role: "documents",
    pipelineKey: "documentsDocumentCore",
    defaultContextKind: "documents.queue_snapshot",
    defaultQuestionRu: ACTIONS.documents[0].concreteQuestionRu,
    checkedSourcesRu: ["document queue", "PDF chunks", "links to work/payment/approval", "missing signatures"],
    actions: ACTIONS.documents,
  },
  {
    context: "reports",
    routeAliases: ["reports", "reports.modal"],
    screenId: "reports.modal",
    role: "director",
    pipelineKey: "reportsDocumentCore",
    defaultContextKind: "reports.evidence_snapshot",
    defaultQuestionRu: ACTIONS.reports[0].concreteQuestionRu,
    checkedSourcesRu: ["reports", "evidence links", "missing photos", "objects", "period"],
    actions: ACTIONS.reports,
  },
  {
    context: "chat",
    routeAliases: ["chat", "chat.main"],
    screenId: "chat.main",
    role: "foreman",
    pipelineKey: "chatExtraction",
    defaultContextKind: "chat.safe_extraction_snapshot",
    defaultQuestionRu: ACTIONS.chat[0].concreteQuestionRu,
    checkedSourcesRu: ["linked chat messages", "mentioned works", "mentioned documents", "owners", "dates"],
    actions: ACTIONS.chat,
  },
  {
    context: "market",
    routeAliases: ["market", "market.home", "marketplace"],
    screenId: "market.home",
    role: "buyer",
    pipelineKey: "marketplaceIntake",
    defaultContextKind: "market.marketplace_queue",
    defaultQuestionRu: ACTIONS.market[0].concreteQuestionRu,
    checkedSourcesRu: ["marketplace offers", "buyer requests", "documents", "moderation state"],
    actions: ACTIONS.market,
  },
  {
    context: "supplier",
    routeAliases: ["supplier", "supplier.showcase", "supplierMap", "suppliers-map"],
    screenId: "supplier.showcase",
    role: "supplier",
    pipelineKey: "marketplaceIntake",
    defaultContextKind: "supplier.showcase_snapshot",
    defaultQuestionRu: ACTIONS.supplier[0].concreteQuestionRu,
    checkedSourcesRu: ["supplier cards", "documents", "moderation state", "linked requests"],
    actions: ACTIONS.supplier,
  },
  {
    context: "admin",
    routeAliases: ["admin", "admin.org", "profile"],
    screenId: "admin.org",
    role: "admin",
    pipelineKey: "adminOrgGovernance",
    defaultContextKind: "admin.org_governance_snapshot",
    defaultQuestionRu: ACTIONS.admin[0].concreteQuestionRu,
    checkedSourcesRu: ["role registry", "owner gaps", "approval policy", "organization settings"],
    actions: ACTIONS.admin,
  },
  {
    context: "security",
    routeAliases: ["security", "security.screen"],
    screenId: "security.screen",
    role: "security",
    pipelineKey: "securityRuntime",
    defaultContextKind: "security.safe_summary",
    defaultQuestionRu: ACTIONS.security[0].concreteQuestionRu,
    checkedSourcesRu: ["safe security summary", "redacted policy status", "forbidden action counters"],
    actions: ACTIONS.security,
  },
  {
    context: "runtime",
    routeAliases: ["runtime", "screen.runtime"],
    screenId: "screen.runtime",
    role: "dev",
    pipelineKey: "securityRuntime",
    defaultContextKind: "runtime.sanitized_health",
    defaultQuestionRu: ACTIONS.runtime[0].concreteQuestionRu,
    checkedSourcesRu: ["sanitized runtime health", "permission boundary", "redacted error classes"],
    actions: ACTIONS.runtime,
  },
  {
    context: "client",
    routeAliases: ["client", "client.dashboard", "owner"],
    screenId: "client.dashboard",
    role: "client",
    pipelineKey: "clientOwnerProgress",
    defaultContextKind: "client.visible_project_snapshot",
    defaultQuestionRu: ACTIONS.client[0].concreteQuestionRu,
    checkedSourcesRu: ["client-visible progress", "client documents", "public milestones", "office-prepared next steps"],
    actions: ACTIONS.client,
  },
];

export function listLiveAiRouteDefinitions(): readonly LiveAiRouteDefinition[] {
  return LIVE_AI_ROUTE_REGISTRY;
}

export function normalizeLiveAiContext(value: string | null | undefined): LiveAiContextId | null {
  const needle = String(value ?? "").trim();
  if (!needle) return null;
  const normalized = needle.toLowerCase();
  return LIVE_AI_ROUTE_REGISTRY.find((route) =>
    route.routeAliases.some((alias) => alias.toLowerCase() === normalized),
  )?.context ?? null;
}

export function resolveLiveAiRoute(
  value: string | null | undefined,
): LiveAiRouteDefinition | null {
  const context = normalizeLiveAiContext(value);
  if (!context) return null;
  return LIVE_AI_ROUTE_REGISTRY.find((route) => route.context === context) ?? null;
}

export function getLiveAiRouteByContext(context: LiveAiContextId): LiveAiRouteDefinition {
  const route = LIVE_AI_ROUTE_REGISTRY.find((candidate) => candidate.context === context);
  if (!route) throw new Error(`live AI route missing: ${context}`);
  return route;
}
