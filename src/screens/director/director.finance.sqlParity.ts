export type DirectorFinanceAggregationZone = {
  owner: "computeFinanceRep" | "computeFinanceSpendSummary" | "computeFinanceSupplierPanel";
  output: string;
  inputs: string[];
  currentSemantics: string;
  targetSqlContract: "director_finance_summary_v2" | "director_finance_panel_scope_v2";
  targetSqlExpression: string;
  parityNotes: string[];
};

export const DIRECTOR_FINANCE_SQL_PREP_ZONES: readonly DirectorFinanceAggregationZone[] = [
  {
    owner: "computeFinanceRep",
    output: "summary.approved",
    inputs: ["FinanceRow.amount"],
    currentSemantics: "sum(amount) over all visible finance rows",
    targetSqlContract: "director_finance_summary_v2",
    targetSqlExpression: "sum(amount_total)",
    parityNotes: ["rows are already filtered by object/date scope before aggregation"],
  },
  {
    owner: "computeFinanceRep",
    output: "summary.paid",
    inputs: ["FinanceRow.paidAmount"],
    currentSemantics: "sum(paidAmount) over all visible finance rows",
    targetSqlContract: "director_finance_summary_v2",
    targetSqlExpression: "sum(amount_paid)",
    parityNotes: [],
  },
  {
    owner: "computeFinanceRep",
    output: "summary.toPay",
    inputs: ["FinanceRow.amount", "FinanceRow.paidAmount"],
    currentSemantics: "sum(max(amount - paidAmount, 0)) over all visible finance rows",
    targetSqlContract: "director_finance_summary_v2",
    targetSqlExpression: "sum(greatest(amount_total - amount_paid, 0))",
    parityNotes: ["negative debt never leaks into UI totals"],
  },
  {
    owner: "computeFinanceRep",
    output: "summary.overdueCount / summary.overdueAmount",
    inputs: ["FinanceRow.amount", "FinanceRow.paidAmount", "FinanceRow.invoiceDate", "FinanceRow.approvedAtIso", "dueDaysDefault"],
    currentSemantics: "invoice is overdue when derived due date is before today and remaining debt > 0",
    targetSqlContract: "director_finance_summary_v2",
    targetSqlExpression: "count/sum where due_date < current_date and amount_debt > 0",
    parityNotes: ["derived due date falls back invoiceDate + dueDaysDefault, then approvedAtIso + dueDaysDefault"],
  },
  {
    owner: "computeFinanceRep",
    output: "summary.criticalCount / summary.criticalAmount",
    inputs: ["overdue days", "criticalDays", "FinanceRow.amount", "FinanceRow.paidAmount"],
    currentSemantics: "critical is a subset of overdue where overdue_days >= criticalDays and debt > 0",
    targetSqlContract: "director_finance_summary_v2",
    targetSqlExpression: "count/sum where overdue_days >= critical threshold and amount_debt > 0",
    parityNotes: ["critical never includes fully paid rows"],
  },
  {
    owner: "computeFinanceRep",
    output: "report.suppliers[]",
    inputs: ["FinanceRow.supplier", "FinanceRow.amount", "FinanceRow.paidAmount", "derived overdue flags"],
    currentSemantics: "group by supplier with approved/paid/debt/overdue/critical invoice counts",
    targetSqlContract: "director_finance_panel_scope_v2",
    targetSqlExpression: "group by supplier_name over scoped debt rows",
    parityNotes: ["client currently sorts suppliers by debt severity; target SQL should preserve ordering parity"],
  },
  {
    owner: "computeFinanceSpendSummary",
    output: "spend.header",
    inputs: ["FinSpendRow.approved_alloc", "FinSpendRow.paid_alloc or paid_alloc_cap", "FinSpendRow.overpay_alloc"],
    currentSemantics: "header totals aggregate approved/paid/toPay/overpay across scoped spend rows",
    targetSqlContract: "director_finance_panel_scope_v2",
    targetSqlExpression: "sum approved_alloc, paid_alloc_cap, overpay_alloc and derive to_pay",
    parityNotes: ["paid uses paid_alloc_cap when present, otherwise paid_alloc"],
  },
  {
    owner: "computeFinanceSpendSummary",
    output: "spend.kindRows[]",
    inputs: ["FinSpendRow.kind_name", "FinSpendRow.supplier", "approved_alloc", "paid_alloc", "overpay_alloc"],
    currentSemantics: "group spend rows by kind, then by supplier inside kind",
    targetSqlContract: "director_finance_panel_scope_v2",
    targetSqlExpression: "json aggregation grouped by normalized kind_name and supplier",
    parityNotes: ["normalized kind ordering should remain stable: materials, works, services, other"],
  },
  {
    owner: "computeFinanceSupplierPanel",
    output: "supplier panel invoices[]",
    inputs: ["FinanceRow.amount", "FinanceRow.paidAmount", "FinanceRow.invoiceDate", "FinanceRow.approvedAtIso", "FinanceRow.dueDate"],
    currentSemantics: "derive per-invoice debt, overdue and critical flags for selected supplier scope",
    targetSqlContract: "director_finance_panel_scope_v2",
    targetSqlExpression: "return invoice rows with amount_total, amount_paid, amount_debt, overdue flags already shaped",
    parityNotes: ["selected supplier/kind filter is applied before invoice shaping"],
  },
] as const;
