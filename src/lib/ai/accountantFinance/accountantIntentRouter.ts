import type { AccountantIntent, AccountantIntentContract } from "./accountantFinanceTypes";

export const ACCOUNTANT_INTENT_CONTRACTS: readonly AccountantIntentContract[] = [
  {
    intent: "payment_readiness_check",
    examplesRu: ["what can be paid today", "check payment readiness"],
    requiredContext: "period",
    allowedSources: ["payment", "invoice", "act", "document", "approval", "warehouse_incoming", "procurement_request"],
    answerMode: "read",
  },
  {
    intent: "critical_payments",
    examplesRu: ["risky payments", "blocked finance items"],
    requiredContext: "period",
    allowedSources: ["payment", "invoice", "act", "waybill", "approval", "warehouse_incoming", "accounting_record"],
    answerMode: "read",
  },
  {
    intent: "missing_documents_for_payment",
    examplesRu: ["missing documents", "primary documents for payment"],
    requiredContext: "period",
    allowedSources: ["invoice", "act", "contract", "waybill", "document", "approval"],
    answerMode: "read",
  },
  {
    intent: "cashflow_summary",
    examplesRu: ["money movement", "cashflow summary"],
    requiredContext: "period",
    allowedSources: ["payment", "cashflow", "cashflow_slice", "accounting_record", "approval", "object"],
    answerMode: "read",
  },
  {
    intent: "cashflow_forecast",
    examplesRu: ["cashflow forecast", "forecast for week"],
    requiredContext: "period",
    allowedSources: ["payment", "cashflow", "invoice", "approval", "contract"],
    answerMode: "read",
  },
  {
    intent: "supplier_debt_summary",
    examplesRu: ["supplier debts", "payables"],
    requiredContext: "supplier",
    allowedSources: ["invoice", "payment", "cashflow", "accounting_record", "supplier_offer"],
    answerMode: "read",
  },
  {
    intent: "contractor_payment_check",
    examplesRu: ["contractor payment", "contractor act"],
    requiredContext: "contractor",
    allowedSources: ["payment", "invoice", "act", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    intent: "invoice_to_request_reconciliation",
    examplesRu: ["invoice to request", "reconcile invoice with request"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "procurement_request", "supplier_offer", "document", "approval"],
    answerMode: "read",
  },
  {
    intent: "invoice_to_warehouse_reconciliation",
    examplesRu: ["invoice to warehouse", "warehouse receipt"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "warehouse_incoming", "warehouse_issue", "waybill", "document"],
    answerMode: "read",
  },
  {
    intent: "act_to_payment_reconciliation",
    examplesRu: ["act to payment", "act payment reconciliation"],
    requiredContext: "act",
    allowedSources: ["act", "payment", "invoice", "work", "object", "approval"],
    answerMode: "read",
  },
  {
    intent: "estimate_to_act_reconciliation",
    examplesRu: ["estimate to act", "estimate act invoice chain"],
    requiredContext: "act",
    allowedSources: ["estimate_line", "act", "work", "object", "invoice", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "approval_queue_for_finance",
    examplesRu: ["finance approvals", "director approval queue"],
    requiredContext: "period",
    allowedSources: ["payment", "invoice", "act", "document", "approval"],
    answerMode: "approval_route",
  },
  {
    intent: "director_payment_rationale",
    examplesRu: ["rationale for director", "director payment note"],
    requiredContext: "payment",
    allowedSources: ["payment", "invoice", "act", "document", "approval", "procurement_request", "warehouse_incoming"],
    answerMode: "draft",
  },
  {
    intent: "document_request_draft",
    examplesRu: ["request documents", "draft supplier document request"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "contract", "waybill", "document", "approval"],
    answerMode: "draft",
  },
  {
    intent: "payment_risk_explanation",
    examplesRu: ["explain payment risk", "why invoice is risky"],
    requiredContext: "payment",
    allowedSources: ["payment", "invoice", "act", "approval", "warehouse_incoming", "document"],
    answerMode: "read",
  },
  {
    intent: "budget_limit_check",
    examplesRu: ["budget limit", "payment budget check"],
    requiredContext: "object",
    allowedSources: ["payment", "invoice", "cashflow", "accounting_record", "object"],
    answerMode: "read",
  },
  {
    intent: "country_accounting_context_check",
    examplesRu: ["country accounting profile", "tax accounting context"],
    requiredContext: "none",
    allowedSources: ["country_profile", "company_policy", "company_standard", "invoice", "payment"],
    answerMode: "read",
  },
  {
    intent: "chart_of_accounts_mapping",
    examplesRu: ["chart of accounts", "account mapping"],
    requiredContext: "invoice",
    allowedSources: ["chart_of_accounts", "company_policy", "company_standard", "invoice"],
    answerMode: "read",
  },
  {
    intent: "payment_readiness",
    examplesRu: ["legacy payment readiness"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "payment", "approval", "supplier_document"],
    answerMode: "read",
  },
  {
    intent: "invoice_risk_check",
    examplesRu: ["legacy invoice risk"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "payment", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    intent: "act_invoice_match",
    examplesRu: ["legacy act invoice match"],
    requiredContext: "act",
    allowedSources: ["act", "invoice", "work", "object", "payment"],
    answerMode: "read",
  },
  {
    intent: "estimate_act_invoice_chain",
    examplesRu: ["legacy estimate act invoice chain"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "estimate_line", "project_pdf", "pdf_chunk", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "missing_primary_documents",
    examplesRu: ["legacy missing primary documents"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "supplier_document", "approval"],
    answerMode: "read",
  },
  {
    intent: "payment_movement_summary",
    examplesRu: ["legacy payment movement"],
    requiredContext: "object",
    allowedSources: ["payment", "cashflow_slice", "invoice", "object"],
    answerMode: "read",
  },
  {
    intent: "cashflow_slice",
    examplesRu: ["legacy cashflow slice"],
    requiredContext: "period",
    allowedSources: ["cashflow_slice", "payment", "invoice", "approval"],
    answerMode: "read",
  },
  {
    intent: "creditor_debtor_summary",
    examplesRu: ["legacy creditor debtor summary"],
    requiredContext: "period",
    allowedSources: ["invoice", "payment", "cashflow_slice"],
    answerMode: "read",
  },
  {
    intent: "prepare_payment_rationale",
    examplesRu: ["legacy payment rationale"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "estimate_line", "payment", "approval"],
    answerMode: "draft",
  },
  {
    intent: "prepare_approval_handoff",
    examplesRu: ["legacy approval handoff"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "payment", "approval"],
    answerMode: "approval_route",
  },
  {
    intent: "tax_country_context_check",
    examplesRu: ["legacy country tax"],
    requiredContext: "none",
    allowedSources: ["country_profile", "company_standard", "invoice", "payment"],
    answerMode: "read",
  },
  {
    intent: "chart_of_accounts_check",
    examplesRu: ["legacy chart of accounts"],
    requiredContext: "invoice",
    allowedSources: ["chart_of_accounts", "company_standard", "invoice"],
    answerMode: "read",
  },
  {
    intent: "document_basis_check",
    examplesRu: ["legacy document basis"],
    requiredContext: "invoice",
    allowedSources: ["invoice", "act", "supplier_document", "pdf_chunk", "approval"],
    answerMode: "read",
  },
  {
    intent: "procurement_invoice_link",
    examplesRu: ["legacy procurement invoice link"],
    requiredContext: "invoice",
    allowedSources: ["procurement_request", "supplier_offer", "invoice", "material", "work", "object"],
    answerMode: "read",
  },
  {
    intent: "free_text_finance_summary",
    examplesRu: ["legacy finance summary"],
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

  if (hasAny(q, [/forecast/, /прогноз/])) return getAccountantIntentContract("cashflow_forecast");
  if (hasAny(q, [/налог/, /страна/, /country/, /ндс/])) return getAccountantIntentContract("country_accounting_context_check");
  if (hasAny(q, [/план счет/, /счет учет/, /счёт учет/, /проводк/])) return getAccountantIntentContract("chart_of_accounts_mapping");
  if (hasAny(q, [/склад/, /приход/, /накладн/]) && hasAny(q, [/счет|счёт|invoice|оплат/])) return getAccountantIntentContract("invoice_to_warehouse_reconciliation");
  if (hasAny(q, [/заявк/, /закупк/, /поставщик/]) && hasAny(q, [/счет|счёт|invoice|оплат/])) return getAccountantIntentContract("invoice_to_request_reconciliation");
  if (hasAny(q, [/смет/, /проект/, /pdf/, /цепоч/, /основан/]) && hasAny(q, [/акт|счет|счёт|оплат/])) return getAccountantIntentContract("estimate_to_act_reconciliation");
  if (hasAny(q, [/акт/]) && hasAny(q, [/счет|счёт|связан|свер|оплат/])) return getAccountantIntentContract("act_to_payment_reconciliation");
  if (hasAny(q, [/документ/, /первич/, /чего не хватает/, /что нужно/])) return getAccountantIntentContract("missing_documents_for_payment");
  if (hasAny(q, [/риск/, /почему нельзя/, /сомнитель/])) return getAccountantIntentContract("payment_risk_explanation");
  if (hasAny(q, [/можно.*оплат/, /готов.*оплат/, /оплачивать/])) return getAccountantIntentContract("payment_readiness_check");
  if (hasAny(q, [/rationale/, /директор/, /обоснован/])) return getAccountantIntentContract("director_payment_rationale");
  if (hasAny(q, [/соглас/, /approval/, /маршрут/])) return getAccountantIntentContract("approval_queue_for_finance");
  if (hasAny(q, [/cashflow/, /движени.*денег/, /денежн.*поток/])) return getAccountantIntentContract("cashflow_summary");
  if (hasAny(q, [/дебитор/, /кредитор/, /кому должны/])) return getAccountantIntentContract("supplier_debt_summary");
  if (hasAny(q, [/бюджет/, /лимит/])) return getAccountantIntentContract("budget_limit_check");
  if (hasAny(q, [/подрядчик/])) return getAccountantIntentContract("contractor_payment_check");
  if (hasAny(q, [/критич/, /заблокирован/])) return getAccountantIntentContract("critical_payments");

  return getAccountantIntentContract("free_text_finance_summary");
}

export const accountantIntentRouter = routeAccountantIntent;
