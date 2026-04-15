import { adaptDirectorFinanceScopeResult } from "./directorFinance.query.adapter";
import type { DirectorFinanceCanonicalScope } from "../director.readModels";
import type { DirectorFinancePanelScopeV4 } from "../director.finance";
import type { DirectorFinanceScreenScopeResult } from "./directorFinance.query.types";

const canonicalScope = {
  mode: "canonical",
  semantics: "invoice_level_obligations",
  summary: {
    approvedTotal: 1000,
    paidTotal: 700,
    debtTotal: 300,
    overpaymentTotal: 0,
    overdueCount: 1,
    overdueAmount: 300,
    criticalCount: 0,
    criticalAmount: 0,
    debtCount: 1,
    partialCount: 1,
    partialPaidTotal: 100,
  },
  suppliers: [],
  objects: [],
  obligations: {
    semantics: "invoice_level_obligations",
    approved: 1000,
    paid: 700,
    debt: 300,
    overpaymentCompensationApplied: false,
    debtFormulaHint: "per invoice",
  },
  spend: {
    semantics: "allocation_level_spend",
    approved: 1000,
    paid: 700,
    toPay: 300,
    overpay: 0,
    allocationCoverageHint: "allocation-level",
  },
  spendBreakdown: {
    header: { approved: 1000, paid: 700, toPay: 300, overpay: 0 },
    kindRows: [],
    overpaySuppliers: [],
  },
  metricSourceMap: [],
  workInclusion: {
    spendRowsSource: "v_director_finance_spend_kinds_v3",
    obligationsSource: "list_accountant_inbox_fact",
    observedKinds: [],
    workKindSupported: true,
    workKindPresent: false,
    materialsPresent: false,
    servicesPresent: false,
    obligationsWorkInclusion: "conditional_when_proposal_or_invoice_exists",
    spendWorkInclusion: "included_by_kind_rows",
    explanation: "test",
  },
  uiExplainer: {
    title: "Finance",
    obligationsSummary: "obligations",
    spendSummary: "spend",
    differenceSummary: "different source",
    workSummary: "work",
  },
  diagnostics: {
    sourceVersion: "director_finance_panel_scope_v4",
    payloadShapeVersion: "v4",
    usedFallback: false,
    displayMode: "canonical_v3",
    owner: "backend",
    generatedAt: "2026-04-15T00:00:00.000Z",
    financeSummarySource: "summary_v4",
    supplierSource: "supplier_rows_v4",
    objectSource: "object_rows_v4",
    spendSource: "panel_spend_header",
  },
} satisfies DirectorFinanceCanonicalScope;

const panelScope = {
  displayMode: "canonical_v3",
  pagination: { limit: 50, offset: 0, total: 0 },
  meta: {
    owner: "backend",
    generatedAt: "2026-04-15T00:00:00.000Z",
    sourceVersion: "director_finance_panel_scope_v4",
    payloadShapeVersion: "v4",
    identitySource: "request_object_identity_scope_v1",
    objectGroupingSource: "stable_object_refs",
    filtersEcho: {
      objectId: null,
      dateFrom: null,
      dateTo: null,
      dueDays: 7,
      criticalDays: 14,
    },
  },
  summary: {
    approved: 1000,
    paid: 700,
    partialPaid: 100,
    toPay: 300,
    overdueCount: 1,
    overdueAmount: 300,
    criticalCount: 0,
    criticalAmount: 0,
    partialCount: 1,
    debtCount: 1,
  },
  report: { suppliers: [] },
  spend: {
    header: { approved: 1000, paid: 700, toPay: 300, overpay: 0 },
    kindRows: [],
    overpaySuppliers: [],
  },
  rows: [],
  canonical: {
    summary: canonicalScope.summary,
    suppliers: [],
    objects: [],
    spend: canonicalScope.spendBreakdown,
  },
} as DirectorFinancePanelScopeV4;

const createScopeResult = (
  overrides?: Partial<DirectorFinanceScreenScopeResult>,
): DirectorFinanceScreenScopeResult => ({
  canonicalScope,
  panelScope,
  financeDisplayMode: "canonical_v3",
  issues: [],
  supportRowsLoaded: false,
  cutoverMeta: {
    primaryOwner: "rpc_v4",
    contractVersion: "v4",
    supportRowsReason: "not_requested",
    backendFirstPrimary: true,
    summaryCompatibilityOverlay: false,
    financeMode: "canonical",
    financeSemantics: "invoice_level_obligations",
  },
  sourceMeta: {
    financeSummary: "rpc_panel_scope_v4_canonical",
    spendSummary: "rpc_panel_scope_v4_canonical",
    financeRows: "not_loaded",
    spendRows: "not_loaded",
    panelScope: "rpc_v4",
    financeDisplayMode: "canonical_v3",
  },
  ...overrides,
});

describe("director finance query adapter", () => {
  it("preserves canonical scope without recomputing finance truth", () => {
    const result = adaptDirectorFinanceScopeResult(createScopeResult(), "|2026-01-01|2026-01-31|7|14");
    expect(result.finScope).toBe(canonicalScope);
    expect(result.finScope.summary.approvedTotal).toBe(1000);
    expect(result.finScope.obligations.debt).toBe(300);
  });

  it("preserves source and cutover metadata", () => {
    const result = adaptDirectorFinanceScopeResult(createScopeResult(), "scope-key");
    expect(result.scopeKey).toBe("scope-key");
    expect(result.cutoverMeta.primaryOwner).toBe("rpc_v4");
    expect(result.cutoverMeta.summaryCompatibilityOverlay).toBe(false);
    expect(result.sourceMeta.financeSummary).toBe("rpc_panel_scope_v4_canonical");
    expect(result.supportRowsLoaded).toBe(false);
  });

  it("passes service issues through for the controller warning boundary", () => {
    const issue = { scope: "panel_scope" as const, error: new Error("rpc failed") };
    const result = adaptDirectorFinanceScopeResult(createScopeResult({ issues: [issue] }), "scope-key");
    expect(result.issues).toEqual([issue]);
  });
});
