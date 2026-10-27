import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { AccountantFinanceContext } from "./accountantFinanceTypes";

const FORBIDDEN_LABEL_PATTERNS = [
  /runtime/i,
  /debug/i,
  /provider/i,
  /service_role/i,
  /secret/i,
  /security/i,
  /payroll/i,
] as const;

function isAllowedSource(source: ConstructionKnowledgeSource): boolean {
  if (FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(source.labelRu))) return false;
  return true;
}

export function sanitizeAccountantContext(context: AccountantFinanceContext): AccountantFinanceContext {
  const sources = context.sources.filter(isAllowedSource);
  const allowedSourceIds = new Set(sources.map((source) => source.id));
  const sourceRefs = (refs: string[]) => refs.filter((ref) => allowedSourceIds.has(ref) || !ref.startsWith("src:"));

  return {
    ...context,
    sources,
    invoices: context.invoices.map((invoice) => ({
      ...invoice,
      sourceRefs: sourceRefs(invoice.sourceRefs),
    })),
    acts: context.acts.map((act) => ({
      ...act,
      sourceRefs: sourceRefs(act.sourceRefs),
    })),
    payments: context.payments.map((payment) => ({
      ...payment,
      sourceRefs: sourceRefs(payment.sourceRefs),
    })),
    cashflow: context.cashflow.map((slice) => ({
      ...slice,
      sourceRefs: sourceRefs(slice.sourceRefs),
    })),
  };
}

export const accountantSourceSanitizer = sanitizeAccountantContext;
