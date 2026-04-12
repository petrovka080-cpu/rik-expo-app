import type { FinSpendSummary } from "./director.finance.types";

export type DirectorFinanceCanonicalMode = "canonical" | "fallback";
export type DirectorFinanceCanonicalSemantics = "invoice_level_obligations";
export type DirectorFinanceSpendSemantics = "allocation_level_spend";
export type DirectorFinanceInclusionState = "included" | "conditional" | "excluded";
export type DirectorFinanceMetricKey =
  | "obligations_approved"
  | "obligations_paid"
  | "obligations_debt"
  | "spend_approved"
  | "spend_paid"
  | "spend_to_pay"
  | "spend_overpay";
export type DirectorFinanceMetricSource =
  | "summary_v4"
  | "summary_v3"
  | "summary_legacy"
  | "panel_spend_header";

export type DirectorFinanceMetricInclusion = {
  materials: DirectorFinanceInclusionState;
  works: DirectorFinanceInclusionState;
  services: DirectorFinanceInclusionState;
  note: string;
};

export type DirectorFinanceMetricSourceMapEntry = {
  key: DirectorFinanceMetricKey;
  label: string;
  semantics: DirectorFinanceCanonicalSemantics | DirectorFinanceSpendSemantics;
  source: DirectorFinanceMetricSource;
  sourcePath: string;
  inclusion: DirectorFinanceMetricInclusion;
};

export type DirectorFinanceWorkInclusionDiagnostics = {
  spendRowsSource: "v_director_finance_spend_kinds_v3";
  obligationsSource: "list_accountant_inbox_fact";
  observedKinds: string[];
  workKindSupported: boolean;
  workKindPresent: boolean;
  materialsPresent: boolean;
  servicesPresent: boolean;
  obligationsWorkInclusion: "conditional_when_proposal_or_invoice_exists";
  spendWorkInclusion: "included_by_kind_rows";
  explanation: string;
};

export type DirectorFinanceUiExplainer = {
  title: string;
  obligationsSummary: string;
  spendSummary: string;
  differenceSummary: string;
  workSummary: string;
};

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

export type DirectorFinanceCanonicalObjectRow = {
  objectKey: string;
  objectId: string | null;
  objectCode: string | null;
  objectName: string;
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
  objects: DirectorFinanceCanonicalObjectRow[];
  obligations: DirectorFinanceObligationsSummary;
  spend: DirectorFinanceSpendTruthSummary;
  spendBreakdown: FinSpendSummary;
  metricSourceMap: DirectorFinanceMetricSourceMapEntry[];
  workInclusion: DirectorFinanceWorkInclusionDiagnostics;
  uiExplainer: DirectorFinanceUiExplainer;
  diagnostics: {
    sourceVersion: string;
    payloadShapeVersion: string;
    usedFallback: boolean;
    displayMode: "canonical_v3" | "fallback_legacy";
    owner: string;
    generatedAt: string | null;
    financeSummarySource: "summary_v4" | "summary_v3" | "summary_legacy";
    supplierSource: "supplier_rows_v4" | "supplier_rows_v3" | "report_suppliers_legacy";
    objectSource: "object_rows_v4";
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
  transportBranch: "rpc_scope_v1";
  pricedStage: "base" | "priced" | null;
};
