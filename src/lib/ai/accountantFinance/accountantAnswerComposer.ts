import { scoreAccountantFinanceRisks } from "./accountantRiskScoring";
import type {
  AccountantFinanceAnswer,
  AccountantFinanceContext,
  AccountantIntent,
  AccountantInvoice,
} from "./accountantFinanceTypes";

function selectedInvoice(context: AccountantFinanceContext): AccountantInvoice {
  const invoice = context.invoices.find((item) => item.id === context.selectedInvoiceId) ?? context.invoices[0];
  if (!invoice) throw new Error("BLOCKED_ACCOUNTANT_DATA_PROVIDER_MISSING");
  return invoice;
}

function answerKind(intent: AccountantIntent): AccountantFinanceAnswer["answerKind"] {
  if (intent === "payment_readiness") return "payment_readiness";
  if (intent === "invoice_risk_check") return "risk_explanation";
  if (intent === "prepare_approval_handoff") return "approval_route";
  if (intent === "prepare_payment_rationale") return "draft_rationale";
  if (intent === "missing_primary_documents" || intent === "tax_country_context_check" || intent === "chart_of_accounts_check") return "clarifying_question";
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
    missingData,
    nextStepRu,
    approvalRoute: {
      required: true,
      approverRole: "director",
      reasonRu: "Оплата и проводка требуют решения человека через approval ledger.",
    },
    changedData: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    autoApproval: false,
    providerTrace: [...new Set(params.providerTrace)],
    sourceTrace: [...new Set(sourceTrace)],
    genericAnswerUsed: false,
    fakeInvoiceCreated: false,
    fakeActCreated: false,
    fakePaymentCreated: false,
    fakeDocumentCreated: false,
    directPaymentPathUsed: false,
    approvalBypassUsed: false,
  };
}
