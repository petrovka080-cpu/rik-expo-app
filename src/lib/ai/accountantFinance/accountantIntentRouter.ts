import type { AccountantIntent, AccountantIntentContract } from "./accountantFinanceTypes";

export const ACCOUNTANT_INTENT_CONTRACTS: readonly AccountantIntentContract[] = [
  {
    intent: "payment_readiness",
    examplesRu: ["можно ли оплачивать", "готов ли счет к оплате"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "payment", "approval", "supplier_document"],
    answerMode: "read",
  },
  {
    intent: "invoice_risk_check",
    examplesRu: ["почему счет рискованный", "какой риск по счету"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "payment", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    intent: "act_invoice_match",
    examplesRu: ["с чем связан акт", "сверь акт и счет"],
    requiredContext: "act",
    allowedSources: ["act", "invoice", "work", "object", "payment"],
    answerMode: "read",
  },
  {
    intent: "estimate_act_invoice_chain",
    examplesRu: ["сверь счет со сметой", "покажи смета акт счет"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "estimate_line", "project_pdf", "pdf_chunk", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "missing_primary_documents",
    examplesRu: ["какие документы нужны", "чего не хватает для оплаты"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    intent: "payment_movement_summary",
    examplesRu: ["покажи движение денег", "что оплачено по объекту"],
    requiredContext: "object",
    allowedSources: ["payment", "cashflow_slice", "invoice", "object"],
    answerMode: "read",
  },
  {
    intent: "cashflow_slice",
    examplesRu: ["cashflow по объекту", "денежный поток"],
    requiredContext: "period",
    allowedSources: ["cashflow_slice", "payment", "invoice", "approval"],
    answerMode: "read",
  },
  {
    intent: "creditor_debtor_summary",
    examplesRu: ["дебиторка кредиторка", "кому должны"],
    requiredContext: "period",
    allowedSources: ["invoice", "payment", "cashflow_slice"],
    answerMode: "read",
  },
  {
    intent: "prepare_payment_rationale",
    examplesRu: ["подготовь rationale", "объясни директору оплату"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "estimate_line", "payment", "approval"],
    answerMode: "draft",
  },
  {
    intent: "prepare_approval_handoff",
    examplesRu: ["отправить на согласование", "маршрут согласования"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "payment", "approval"],
    answerMode: "approval_route",
  },
  {
    intent: "tax_country_context_check",
    examplesRu: ["налоги по стране", "country tax"],
    requiredContext: "none",
    allowedSources: ["country_profile", "company_standard", "invoice", "payment"],
    answerMode: "read",
  },
  {
    intent: "chart_of_accounts_check",
    examplesRu: ["план счетов", "на какой счет учета"],
    requiredContext: "invoice",
    allowedSources: ["chart_of_accounts", "company_standard", "invoice"],
    answerMode: "read",
  },
  {
    intent: "document_basis_check",
    examplesRu: ["основание платежа", "какие документы подтверждают"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "supplier_document", "pdf_chunk", "approval"],
    answerMode: "read",
  },
  {
    intent: "procurement_invoice_link",
    examplesRu: ["связь счета с заявкой", "какая закупка связана"],
    requiredContext: "invoice",
    allowedSources: ["procurement_request", "supplier_offer", "invoice", "material", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "free_text_finance_summary",
    examplesRu: ["что по оплатам сегодня", "что проверить бухгалтеру"],
    requiredContext: "none",
    allowedSources: ["invoice", "payment", "act", "approval", "cashflow_slice"],
    answerMode: "read",
  },
] as const;

function normalize(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s/.-]+/gu, " ")
    .replace(/\s+/g, " ");
}

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function getAccountantIntentContract(intent: AccountantIntent): AccountantIntentContract {
  const contract = ACCOUNTANT_INTENT_CONTRACTS.find((entry) => entry.intent === intent);
  if (!contract) throw new Error(`Missing accountant intent contract: ${intent}`);
  return {
    ...contract,
    examplesRu: [...contract.examplesRu],
    allowedSources: [...contract.allowedSources],
  };
}

export function routeAccountantIntent(questionRu: string): AccountantIntentContract {
  const q = normalize(questionRu);

  if (hasAny(q, [/налог/, /страна/, /country/, /ндс/])) return getAccountantIntentContract("tax_country_context_check");
  if (hasAny(q, [/план счет/, /счет учет/, /проводк/])) return getAccountantIntentContract("chart_of_accounts_check");
  if (hasAny(q, [/смет/, /проект/, /pdf/, /цепоч/, /основан/]) && hasAny(q, [/акт|счет|сч[её]т|оплат/])) return getAccountantIntentContract("estimate_act_invoice_chain");
  if (hasAny(q, [/акт/]) && hasAny(q, [/счет|сч[её]т|связан|свер/])) return getAccountantIntentContract("act_invoice_match");
  if (hasAny(q, [/документ/, /первич/, /чего не хватает/, /что нужно/])) return getAccountantIntentContract("missing_primary_documents");
  if (hasAny(q, [/риск/, /почему нельзя/, /сомнитель/])) return getAccountantIntentContract("invoice_risk_check");
  if (hasAny(q, [/можно.*оплат/, /готов.*оплат/, /оплачивать/])) return getAccountantIntentContract("payment_readiness");
  if (hasAny(q, [/движени.*денег/, /оплачен/, /платеж/, /плат[её]ж/])) return getAccountantIntentContract("payment_movement_summary");
  if (hasAny(q, [/cashflow/, /денежн.*поток/])) return getAccountantIntentContract("cashflow_slice");
  if (hasAny(q, [/дебитор/, /кредитор/, /кому должны/])) return getAccountantIntentContract("creditor_debtor_summary");
  if (hasAny(q, [/rationale/, /объясни директор/, /обоснован/])) return getAccountantIntentContract("prepare_payment_rationale");
  if (hasAny(q, [/соглас/, /approval/, /маршрут/])) return getAccountantIntentContract("prepare_approval_handoff");
  if (hasAny(q, [/заявк/, /закупк/, /поставщик/])) return getAccountantIntentContract("procurement_invoice_link");

  return getAccountantIntentContract("free_text_finance_summary");
}

export const accountantIntentRouter = routeAccountantIntent;
