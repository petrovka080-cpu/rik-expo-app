import type {
  DirectorCompanyContext,
  DirectorDataProviderResult,
  DirectorProviderDescriptor,
  DirectorProviderKey,
  DirectorSourceRef,
} from "./directorCompanyTypes";

export const REQUIRED_DIRECTOR_PROVIDER_KEYS: readonly DirectorProviderKey[] = [
  "aiDirectorScreenContextProvider",
  "aiCompanyDecisionEventProvider",
  "aiCompanyRiskProvider",
  "aiCompanyTimelineProvider",
  "aiCompanyKpiProvider",
  "aiApprovalQueueProvider",
  "aiDirectorApprovalContextProvider",
  "aiDirectorFinanceProvider",
  "aiDirectorCashflowProvider",
  "aiDirectorProcurementProvider",
  "aiDirectorSupplierProvider",
  "aiDirectorMarketplaceProvider",
  "aiDirectorWarehouseProvider",
  "aiDirectorFieldProvider",
  "aiDirectorContractorProvider",
  "aiDirectorDocumentsProvider",
  "aiDirectorReportsProvider",
  "aiDirectorOfficeProvider",
  "aiDirectorSecuritySummaryProvider",
  "aiConstructionKnowledgeCoreProvider",
  "aiCountryProfileProvider",
  "aiForecastProvider",
  "aiDirectorAnswerComposer",
  "aiDirectorSourceSanitizer",
] as const;

function descriptor(key: DirectorProviderKey): DirectorProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const DIRECTOR_PROVIDER_REGISTRY: readonly DirectorProviderDescriptor[] =
  REQUIRED_DIRECTOR_PROVIDER_KEYS.map(descriptor);

export function listDirectorDataProviders(): DirectorProviderDescriptor[] {
  return DIRECTOR_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): DirectorDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length ? "high" : "medium",
  };
}

function providerResult(params: Partial<DirectorDataProviderResult>): DirectorDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourcesByType(context: DirectorCompanyContext, types: DirectorSourceRef["type"][]): DirectorSourceRef[] {
  return context.sources.filter((source) => types.includes(source.type));
}

export function aiDirectorScreenContextProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "director:screen",
        `Экран ${context.screenId}: approvals ${context.approvals.length}, работы ${context.works.length}, закупки ${context.procurementRequests.length}, склад ${context.warehouse.length}, финансы ${context.finance.length}.`,
      ),
    ],
  });
}

export function aiCompanyDecisionEventProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  const count =
    context.approvals.length +
    context.finance.filter((item) => item.status !== "paid").length +
    context.warehouse.filter((item) => (item.deficitQty ?? 0) > 0 || !item.incomingConfirmed).length +
    context.works.filter((item) => item.status === "blocked").length;
  return providerResult({
    facts: [fact("director:decision-events", `Очередь решений содержит ${count} подтверждённых событий из бизнес-доменов.`)],
    exactNoDataReasonRu: count === 0 ? "По доступным источникам нет решений, требующих директора." : undefined,
  });
}

export function aiCompanyRiskProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  const riskFacts = [
    ...context.finance.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").map((item) =>
      fact(`finance-risk:${item.id}`, `Финансовый риск ${item.id}: ${item.amount} ${item.currency}, не хватает ${item.missingDocuments.join(", ") || "документального основания"}.`, item.sourceRefs),
    ),
    ...context.warehouse.filter((item) => (item.deficitQty ?? 0) > 0).map((item) =>
      fact(`warehouse-risk:${item.id}`, `Складской риск ${item.materialNameRu}: дефицит ${item.deficitQty} ${item.unit ?? ""}.`, item.sourceRefs),
    ),
    ...context.works.filter((item) => item.status === "blocked").map((item) =>
      fact(`field-risk:${item.id}`, `Полевой риск ${item.objectNameRu}: ${item.blockerRu ?? "работа заблокирована"}.`, item.sourceRefs),
    ),
  ];
  return providerResult({ facts: riskFacts, sources: context.sources });
}

export function aiCompanyTimelineProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: context.works.map((work) =>
      fact(
        `timeline:${work.id}`,
        `Цепочка объекта ${work.objectNameRu}: работа ${work.workNameRu}, материал ${work.materialNameRu ?? "не указан"}, статус ${work.status}.`,
        work.sourceRefs,
      ),
    ),
    missingData: context.works.filter((work) => !work.materialNameRu).map((work) => `По работе ${work.id} не указан материал для полной цепочки.`),
  });
}

export function aiCompanyKpiProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: [
      fact("kpi:approvals", `Ожидают решения: ${context.approvals.length}.`),
      fact("kpi:blocked-works", `Блокируют объекты: ${context.works.filter((item) => item.status === "blocked").length}.`),
      fact("kpi:finance-risk", `Финансовые риски: ${context.finance.filter((item) => item.status === "blocked" || item.riskLevel === "high" || item.riskLevel === "critical").length}.`),
      fact("kpi:warehouse-risk", `Складские риски: ${context.warehouse.filter((item) => (item.deficitQty ?? 0) > 0 || !item.incomingConfirmed).length}.`),
    ],
  });
}

export function aiApprovalQueueProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["approval"]),
    facts: context.approvals.map((item) =>
      fact(`approval:${item.id}`, `Approval ${item.approvalId}: ${item.titleRu}, статус ${item.status}, риск ${item.riskLevel}.`, item.sourceRefs),
    ),
    missingData: context.approvals.flatMap((item) => item.missingData.map((missing) => `Approval ${item.approvalId}: ${missing}`)),
  });
}

export const aiDirectorApprovalContextProvider = aiApprovalQueueProvider;

export function aiDirectorFinanceProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["payment", "invoice", "act", "cashflow"]),
    facts: context.finance.map((item) =>
      fact(`finance:${item.id}`, `Финансы ${item.id}: ${item.amount} ${item.currency}, статус ${item.status}, риск ${item.riskLevel}.`, item.sourceRefs),
    ),
    missingData: context.finance.flatMap((item) => item.missingDocuments.map((missing) => `Финансы ${item.id}: не хватает ${missing}.`)),
  });
}

export function aiDirectorCashflowProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["cashflow"]),
    facts: context.cashflowForecasts.map((item) =>
      fact(`cashflow:${item.id}`, `Прогноз cashflow ${item.periodRu}: ${item.amount} ${item.currency}. Основание: ${item.assumptionRu}.`, item.sourceRefs),
    ),
    missingData: context.forecastProviderConnected ? [] : ["Cashflow/forecast provider не подключён; движение денег нельзя показывать как факт."],
  });
}

export function aiDirectorProcurementProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["procurement_request", "supplier_offer", "marketplace_offer"]),
    facts: context.procurementRequests.map((item) =>
      fact(`procurement:${item.id}`, `Заявка ${item.id}: ${item.itemRu}, статус ${item.status}, поставщик ${item.supplierNameRu ?? "не подтверждён"}.`, item.sourceRefs),
    ),
    missingData: context.procurementRequests.flatMap((item) => item.missingData.map((missing) => `Заявка ${item.id}: ${missing}`)),
  });
}

export function aiDirectorSupplierProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["supplier_offer"]),
    facts: context.procurementRequests
      .filter((item) => item.supplierNameRu)
      .map((item) => fact(`supplier:${item.id}`, `Поставщик ${item.supplierNameRu} связан с заявкой ${item.id}.`, item.sourceRefs)),
    missingData: context.procurementRequests.filter((item) => !item.supplierNameRu).map((item) => `Заявка ${item.id}: поставщик не подтверждён.`),
  });
}

export function aiDirectorMarketplaceProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["marketplace_offer"]),
    facts: sourcesByType(context, ["marketplace_offer"]).map((source) => fact(`marketplace:${source.id}`, `Marketplace source: ${source.labelRu}.`, [source.id])),
  });
}

export function aiDirectorWarehouseProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["warehouse_stock", "warehouse_incoming", "warehouse_issue"]),
    facts: context.warehouse.map((item) =>
      fact(
        `warehouse:${item.id}`,
        `Склад ${item.materialNameRu}: доступно ${item.availableQty ?? 0}, дефицит ${item.deficitQty ?? 0}, приход подтверждён: ${item.incomingConfirmed ? "да" : "нет"}.`,
        item.sourceRefs,
      ),
    ),
    missingData: context.warehouse.filter((item) => !item.incomingConfirmed).map((item) => `${item.materialNameRu}: приход не подтверждён.`),
  });
}

export function aiDirectorFieldProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["work", "object", "contractor"]),
    facts: context.works.map((item) =>
      fact(`field:${item.id}`, `Работа ${item.workNameRu}, объект ${item.objectNameRu}: статус ${item.status}.`, item.sourceRefs),
    ),
    missingData: context.works.flatMap((item) => [
      ...(item.missingPhotos ? [`Работа ${item.id}: не хватает фото/evidence.`] : []),
      ...(item.missingSignature ? [`Работа ${item.id}: не хватает подписи.`] : []),
      ...(item.missingAct ? [`Работа ${item.id}: не хватает акта.`] : []),
    ]),
  });
}

export function aiDirectorContractorProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["contractor", "work"]),
    facts: context.works
      .filter((item) => item.contractorNameRu)
      .map((item) => fact(`contractor:${item.id}`, `Подрядчик ${item.contractorNameRu}: работа ${item.workNameRu}, статус ${item.status}.`, item.sourceRefs)),
  });
}

export function aiDirectorDocumentsProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["document", "pdf_chunk", "act"]),
    facts: context.documents.map((item) =>
      fact(`document:${item.id}`, `Документ ${item.titleRu}: тип ${item.documentType}, статус ${item.status}.`, item.sourceRefs),
    ),
    missingData: context.documents.filter((item) => item.status !== "ready").map((item) => `Документ ${item.titleRu}: статус ${item.status}.`),
  });
}

export function aiDirectorReportsProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["report"]),
    facts: context.reports.map((item) =>
      fact(`report:${item.id}`, `Отчёт ${item.titleRu}: ${item.periodRu}, статус ${item.status}.`, item.sourceRefs),
    ),
    missingData: context.reports.flatMap((item) => item.missingData.map((missing) => `Отчёт ${item.id}: ${missing}`)),
  });
}

export function aiDirectorOfficeProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["office_task"]),
    facts: context.officeTasks.map((item) =>
      fact(`office:${item.id}`, `Офисная задача ${item.titleRu}: ${item.status}, владелец ${item.ownerRole}.`, item.sourceRefs),
    ),
  });
}

export function aiDirectorSecuritySummaryProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    sources: sourcesByType(context, ["security_summary"]),
    facts: context.securitySummaries.map((item) =>
      fact(`security:${item.id}`, `Security summary: ${item.summaryRu}; forbidden attempts ${item.forbiddenAttemptsCount}.`, item.sourceRefs),
    ),
    permissionLimited: context.securitySummaryProviderConnected ? [] : ["Security summary provider не подключён."],
  });
}

export function aiConstructionKnowledgeCoreProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: context.works.map((item) =>
      fact(`construction-core:${item.id}`, `Construction core связал объект ${item.objectNameRu}, работу ${item.workNameRu} и материал ${item.materialNameRu ?? "не указан"}.`, item.sourceRefs),
    ),
  });
}

export function aiCountryProfileProvider(_context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: [fact("country-profile:director", `Директорский контур использует валюту из источников; country-specific claims не создаются без source trace.`)],
  });
}

export function aiForecastProvider(context: DirectorCompanyContext): DirectorDataProviderResult {
  return aiDirectorCashflowProvider(context);
}

export function aiDirectorAnswerComposer(_context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    facts: [fact("director:composer", "Ответ директора собирается как decision queue/read-only draft; данные не изменяются.")],
  });
}

export function aiDirectorSourceSanitizer(context: DirectorCompanyContext): DirectorDataProviderResult {
  return providerResult({
    permissionLimited: (context.unsafeTechnicalSources ?? []).map((source) => `${source.type} скрыт от director UI.`),
  });
}

export const DIRECTOR_DATA_PROVIDER_FUNCTIONS: Record<
  DirectorProviderKey,
  (context: DirectorCompanyContext) => DirectorDataProviderResult
> = {
  aiDirectorScreenContextProvider,
  aiCompanyDecisionEventProvider,
  aiCompanyRiskProvider,
  aiCompanyTimelineProvider,
  aiCompanyKpiProvider,
  aiApprovalQueueProvider,
  aiDirectorApprovalContextProvider,
  aiDirectorFinanceProvider,
  aiDirectorCashflowProvider,
  aiDirectorProcurementProvider,
  aiDirectorSupplierProvider,
  aiDirectorMarketplaceProvider,
  aiDirectorWarehouseProvider,
  aiDirectorFieldProvider,
  aiDirectorContractorProvider,
  aiDirectorDocumentsProvider,
  aiDirectorReportsProvider,
  aiDirectorOfficeProvider,
  aiDirectorSecuritySummaryProvider,
  aiConstructionKnowledgeCoreProvider,
  aiCountryProfileProvider,
  aiForecastProvider,
  aiDirectorAnswerComposer,
  aiDirectorSourceSanitizer,
};
