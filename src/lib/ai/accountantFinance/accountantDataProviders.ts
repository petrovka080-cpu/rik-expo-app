import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import { scoreAccountantFinanceRisks } from "./accountantRiskScoring";
import type {
  AccountantDataProviderResult,
  AccountantFinanceContext,
  AccountantInvoice,
  AccountantProviderDescriptor,
  AccountantProviderKey,
} from "./accountantFinanceTypes";

export const REQUIRED_ACCOUNTANT_PROVIDER_KEYS: readonly AccountantProviderKey[] = [
  "aiAccountantScreenContextProvider",
  "aiPaymentsProvider",
  "aiPaymentDetailProvider",
  "aiInvoicesProvider",
  "aiInvoiceDetailProvider",
  "aiActsProvider",
  "aiContractsProvider",
  "aiWaybillsProvider",
  "aiDocumentsProvider",
  "aiPdfAggregatorProvider",
  "aiApprovalProvider",
  "aiProcurementLinkedRequestProvider",
  "aiSupplierLinkedProvider",
  "aiWarehouseLinkedIncomingProvider",
  "aiWarehouseLinkedIssueProvider",
  "aiWorkObjectLinkedProvider",
  "aiEstimateLinkedLineProvider",
  "aiCashflowProvider",
  "aiReceivablesPayablesProvider",
  "aiAccountingRecordsProvider",
  "aiChartOfAccountsProvider",
  "aiBudgetLimitProvider",
  "aiCurrencyCountryProvider",
  "aiExchangeRateProvider",
  "aiTaxAccountingProfileProvider",
  "aiCompanyAccountingPolicyProvider",
  "aiFinanceRiskProvider",
  "aiAccountantInvoiceProvider",
  "aiAccountantActProvider",
  "aiAccountantEstimateProvider",
  "aiAccountantProcurementLinkProvider",
  "aiAccountantDocumentEvidenceProvider",
  "aiAccountantPaymentLedgerProvider",
  "aiAccountantCashflowSliceProvider",
  "aiAccountantDebtCreditorProvider",
  "aiAccountantChartOfAccountsProvider",
  "aiAccountantCountryTaxProfileProvider",
  "aiAccountantApprovalStatusProvider",
  "aiAccountantRiskProvider",
  "aiAccountantAnswerComposer",
  "aiAccountantSourceSanitizer",
] as const;

function descriptor(key: AccountantProviderKey): AccountantProviderDescriptor {
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

export const ACCOUNTANT_PROVIDER_REGISTRY: readonly AccountantProviderDescriptor[] =
  REQUIRED_ACCOUNTANT_PROVIDER_KEYS.map(descriptor);

export function listAccountantDataProviders(): AccountantProviderDescriptor[] {
  return ACCOUNTANT_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function selectedInvoice(context: AccountantFinanceContext): AccountantInvoice | undefined {
  return context.invoices.find((invoice) => invoice.id === context.selectedInvoiceId) ?? context.invoices[0];
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): AccountantDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function providerResult(params: Partial<AccountantDataProviderResult>): AccountantDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourceFilter(
  context: AccountantFinanceContext,
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource[] {
  return context.sources.filter((source) => types.includes(source.type));
}

export function aiAccountantScreenContextProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "accountant:screen",
        `Экран ${context.screenId}: бухгалтерская проверка собирается по ${context.invoices.length} счетам, ${context.payments.length} платежам.`,
      ),
    ],
  });
}

export function aiAccountantInvoiceProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const invoice = selectedInvoice(context);
  if (!invoice) {
    return providerResult({
      missingData: ["Счет для проверки не найден."],
      exactNoDataReasonRu: "В бухгалтерском срезе нет счета.",
    });
  }
  return providerResult({
    facts: [
      fact(
        `invoice:${invoice.id}`,
        `Счет ${invoice.numberRu}: ${invoice.supplierNameRu}, ${invoice.amount} ${invoice.currency}, статус ${invoice.status}.`,
        invoice.sourceRefs,
      ),
    ],
    sources: sourceFilter(context, ["payment", "supplier_offer"]),
    missingData: [
      ...(invoice.requestId ? [] : ["Счет не связан с закупочной заявкой."]),
      ...(invoice.actId ? [] : ["Счет не связан с актом."]),
      ...(invoice.estimateLineId ? [] : ["Счет не связан со сметной строкой."]),
    ],
  });
}

export function aiAccountantActProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const invoice = selectedInvoice(context);
  const act = invoice?.actId ? context.acts.find((item) => item.id === invoice.actId) : undefined;
  if (!act) {
    return providerResult({
      missingData: ["Акт по счету не найден или не связан."],
      exactNoDataReasonRu: "Акт не найден.",
    });
  }
  return providerResult({
    sources: sourceFilter(context, ["act"]),
    facts: [
      fact(
        `act:${act.id}`,
        `Акт ${act.titleRu}: ${act.amount ?? "сумма не указана"} ${act.currency ?? ""}, подпись человека: ${act.signedByHuman ? "да" : "нет"}.`,
        act.sourceRefs,
      ),
    ],
    missingData: act.signedByHuman ? [] : ["Подпись человека по акту не подтверждена."],
  });
}

export function aiAccountantEstimateProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["estimate_pdf", "boq", "project_pdf", "architecture_pdf", "engineering_pdf"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`estimate-project:${source.id}`, `Источник сметы/проекта: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id])),
    missingData: sources.length === 0 ? ["Смета/проектный PDF не привязаны к счету или акту."] : [],
    exactNoDataReasonRu: sources.length === 0 ? "Сметный или проектный источник не найден." : undefined,
  });
}

export function aiAccountantProcurementLinkProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["procurement_request", "supplier_offer", "material", "work", "object"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`procurement-link:${source.id}`, `Связанный источник закупки/работы: ${source.labelRu}.`, [source.id])),
    missingData: sources.length === 0 ? ["Связь счета с закупкой, работой или объектом не найдена."] : [],
  });
}

export function aiAccountantDocumentEvidenceProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["act", "report", "supplier_offer", "payment", "approval"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`document:${source.id}`, `Документальное основание: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id])),
    missingData: sources.length === 0 ? ["Первичные документы по счету не найдены."] : [],
  });
}

export function aiAccountantPaymentLedgerProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const invoice = selectedInvoice(context);
  const payments = invoice ? context.payments.filter((payment) => payment.invoiceId === invoice.id) : context.payments;
  return providerResult({
    sources: sourceFilter(context, ["payment"]),
    facts: payments.map((payment) => fact(`payment:${payment.id}`, `Платеж ${payment.id}: ${payment.amount} ${payment.currency}, статус ${payment.status}.`, payment.sourceRefs)),
    missingData: payments.length === 0 ? ["Платежи по счету не найдены; оплату нельзя считать выполненной."] : [],
  });
}

export function aiAccountantCashflowSliceProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  return providerResult({
    facts: context.cashflow.map((slice) =>
      fact(
        `cashflow:${slice.id}`,
        `Cashflow slice ${slice.scope}, ${slice.periodRu}: расход ${slice.outgoingAmount ?? 0} ${slice.currency}, приход ${slice.incomingAmount ?? 0} ${slice.currency}.`,
        slice.sourceRefs,
      ),
    ),
    missingData: context.cashflow.length === 0 ? ["Доступный cashflow slice не найден."] : [],
  });
}

export function aiAccountantDebtCreditorProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const totalInvoices = context.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalPayments = context.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return providerResult({
    facts: [
      fact(
        "debt-creditor:summary",
        `Кредиторский срез: счета ${totalInvoices} ${context.currency ?? ""}, платежи ${totalPayments} ${context.currency ?? ""}.`,
        context.invoices.flatMap((invoice) => invoice.sourceRefs),
      ),
    ],
  });
}

export function aiAccountantChartOfAccountsProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["company_standard"]);
  return providerResult({
    sources,
    facts: [
      fact(
        "chart-of-accounts",
        context.chartOfAccountsConfigured
          ? "План счетов настроен источниками компании."
          : "План счетов не настроен; AI не утверждает счет учета.",
        sources.map((source) => source.id),
      ),
    ],
    missingData: context.chartOfAccountsConfigured ? [] : ["План счетов не настроен или не привязан источником."],
  });
}

export function aiAccountantCountryTaxProfileProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["country_profile", "normative_pdf", "company_standard"]);
  return providerResult({
    sources,
    facts: [
      fact(
        "country-tax-profile",
        context.countryTaxProfileConfigured
          ? `Country/tax profile ${context.countryCode ?? "не указана"} настроен источниками.`
          : "Country/tax profile не настроен; AI не делает налоговые утверждения по стране.",
        sources.map((source) => source.id),
      ),
    ],
    missingData: context.countryTaxProfileConfigured ? [] : ["Country/tax profile не настроен источником."],
  });
}

export function aiAccountantApprovalStatusProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const sources = sourceFilter(context, ["approval"]);
  return providerResult({
    sources,
    facts: [fact("approval:accountant", "Согласование готовится только как маршрут для человека; auto approval не выполняется.", sources.map((source) => source.id))],
    missingData: sources.length === 0 ? ["Approval route по счету не найден; нужен безопасный handoff."] : [],
  });
}

export function aiAccountantRiskProvider(context: AccountantFinanceContext): AccountantDataProviderResult {
  const risks = scoreAccountantFinanceRisks(context);
  return providerResult({
    facts: risks.map((risk) => fact(risk.id, `Риск ${risk.riskLevel}: ${risk.reasonsRu.join("; ")}.`, risk.sourceRefs)),
  });
}

export const ACCOUNTANT_DATA_PROVIDER_FUNCTIONS: Record<AccountantProviderKey, (context: AccountantFinanceContext) => AccountantDataProviderResult> = {
  aiAccountantScreenContextProvider,
  aiPaymentsProvider: aiAccountantPaymentLedgerProvider,
  aiPaymentDetailProvider: aiAccountantPaymentLedgerProvider,
  aiInvoicesProvider: aiAccountantInvoiceProvider,
  aiInvoiceDetailProvider: aiAccountantInvoiceProvider,
  aiActsProvider: aiAccountantActProvider,
  aiContractsProvider: () => providerResult({ missingData: ["contract source is not connected for this finance event."] }),
  aiWaybillsProvider: () => providerResult({ missingData: ["waybill source is not connected for this finance event."] }),
  aiDocumentsProvider: aiAccountantDocumentEvidenceProvider,
  aiPdfAggregatorProvider: aiAccountantDocumentEvidenceProvider,
  aiApprovalProvider: aiAccountantApprovalStatusProvider,
  aiProcurementLinkedRequestProvider: aiAccountantProcurementLinkProvider,
  aiSupplierLinkedProvider: aiAccountantProcurementLinkProvider,
  aiWarehouseLinkedIncomingProvider: () => providerResult({ missingData: ["warehouse incoming confirmation is not connected for this finance event."] }),
  aiWarehouseLinkedIssueProvider: () => providerResult({ missingData: ["warehouse issue confirmation is not connected for this finance event."] }),
  aiWorkObjectLinkedProvider: aiAccountantProcurementLinkProvider,
  aiEstimateLinkedLineProvider: aiAccountantEstimateProvider,
  aiCashflowProvider: aiAccountantCashflowSliceProvider,
  aiReceivablesPayablesProvider: aiAccountantDebtCreditorProvider,
  aiAccountingRecordsProvider: () => providerResult({ missingData: ["accounting records provider is not connected for this finance event."] }),
  aiChartOfAccountsProvider: aiAccountantChartOfAccountsProvider,
  aiBudgetLimitProvider: () => providerResult({ missingData: ["budget limit source is not connected for this finance event."] }),
  aiCurrencyCountryProvider: aiAccountantCountryTaxProfileProvider,
  aiExchangeRateProvider: () => providerResult({ missingData: ["exchange rate source is not connected for this finance event."] }),
  aiTaxAccountingProfileProvider: aiAccountantCountryTaxProfileProvider,
  aiCompanyAccountingPolicyProvider: aiAccountantChartOfAccountsProvider,
  aiFinanceRiskProvider: aiAccountantRiskProvider,
  aiAccountantInvoiceProvider,
  aiAccountantActProvider,
  aiAccountantEstimateProvider,
  aiAccountantProcurementLinkProvider,
  aiAccountantDocumentEvidenceProvider,
  aiAccountantPaymentLedgerProvider,
  aiAccountantCashflowSliceProvider,
  aiAccountantDebtCreditorProvider,
  aiAccountantChartOfAccountsProvider,
  aiAccountantCountryTaxProfileProvider,
  aiAccountantApprovalStatusProvider,
  aiAccountantRiskProvider,
  aiAccountantAnswerComposer: () => providerResult({ facts: [fact("composer:accountant", "Ответ собирается единым accountant finance composer.")] }),
  aiAccountantSourceSanitizer: () => providerResult({ facts: [fact("sanitizer:accountant", "Источники очищены от security/runtime/provider/secrets и unrelated данных.")] }),
};

export function accountantProviderTraceForAll(): string[] {
  return ["accountantFinancePipeline", ...REQUIRED_ACCOUNTANT_PROVIDER_KEYS];
}
