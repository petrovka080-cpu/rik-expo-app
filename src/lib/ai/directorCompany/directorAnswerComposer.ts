import type {
  CompanyDecisionEvent,
  DirectorAnswerKind,
  DirectorCompanyAnswer,
  DirectorCompanyContext,
  DirectorIntent,
  DirectorSourceRef,
} from "./directorCompanyTypes";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function severityRank(value: CompanyDecisionEvent["severity"]): number {
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function option(
  optionRu: string,
  consequenceRu: string,
  requiresApproval = true,
): CompanyDecisionEvent["decisionOptions"][number] {
  return {
    optionRu,
    consequenceRu,
    requiresApproval,
    unsafeDirectAction: false,
  };
}

function buildApprovalEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.approvals.map((item) => ({
    id: `approval:${item.id}`,
    eventType: "approval_pending",
    severity: item.riskLevel,
    status: item.status === "needs_data" ? "needs_data" : "needs_director_decision",
    titleRu: item.titleRu,
    summaryRu: `Approval ${item.approvalId} ожидает директорского review; missing data: ${item.missingData.join(", ") || "нет"}.`,
    ownerRole: "director",
    linkedContext: {
      objectId: item.linkedObjectId,
      workId: item.linkedWorkId,
      requestId: item.linkedRequestId,
      invoiceId: item.linkedInvoiceId,
      approvalId: item.approvalId,
    },
    dates: { dueAt: item.dueAt, overdueDays: item.overdueDays },
    blockers: item.missingData.map((missing) => ({
      kind: "approval_missing" as const,
      textRu: `Approval ${item.approvalId}: ${missing}`,
    })),
    risks: [{
      kind: "approval",
      level: item.riskLevel,
      reasonRu: `Решение требует проверки sources и missing data перед human approval.`,
    }],
    decisionOptions: [
      option("Открыть approval package", "Директор увидит источники и missing data без автоматического approve/reject."),
      option("Запросить недостающие данные", "Владелец домена должен приложить документы/evidence до решения.", false),
    ],
    sourceRefs: item.sourceRefs,
  }));
}

function buildFinanceEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.finance
    .filter((item) => item.status !== "paid")
    .map((item) => ({
      id: `finance:${item.id}`,
      eventType: "payment_risk" as const,
      severity: item.riskLevel,
      status: item.missingDocuments.length ? "needs_data" : "ready_for_approval_review",
      titleRu: `Платёж/счёт ${item.invoiceId ?? item.paymentId ?? item.id}: ${item.amount} ${item.currency}`,
      summaryRu: `Финансовое событие ${item.id}: статус ${item.status}, missing documents: ${item.missingDocuments.join(", ") || "нет"}.`,
      ownerRole: "accountant" as const,
      linkedContext: {
        invoiceId: item.invoiceId,
        paymentId: item.paymentId,
        requestId: item.linkedRequestId,
        workId: item.linkedWorkId,
        objectId: item.linkedObjectId,
      },
      dates: {},
      amount: {
        value: item.amount,
        currency: item.currency,
        kind: item.invoiceId ? "invoice" : "payment",
      },
      blockers: item.missingDocuments.map((missing) => ({
        kind: missing.toLowerCase().includes("approval") ? "approval_missing" as const : "missing_document" as const,
        textRu: `По ${item.invoiceId ?? item.paymentId ?? item.id} не хватает: ${missing}.`,
      })),
      risks: [{
        kind: "financial",
        level: item.riskLevel,
        reasonRu: item.missingDocuments.length
          ? "Оплата без полного основания может пройти без накладной/акта/approval."
          : "Финансовое событие требует директорского review по сумме и источникам.",
      }],
      decisionOptions: [
        option("Не согласовывать до закрытия missing documents", "Снижает риск оплаты без основания.", false),
        option("Согласовать только с условием документов", "Решение остаётся за директором и фиксируется через approval ledger."),
      ],
      sourceRefs: item.sourceRefs,
    }));
}

function buildProcurementEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.procurementRequests
    .filter((item) => item.status !== "approved" || item.missingData.length)
    .map((item) => ({
      id: `procurement:${item.id}`,
      eventType: "procurement_blocker" as const,
      severity: item.status === "blocked" || item.status === "delivery_risk" ? "high" as const : "medium" as const,
      status: item.missingData.length ? "needs_data" as const : "needs_owner_action" as const,
      titleRu: `Закупка ${item.id}: ${item.itemRu}`,
      summaryRu: `Заявка ${item.id} связана с ${item.objectNameRu ?? "объект не указан"}; поставщик ${item.supplierNameRu ?? "не подтверждён"}.`,
      ownerRole: "buyer" as const,
      linkedContext: {
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        workId: item.workId,
        workNameRu: item.workNameRu,
        requestId: item.id,
        supplierNameRu: item.supplierNameRu,
      },
      dates: { dueAt: item.deliveryDueAt },
      blockers: [
        ...item.missingData.map((missing) => ({ kind: "supplier_missing" as const, textRu: `Заявка ${item.id}: ${missing}` })),
        ...(item.status === "delivery_risk" ? [{ kind: "supplier_missing" as const, textRu: `Поставка по ${item.id} требует подтверждения срока.` }] : []),
      ],
      risks: [{
        kind: "procurement",
        level: item.status === "blocked" || item.status === "delivery_risk" ? "high" : "medium",
        reasonRu: "Закупка может задержать объект или складскую выдачу.",
      }],
      decisionOptions: [
        option("Поручить снабженцу подтвердить срок/shortlist", "Появится безопасный handoff без создания заказа напрямую.", false),
        option("Открыть approval по закупке", "Директор review sources без auto approval."),
      ],
      sourceRefs: item.sourceRefs,
    }));
}

function buildWarehouseEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.warehouse
    .filter((item) => (item.deficitQty ?? 0) > 0 || !item.incomingConfirmed)
    .map((item) => ({
      id: `warehouse:${item.id}`,
      eventType: item.incomingConfirmed ? "warehouse_deficit" as const : "incoming_discrepancy" as const,
      severity: (item.deficitQty ?? 0) > 0 ? "high" as const : "medium" as const,
      status: "needs_owner_action" as const,
      titleRu: `Склад: ${item.materialNameRu}`,
      summaryRu: `Материал ${item.materialNameRu}: доступно ${item.availableQty ?? 0}, дефицит ${item.deficitQty ?? 0} ${item.unit ?? ""}, приход подтверждён: ${item.incomingConfirmed ? "да" : "нет"}.`,
      ownerRole: "warehouse" as const,
      linkedContext: {
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        workId: item.workId,
        workNameRu: item.workNameRu,
        stockItemId: item.id,
        materialNameRu: item.materialNameRu,
      },
      dates: {},
      blockers: [
        ...((item.deficitQty ?? 0) > 0 ? [{ kind: "warehouse_missing" as const, textRu: `Дефицит ${item.deficitQty} ${item.unit ?? ""} блокирует работу/объект.` }] : []),
        ...(!item.incomingConfirmed ? [{ kind: "incoming_not_confirmed" as const, textRu: "Приход склада не подтверждён источником." }] : []),
      ],
      risks: [{
        kind: "warehouse",
        level: (item.deficitQty ?? 0) > 0 ? "high" : "medium",
        reasonRu: "Физический факт материала не закрывает потребность объекта.",
      }],
      decisionOptions: [
        option("Поручить складу подтвердить приход/дефицит", "Склад даст source-backed trace без мутации остатков.", false),
        option("Поручить снабжению закрыть дефицит", "Buyer получает handoff только на дефицит, без прямого заказа.", false),
      ],
      sourceRefs: item.sourceRefs,
    }));
}

function buildFieldEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.works
    .filter((item) => item.status === "blocked" || item.missingPhotos || item.missingSignature || item.missingAct)
    .map((item) => ({
      id: `field:${item.id}`,
      eventType: item.contractorNameRu ? "contractor_blocker" as const : "field_closeout_blocker" as const,
      severity: item.status === "blocked" ? "high" as const : "medium" as const,
      status: "needs_owner_action" as const,
      titleRu: `${item.objectNameRu}: ${item.workNameRu}`,
      summaryRu: item.blockerRu ?? `Работа требует evidence/signature/act перед закрытием.`,
      ownerRole: item.contractorNameRu ? "contractor" as const : "foreman" as const,
      linkedContext: {
        objectId: item.objectId,
        objectNameRu: item.objectNameRu,
        workId: item.id,
        workNameRu: item.workNameRu,
        materialNameRu: item.materialNameRu,
      },
      dates: {},
      blockers: [
        ...(item.missingPhotos ? [{ kind: "missing_photo" as const, textRu: `По работе ${item.id} нет фото/evidence.` }] : []),
        ...(item.missingSignature ? [{ kind: "missing_signature" as const, textRu: `По работе ${item.id} нет подписи ответственного.` }] : []),
        ...(item.missingAct ? [{ kind: "missing_document" as const, textRu: `По работе ${item.id} нет акта/документа.` }] : []),
        ...(item.blockerRu ? [{ kind: "contractor_not_confirmed" as const, textRu: item.blockerRu }] : []),
      ],
      risks: [{
        kind: item.contractorNameRu ? "contractor" : "schedule",
        level: item.status === "blocked" ? "high" : "medium",
        reasonRu: "Работа не закрывается без evidence/акта/подтверждения.",
      }],
      decisionOptions: [
        option("Поручить прорабу запросить evidence", "Поле приложит фото/акт без финального закрытия AI.", false),
        option("Поручить подрядчику сдать документы", "Подрядчик получает draft request, статус работы не меняется.", false),
      ],
      sourceRefs: item.sourceRefs,
    }));
}

function buildDocumentEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return [
    ...context.documents
      .filter((item) => item.status !== "ready")
      .map((item) => ({
        id: `document:${item.id}`,
        eventType: "document_missing" as const,
        severity: item.status === "missing" ? "high" as const : "medium" as const,
        status: "needs_data" as const,
        titleRu: `Документ: ${item.titleRu}`,
        summaryRu: `Документ ${item.titleRu} имеет статус ${item.status}.`,
        ownerRole: "office" as const,
        linkedContext: { objectId: item.linkedObjectId, workId: item.linkedWorkId, documentId: item.id },
        dates: {},
        blockers: [{ kind: "missing_document" as const, textRu: `Документ ${item.titleRu}: ${item.status}.` }],
        risks: [{ kind: "document" as const, level: item.status === "missing" ? "high" as const : "medium" as const, reasonRu: "Документальный пакет неполный." }],
        decisionOptions: [option("Поручить офису связать/запросить документ", "Approval/payment/closeout не скрывает missing document.", false)],
        sourceRefs: item.sourceRefs,
      })),
    ...context.reports
      .filter((item) => item.status !== "ready_for_review")
      .map((item) => ({
        id: `report:${item.id}`,
        eventType: "report_risk" as const,
        severity: item.status === "needs_evidence" ? "high" as const : "medium" as const,
        status: "needs_data" as const,
        titleRu: `Отчёт: ${item.titleRu}`,
        summaryRu: `Отчёт ${item.titleRu} за ${item.periodRu}; missing data: ${item.missingData.join(", ") || "нет"}.`,
        ownerRole: "office" as const,
        linkedContext: { reportId: item.id },
        dates: {},
        blockers: item.missingData.map((missing) => ({ kind: "missing_document" as const, textRu: `Отчёт ${item.id}: ${missing}` })),
        risks: [{ kind: "document" as const, level: "medium" as const, reasonRu: "Executive report нельзя финально отправлять без review и evidence." }],
        decisionOptions: [option("Подготовить draft summary", "Финальная отправка не выполняется AI.", false)],
        sourceRefs: item.sourceRefs,
      })),
  ];
}

function buildOfficeEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.officeTasks
    .filter((item) => item.status !== "pending" || (item.overdueDays ?? 0) > 0)
    .map((item) => ({
      id: `office:${item.id}`,
      eventType: "office_stuck_work" as const,
      severity: item.status === "overdue" ? "high" as const : "medium" as const,
      status: "needs_owner_action" as const,
      titleRu: `Офис: ${item.titleRu}`,
      summaryRu: `Офисная работа ${item.status}; владелец ${item.ownerRole}.`,
      ownerRole: "office" as const,
      linkedContext: {},
      dates: { dueAt: item.dueAt, overdueDays: item.overdueDays },
      blockers: [{ kind: "office_overdue" as const, textRu: `Офисная задача ${item.id}: ${item.status}.` }],
      risks: [{ kind: "document" as const, level: item.status === "overdue" ? "high" as const : "medium" as const, reasonRu: "Офисная задержка блокирует package/approval/document flow." }],
      decisionOptions: [option("Поручить офису собрать package", "Создаётся только draft поручения.", false)],
      sourceRefs: item.sourceRefs,
    }));
}

function buildForecastEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.cashflowForecasts.map((item) => ({
    id: `forecast:${item.id}`,
    eventType: "cashflow_risk",
    severity: "medium",
    status: "watch",
    titleRu: `Прогноз cashflow: ${item.periodRu}`,
    summaryRu: `Это прогноз, не факт движения денег: ${item.amount} ${item.currency}. Assumption: ${item.assumptionRu}.`,
    ownerRole: "accountant",
    linkedContext: {},
    dates: {},
    amount: { value: item.amount, currency: item.currency, kind: "cashflow_forecast" },
    blockers: context.forecastProviderConnected ? [] : [{ kind: "cashflow_unknown", textRu: "Cashflow provider не подключён." }],
    risks: [{ kind: "financial", level: "medium", reasonRu: "Forecast must stay labeled as forecast and source-backed." }],
    decisionOptions: [option("Попросить бухгалтерию подтвердить cashflow source", "Прогноз не превращается в факт.", false)],
    sourceRefs: item.sourceRefs,
  } satisfies CompanyDecisionEvent));
}

function buildSecurityEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return context.securitySummaries.map((item) => ({
    id: `security:${item.id}`,
    eventType: "security_summary_risk",
    severity: item.riskLevel,
    status: "watch",
    titleRu: item.titleRu,
    summaryRu: item.summaryRu,
    ownerRole: "security",
    linkedContext: {},
    dates: {},
    blockers: [],
    risks: [{ kind: "security", level: item.riskLevel, reasonRu: "Доступен только safe summary; raw security/runtime данные скрыты." }],
    decisionOptions: [option("Открыть безопасный security summary", "Raw runtime/provider payload остаётся скрытым.", false)],
    sourceRefs: item.sourceRefs,
  } satisfies CompanyDecisionEvent));
}

export function buildCompanyDecisionEvents(context: DirectorCompanyContext): CompanyDecisionEvent[] {
  return [
    ...buildApprovalEvents(context),
    ...buildFinanceEvents(context),
    ...buildProcurementEvents(context),
    ...buildWarehouseEvents(context),
    ...buildFieldEvents(context),
    ...buildDocumentEvents(context),
    ...buildOfficeEvents(context),
    ...buildForecastEvents(context),
    ...buildSecurityEvents(context),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function answerKindForIntent(intent: DirectorIntent, events: CompanyDecisionEvent[]): DirectorAnswerKind {
  if (events.length === 0) return "exact_no_data_reason";
  if (intent === "weekly_executive_summary") return "executive_summary";
  if (intent === "approval_queue_review" || intent === "approval_rationale_review") return "approval_review";
  if (intent === "company_timeline" || intent === "object_chain_trace") return "company_timeline";
  if (intent === "cashflow_risk_summary") return "cashflow_risk_summary";
  if (intent === "director_delegation_draft") return "delegation_draft";
  if (intent === "top_company_risks" || intent === "blocked_objects_summary") return "cross_domain_risk_report";
  return "decision_queue";
}

function buildDomainSummary(context: DirectorCompanyContext): DirectorCompanyAnswer["domainSummary"] {
  return {
    field: `${context.works.filter((item) => item.status === "blocked").length} blocked works / ${context.works.length} works`,
    procurement: `${context.procurementRequests.filter((item) => item.status !== "approved").length} procurement blockers / ${context.procurementRequests.length} requests`,
    warehouse: `${context.warehouse.filter((item) => (item.deficitQty ?? 0) > 0 || !item.incomingConfirmed).length} stock risks / ${context.warehouse.length} stock rows`,
    finance: `${context.finance.filter((item) => item.status !== "paid").length} finance decisions / ${context.finance.length} finance items`,
    documents: `${context.documents.filter((item) => item.status !== "ready").length} document gaps / ${context.documents.length} documents`,
    office: `${context.officeTasks.filter((item) => item.status !== "pending").length} stuck office tasks / ${context.officeTasks.length} tasks`,
    approvals: `${context.approvals.length} approvals waiting`,
    security: context.securitySummaryProviderConnected ? `${context.securitySummaries.length} safe security summaries` : "security summary provider not connected",
  };
}

function sourceList(context: DirectorCompanyContext, events: CompanyDecisionEvent[]): DirectorSourceRef[] {
  const ids = new Set(events.flatMap((event) => event.sourceRefs));
  return context.sources.filter((source) => ids.has(source.id));
}

function buildAnswerText(params: {
  context: DirectorCompanyContext;
  top?: CompanyDecisionEvent;
  events: CompanyDecisionEvent[];
  missingData: string[];
  sources: DirectorSourceRef[];
  nextStepRu: string;
}): string {
  const { context, top, events, missingData, sources, nextStepRu } = params;
  const domain = buildDomainSummary(context);
  const byDomain = (eventType: CompanyDecisionEvent["eventType"]) =>
    events.filter((event) => event.eventType === eventType).slice(0, 2);
  const lines = [
    "Ответ",
    "",
    "Коротко:",
    top
      ? `Главное решение: ${top.titleRu}. ${top.summaryRu}`
      : "По доступным источникам нет решения без missing data; показан exact reason.",
    "",
    "Период:",
    context.period?.labelRu ?? "сегодня",
    "",
    "Главное решение:",
    top ? `- Что: ${top.titleRu}` : "- Что: нет подтверждённого top decision",
    top ? `- Почему: ${top.summaryRu}` : "- Почему: нет source-backed события",
    top ? `- Риск: ${top.risks[0]?.reasonRu ?? top.severity}` : "- Риск: exact no data",
    top ? `- Кому поручить: ${top.ownerRole}` : "- Кому поручить: не определено",
    top ? "- Что будет, если не решить: событие останется в blockers/approval queue." : "- Что будет, если не решить: требуется подключить источники.",
    "",
    "По доменам:",
    "",
    "Стройка:",
    `- ${domain.field}`,
    ...byDomain("field_closeout_blocker").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Снабжение:",
    `- ${domain.procurement}`,
    ...byDomain("procurement_blocker").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Склад:",
    `- ${domain.warehouse}`,
    ...byDomain("warehouse_deficit").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Финансы:",
    `- ${domain.finance}`,
    ...byDomain("payment_risk").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    ...byDomain("cashflow_risk").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Документы:",
    `- ${domain.documents}`,
    ...byDomain("document_missing").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Office:",
    `- ${domain.office}`,
    ...byDomain("office_stuck_work").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Approvals:",
    `- ${domain.approvals}`,
    ...byDomain("approval_pending").map((event) => `- ${event.titleRu}: ${event.summaryRu}`),
    "",
    "Источники:",
    ...(sources.length ? sources.slice(0, 12).map((source) => `- ${source.type}: ${source.labelRu}`) : ["- exact reason: источники не найдены"]),
    "",
    "Чего не хватает:",
    ...(missingData.length ? missingData.slice(0, 12).map((item) => `- ${item}`) : ["- Ничего критичного по текущему source trace"]),
    "",
    "Следующий шаг:",
    nextStepRu,
    "",
    "Статус:",
    "AI не принял решение. Данные не изменены. Требуется действие человека.",
  ];
  return lines.join("\n");
}

export function composeDirectorCompanyAnswer(params: {
  context: DirectorCompanyContext;
  intent: DirectorIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
  hiddenTechnicalData: DirectorCompanyAnswer["hiddenTechnicalData"];
}): DirectorCompanyAnswer {
  const events = buildCompanyDecisionEvents(params.context);
  const top = events[0];
  const sources = sourceList(params.context, events);
  const eventMissingData = unique(events.flatMap((event) => event.blockers.map((blocker) => blocker.textRu)));
  const missingData = unique([
    ...params.missingData,
    ...eventMissingData,
    ...(params.context.forecastProviderConnected ? [] : ["Cashflow source не подключён; forecast нельзя показывать как факт."]),
  ]);
  const nextStepRu = top
    ? `Открыть ${top.ownerRole} source trace и поручить безопасное действие без approve/reject или мутации.`
    : "Подключить источники или открыть approvals/risk list для exact no-data review.";
  const topDecision = top
    ? {
        eventId: top.id,
        titleRu: top.titleRu,
        reasonRu: top.summaryRu,
        riskRu: top.risks[0]?.reasonRu ?? top.severity,
        nextStepRu,
      }
    : undefined;
  const answerRu = buildAnswerText({
    context: params.context,
    top,
    events,
    missingData,
    sources,
    nextStepRu,
  });
  return {
    screenId: params.context.screenId,
    role: "director",
    questionRu: params.questionRu,
    answerKind: answerKindForIntent(params.intent, events),
    titleRu: params.intent === "weekly_executive_summary" ? "Executive summary" : "Очередь решений директора",
    shortAnswerRu: top
      ? `Главное решение: ${top.titleRu}. Источники: ${top.sourceRefs.join(", ")}.`
      : "Нет source-backed top decision; нужен exact source.",
    period: params.context.period,
    topDecision,
    events,
    domainSummary: buildDomainSummary(params.context),
    sources,
    missingData,
    hiddenTechnicalData: params.hiddenTechnicalData,
    nextStepRu,
    changedData: false,
    approvedByAi: false,
    rejectedByAi: false,
    paymentExecuted: false,
    orderCreated: false,
    stockMutated: false,
    rolePolicyMutated: false,
    finalSubmit: false,
    answerRu,
    sourceTrace: unique(sources.map((source) => source.id)),
    providerTrace: params.providerTrace,
    genericAnswerUsed: false,
    fakeDataCreated: false,
  };
}
