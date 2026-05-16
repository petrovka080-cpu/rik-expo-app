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

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function paymentTitle(payment: AccountantPaymentAssistantEvidence): string {
  return [payment.supplierName, payment.amountLabel].map(clean).filter(Boolean).join(" · ");
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
