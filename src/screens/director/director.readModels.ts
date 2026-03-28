export type DirectorFinanceCanonicalMode = "canonical" | "fallback";
export type DirectorFinanceCanonicalSemantics = "invoice_level_obligations";
export type DirectorFinanceSpendSemantics = "allocation_level_spend";

export type DirectorFinanceCanonicalSummary = {
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

export type DirectorFinanceCanonicalSupplierRow = {
  supplierId: string | null;
  supplierName: string;
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaymentTotal: number;
  invoiceCount: number;
  overdueCount: number;
  criticalCount: number;
  semanticsMode: DirectorFinanceCanonicalSemantics;
  sourceVersion: string;
};

export type DirectorFinanceObligationsSummary = {
  semantics: DirectorFinanceCanonicalSemantics;
  approved: number;
  paid: number;
  debt: number;
  overpaymentCompensationApplied: false;
  debtFormulaHint: string;
};

export type DirectorFinanceSpendTruthSummary = {
  semantics: DirectorFinanceSpendSemantics;
  approved: number;
  paid: number;
  toPay: number;
  overpay: number;
  allocationCoverageHint: string;
};

export type DirectorFinanceCanonicalScope = {
  mode: DirectorFinanceCanonicalMode;
  semantics: DirectorFinanceCanonicalSemantics;
  summary: DirectorFinanceCanonicalSummary;
  suppliers: DirectorFinanceCanonicalSupplierRow[];
  obligations: DirectorFinanceObligationsSummary;
  spend: DirectorFinanceSpendTruthSummary;
  diagnostics: {
    sourceVersion: string;
    payloadShapeVersion: string;
    usedFallback: boolean;
    displayMode: "canonical_v3" | "fallback_legacy";
    owner: string;
    generatedAt: string | null;
    financeSummarySource: "summary_v3" | "summary_legacy";
    supplierSource: "supplier_rows_v3" | "report_suppliers_legacy";
    spendSource: "panel_spend_header";
  };
};

export type DirectorNamingSourceStatus = "ok" | "failed" | "missing";
export type DirectorNamingProbeCacheMode = "live" | "cached_positive" | "cached_negative";
export type DirectorNamingHealthStatus = "ok" | "degraded" | "failed";

export type DirectorReportsCanonicalSummary = {
  objectCount: number;
  objectCountLabel: string;
  objectCountExplanation: string;
  confirmedWarehouseObjectCount: number;
  displayObjectCount: number;
  displayObjectCountLabel: string;
  displayObjectCountExplanation: string;
  noWorkNameCount: number;
  noWorkNameExplanation: string;
  unresolvedNamesCount: number;
};

export type DirectorReportsNamingDiagnostics = {
  vrr: DirectorNamingSourceStatus;
  overrides: DirectorNamingSourceStatus;
  ledger: DirectorNamingSourceStatus;
  objectNamingSourceStatus: DirectorNamingHealthStatus;
  workNamingSourceStatus: DirectorNamingHealthStatus;
  balanceViewStatus: DirectorNamingHealthStatus;
  namesViewStatus: DirectorNamingHealthStatus;
  overridesStatus: DirectorNamingHealthStatus;
  resolvedNames: number;
  unresolvedCodes: string[];
  lastProbeAt: string | null;
  probeCacheMode: DirectorNamingProbeCacheMode;
};

export type DirectorReportsNoWorkDiagnostics = {
  workNameMissingCount: number;
  workNameResolvedCount: number;
  itemsWithoutWorkName: number;
  locationsWithoutWorkName: number;
  share: number;
  source: "warehouse_issues";
  fallbackApplied: boolean;
  canResolveFromSource: boolean;
  explanation: string;
};

export type DirectorReportsCanonicalDiagnostics = {
  naming: DirectorReportsNamingDiagnostics;
  objectCountSource: "warehouse_confirmed_issues" | "requests" | "mixed";
  noWorkName: DirectorReportsNoWorkDiagnostics;
  backendOwnerPreserved: boolean;
  transportBranch: "rpc_scope_v1" | "canonical_scope_fallback" | "legacy_scope_fallback";
  pricedStage: "base" | "priced" | null;
};
