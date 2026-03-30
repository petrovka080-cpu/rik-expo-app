export type FinanceRow = {
  id: string;
  supplier: string;
  amount: number;
  paidAmount: number;
  currency?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  approvedAtIso?: string | null;
  dueDate?: string | null;
  paid_first_at?: string | null;
  paid_last_at?: string | null;
  proposalId?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;
  raw?: Record<string, unknown> | null;
};

export type FinanceSourceRow = Record<string, unknown> & {
  row?: Record<string, unknown> | null;
  list_accountant_inbox_fact?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
};

export type FinSpendRow = {
  supplier?: string | null;
  kind_code?: string | null;
  kind_name?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;
  director_approved_at?: string | null;
  approved_at?: string | null;
  approvedAtIso?: string | null;
  approved_alloc?: number | string | null;
  paid_alloc?: number | string | null;
  paid_alloc_cap?: number | string | null;
  overpay_alloc?: number | string | null;
};

export type FinSupplierDebt = {
  supplier: string;
  count: number;
  approved: number;
  paid: number;
  toPay: number;
  overdueCount: number;
  criticalCount: number;
};

export type FinSupplierInvoice = {
  id: string;
  title: string;
  amount: number;
  paid: number;
  rest: number;
  isOverdue: boolean;
  isCritical: boolean;
  approvedIso: string | null;
  invoiceIso: string | null;
  dueIso: string | null;
};

export type FinKindSupplierRow = {
  supplier: string;
  approved: number;
  paid: number;
  overpay: number;
  count: number;
};

export type FinSpendSummaryRow = {
  kind: string;
  approved: number;
  paid: number;
  overpay: number;
  toPay: number;
  suppliers: FinKindSupplierRow[];
};

export type FinSpendSummary = {
  header: {
    approved: number;
    paid: number;
    toPay: number;
    overpay: number;
  };
  kindRows: FinSpendSummaryRow[];
  overpaySuppliers: FinKindSupplierRow[];
};

export type FinSupplierPanelState = FinSupplierDebt & {
  amount?: number;
  _kindName?: string | null;
  kindName?: string | null;
  invoices: FinSupplierInvoice[];
};

export type FinSupplierInput =
  | FinSupplierDebt
  | FinSupplierPanelState
  | {
      supplier?: unknown;
      name?: unknown;
      _kindName?: unknown;
      kindName?: unknown;
      amount?: unknown;
      count?: unknown;
      overdueCount?: unknown;
      criticalCount?: unknown;
      invoices?: unknown;
    };

export type FinSupplierViewModel = {
  supplier: string;
  name?: string | null;
  _kindName?: string | null;
  kindName?: string | null;
  amount?: number;
  count?: number;
  overdueCount?: number;
  criticalCount?: number;
  invoices?: FinSupplierInvoice[];
};

export type FinRep = {
  summary: {
    approved: number;
    paid: number;
    partialPaid: number;
    toPay: number;
    overdueCount: number;
    overdueAmount: number;
    criticalCount: number;
    criticalAmount: number;
    partialCount: number;
    debtCount: number;
  };
  report: {
    suppliers: FinSupplierDebt[];
  };
};

export type DirectorFinancePanelScope = FinRep & {
  spend: FinSpendSummary;
};

export type DirectorFinanceStatus = "pending" | "approved" | "paid" | "overdue";

export type DirectorFinanceRowV2 = {
  requestId: string | null;
  objectId: string | null;
  objectCode?: string | null;
  objectName?: string | null;
  supplierId: string;
  supplierName: string;
  proposalId: string | null;
  invoiceNumber: string | null;
  amountTotal: number;
  amountPaid: number;
  amountDebt: number;
  dueDate: string | null;
  isOverdue: boolean;
  overdueDays: number | null;
  status: DirectorFinanceStatus;
};

export type DirectorFinanceSummaryV2Supplier = {
  supplierId: string;
  supplierName: string;
  debt: number;
};

export type DirectorFinanceSummaryV2 = {
  totalAmount: number;
  totalPaid: number;
  totalDebt: number;
  overdueAmount: number;
  bySupplier: DirectorFinanceSummaryV2Supplier[];
};

export type DirectorFinancePagination = {
  limit: number;
  offset: number;
  total: number;
};

export type DirectorFinancePanelScopeV2 = DirectorFinancePanelScope & {
  rows: DirectorFinanceRowV2[];
  pagination: DirectorFinancePagination;
  summaryV2: DirectorFinanceSummaryV2;
};

export type DirectorFinanceSummaryV3 = {
  totalPayable: number;
  totalApproved: number;
  totalPaid: number;
  totalDebt: number;
  totalOverpayment: number;
  overdueAmount: number;
  criticalAmount: number;
  overdueCount: number;
  criticalCount: number;
  debtCount: number;
  partialCount: number;
  partialPaid: number;
  rowCount: number;
  supplierRowCount: number;
};

export type DirectorFinanceSupplierRowV3 = {
  id: string;
  supplierId: string;
  supplierName: string;
  payable: number;
  paid: number;
  debt: number;
  overpayment: number;
  overdueAmount: number;
  criticalAmount: number;
  invoiceCount: number;
  debtCount: number;
  overdueCount: number;
  criticalCount: number;
};

export type DirectorFinanceMetaV3 = {
  owner: string;
  generatedAt: string | null;
  sourceVersion: string;
  payloadShapeVersion: string;
  filtersEcho: {
    objectId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    dueDays: number;
    criticalDays: number;
  };
};

export type DirectorFinancePanelScopeV3 = DirectorFinancePanelScope & {
  rows: DirectorFinanceRowV2[];
  pagination: DirectorFinancePagination;
  summaryV2: DirectorFinanceSummaryV2;
  summaryV3: DirectorFinanceSummaryV3;
  supplierRows: DirectorFinanceSupplierRowV3[];
  meta: DirectorFinanceMetaV3;
  displayMode: "canonical_v3" | "fallback_legacy";
};

export type DirectorFinanceCanonicalSummaryV4 = {
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaymentTotal: number;
  overdueCount: number;
  overdueAmount: number;
  criticalCount: number;
  criticalAmount: number;
  debtCount: number;
  partialCount: number;
  partialPaidTotal: number;
};

export type DirectorFinanceSupplierRowV4 = {
  supplierId: string | null;
  supplierName: string;
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaymentTotal: number;
  invoiceCount: number;
  debtCount: number;
  overdueCount: number;
  criticalCount: number;
  overdueAmount: number;
  criticalAmount: number;
};

export type DirectorFinanceObjectRowV4 = {
  objectKey: string;
  objectId: string | null;
  objectCode: string | null;
  objectName: string;
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaymentTotal: number;
  invoiceCount: number;
  debtCount: number;
  overdueCount: number;
  criticalCount: number;
  overdueAmount: number;
  criticalAmount: number;
};

export type DirectorFinanceMetaV4 = DirectorFinanceMetaV3 & {
  identitySource: string;
  objectGroupingSource: string;
};

export type DirectorFinancePanelScopeV4 = DirectorFinancePanelScope & {
  rows: DirectorFinanceRowV2[];
  pagination: DirectorFinancePagination;
  canonical: {
    summary: DirectorFinanceCanonicalSummaryV4;
    suppliers: DirectorFinanceSupplierRowV4[];
    objects: DirectorFinanceObjectRowV4[];
    spend: FinSpendSummary;
  };
  meta: DirectorFinanceMetaV4;
  displayMode: "canonical_v3";
};

export type FinanceSummary = FinRep["summary"];

export type FinKindSummary = {
  kind_name: string;
  count: number;
  approved: number;
  paid: number;
  toPay: number;
};
