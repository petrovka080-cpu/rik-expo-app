import type { AccountantActionQuestion, AccountantIntent, AccountantScreenId } from "./accountantFinanceTypes";

export const ACCOUNTANT_ACTION_QUESTION_MAP: readonly AccountantActionQuestion[] = [
  {
    screenId: "accountant.main",
    actionId: "payment_readiness",
    labelRu: "Что можно оплачивать",
    concreteQuestionRu: "Проверь счета на готовность к оплате: акт, документы, approval, сумма, остаток и риски.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "act", "payment", "approval", "supplier_document"],
    answerMode: "read",
  },
  {
    screenId: "accountant.main",
    actionId: "missing_primary_documents",
    labelRu: "Каких документов не хватает",
    concreteQuestionRu: "Покажи недостающие первичные документы по счетам и что блокирует оплату.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "act", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    screenId: "accountant.main",
    actionId: "payment_movement_summary",
    labelRu: "Движение денег",
    concreteQuestionRu: "Покажи движение денег по доступному бухгалтерскому срезу без раскрытия security/runtime данных.",
    requiredContext: ["period"],
    allowedSources: ["payment", "cashflow_slice", "invoice", "object"],
    answerMode: "read",
  },
  {
    screenId: "accountant.invoice.detail",
    actionId: "estimate_act_invoice_chain",
    labelRu: "Смета → акт → счёт",
    concreteQuestionRu: "Свяжи счет со сметой, актом, работой, объектом и документальными источниками.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "act", "estimate_line", "project_pdf", "pdf_chunk", "work", "object"],
    answerMode: "read",
  },
  {
    screenId: "accountant.invoice.detail",
    actionId: "invoice_risk_check",
    labelRu: "Почему риск",
    concreteQuestionRu: "Объясни, почему счет можно или нельзя оплачивать, с источниками и без проведения платежа.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "act", "payment", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    screenId: "accountant.invoice.detail",
    actionId: "prepare_payment_rationale",
    labelRu: "Rationale директору",
    concreteQuestionRu: "Подготовь черновик rationale директору по счету: основания, сумма, риски, документы.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "act", "estimate_line", "payment", "approval"],
    answerMode: "draft",
  },
  {
    screenId: "accountant.invoice.detail",
    actionId: "prepare_approval_handoff",
    labelRu: "На согласование",
    concreteQuestionRu: "Подготовь маршрут согласования без создания платежа, проводки или автоматического approval.",
    requiredContext: ["invoice"],
    allowedSources: ["invoice", "payment", "approval"],
    answerMode: "approval_route",
  },
  {
    screenId: "finance.copilot",
    actionId: "creditor_debtor_summary",
    labelRu: "Дебиторка / кредиторка",
    concreteQuestionRu: "Собери краткий debt/creditor summary по доступным счетам, платежам и cashflow slice.",
    requiredContext: ["period"],
    allowedSources: ["invoice", "payment", "cashflow_slice"],
    answerMode: "read",
  },
] as const;

export function getAccountantActionQuestion(
  actionId: AccountantIntent,
  screenId?: AccountantScreenId,
): AccountantActionQuestion | null {
  const action = ACCOUNTANT_ACTION_QUESTION_MAP.find((entry) =>
    entry.actionId === actionId && (!screenId || entry.screenId === screenId),
  ) ?? ACCOUNTANT_ACTION_QUESTION_MAP.find((entry) => entry.actionId === actionId);
  return action
    ? {
      ...action,
      requiredContext: [...action.requiredContext],
      allowedSources: [...action.allowedSources],
    }
    : null;
}
