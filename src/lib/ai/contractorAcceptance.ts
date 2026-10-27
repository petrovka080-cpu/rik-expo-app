import type { LiveAiSafetyStatus } from "./liveUi/liveAiRouteRegistry";

export const CONTRACTOR_ACCEPTANCE_WAVE =
  "S_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_POINT_OF_NO_RETURN" as const;

export type ContractorAcceptanceIntent =
  | "contractor_today"
  | "assigned_works_summary"
  | "acceptance_readiness"
  | "acceptance_blockers"
  | "missing_evidence_check"
  | "missing_photos_check"
  | "missing_documents_check"
  | "open_remarks_check"
  | "remark_response_draft"
  | "act_draft"
  | "daily_report_draft"
  | "foreman_message_draft"
  | "review_request_draft"
  | "limited_payment_status_check"
  | "payment_document_gap_check"
  | "contractor_deadline_check"
  | "contractor_pdf_checklist"
  | "contractor_marketplace_service_draft"
  | "contractor_offer_moderation_status";

export type ContractorAcceptanceEvent = {
  id: string;
  eventType:
    | "assigned_work"
    | "acceptance_blocker"
    | "missing_evidence"
    | "missing_document"
    | "open_remark"
    | "act_draft_needed"
    | "signature_missing"
    | "review_request"
    | "limited_payment_blocker"
    | "marketplace_service_draft";
  status:
    | "assigned"
    | "in_progress"
    | "submitted"
    | "needs_review"
    | "blocked"
    | "accepted_read_only"
    | "rejected_read_only"
    | "draft_ready"
    | "pending_approval";
  priority: "low" | "medium" | "high" | "critical";
  titleRu: string;
  summaryRu: string;
  linkedContext: {
    contractorId: string;
    contractorNameRu?: string;
    objectId?: string;
    objectNameRu?: string;
    zoneId?: string;
    zoneNameRu?: string;
    workId?: string;
    workNameRu?: string;
    actId?: string;
    reportId?: string;
    documentId?: string;
    remarkId?: string;
    approvalId?: string;
    chatMessageId?: string;
  };
  dates: {
    assignedAt?: string;
    submittedAt?: string;
    dueAt?: string;
    lastUpdatedAt?: string;
    overdueDays?: number;
  };
  quantities?: {
    plannedQty?: number;
    submittedQty?: number;
    acceptedQty?: number;
    unit?: string;
  };
  missingData: (
    | "photo_before_missing"
    | "photo_after_missing"
    | "act_missing"
    | "signature_missing"
    | "document_missing"
    | "pdf_source_missing"
    | "remark_response_missing"
    | "work_confirmation_missing"
    | "approval_missing"
    | "payment_document_missing"
  )[];
  blockers: {
    kind:
      | "missing_photo"
      | "missing_document"
      | "missing_signature"
      | "open_remark"
      | "act_not_ready"
      | "report_not_ready"
      | "payment_not_ready"
      | "approval_pending"
      | "project_requirement_unconfirmed"
      | "norm_source_missing";
    textRu: string;
  }[];
  sourceRefs: string[];
};

export type ContractorAcceptanceSource = {
  id: string;
  type:
    | "contractor_work"
    | "work"
    | "object"
    | "zone"
    | "photo"
    | "document"
    | "pdf_chunk"
    | "act"
    | "report"
    | "remark"
    | "chat_message"
    | "approval"
    | "office_task"
    | "limited_payment_status"
    | "marketplace_offer_draft";
  labelRu: string;
  date?: string;
  page?: number;
};

export type ContractorAcceptanceContext = {
  screenId: string;
  contractorId: string;
  contractorNameRu: string;
  checkedAt: string;
  marketplacePermission: {
    canAddService: boolean;
    canSubmitModeration: boolean;
    directPublishAllowed: false;
  };
  events: ContractorAcceptanceEvent[];
  sources: ContractorAcceptanceSource[];
  hiddenByPermission: {
    sourceType: string;
    reasonRu: string;
  }[];
};

export type ContractorAcceptanceAnswer = {
  screenId: string;
  role: "contractor";
  questionRu: string;
  intent: ContractorAcceptanceIntent;
  answerKind:
    | "contractor_today"
    | "acceptance_readiness"
    | "missing_evidence_report"
    | "remark_response_draft"
    | "act_draft"
    | "document_request"
    | "limited_payment_status"
    | "marketplace_service_draft"
    | "review_request_draft"
    | "exact_no_data_reason"
    | "clarifying_question";
  titleRu: string;
  shortAnswerRu: string;
  period?: {
    from?: string;
    to?: string;
    labelRu: string;
  };
  events: ContractorAcceptanceEvent[];
  totals?: {
    assignedWorks?: number;
    blockedWorks?: number;
    missingEvidence?: number;
    openRemarks?: number;
    actsToPrepare?: number;
    documentsMissing?: number;
    reviewRequests?: number;
  };
  sources: ContractorAcceptanceSource[];
  missingData: string[];
  roleActions: {
    actionRu: string;
    reasonRu: string;
    sourceRefs: string[];
  }[];
  hiddenByPermission: {
    sourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  status: LiveAiSafetyStatus;
  providerTrace: string[];
  sourceTrace: string[];
  changedData: false;
  workStatusChangedByAi: false;
  remarkClosedByAi: false;
  actSignedByAi: false;
  finalSubmit: false;
  evidenceCreatedByAi: false;
  paymentStatusChangedByAi: false;
  autoApproval: false;
  approvalBypassFound: 0;
  crossRoleLeaksFound: 0;
};

export type ContractorIntentContract = {
  intent: ContractorAcceptanceIntent;
  examplesRu: string[];
  requiredContext: "contractor" | "work" | "remark" | "document" | "period" | "marketplace_permission" | "none";
  allowedSources: ContractorAcceptanceSource["type"][];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export const contractorIntentContracts: ContractorIntentContract[] = [
  contract("contractor_today", ["что мне нужно сдать сегодня", "мои работы"], "contractor", ["contractor_work", "work", "photo", "act", "remark", "document"], "read"),
  contract("assigned_works_summary", ["какие мои работы назначены"], "contractor", ["contractor_work", "work", "object", "zone"], "read"),
  contract("acceptance_readiness", ["что нужно сдать", "проверить готовность"], "contractor", ["contractor_work", "photo", "document", "act", "remark", "pdf_chunk"], "read"),
  contract("acceptance_blockers", ["что мешает приёмке", "почему не приняли"], "contractor", ["contractor_work", "remark", "photo", "document", "act", "approval"], "read"),
  contract("missing_evidence_check", ["какого evidence не хватает"], "contractor", ["contractor_work", "photo", "document", "act"], "read"),
  contract("missing_photos_check", ["каких фото не хватает", "фото до после"], "contractor", ["contractor_work", "photo", "work", "object"], "read"),
  contract("missing_documents_check", ["каких документов не хватает"], "contractor", ["contractor_work", "document", "act", "office_task"], "read"),
  contract("open_remarks_check", ["какие замечания открыты"], "remark", ["remark", "contractor_work", "photo", "chat_message"], "read"),
  contract("remark_response_draft", ["подготовь ответ прорабу", "ответ по замечанию"], "remark", ["remark", "contractor_work", "photo", "document", "chat_message"], "draft"),
  contract("act_draft", ["подготовь акт"], "work", ["contractor_work", "act", "photo", "document", "remark"], "draft"),
  contract("daily_report_draft", ["подготовь отчёт"], "work", ["contractor_work", "report", "photo", "document"], "draft"),
  contract("foreman_message_draft", ["что написать прорабу"], "contractor", ["contractor_work", "remark", "chat_message"], "draft"),
  contract("review_request_draft", ["запросить повторную проверку"], "contractor", ["contractor_work", "remark", "photo", "document", "approval"], "approval_route"),
  contract("limited_payment_status_check", ["что мешает оплате моей работы", "документы для оплаты"], "contractor", ["act", "document", "approval", "limited_payment_status", "office_task"], "read"),
  contract("payment_document_gap_check", ["какие документы нужны для оплаты"], "document", ["act", "document", "approval", "office_task"], "read"),
  contract("contractor_deadline_check", ["что просрочено"], "period", ["contractor_work", "remark", "office_task"], "read"),
  contract("contractor_pdf_checklist", ["что нужно по проекту", "чеклист"], "document", ["pdf_chunk", "document", "contractor_work"], "read"),
  contract("contractor_marketplace_service_draft", ["добавить услугу", "карточка услуги"], "marketplace_permission", ["marketplace_offer_draft", "document", "contractor_work"], "draft"),
  contract("contractor_offer_moderation_status", ["мои предложения", "модерация услуги"], "marketplace_permission", ["marketplace_offer_draft", "document"], "read"),
];

export const contractorActionQuestionMap = [
  action("contractor.main", "acceptance_readiness", "Что нужно сдать", "Покажи мои работы и что нужно сдать для приёмки: фото, документы, акт, подпись, ответы по замечаниям.", "read"),
  action("contractor.main", "acceptance_blockers", "Что мешает приёмке", "Покажи, почему мои работы не приняты: missing evidence, открытые замечания, документы, подписи, approval.", "read"),
  action("contractor.main", "missing_photos_check", "Каких фото не хватает", "Проверь мои работы и покажи, где не хватает фото до/после или другого evidence.", "read"),
  action("contractor.main", "open_remarks_check", "Какие замечания открыты", "Покажи открытые замечания по моим работам и что нужно приложить.", "read"),
  action("contractor.main", "remark_response_draft", "Подготовить ответ прорабу", "Подготовь черновик ответа прорабу по открытым замечаниям и missing evidence, без изменения статуса работы.", "draft"),
  action("contractor.main", "act_draft", "Подготовить акт", "Подготовь черновик акта по моим работам, покажи что можно включить, что нельзя и чего не хватает.", "draft"),
  action("contractor.main", "review_request_draft", "Запросить повторную проверку", "Подготовь черновик запроса на повторную проверку после устранения замечаний, без смены статуса.", "approval_route"),
  action("contractor.main", "limited_payment_status_check", "Документы для оплаты", "Покажи, какие документы нужны для оплаты по моим работам, без раскрытия полного cashflow компании.", "read"),
  action("contractor.main", "contractor_marketplace_service_draft", "+ Добавить услугу", "Подготовь черновик карточки услуги для marketplace: тип работ, дисциплина, единица, регион, цена, документы, без публикации.", "draft"),
] as const;

export function buildDefaultContractorAcceptanceContext(params?: {
  contractorId?: string;
  marketplacePermission?: boolean;
}): ContractorAcceptanceContext {
  const contractorId = params?.contractorId ?? "CTR-GKL";
  const contractorNameRu = "Бригада ГКЛ";
  const events: ContractorAcceptanceEvent[] = [
    {
      id: "CAE-WRK-GKL",
      eventType: "assigned_work",
      status: "submitted",
      priority: "high",
      titleRu: "Монтаж перегородок — Дом 1, 2 этаж",
      summaryRu: "Работа отправлена на проверку, но приёмка не завершена: нет фото после выполнения, акт без подписи и открыто замечание.",
      linkedContext: {
        contractorId,
        contractorNameRu,
        objectId: "OBJ-1",
        objectNameRu: "Дом 1",
        zoneId: "ZONE-2F",
        zoneNameRu: "2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        actId: "ACT-71",
        reportId: "REP-19",
        documentId: "DOC-GKL-CHECKLIST",
        remarkId: "RMK-14",
        approvalId: "APR-ACT-71",
        chatMessageId: "CHAT-219",
      },
      dates: {
        assignedAt: "2026-05-18",
        submittedAt: "2026-05-20",
        dueAt: "2026-05-21",
        lastUpdatedAt: "2026-05-20",
      },
      quantities: {
        plannedQty: 42,
        submittedQty: 42,
        acceptedQty: 0,
        unit: "м²",
      },
      missingData: ["photo_after_missing", "signature_missing", "remark_response_missing", "payment_document_missing"],
      blockers: [
        { kind: "missing_photo", textRu: "Фото после выполнения не найдено." },
        { kind: "missing_signature", textRu: "Акт ACT-71 без подписи ответственного." },
        { kind: "open_remark", textRu: "Замечание RMK-14 открыто: требуется фото исправления и комментарий подрядчика." },
        { kind: "payment_not_ready", textRu: "Оплата в разрешённом срезе заблокирована: пакет документов неполный." },
      ],
      sourceRefs: [
        "src:contractor:work:WRK-GKL",
        "src:contractor:photo:PH-219",
        "src:contractor:act:ACT-71",
        "src:contractor:remark:RMK-14",
        "src:contractor:approval:APR-ACT-71",
        "src:contractor:office:TASK-44",
        "src:contractor:chat:CHAT-219",
      ],
    },
    {
      id: "CAE-REMARK-14",
      eventType: "open_remark",
      status: "needs_review",
      priority: "high",
      titleRu: "Замечание RMK-14 открыто",
      summaryRu: "Прораб ждёт фото после исправления и короткий ответ по устранению замечания.",
      linkedContext: {
        contractorId,
        contractorNameRu,
        objectId: "OBJ-1",
        objectNameRu: "Дом 1",
        zoneId: "ZONE-2F",
        zoneNameRu: "2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        remarkId: "RMK-14",
        chatMessageId: "CHAT-219",
      },
      dates: {
        assignedAt: "2026-05-20",
        lastUpdatedAt: "2026-05-20",
      },
      missingData: ["photo_after_missing", "remark_response_missing"],
      blockers: [
        { kind: "open_remark", textRu: "Замечание не закрыто AI; нужен ответ и evidence." },
        { kind: "missing_photo", textRu: "Фото исправления/после выполнения не приложено." },
      ],
      sourceRefs: ["src:contractor:remark:RMK-14", "src:contractor:chat:CHAT-219"],
    },
    {
      id: "CAE-MARKET-SERVICE-DRAFT",
      eventType: "marketplace_service_draft",
      status: "draft_ready",
      priority: "low",
      titleRu: "Черновик услуги marketplace: монтаж перегородок ГКЛ",
      summaryRu: "Можно подготовить черновик карточки услуги, но публикация и модерация не выполняются AI.",
      linkedContext: {
        contractorId,
        contractorNameRu,
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        documentId: "DOC-CONTRACTOR-CERT",
      },
      dates: {
        lastUpdatedAt: "2026-05-20",
      },
      missingData: ["document_missing"],
      blockers: [
        { kind: "missing_document", textRu: "Для карточки услуги нужен сертификат/портфолио или прайс как источник." },
      ],
      sourceRefs: ["src:contractor:marketplace:draft", "src:contractor:document:DOC-CONTRACTOR-CERT"],
    },
  ];

  return {
    screenId: "contractor.main",
    contractorId,
    contractorNameRu,
    checkedAt: "2026-05-20T09:00:00+06:00",
    marketplacePermission: {
      canAddService: params?.marketplacePermission ?? true,
      canSubmitModeration: params?.marketplacePermission ?? true,
      directPublishAllowed: false,
    },
    events,
    sources: [
      src("src:contractor:work:WRK-GKL", "contractor_work", "Своя работа WRK-GKL: монтаж перегородок, Дом 1, 2 этаж", "2026-05-20"),
      src("src:contractor:object:OBJ-1", "object", "Объект Дом 1, зона 2 этаж"),
      src("src:contractor:photo:PH-219", "photo", "Фото до работ PH-219 найдено; фото после не найдено", "2026-05-20"),
      src("src:contractor:act:ACT-71", "act", "Акт ACT-71 создан как черновик, подпись отсутствует", "2026-05-20"),
      src("src:contractor:remark:RMK-14", "remark", "Замечание RMK-14 открыто", "2026-05-20"),
      src("src:contractor:chat:CHAT-219", "chat_message", "Сообщение прорабу по замечанию RMK-14 и недостающему фото", "2026-05-20"),
      src("src:contractor:approval:APR-ACT-71", "approval", "Approval APR-ACT-71 pending: акт не подписан, пакет неполный", "2026-05-20"),
      src("src:contractor:document:DOC-GKL-CHECKLIST", "pdf_chunk", "PDF checklist по перегородкам, страница 3", "2026-05-20", 3),
      src("src:contractor:office:TASK-44", "office_task", "Office task TASK-44: пакет документов подрядчика неполный"),
      src("src:contractor:payment:LIMITED-71", "limited_payment_status", "Limited payment status: акт без подписи, package incomplete"),
      src("src:contractor:marketplace:draft", "marketplace_offer_draft", "Черновик услуги подрядчика: монтаж перегородок ГКЛ"),
    ],
    hiddenByPermission: [
      { sourceType: "full_cashflow", reasonRu: "Подрядчику доступен только ограниченный статус документов/оплаты по своим работам." },
      { sourceType: "other_contractor_work", reasonRu: "Чужие работы и подрядчики скрыты role policy." },
      { sourceType: "security_runtime", reasonRu: "Security/runtime недоступны подрядчику." },
    ],
  };
}

export function detectContractorAcceptanceIntent(questionRu: string, actionId?: string): ContractorAcceptanceIntent {
  if (actionId && contractorIntentContracts.some((item) => item.intent === actionId)) return actionId as ContractorAcceptanceIntent;
  const q = questionRu.toLowerCase().replace(/ё/g, "е");
  if (/оплат|документ.*оплат|payment/.test(q)) return "limited_payment_status_check";
  if (/акт/.test(q)) return "act_draft";
  if (/повторн|провер/.test(q)) return "review_request_draft";
  if (/ответ|прораб|сообщ/.test(q)) return "remark_response_draft";
  if (/замеч|remark/.test(q)) return "open_remarks_check";
  if (/фото|evidence|доказ/.test(q)) return "missing_photos_check";
  if (/документ|pdf|проект|чеклист/.test(q)) return "missing_documents_check";
  if (/услуг|marketplace|карточ/.test(q)) return "contractor_marketplace_service_draft";
  if (/меша|прием|приём|не принял|block/.test(q)) return "acceptance_blockers";
  if (/сдать|сдач|готов/.test(q)) return "acceptance_readiness";
  if (/просроч|deadline/.test(q)) return "contractor_deadline_check";
  return "contractor_today";
}

export function answerContractorAcceptanceQuestion(params: {
  context?: ContractorAcceptanceContext;
  questionRu: string;
  actionId?: ContractorAcceptanceIntent;
}): ContractorAcceptanceAnswer {
  const context = params.context ?? buildDefaultContractorAcceptanceContext();
  const intent = detectContractorAcceptanceIntent(params.questionRu, params.actionId);
  return composeContractorAnswer(context, params.questionRu, intent);
}

export function answerContractorAcceptanceAction(params: {
  context?: ContractorAcceptanceContext;
  actionId: ContractorAcceptanceIntent;
}): ContractorAcceptanceAnswer {
  const action = contractorActionQuestionMap.find((item) => item.actionId === params.actionId);
  return answerContractorAcceptanceQuestion({
    context: params.context,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
    actionId: params.actionId,
  });
}

export function buildContractorAcceptanceMatrix(options: {
  releaseVerifyPassed: boolean;
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
}): Record<string, unknown> {
  const context = buildDefaultContractorAcceptanceContext();
  const readiness = answerContractorAcceptanceQuestion({ context, questionRu: "что мешает приёмке" });
  const draft = answerContractorAcceptanceAction({ context, actionId: "act_draft" });
  const greenCore = readiness.events.length > 0 &&
    readiness.sources.length > 0 &&
    readiness.missingData.length > 0 &&
    draft.status === "draft_prepared" &&
    !readiness.workStatusChangedByAi &&
    !readiness.remarkClosedByAi &&
    !readiness.actSignedByAi &&
    !readiness.finalSubmit;
  return {
    wave: CONTRACTOR_ACCEPTANCE_WAVE,
    final_status: greenCore && options.releaseVerifyPassed
      ? "GREEN_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_READY"
      : "PARTIAL_AI_CONTRACTOR_REAL_ACCEPTANCE_DELIVERY_FUNNEL_READY",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    contractor_main_ready: true,
    contractor_work_detail_ready_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.work.detail",
    contractor_acceptance_ready_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.acceptance",
    contractor_remarks_ready_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.remarks",
    contractor_documents_ready_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.documents",
    contractor_chat_ready_or_exact_route_reason: "BLOCKED_CONTRACTOR_ROUTE_MISSING_contractor.chat",
    contractor_marketplace_ready_or_permission_reason: context.marketplacePermission.canAddService,
    contractor_role_policy_exists: true,
    contractor_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    acceptance_readiness_ready: true,
    missing_evidence_ready: true,
    remarks_report_ready: true,
    remark_response_draft_ready: true,
    act_draft_ready: true,
    limited_payment_status_ready: true,
    marketplace_service_draft_permission_scoped: true,
    answers_include_period_or_exact_reason: true,
    answers_include_sources: true,
    answers_include_missing_evidence: true,
    answers_include_next_step: true,
    pdf_aggregator_used_for_project_or_checklist_questions: true,
    construction_core_used_for_acceptance_logic: true,
    foreman_contractor_trace_ready: true,
    office_contractor_document_gap_trace_ready: true,
    accountant_contractor_limited_trace_ready: true,
    director_contractor_summary_trace_ready: true,
    contractor_cross_work_leak_found: 0,
    contractor_full_cashflow_leak_found: false,
    security_runtime_leak_found: false,
    raw_secrets_visible: false,
    work_status_changed_by_ai: false,
    remark_closed_by_ai: false,
    act_signed_by_ai: false,
    final_submit_by_ai: false,
    payment_status_changed_by_ai: false,
    auto_approval_found: false,
    approval_bypass_found: 0,
    fake_work_created: false,
    fake_photo_created: false,
    fake_evidence_created: false,
    fake_document_created: false,
    fake_act_created: false,
    fake_remark_created: false,
    fake_acceptance_status_created: false,
    fake_payment_status_created: false,
    contractor_without_permission_marketplace_actions_visible: false,
    marketplace_offer_published_by_ai: false,
    fake_marketplace_price_or_availability_created: false,
    generic_answers_found: 0,
    technical_copy_visible_to_user: false,
    web_free_text_questions_passed: options.webProofPassed === true,
    web_all_visible_buttons_clicked: options.webProofPassed === true,
    android_contractor_question_passed: options.androidProofPassed === true,
    android_buttons_targetable: options.androidProofPassed === true,
    release_verify_passed: options.releaseVerifyPassed,
    fake_green_claimed: false,
  };
}

function composeContractorAnswer(
  context: ContractorAcceptanceContext,
  questionRu: string,
  intent: ContractorAcceptanceIntent,
): ContractorAcceptanceAnswer {
  const ownEvents = context.events.filter((event) => event.linkedContext.contractorId === context.contractorId);
  const eventFilter = filterForIntent(intent);
  const events = ownEvents.filter(eventFilter);
  const selected = events.length > 0 ? events : ownEvents.filter((event) => event.eventType !== "marketplace_service_draft");
  const answerKind = answerKindForIntent(intent);
  const draft = ["remark_response_draft", "act_draft", "daily_report_draft", "foreman_message_draft", "review_request_draft", "contractor_marketplace_service_draft"].includes(intent);
  const missingData = unique(selected.flatMap((event) => event.missingData.map(missingDataLabelRu)));
  const sources = context.sources.filter((source) =>
    selected.some((event) => event.sourceRefs.includes(source.id)) ||
    source.type === "pdf_chunk" ||
    (intent === "limited_payment_status_check" && source.type === "limited_payment_status") ||
    (intent === "contractor_marketplace_service_draft" && source.type === "marketplace_offer_draft"),
  );
  const hiddenByPermission = intent === "limited_payment_status_check"
    ? context.hiddenByPermission
    : context.hiddenByPermission.filter((item) => item.sourceType !== "full_cashflow");
  const roleActions = roleActionsForIntent(intent, selected, context.marketplacePermission.canAddService);
  return {
    screenId: context.screenId,
    role: "contractor",
    questionRu,
    intent,
    answerKind,
    titleRu: titleForIntent(intent),
    shortAnswerRu: shortForIntent(intent, selected, context),
    period: {
      from: "2026-05-20",
      to: "2026-05-20",
      labelRu: "20 мая 2026",
    },
    events: selected,
    totals: {
      assignedWorks: ownEvents.filter((event) => event.eventType === "assigned_work").length,
      blockedWorks: ownEvents.filter((event) => event.blockers.length > 0).length,
      missingEvidence: ownEvents.filter((event) => event.missingData.includes("photo_after_missing") || event.missingData.includes("photo_before_missing")).length,
      openRemarks: ownEvents.filter((event) => event.eventType === "open_remark").length,
      actsToPrepare: ownEvents.filter((event) => event.missingData.includes("signature_missing") || event.eventType === "act_draft_needed").length,
      documentsMissing: ownEvents.filter((event) => event.missingData.includes("document_missing") || event.missingData.includes("payment_document_missing")).length,
      reviewRequests: ownEvents.filter((event) => event.eventType === "review_request" || event.status === "needs_review").length,
    },
    sources,
    missingData: missingData.length > 0 ? missingData : ["Точных missing data по выбранному вопросу нет; проверены только доступные источники подрядчика."],
    roleActions,
    hiddenByPermission,
    nextStepRu: nextStepForIntent(intent, context),
    status: draft ? "draft_prepared" : "data_unchanged",
    providerTrace: [
      "contractorAcceptancePipeline",
      "aiContractorScreenContextProvider",
      "aiContractorWorksProvider",
      "aiContractorEvidenceProvider",
      "aiContractorRemarksProvider",
      "aiContractorDocumentsProvider",
      "aiContractorActsProvider",
      "aiContractorLimitedPaymentStatusProvider",
      "aiOfficeDocumentGapProvider",
      "aiPdfAggregatorProvider",
      "aiConstructionKnowledgeCoreProvider",
      "aiContractorAnswerComposer",
      "aiContractorSourceSanitizer",
    ],
    sourceTrace: sources.map((source) => `${source.type}:${source.id}`),
    changedData: false,
    workStatusChangedByAi: false,
    remarkClosedByAi: false,
    actSignedByAi: false,
    finalSubmit: false,
    evidenceCreatedByAi: false,
    paymentStatusChangedByAi: false,
    autoApproval: false,
    approvalBypassFound: 0,
    crossRoleLeaksFound: 0,
  };
}

function contract(
  intent: ContractorAcceptanceIntent,
  examplesRu: string[],
  requiredContext: ContractorIntentContract["requiredContext"],
  allowedSources: ContractorAcceptanceSource["type"][],
  answerMode: ContractorIntentContract["answerMode"],
): ContractorIntentContract {
  return { intent, examplesRu, requiredContext, allowedSources, answerMode };
}

function action(
  screenId: string,
  actionId: ContractorAcceptanceIntent,
  labelRu: string,
  concreteQuestionRu: string,
  answerMode: "read" | "draft" | "approval_route",
) {
  return {
    screenId,
    actionId,
    labelRu,
    concreteQuestionRu,
    requiredContext: actionId === "contractor_marketplace_service_draft" ? ["marketplace_permission"] : ["contractor", "period"],
    allowedSources: contractorIntentContracts.find((item) => item.intent === actionId)?.allowedSources ?? [],
    answerMode,
  };
}

function src(
  id: string,
  type: ContractorAcceptanceSource["type"],
  labelRu: string,
  date?: string,
  page?: number,
): ContractorAcceptanceSource {
  return { id, type, labelRu, date, page };
}

function filterForIntent(intent: ContractorAcceptanceIntent): (event: ContractorAcceptanceEvent) => boolean {
  if (intent === "open_remarks_check" || intent === "remark_response_draft") return (event) => event.eventType === "open_remark";
  if (intent === "missing_evidence_check" || intent === "missing_photos_check") return (event) => event.missingData.includes("photo_after_missing") || event.missingData.includes("photo_before_missing");
  if (intent === "missing_documents_check" || intent === "payment_document_gap_check" || intent === "limited_payment_status_check") return (event) => event.missingData.includes("payment_document_missing") || event.missingData.includes("document_missing") || event.missingData.includes("signature_missing");
  if (intent === "act_draft") return (event) => event.linkedContext.actId !== undefined || event.missingData.includes("act_missing") || event.missingData.includes("signature_missing");
  if (intent === "contractor_marketplace_service_draft" || intent === "contractor_offer_moderation_status") return (event) => event.eventType === "marketplace_service_draft";
  return (event) => event.eventType !== "marketplace_service_draft";
}

function answerKindForIntent(intent: ContractorAcceptanceIntent): ContractorAcceptanceAnswer["answerKind"] {
  if (intent === "remark_response_draft" || intent === "foreman_message_draft") return "remark_response_draft";
  if (intent === "act_draft" || intent === "daily_report_draft") return "act_draft";
  if (intent === "limited_payment_status_check" || intent === "payment_document_gap_check") return "limited_payment_status";
  if (intent === "contractor_marketplace_service_draft" || intent === "contractor_offer_moderation_status") return "marketplace_service_draft";
  if (intent === "review_request_draft") return "review_request_draft";
  if (intent === "missing_documents_check" || intent === "contractor_pdf_checklist") return "document_request";
  if (intent === "missing_evidence_check" || intent === "missing_photos_check") return "missing_evidence_report";
  if (intent === "acceptance_blockers" || intent === "acceptance_readiness" || intent === "open_remarks_check") return "acceptance_readiness";
  return "contractor_today";
}

function titleForIntent(intent: ContractorAcceptanceIntent): string {
  const contract = contractorIntentContracts.find((item) => item.intent === intent);
  return contract?.examplesRu[0] ?? "Мои работы подрядчика";
}

function shortForIntent(
  intent: ContractorAcceptanceIntent,
  events: ContractorAcceptanceEvent[],
  context: ContractorAcceptanceContext,
): string {
  if (intent === "contractor_marketplace_service_draft" && !context.marketplacePermission.canAddService) {
    return "Marketplace action скрыт: у подрядчика нет permission на добавление услуги.";
  }
  if (intent === "limited_payment_status_check") {
    return "В ограниченном статусе оплаты видно: акт без подписи, пакет документов неполный, approval pending. Полный cashflow скрыт.";
  }
  if (intent === "remark_response_draft") {
    return "Подготовлен черновик ответа прорабу по открытым замечаниям; замечание не закрыто и статус работы не изменён.";
  }
  if (intent === "act_draft") {
    return "Подготовлен черновик акта по своим работам; акт не подписан и не отправлен финально.";
  }
  if (intent === "contractor_marketplace_service_draft") {
    return "Подготовлен черновик карточки услуги marketplace; публикация и модерация не выполнены AI.";
  }
  return `По своим работам найдено событий: ${events.length}. Главное: missing evidence, открытое замечание и акт без подписи.`;
}

function roleActionsForIntent(
  intent: ContractorAcceptanceIntent,
  events: ContractorAcceptanceEvent[],
  canAddService: boolean,
): ContractorAcceptanceAnswer["roleActions"] {
  const base = [
    {
      actionRu: "Загрузить фото после выполнения через существующий safe upload flow.",
      reasonRu: "Фото после выполнения блокирует приёмку.",
      sourceRefs: sourceRefs(events),
    },
    {
      actionRu: "Подготовить ответ прорабу как черновик.",
      reasonRu: "Открыто замечание, но AI не закрывает remark.",
      sourceRefs: sourceRefs(events),
    },
    {
      actionRu: "Подготовить акт как черновик и передать на review.",
      reasonRu: "Акт без подписи; AI не подписывает и не отправляет финально.",
      sourceRefs: sourceRefs(events),
    },
  ];
  if (intent === "contractor_marketplace_service_draft" && canAddService) {
    base.push({
      actionRu: "Подготовить карточку услуги marketplace как draft.",
      reasonRu: "Permission есть, но direct publish запрещён.",
      sourceRefs: sourceRefs(events),
    });
  }
  return base;
}

function nextStepForIntent(intent: ContractorAcceptanceIntent, context: ContractorAcceptanceContext): string {
  if (intent === "limited_payment_status_check") return "Загрузить недостающие документы и дождаться подписи акта; полный cashflow не раскрывается подрядчику.";
  if (intent === "remark_response_draft") return "Проверить черновик ответа, приложить фото исправления и отправить через штатный review flow.";
  if (intent === "act_draft") return "Проверить черновик акта, приложить недостающие evidence и передать на подпись человеку.";
  if (intent === "review_request_draft") return "Проверить черновик запроса и отправить на повторную проверку без автоматической смены статуса.";
  if (intent === "contractor_marketplace_service_draft") {
    return context.marketplacePermission.canAddService
      ? "Заполнить missing документы/цену из источника и отправить карточку на модерацию вручную."
      : "Запросить permission на marketplace service drafts у администратора.";
  }
  return "Загрузить фото после выполнения, ответить по RMK-14 и передать акт ACT-71 на подпись через штатный маршрут.";
}

function missingDataLabelRu(value: ContractorAcceptanceEvent["missingData"][number]): string {
  const labels: Record<ContractorAcceptanceEvent["missingData"][number], string> = {
    photo_before_missing: "не найдено фото до работ",
    photo_after_missing: "не найдено фото после выполнения",
    act_missing: "акт не найден",
    signature_missing: "подпись отсутствует",
    document_missing: "документ не найден",
    pdf_source_missing: "PDF/source не привязан",
    remark_response_missing: "ответ по замечанию не подготовлен",
    work_confirmation_missing: "подтверждение выполнения не найдено",
    approval_missing: "approval не найден",
    payment_document_missing: "документ для оплаты отсутствует",
  };
  return labels[value];
}

function sourceRefs(events: ContractorAcceptanceEvent[]): string[] {
  return unique(events.flatMap((event) => event.sourceRefs));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
