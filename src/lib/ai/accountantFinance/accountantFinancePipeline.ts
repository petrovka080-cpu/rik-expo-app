import { getAccountantActionQuestion } from "./accountantActionQuestionMap";
import { composeAccountantFinanceAnswer } from "./accountantAnswerComposer";
import { ACCOUNTANT_DATA_PROVIDER_FUNCTIONS } from "./accountantDataProviders";
import { routeAccountantIntent } from "./accountantIntentRouter";
import { sanitizeAccountantContext } from "./accountantSourceSanitizer";
import type {
  AccountantDataProviderResult,
  AccountantFinanceAnswer,
  AccountantFinanceContext,
  AccountantIntent,
  AccountantProviderKey,
} from "./accountantFinanceTypes";

function providerKeysForIntent(intent: AccountantIntent): AccountantProviderKey[] {
  const always: AccountantProviderKey[] = [
    "aiAccountantSourceSanitizer",
    "aiAccountantScreenContextProvider",
    "aiPaymentsProvider",
    "aiInvoicesProvider",
    "aiActsProvider",
    "aiDocumentsProvider",
    "aiApprovalProvider",
    "aiAccountantInvoiceProvider",
    "aiAccountantActProvider",
    "aiAccountantDocumentEvidenceProvider",
    "aiAccountantPaymentLedgerProvider",
    "aiAccountantRiskProvider",
    "aiAccountantApprovalStatusProvider",
    "aiAccountantAnswerComposer",
  ];
  const byIntent: Partial<Record<AccountantIntent, AccountantProviderKey[]>> = {
    payment_readiness_check: ["aiPaymentDetailProvider", "aiInvoiceDetailProvider", "aiWaybillsProvider", "aiWarehouseLinkedIncomingProvider", "aiApprovalProvider"],
    critical_payments: ["aiPaymentDetailProvider", "aiInvoiceDetailProvider", "aiWaybillsProvider", "aiAccountingRecordsProvider", "aiFinanceRiskProvider"],
    missing_documents_for_payment: ["aiContractsProvider", "aiWaybillsProvider", "aiDocumentsProvider", "aiPdfAggregatorProvider"],
    cashflow_summary: ["aiCashflowProvider", "aiReceivablesPayablesProvider"],
    cashflow_forecast: ["aiCashflowProvider", "aiBudgetLimitProvider", "aiCurrencyCountryProvider"],
    supplier_debt_summary: ["aiReceivablesPayablesProvider", "aiSupplierLinkedProvider"],
    contractor_payment_check: ["aiActsProvider", "aiWorkObjectLinkedProvider", "aiEstimateLinkedLineProvider"],
    invoice_to_request_reconciliation: ["aiProcurementLinkedRequestProvider", "aiSupplierLinkedProvider"],
    invoice_to_warehouse_reconciliation: ["aiWarehouseLinkedIncomingProvider", "aiWarehouseLinkedIssueProvider"],
    act_to_payment_reconciliation: ["aiActsProvider", "aiPaymentDetailProvider", "aiWorkObjectLinkedProvider"],
    estimate_to_act_reconciliation: [
      "aiEstimateLinkedLineProvider",
      "aiActsProvider",
      "aiWorkObjectLinkedProvider",
      "aiAccountantEstimateProvider",
      "aiAccountantActProvider",
      "aiAccountantDocumentEvidenceProvider",
      "aiAccountantProcurementLinkProvider",
    ],
    approval_queue_for_finance: ["aiApprovalProvider"],
    director_payment_rationale: ["aiProcurementLinkedRequestProvider", "aiWarehouseLinkedIncomingProvider", "aiApprovalProvider"],
    document_request_draft: ["aiContractsProvider", "aiWaybillsProvider", "aiDocumentsProvider"],
    payment_risk_explanation: ["aiFinanceRiskProvider"],
    budget_limit_check: ["aiBudgetLimitProvider"],
    country_accounting_context_check: ["aiTaxAccountingProfileProvider", "aiCompanyAccountingPolicyProvider", "aiCurrencyCountryProvider"],
    chart_of_accounts_mapping: ["aiChartOfAccountsProvider", "aiCompanyAccountingPolicyProvider"],
    act_invoice_match: ["aiAccountantActProvider"],
    estimate_act_invoice_chain: ["aiAccountantEstimateProvider", "aiAccountantProcurementLinkProvider"],
    payment_movement_summary: ["aiAccountantCashflowSliceProvider", "aiAccountantDebtCreditorProvider"],
    cashflow_slice: ["aiAccountantCashflowSliceProvider"],
    creditor_debtor_summary: ["aiAccountantDebtCreditorProvider", "aiAccountantCashflowSliceProvider"],
    prepare_payment_rationale: ["aiAccountantEstimateProvider", "aiAccountantProcurementLinkProvider"],
    prepare_approval_handoff: ["aiAccountantApprovalStatusProvider"],
    tax_country_context_check: ["aiAccountantCountryTaxProfileProvider"],
    chart_of_accounts_check: ["aiAccountantChartOfAccountsProvider"],
    document_basis_check: ["aiAccountantDocumentEvidenceProvider"],
    procurement_invoice_link: ["aiAccountantProcurementLinkProvider"],
    free_text_finance_summary: ["aiAccountantCashflowSliceProvider", "aiAccountantDebtCreditorProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: AccountantFinanceContext, intent: AccountantIntent): {
  results: AccountantDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "accountantFinancePipeline",
      "role:accountant",
      "source_chain:invoice>act>estimate>documents>payments>approval",
      ...keys,
    ],
    results: keys.map((key) => ACCOUNTANT_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

export function answerAccountantFinanceQuestion(params: {
  context: AccountantFinanceContext;
  questionRu: string;
  actionId?: AccountantIntent;
}): AccountantFinanceAnswer {
  const safeContext = sanitizeAccountantContext(params.context);
  const action = params.actionId ? getAccountantActionQuestion(params.actionId, safeContext.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeAccountantIntent(questionRu).intent;
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
    ...results.flatMap((result) => result.permissionLimited),
  ];
  return composeAccountantFinanceAnswer({
    context: safeContext,
    intent,
    questionRu,
    providerTrace,
    missingData: [...new Set(missingData)],
  });
}

export function answerAccountantAction(params: {
  context: AccountantFinanceContext;
  actionId: AccountantIntent;
}): AccountantFinanceAnswer {
  const action = getAccountantActionQuestion(params.actionId, params.context.screenId);
  return answerAccountantFinanceQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildAccountantAiBlockViewModel(context: AccountantFinanceContext): {
  titleRu: string;
  invoicesCount: number;
  paymentsCount: number;
  totalAmountRu: string;
  criticalCount: number;
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const currency = context.currency ?? context.invoices[0]?.currency ?? "";
  const totalAmount = context.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const criticalCount = context.invoices.filter((invoice) => invoice.status === "blocked" || invoice.status === "needs_check").length;
  const actions = [
    "Что можно оплачивать",
    "Каких документов не хватает",
    "Движение денег",
    "Смета -> акт -> счет",
    "Почему риск",
    "Rationale директору",
    "На согласование",
  ];
  return {
    titleRu: "Готово от AI",
    invoicesCount: context.invoices.length,
    paymentsCount: context.payments.length,
    totalAmountRu: `${totalAmount.toLocaleString("ru-RU")} ${currency}`,
    criticalCount,
    missingData: [
      ...(context.countryTaxProfileConfigured ? [] : ["country/tax profile не настроен"]),
      ...(context.chartOfAccountsConfigured ? [] : ["план счетов не настроен"]),
      ...(context.invoices.length ? [] : ["счета не загружены"]),
    ],
    inputPlaceholderRu: "Спросить по счетам, актам, оплатам, документам...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const accountantFinancePipeline = answerAccountantFinanceQuestion;
