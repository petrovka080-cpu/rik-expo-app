import type { AccountantFinanceContext, AccountantFinanceRisk, AccountantInvoice } from "./accountantFinanceTypes";

function selectedInvoice(context: AccountantFinanceContext): AccountantInvoice | undefined {
  return context.invoices.find((invoice) => invoice.id === context.selectedInvoiceId) ?? context.invoices[0];
}

export function scoreAccountantFinanceRisks(context: AccountantFinanceContext): AccountantFinanceRisk[] {
  const invoice = selectedInvoice(context);
  if (!invoice) return [];
  const act = invoice.actId ? context.acts.find((item) => item.id === invoice.actId) : undefined;
  const payments = context.payments.filter((payment) => payment.invoiceId === invoice.id);
  const paidAmount = payments
    .filter((payment) => payment.status === "paid" || payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const reasons: string[] = [];
  const sourceRefs = new Set<string>(invoice.sourceRefs);

  if (!invoice.actId || !act) reasons.push("акт не найден или не связан со счетом");
  if (act && !act.signedByHuman) reasons.push("акт есть, но подпись человека не подтверждена");
  if (!invoice.estimateLineId) reasons.push("сметная строка не связана со счетом");
  if (paidAmount > invoice.amount) reasons.push("сумма уже согласованных/оплаченных платежей больше суммы счета");
  if (invoice.status === "blocked" || invoice.status === "needs_check") reasons.push(`статус счета требует проверки: ${invoice.status}`);
  if (invoice.currency !== (context.currency ?? invoice.currency)) reasons.push("валюта счета отличается от валюты бухгалтерского среза");
  if (!context.countryTaxProfileConfigured) reasons.push("налоговый/country profile не настроен; нельзя делать country-specific claims");
  if (!context.chartOfAccountsConfigured) reasons.push("план счетов не настроен; нельзя утверждать счет учета");
  if (act) act.sourceRefs.forEach((ref) => sourceRefs.add(ref));
  payments.forEach((payment) => payment.sourceRefs.forEach((ref) => sourceRefs.add(ref)));

  return [{
    id: `risk:${invoice.id}`,
    riskLevel: reasons.length >= 4 ? "high" : reasons.length >= 2 ? "medium" : "low",
    reasonsRu: reasons.length > 0 ? reasons : ["критичных расхождений в доступных источниках не найдено"],
    sourceRefs: [...sourceRefs],
  }];
}
