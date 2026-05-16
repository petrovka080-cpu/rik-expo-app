import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";

export type AccountantPaymentAssistantEvidence = {
  id: string;
  supplierName: string;
  amountLabel?: string;
  requestId?: string;
  riskReason?: string;
  missingDocument?: string;
  approvalStatus?: "ready_for_approval" | "needs_check" | "blocked";
  evidence: string[];
};

export type AccountantMainAiPanelRow = {
  proposal_id?: string | number | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_amount?: number | null;
  outstanding_amount?: number | null;
  invoice_currency?: string | null;
  payment_status?: string | null;
  total_paid?: number | null;
  has_invoice?: boolean | null;
  payments_count?: number | null;
  payment_eligible?: boolean | null;
  failure_code?: string | null;
  sent_to_accountant_at?: string | null;
};

export type AccountantMainAiPanelMetric = {
  id: string;
  label: string;
  value: string;
};

export type AccountantMainAiPanelPayment = {
  id: string;
  supplierName: string;
  amountLabel: string;
  riskReason: string;
  missingData: string[];
  evidence: string[];
  nextStep: string;
};

export type AccountantMainAiPanelAction = {
  id: string;
  label: string;
  prompt: string;
  requiresApproval: boolean;
  executesDirectly: false;
};

export type AccountantMainAiPanelModel = {
  status: "loading" | "ready" | "missing_data";
  title: string;
  summary: string;
  metrics: AccountantMainAiPanelMetric[];
  criticalPayments: AccountantMainAiPanelPayment[];
  missingData: string[];
  actions: AccountantMainAiPanelAction[];
  aiRouteParams: Record<string, string>;
  providerCalled: false;
  dbWriteUsed: false;
  directMutationAllowed: false;
  fakeDataUsed: false;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function money(value: number | null | undefined, currency: string | null | undefined): string {
  const amount = Number(value ?? 0);
  const currencyLabel = clean(currency) || "KGS";
  return `${Math.round(amount).toLocaleString("ru-RU")} ${currencyLabel}`;
}

function accountantMainRowAmount(row: AccountantMainAiPanelRow): number {
  const outstanding = Number(row.outstanding_amount ?? 0);
  if (Number.isFinite(outstanding) && outstanding > 0) return outstanding;
  const invoice = Number(row.invoice_amount ?? 0);
  return Number.isFinite(invoice) ? invoice : 0;
}

function accountantMainStatusIncludes(row: AccountantMainAiPanelRow, tokens: string[]): boolean {
  const status = clean(row.payment_status).toLowerCase();
  return tokens.some((token) => status.includes(token));
}

function accountantMainRiskReasonFor(row: AccountantMainAiPanelRow): string | null {
  const reasons: string[] = [];
  if (row.has_invoice === false) reasons.push("нет счёта или подтверждающего документа");
  if (row.payment_eligible === false) {
    const code = clean(row.failure_code);
    reasons.push(code ? `платёж заблокирован: ${code}` : "платёж не готов по финансовому состоянию");
  }
  const invoice = Number(row.invoice_amount ?? 0);
  const outstanding = Number(row.outstanding_amount ?? 0);
  const paid = Number(row.total_paid ?? 0);
  if (Number.isFinite(invoice) && Number.isFinite(outstanding) && invoice > 0 && outstanding > invoice) {
    reasons.push("остаток к оплате больше суммы счёта");
  }
  if (Number.isFinite(paid) && paid > 0 && Number.isFinite(outstanding) && outstanding > 0) {
    reasons.push("есть частичная оплата, нужно проверить остаток");
  }
  if (accountantMainStatusIncludes(row, ["доработ", "rework", "blocked", "ошиб"])) {
    reasons.push("статус требует ручной проверки");
  }
  return reasons.length ? reasons.join("; ") : null;
}

function accountantMainMissingDataFor(row: AccountantMainAiPanelRow): string[] {
  const missing: string[] = [];
  if (row.has_invoice === false) missing.push("счёт/документ");
  if (!clean(row.supplier)) missing.push("поставщик");
  if (!clean(row.invoice_number)) missing.push("номер счёта");
  if (!clean(row.sent_to_accountant_at)) missing.push("время поступления в бухгалтерию");
  return missing;
}

function accountantMainEvidenceFor(row: AccountantMainAiPanelRow): string[] {
  const proposalId = clean(row.proposal_id);
  const evidence = proposalId ? [`proposal:${proposalId}`] : ["screen:accountant.main"];
  if (clean(row.invoice_number)) evidence.push(`invoice:${clean(row.invoice_number)}`);
  if (row.payments_count && row.payments_count > 0) evidence.push(`payments:${row.payments_count}`);
  return evidence;
}

function accountantMainProposalId(row: AccountantMainAiPanelRow, index: number): string {
  return clean(row.proposal_id) || `accountant-row-${index + 1}`;
}

function paymentTitle(payment: AccountantPaymentAssistantEvidence): string {
  return [payment.supplierName, payment.amountLabel].map(clean).filter(Boolean).join(" · ");
}

export function buildAccountantMainAiPanelModel(params: {
  rows: AccountantMainAiPanelRow[];
  loading?: boolean;
}): AccountantMainAiPanelModel {
  const rows = params.rows.slice(0, 25);
  const totalAmount = rows.reduce((sum, row) => sum + accountantMainRowAmount(row), 0);
  const primaryCurrency = clean(rows.find((row) => clean(row.invoice_currency))?.invoice_currency) || "KGS";
  const criticalPayments = rows
    .map((row, index) => {
      const riskReason = accountantMainRiskReasonFor(row);
      if (!riskReason) return null;
      const supplierName = clean(row.supplier) || "Поставщик не указан";
      const missingData = accountantMainMissingDataFor(row);
      return {
        id: accountantMainProposalId(row, index),
        supplierName,
        amountLabel: money(accountantMainRowAmount(row), row.invoice_currency || primaryCurrency),
        riskReason,
        missingData,
        evidence: accountantMainEvidenceFor(row),
        nextStep: missingData.length
          ? "запросить недостающие документы до согласования"
          : "подготовить rationale и отправить человеку на согласование",
      };
    })
    .filter((item): item is AccountantMainAiPanelPayment => Boolean(item));
  const missingDocsCount = rows.filter((row) => row.has_invoice === false).length;
  const pendingApprovalCount = criticalPayments.filter((payment) => payment.riskReason || payment.missingData.length).length;
  const pack = buildAccountantTodayPaymentAssistant({
    screenId: "accountant.main",
    role: "accountant",
    payments: rows.map((row, index) => ({
      id: accountantMainProposalId(row, index),
      supplierName: clean(row.supplier) || "Поставщик не указан",
      amountLabel: money(accountantMainRowAmount(row), row.invoice_currency || primaryCurrency),
      riskReason: accountantMainRiskReasonFor(row) ?? undefined,
      missingDocument: accountantMainMissingDataFor(row)[0],
      approvalStatus: accountantMainRiskReasonFor(row) ? "needs_check" : undefined,
      evidence: accountantMainEvidenceFor(row),
    })),
    totalAmountLabel: rows.length ? money(totalAmount, primaryCurrency) : undefined,
    waitingApprovalCount: pendingApprovalCount,
  });
  const firstCritical = criticalPayments[0] ?? null;
  const missingData = [
    ...new Set([
      ...criticalPayments.flatMap((payment) => payment.missingData),
      rows.length ? "история поставщика для проверки необычной суммы" : "read-only маршрут оплат бухгалтера",
      rows.length ? "статус approval ledger для точного счётчика согласований" : "строки оплат за сегодня",
    ]),
  ];
  const status = params.loading ? "loading" : rows.length ? "ready" : "missing_data";
  const summary = status === "missing_data"
    ? "Данных не хватает: текущий read-only список оплат ещё не загружен. AI не будет выдумывать поставщиков, суммы, документы или approvals."
    : pack.summary;
  const actions: AccountantMainAiPanelAction[] = [
    {
      id: "accountant.main.review_critical",
      label: "Проверить критические",
      prompt: "Покажи критические оплаты на текущем экране бухгалтера и объясни, что проверить первым.",
      requiresApproval: false,
      executesDirectly: false,
    },
    {
      id: "accountant.main.today_report",
      label: "Собрать отчёт за сегодня",
      prompt: "Собери краткий отчёт по оплатам за сегодня из текущего screen context.",
      requiresApproval: false,
      executesDirectly: false,
    },
    {
      id: "accountant.main.rationale",
      label: "Подготовить rationale",
      prompt: "Подготовь rationale для директора по самой рискованной оплате. Ничего не проводи.",
      requiresApproval: false,
      executesDirectly: false,
    },
    {
      id: "accountant.main.request_docs",
      label: "Запросить документы",
      prompt: "Подготовь текст запроса недостающих документов по текущим оплатам.",
      requiresApproval: false,
      executesDirectly: false,
    },
    {
      id: "accountant.main.submit_approval",
      label: "Отправить на согласование",
      prompt: "Подготовь черновик отправки рискованной оплаты на согласование через approval ledger. Не approve и не проводи платёж.",
      requiresApproval: true,
      executesDirectly: false,
    },
  ];

  return {
    status,
    title: "Готово от AI · Финансы сегодня",
    summary,
    metrics: [
      { id: "incoming", label: "Поступило на оплату", value: String(rows.length) },
      { id: "amount", label: "Общая сумма", value: rows.length ? money(totalAmount, primaryCurrency) : "данных нет" },
      { id: "critical", label: "Критические", value: String(criticalPayments.length) },
      { id: "missing_docs", label: "Без документов", value: String(missingDocsCount) },
      { id: "approval", label: "Ждут согласования", value: rows.length ? String(pendingApprovalCount) : "данных нет" },
    ],
    criticalPayments: criticalPayments.slice(0, 3),
    missingData,
    actions,
    aiRouteParams: {
      context: "accountant",
      screenId: "accountant.main",
      paymentSupplierName: firstCritical?.supplierName ?? "",
      paymentAmountLabel: firstCritical?.amountLabel ?? "",
      paymentRisk: firstCritical?.riskReason ?? "",
      paymentMissingDocument: firstCritical?.missingData[0] ?? "",
      paymentEvidence: firstCritical?.evidence.join("|") ?? "screen:accountant.main",
      paymentTotalAmountLabel: rows.length ? money(totalAmount, primaryCurrency) : "",
      paymentApprovalCount: rows.length ? String(pendingApprovalCount) : "",
    },
    providerCalled: false,
    dbWriteUsed: false,
    directMutationAllowed: false,
    fakeDataUsed: false,
  };
}

export function buildAccountantTodayPaymentAssistant(params: {
  screenId?: string;
  role?: string;
  payments?: AccountantPaymentAssistantEvidence[];
  totalAmountLabel?: string;
  waitingApprovalCount?: number;
}): AiRoleScreenAssistantPack {
  const payments = [...(params.payments ?? [])];
  const critical = payments.filter((payment) => clean(payment.riskReason));
  const withoutDocs = payments.filter((payment) => clean(payment.missingDocument));
  const waitingApprovalCount =
    Number(params.waitingApprovalCount ?? payments.filter((payment) => payment.approvalStatus === "ready_for_approval").length) || 0;
  const primaryPayment = critical[0] ?? withoutDocs[0] ?? payments[0] ?? null;
  const count = payments.length;

  return {
    screenId: params.screenId ?? "accountant.main",
    role: params.role ?? "accountant",
    domain: "finance",
    title: params.screenId === "accountant.payment" ? "AI-проверка платежа" : "Финансы сегодня",
    summary: count > 0
      ? `За сегодня на оплату поступило ${count} платежей${params.totalAmountLabel ? ` на ${params.totalAmountLabel}` : ""}. Критические: ${critical.length}, без документов: ${withoutDocs.length}, ждут согласования: ${waitingApprovalCount}.`
      : "Нет загруженного read-only среза оплат. Я подготовил безопасный чек-лист проверки без выдуманных платежей, сумм и документов.",
    today: count > 0
      ? {
        count,
        amountLabel: params.totalAmountLabel,
        criticalCount: critical.length,
        overdueCount: waitingApprovalCount,
      }
      : undefined,
    readyItems: payments.slice(0, 4).map((payment) => ({
      id: `accountant.payment.${payment.id}`,
      title: paymentTitle(payment) || `Платёж ${payment.id}`,
      description: [
        payment.requestId ? `Основание: заявка ${payment.requestId}.` : null,
        payment.riskReason ? `Риск: ${payment.riskReason}.` : null,
        payment.missingDocument ? `Не хватает: ${payment.missingDocument}.` : null,
      ].filter(Boolean).join(" "),
      evidence: payment.evidence,
      riskLevel: payment.riskReason ? "high" : payment.missingDocument ? "medium" : "low",
      actionKind: payment.riskReason || payment.approvalStatus === "ready_for_approval"
        ? "approval_required"
        : payment.missingDocument
          ? "draft_only"
          : "safe_read",
      primaryActionLabel: payment.riskReason ? "Подготовить rationale" : payment.missingDocument ? "Запросить документ" : "Проверить платёж",
      secondaryActionLabel: payment.approvalStatus === "ready_for_approval" ? "Отправить на согласование" : undefined,
    })),
    risks: critical.map((payment) => ({
      id: `accountant.risk.${payment.id}`,
      title: paymentTitle(payment) || `Платёж ${payment.id}`,
      reason: payment.riskReason || "Требуется проверка до согласования.",
      severity: "high",
      evidence: payment.evidence,
    })),
    missingData: withoutDocs.map((payment) => ({
      id: `accountant.missing.${payment.id}`,
      label: `${paymentTitle(payment) || payment.id}: ${payment.missingDocument}`,
      blocksAction: true,
    })),
    nextActions: [
      {
        id: "accountant.review_critical",
        label: primaryPayment ? `Проверить критические: ${paymentTitle(primaryPayment)}` : "Проверить платежи после загрузки среза",
        kind: "review",
        requiresApproval: false,
        canExecuteDirectly: false,
      },
      {
        id: "accountant.draft_rationale",
        label: "Подготовить rationale директору",
        kind: "draft",
        requiresApproval: false,
        canExecuteDirectly: false,
      },
      {
        id: "accountant.request_document",
        label: "Запросить недостающий документ",
        kind: "request_more_data",
        requiresApproval: false,
        canExecuteDirectly: false,
      },
      {
        id: "accountant.submit_for_approval",
        label: "Отправить рискованный платёж на согласование",
        kind: "submit_for_approval",
        requiresApproval: true,
        canExecuteDirectly: false,
      },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}
