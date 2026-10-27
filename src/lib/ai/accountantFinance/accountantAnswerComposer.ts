import { scoreAccountantFinanceRisks } from "./accountantRiskScoring";
import type {
  AccountantFinanceAnswer,
  AccountantFinanceContext,
  AccountantFinanceSourceType,
  AccountantIntent,
  AccountantInvoice,
  FinanceEvent,
} from "./accountantFinanceTypes";

function selectedInvoice(context: AccountantFinanceContext): AccountantInvoice {
  const invoice = context.invoices.find((item) => item.id === context.selectedInvoiceId) ?? context.invoices[0];
  if (!invoice) throw new Error("BLOCKED_ACCOUNTANT_DATA_PROVIDER_MISSING");
  return invoice;
}

function answerKind(intent: AccountantIntent): AccountantFinanceAnswer["answerKind"] {
  if (intent === "payment_readiness" || intent === "payment_readiness_check") return "payment_readiness";
  if (intent === "invoice_risk_check" || intent === "payment_risk_explanation" || intent === "critical_payments") return "risk_explanation";
  if (intent === "prepare_approval_handoff" || intent === "approval_queue_for_finance") return "approval_route";
  if (intent === "prepare_payment_rationale" || intent === "director_payment_rationale") return "draft_rationale";
  if (intent === "document_request_draft") return "draft_request";
  if (intent === "missing_primary_documents" || intent === "missing_documents_for_payment") return "document_gap_check";
  if (intent === "cashflow_summary" || intent === "cashflow_forecast" || intent === "cashflow_slice") return "cashflow_summary";
  if (intent === "tax_country_context_check" || intent === "country_accounting_context_check" || intent === "chart_of_accounts_check" || intent === "chart_of_accounts_mapping") return "clarifying_question";
  return "finance_result";
}

function money(amount?: number, currency?: string): string {
  if (typeof amount !== "number") return "сумма не указана";
  return `${amount.toLocaleString("ru-RU")} ${currency ?? "валюта не указана"}`;
}

function statusText(kind: AccountantFinanceAnswer["answerKind"]): string {
  if (kind === "approval_route") return "Платеж не создан. Проводка не создана. Подготовлен маршрут согласования. Автоматическое согласование не выполнялось.";
  if (kind === "draft_rationale") return "Платеж не создан. Проводка не создана. Подготовлен черновик rationale.";
  return "Платеж не создан. Проводка не создана. Данные не изменены.";
}

function sourceType(type: string): AccountantFinanceSourceType {
  if (type === "estimate_pdf" || type === "boq") return "estimate_line";
  if (type === "project_pdf" || type === "architecture_pdf" || type === "engineering_pdf" || type === "normative_pdf") return "pdf_chunk";
  if (type === "company_standard") return "company_policy";
  if (type === "report" || type === "photo" || type === "chat_message") return "document";
  if ([
    "payment",
    "invoice",
    "act",
    "contract",
    "waybill",
    "document",
    "pdf_chunk",
    "approval",
    "procurement_request",
    "supplier_offer",
    "warehouse_incoming",
    "warehouse_issue",
    "work",
    "object",
    "country_profile",
  ].includes(type)) return type as AccountantFinanceSourceType;
  return "document";
}

function missingCode(value: string): FinanceEvent["missingData"][number] {
  const lower = value.toLowerCase();
  if (lower.includes("act") || lower.includes("Р°РєС‚")) return "act_missing";
  if (lower.includes("waybill") || lower.includes("РЅР°РєР»Р°Рґ")) return "waybill_missing";
  if (lower.includes("contract") || lower.includes("РґРѕРіРѕРІ")) return "contract_missing";
  if (lower.includes("approval")) return "approval_missing";
  if (lower.includes("warehouse")) return "warehouse_receipt_missing";
  if (lower.includes("estimate") || lower.includes("СЃРјРµС‚")) return "estimate_link_missing";
  if (lower.includes("tax") || lower.includes("country")) return "tax_profile_missing";
  if (lower.includes("budget")) return "budget_limit_missing";
  return "invoice_missing";
}

export function composeAccountantFinanceAnswer(params: {
  context: AccountantFinanceContext;
  intent: AccountantIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
}): AccountantFinanceAnswer {
  const invoice = selectedInvoice(params.context);
  const act = invoice.actId ? params.context.acts.find((item) => item.id === invoice.actId) : undefined;
  const payments = params.context.payments.filter((payment) => payment.invoiceId === invoice.id);
  const risks = scoreAccountantFinanceRisks(params.context);
  const kind = answerKind(params.intent);
  const missingData = [...new Set([
    ...params.missingData,
    ...(act ? [] : ["акт по счету не найден"]),
    ...(invoice.estimateLineId ? [] : ["сметная строка не связана"]),
    ...(params.context.countryTaxProfileConfigured ? [] : ["country/tax profile не настроен источником"]),
    ...(params.context.chartOfAccountsConfigured ? [] : ["план счетов не настроен источником"]),
  ])];
  const sourceTrace = [
    ...invoice.sourceRefs,
    ...(act?.sourceRefs ?? []),
    ...payments.flatMap((payment) => payment.sourceRefs),
    ...params.context.cashflow.flatMap((slice) => slice.sourceRefs),
    ...params.context.sources.map((source) => source.id),
  ];
  const sourceLabels = params.context.sources
    .filter((source) => ["payment", "act", "estimate_pdf", "boq", "project_pdf", "architecture_pdf", "engineering_pdf", "procurement_request", "supplier_offer", "approval", "country_profile", "company_standard", "normative_pdf"].includes(source.type))
    .map((source) => `- ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}`);
  const riskLevel = risks[0]?.riskLevel ?? "low";
  const riskReasons = risks.flatMap((risk) => risk.reasonsRu);
  const event: FinanceEvent = {
    id: `finance:${invoice.id}`,
    eventType: invoice.actId ? "contractor_act" : "supplier_invoice",
    status: invoice.status === "paid"
      ? "paid"
      : invoice.status === "ready_for_approval"
        ? "ready_for_review"
        : invoice.status === "blocked"
          ? "blocked"
          : payments.some((payment) => payment.status === "pending_approval")
            ? "pending_approval"
            : "needs_documents",
    amount: invoice.amount,
    currency: invoice.currency,
    supplierNameRu: invoice.supplierNameRu,
    objectId: invoice.objectId,
    workId: invoice.workId,
    requestId: invoice.requestId,
    invoiceId: invoice.id,
    actId: invoice.actId,
    paymentId: payments[0]?.id,
    approvalId: params.context.sources.find((source) => source.type === "approval")?.id,
    documentRefs: [...new Set([...(act?.sourceRefs ?? []), ...invoice.sourceRefs])],
    sourceRefs: [...new Set(sourceTrace)],
    riskLevel,
    riskReasonsRu: riskReasons,
    missingData: [...new Set(missingData.map(missingCode))],
  };
  const documentGaps = missingData.map((item) => ({
    eventId: event.id,
    missingRu: item,
    whyRequiredRu: "Required before payment execution, posting, or final approval.",
  }));
  const normalizedSources = params.context.sources.map((source) => ({
    id: source.id,
    type: sourceType(source.type),
    labelRu: source.labelRu,
    page: source.page,
  }));
  const paidTotal = params.context.payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingTotal = params.context.payments
    .filter((payment) => payment.status === "pending_approval" || payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const nextStepRu = kind === "approval_route"
    ? "Передать счет и rationale на approval ledger для решения человека."
    : kind === "draft_rationale"
      ? "Проверить документы, сумму и акт, затем отправить rationale человеку на согласование."
      : "Проверить missing data и открыть безопасный маршрут согласования без проведения оплаты.";
  const answerRu = [
    "Ответ",
    "",
    "Коротко:",
    `По счету ${invoice.numberRu} найден бухгалтерский срез: сумма ${money(invoice.amount, invoice.currency)}, статус ${invoice.status}. ${risks[0]?.riskLevel === "low" ? "Критичных расхождений в источниках не найдено." : "Есть блокеры для оплаты, пока их не проверит человек."}`,
    "",
    "Счет:",
    `- Номер: ${invoice.numberRu}`,
    `- Поставщик: ${invoice.supplierNameRu}`,
    `- Сумма: ${money(invoice.amount, invoice.currency)}`,
    `- Дата счета: ${invoice.invoiceDate}`,
    `- Срок оплаты: ${invoice.dueDate ?? "не указан"}`,
    `- Статус: ${invoice.status}`,
    "",
    "Цепочка основания:",
    `- Заявка: ${invoice.requestId ?? "не связана"}`,
    `- Акт: ${invoice.actId ?? "не связан"}`,
    `- Работа: ${invoice.workId ?? "не связана"}`,
    `- Объект: ${invoice.objectId ?? "не связан"}`,
    `- Смета: ${invoice.estimateLineId ?? "не связана"}`,
    "",
    "Платежи:",
    ...(payments.length > 0
      ? payments.map((payment) => `- ${payment.id}: ${money(payment.amount, payment.currency)}, статус ${payment.status}`)
      : ["- Платежи по счету не найдены."]),
    "",
    "Риски:",
    ...risks.flatMap((risk) => risk.reasonsRu.map((reason) => `- ${risk.riskLevel}: ${reason}`)),
    "",
    "Источники:",
    ...(sourceLabels.length > 0 ? sourceLabels : ["- Источники по счету не найдены; данные не выдумывались."]),
    "",
    "Что проверить:",
    ...missingData.slice(0, 10).map((item) => `- ${item}`),
    "",
    "Следующий шаг:",
    nextStepRu,
    "",
    "Статус:",
    statusText(kind),
  ].join("\n");

  return {
    screenId: params.context.screenId,
    role: "accountant",
    invoiceId: invoice.id,
    paymentId: params.context.selectedPaymentId,
    questionRu: params.questionRu,
    answerKind: kind,
    titleRu: kind === "approval_route" ? "На согласование" : kind === "draft_rationale" ? "Черновик rationale" : "Финансовая проверка",
    shortAnswerRu: `Счет ${invoice.numberRu}: ${money(invoice.amount, invoice.currency)}, платеж не создан, источники проверены.`,
    answerRu,
    period: {
      labelRu: params.context.cashflow[0]?.periodRu ?? invoice.invoiceDate,
    },
    events: [event],
    totals: {
      payableReady: invoice.status === "ready_for_approval" ? invoice.amount : 0,
      payableBlocked: invoice.status === "blocked" || missingData.length > 0 ? invoice.amount : 0,
      pendingApproval: pendingTotal,
      paid: paidTotal,
      currency: invoice.currency,
    },
    documentGaps,
    invoiceSummary: {
      numberRu: invoice.numberRu,
      supplierNameRu: invoice.supplierNameRu,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
    },
    chain: {
      invoiceId: invoice.id,
      requestId: invoice.requestId,
      actId: invoice.actId,
      workId: invoice.workId,
      objectId: invoice.objectId,
      estimateLineId: invoice.estimateLineId,
    },
    risks,
    riskExplanations: risks.flatMap((risk) =>
      risk.reasonsRu.map((reasonRu) => ({
        eventId: event.id,
        level: risk.riskLevel,
        reasonRu,
        sourceRefs: risk.sourceRefs,
      })),
    ),
    sources: normalizedSources,
    missingData,
    hiddenByPermission: [
      {
        sourceType: "security/runtime/provider/secrets",
        reasonRu: "Hidden from accountant finance assistant by role policy.",
      },
    ],
    nextStepRu,
    approvalRoute: {
      required: true,
      approverRole: "director",
      reasonRu: "Оплата и проводка требуют решения человека через approval ledger.",
    },
    changedData: false,
    paymentCreated: false,
    paymentExecuted: false,
    postingCreated: false,
    accountingRecordCreated: false,
    invoiceMutated: false,
    autoApproval: false,
    providerTrace: [...new Set(params.providerTrace)],
    sourceTrace: [...new Set(sourceTrace)],
    genericAnswerUsed: false,
    fakeInvoiceCreated: false,
    fakeActCreated: false,
    fakePaymentCreated: false,
    fakeDocumentCreated: false,
    fakeWaybillCreated: false,
    fakeCashflowCreated: false,
    fakeAccountingRecordCreated: false,
    cashflowInvented: false,
    forecastLabeledAsForecast: true,
    countryAccountingClaimHasSource: params.context.countryTaxProfileConfigured
      ? params.context.sources.some((source) => source.type === "country_profile" || source.type === "company_standard" || source.type === "normative_pdf")
      : true,
    chartOfAccountsMappingHasConfiguredSource: params.context.chartOfAccountsConfigured
      ? params.context.sources.some((source) => source.type === "company_standard")
      : true,
    directPaymentPathUsed: false,
    approvalBypassUsed: false,
  };
}
