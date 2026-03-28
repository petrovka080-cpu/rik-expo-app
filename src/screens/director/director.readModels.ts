export type DirectorFinanceCanonicalMode = "canonical" | "fallback";
export type DirectorFinanceCanonicalSemantics = "allocation" | "invoice";

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

export type DirectorFinanceCanonicalScope = {
  mode: DirectorFinanceCanonicalMode;
  semantics: DirectorFinanceCanonicalSemantics;
  summary: DirectorFinanceCanonicalSummary;
  suppliers: DirectorFinanceCanonicalSupplierRow[];
  diagnostics: {
    sourceVersion: string;
    payloadShapeVersion: string;
    usedFallback: boolean;
    displayMode: "canonical_v3" | "fallback_legacy";
    owner: string;
    generatedAt: string | null;
  };
};

export type DirectorNamingSourceStatus = "ok" | "failed" | "missing";
export type DirectorNamingProbeCacheMode = "live" | "cached_positive" | "cached_negative";

export type DirectorReportsCanonicalSummary = {
  objectCount: number;
  objectCountLabel: string;
  confirmedWarehouseObjectCount: number;
  displayObjectCount: number;
  displayObjectCountLabel: string;
  noWorkNameCount: number;
  unresolvedNamesCount: number;
};

export type DirectorReportsNamingDiagnostics = {
  vrr: DirectorNamingSourceStatus;
  overrides: DirectorNamingSourceStatus;
  ledger: DirectorNamingSourceStatus;
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
  canResolveFromSource: boolean;
};

export type DirectorReportsCanonicalDiagnostics = {
  naming: DirectorReportsNamingDiagnostics;
  objectCountSource: "warehouse_confirmed_issues" | "requests" | "mixed";
  noWorkName: DirectorReportsNoWorkDiagnostics;
  backendOwnerPreserved: boolean;
  transportBranch: "rpc_scope_v1" | "canonical_scope_fallback" | "legacy_scope_fallback";
  pricedStage: "base" | "priced" | null;
};
