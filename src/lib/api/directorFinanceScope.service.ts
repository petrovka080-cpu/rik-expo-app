import { supabase } from "../supabaseClient";
import { beginPlatformObservability } from "../observability/platformObservability";
import { listAccountantInbox } from "./accountant";
import {
  fetchDirectorFinancePanelScopeV4ViaRpc,
  mapToFinanceRow,
  normalizeFinSpendRows,
  type DirectorFinancePanelScopeV4,
  type FinRep,
  type FinSpendRow,
  type FinSpendSummary,
  type FinanceRow,
} from "../../screens/director/director.finance";
import type {
  DirectorFinanceCanonicalScope,
  DirectorFinanceCanonicalSemantics,
} from "../../screens/director/director.readModels";

type DirectorFinanceDisplayMode = DirectorFinancePanelScopeV4["displayMode"];

export type DirectorFinanceScreenScopeIssueScope =
  | "finance_rows"
  | "spend_rows"
  | "panel_scope";

export type DirectorFinanceScreenScopeIssue = {
  scope: DirectorFinanceScreenScopeIssueScope;
  error: unknown;
};

export type DirectorFinanceScreenScopeResult = {
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
  canonicalScope: DirectorFinanceCanonicalScope;
  finRep: FinRep;
  finSpendSummary: FinSpendSummary;
  panelScope: DirectorFinancePanelScopeV4 | null;
  financeDisplayMode: DirectorFinanceDisplayMode;
  issues: DirectorFinanceScreenScopeIssue[];
  supportRowsLoaded: boolean;
  cutoverMeta: {
    primaryOwner: "rpc_v4";
    contractVersion: "v4";
    supportRowsReason: "not_requested";
    backendFirstPrimary: boolean;
    summaryCompatibilityOverlay: boolean;
    financeMode: DirectorFinanceCanonicalScope["mode"];
    financeSemantics: DirectorFinanceCanonicalSemantics;
  };
  sourceMeta: {
    financeSummary: "rpc_panel_scope_v4_canonical";
    spendSummary: "rpc_panel_scope_v4_canonical";
    financeRows: "legacy_accountant_inbox" | "not_loaded";
    spendRows: "legacy_spend_view" | "not_loaded";
    panelScope: "rpc_v4";
    financeDisplayMode: DirectorFinanceDisplayMode;
  };
};

export type DirectorFinanceSupportRowsResult = {
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
  issues: DirectorFinanceScreenScopeIssue[];
};

type DirectorFinanceScreenScopeArgs = {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
};

type DirectorFinancePrimaryScopeResult = {
  panelScopeV4: DirectorFinancePanelScopeV4 | null;
  issues: DirectorFinanceScreenScopeIssue[];
};

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const trimText = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return text;
};

const DIRECTOR_FINANCE_OBLIGATIONS_DEBT_HINT =
  "\u0414\u043e\u043b\u0433 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u043a\u0430\u0436\u0434\u043e\u043c\u0443 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044e \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e. \u041f\u0435\u0440\u0435\u043f\u043b\u0430\u0442\u0430 \u043f\u043e \u043e\u0434\u043d\u043e\u043c\u0443 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443 \u043d\u0435 \u0443\u043c\u0435\u043d\u044c\u0448\u0430\u0435\u0442 \u0434\u043e\u043b\u0433 \u043f\u043e \u0434\u0440\u0443\u0433\u043e\u043c\u0443.";
const DIRECTOR_FINANCE_SPEND_COVERAGE_HINT =
  "\u0420\u0430\u0441\u0445\u043e\u0434\u044b \u0441\u0447\u0438\u0442\u0430\u044e\u0442\u0441\u044f \u043f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c \u0438 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0439 allocation-level \u043a\u043e\u043d\u0442\u0443\u0440, \u0430 \u043d\u0435 \u0434\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c.";
const DIRECTOR_FINANCE_OBLIGATIONS_WORK_NOTE =
  "\u0412 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442 \u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b, \u0440\u0430\u0431\u043e\u0442\u044b \u0438 \u0443\u0441\u043b\u0443\u0433\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0443\u0436\u0435 \u0432\u043e\u0448\u043b\u0438 \u0432 proposal/invoice chain. \u042d\u0442\u043e \u043d\u0435 allocation-level \u0441\u0440\u0435\u0437.";
const DIRECTOR_FINANCE_SPEND_WORK_NOTE =
  "\u0420\u0430\u0441\u0445\u043e\u0434\u044b \u0431\u0435\u0440\u0443\u0442\u0441\u044f \u0438\u0437 allocation kind rows. \u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b, \u0440\u0430\u0431\u043e\u0442\u044b \u0438 \u0443\u0441\u043b\u0443\u0433\u0438 \u0443\u0447\u0438\u0442\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u043f\u043e \u0432\u0438\u0434\u0430\u043c, \u0435\u0441\u043b\u0438 \u043e\u043d\u0438 \u043f\u0440\u0438\u0448\u043b\u0438 \u0432 v3 scope.";

const normalizeFinanceKind = (value: unknown): string => trimText(value).toLowerCase();

const isMaterialKind = (value: unknown): boolean => {
  const normalized = normalizeFinanceKind(value);
  return normalized.includes("\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b") || normalized.includes("material");
};

const isWorkKind = (value: unknown): boolean => {
  const normalized = normalizeFinanceKind(value);
  return normalized.includes("\u0440\u0430\u0431\u043e\u0442") || normalized.includes("work");
};

const isServiceKind = (value: unknown): boolean => {
  const normalized = normalizeFinanceKind(value);
  return normalized.includes("\u0443\u0441\u043b\u0443\u0433") || normalized.includes("service");
};

const buildFinanceMetricSourceMap = (): DirectorFinanceCanonicalScope["metricSourceMap"] => {
  return [
    {
      key: "obligations_approved",
      label: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c",
      semantics: "invoice_level_obligations",
      source: "summary_v4",
      sourcePath: "canonical.summary.approvedTotal",
      inclusion: {
        materials: "conditional",
        works: "conditional",
        services: "conditional",
        note: DIRECTOR_FINANCE_OBLIGATIONS_WORK_NOTE,
      },
    },
    {
      key: "obligations_paid",
      label: "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e",
      semantics: "invoice_level_obligations",
      source: "summary_v4",
      sourcePath: "canonical.summary.paidTotal",
      inclusion: {
        materials: "conditional",
        works: "conditional",
        services: "conditional",
        note: DIRECTOR_FINANCE_OBLIGATIONS_WORK_NOTE,
      },
    },
    {
      key: "obligations_debt",
      label: "\u0414\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c",
      semantics: "invoice_level_obligations",
      source: "summary_v4",
      sourcePath: "canonical.summary.debtTotal",
      inclusion: {
        materials: "conditional",
        works: "conditional",
        services: "conditional",
        note: DIRECTOR_FINANCE_OBLIGATIONS_WORK_NOTE,
      },
    },
    {
      key: "spend_approved",
      label: "\u0410\u043b\u043b\u043e\u0446\u0438\u0440\u043e\u0432\u0430\u043d\u043e",
      semantics: "allocation_level_spend",
      source: "panel_spend_header",
      sourcePath: "spend.header.approved",
      inclusion: {
        materials: "included",
        works: "included",
        services: "included",
        note: DIRECTOR_FINANCE_SPEND_WORK_NOTE,
      },
    },
    {
      key: "spend_paid",
      label: "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e \u043f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c",
      semantics: "allocation_level_spend",
      source: "panel_spend_header",
      sourcePath: "spend.header.paid",
      inclusion: {
        materials: "included",
        works: "included",
        services: "included",
        note: DIRECTOR_FINANCE_SPEND_WORK_NOTE,
      },
    },
    {
      key: "spend_to_pay",
      label: "\u041a \u043e\u043f\u043b\u0430\u0442\u0435 \u043f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c",
      semantics: "allocation_level_spend",
      source: "panel_spend_header",
      sourcePath: "spend.header.toPay",
      inclusion: {
        materials: "included",
        works: "included",
        services: "included",
        note: DIRECTOR_FINANCE_SPEND_WORK_NOTE,
      },
    },
    {
      key: "spend_overpay",
      label: "\u041f\u0435\u0440\u0435\u043f\u043b\u0430\u0442\u0430",
      semantics: "allocation_level_spend",
      source: "panel_spend_header",
      sourcePath: "spend.header.overpay",
      inclusion: {
        materials: "included",
        works: "included",
        services: "included",
        note: DIRECTOR_FINANCE_SPEND_WORK_NOTE,
      },
    },
  ];
};

const buildFinanceWorkInclusionDiagnostics = (
  panelScope: DirectorFinancePanelScopeV4,
): DirectorFinanceCanonicalScope["workInclusion"] => {
  const observedKinds = panelScope.spend.kindRows
    .map((row) => trimText(row.kind))
    .filter((value) => value.length > 0);

  return {
    spendRowsSource: "v_director_finance_spend_kinds_v3",
    obligationsSource: "list_accountant_inbox_fact",
    observedKinds,
    workKindSupported: true,
    workKindPresent: observedKinds.some((value) => isWorkKind(value)),
    materialsPresent: observedKinds.some((value) => isMaterialKind(value)),
    servicesPresent: observedKinds.some((value) => isServiceKind(value)),
    obligationsWorkInclusion: "conditional_when_proposal_or_invoice_exists",
    spendWorkInclusion: "included_by_kind_rows",
    explanation:
      "\u0420\u0430\u0431\u043e\u0442\u044b \u0438 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0432\u0445\u043e\u0434\u044f\u0442 \u0432 allocation-level \u0440\u0430\u0441\u0445\u043e\u0434\u044b \u0447\u0435\u0440\u0435\u0437 kind rows. \u0412 invoice-level \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 \u043e\u043d\u0438 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 proposal/invoice chain.",
  };
};

const buildFinanceUiExplainer = (): DirectorFinanceCanonicalScope["uiExplainer"] => ({
  title: "\u041a\u0430\u043a \u0447\u0438\u0442\u0430\u0442\u044c \u0444\u0438\u043d\u0430\u043d\u0441\u044b",
  obligationsSummary: DIRECTOR_FINANCE_OBLIGATIONS_DEBT_HINT,
  spendSummary: DIRECTOR_FINANCE_SPEND_COVERAGE_HINT,
  differenceSummary:
    "\u0414\u043e\u043b\u0433 \u043d\u0435 \u043e\u0431\u044f\u0437\u0430\u043d \u0441\u0445\u043e\u0434\u0438\u0442\u044c\u0441\u044f \u0441 allocation-level \u0440\u0430\u0441\u0445\u043e\u0434\u0430\u043c\u0438: \u0437\u0434\u0435\u0441\u044c \u0436\u0438\u0432\u0443\u0442 \u0440\u0430\u0437\u043d\u044b\u0435 \u043c\u0435\u0442\u0440\u0438\u043a\u0438 \u0438 \u0440\u0430\u0437\u043d\u044b\u0435 source-of-truth.",
  workSummary:
    "\u0420\u0430\u0431\u043e\u0442\u044b \u0438 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0432\u0445\u043e\u0434\u044f\u0442 \u0432 \u0440\u0430\u0441\u0445\u043e\u0434\u044b \u043f\u043e kind rows. \u0412 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 \u043e\u043d\u0438 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u043e\u0433\u0434\u0430 \u0443\u0436\u0435 \u0432\u043e\u0448\u043b\u0438 \u0432 proposal/invoice chain.",
});

const buildDirectorFinanceCanonicalScope = (
  panelScope: DirectorFinancePanelScopeV4,
): DirectorFinanceCanonicalScope => {
  const mode: DirectorFinanceCanonicalScope["mode"] = "canonical";
  const semantics: DirectorFinanceCanonicalSemantics = "invoice_level_obligations";
  const sourceVersion = trimText(panelScope.meta.payloadShapeVersion || panelScope.meta.sourceVersion) || "v4";
  const metricSourceMap = buildFinanceMetricSourceMap();
  const workInclusion = buildFinanceWorkInclusionDiagnostics(panelScope);
  const uiExplainer = buildFinanceUiExplainer();
  const obligationsDebtFormulaHint =
    "Долг считается по каждому предложению отдельно. Переплата по одному поставщику не уменьшает долг по другому.";
  const spendAllocationCoverageHint =
    "Расходы считаются по аллокациям и показывают отдельный allocation-level контур, а не долг по предложениям.";

  if (mode === "canonical") {
    return {
      mode,
      semantics,
      summary: {
        approvedTotal: toFiniteNumber(panelScope.canonical.summary.approvedTotal),
        paidTotal: toFiniteNumber(panelScope.canonical.summary.paidTotal),
        debtTotal: toFiniteNumber(panelScope.canonical.summary.debtTotal),
        overpaymentTotal: toFiniteNumber(panelScope.canonical.summary.overpaymentTotal),
        overdueCount: toFiniteNumber(panelScope.canonical.summary.overdueCount),
        overdueAmount: toFiniteNumber(panelScope.canonical.summary.overdueAmount),
        criticalCount: toFiniteNumber(panelScope.canonical.summary.criticalCount),
        criticalAmount: toFiniteNumber(panelScope.canonical.summary.criticalAmount),
        debtCount: toFiniteNumber(panelScope.canonical.summary.debtCount),
        partialCount: toFiniteNumber(panelScope.canonical.summary.partialCount),
        partialPaidTotal: toFiniteNumber(panelScope.canonical.summary.partialPaidTotal),
      },
      suppliers: panelScope.canonical.suppliers.map((row) => ({
        supplierId: trimText(row.supplierId) || null,
        supplierName: trimText(row.supplierName) || "—",
        approvedTotal: toFiniteNumber(row.approvedTotal),
        paidTotal: toFiniteNumber(row.paidTotal),
        debtTotal: toFiniteNumber(row.debtTotal),
        overpaymentTotal: toFiniteNumber(row.overpaymentTotal),
        invoiceCount: toFiniteNumber(row.invoiceCount),
        overdueCount: toFiniteNumber(row.overdueCount),
        criticalCount: toFiniteNumber(row.criticalCount),
        semanticsMode: semantics,
        sourceVersion,
      })),
      objects: panelScope.canonical.objects.map((row) => ({
        objectKey: trimText(row.objectKey) || "Без объекта",
        objectId: trimText(row.objectId) || null,
        objectCode: trimText(row.objectCode) || null,
        objectName: trimText(row.objectName) || "Без объекта",
        approvedTotal: toFiniteNumber(row.approvedTotal),
        paidTotal: toFiniteNumber(row.paidTotal),
        debtTotal: toFiniteNumber(row.debtTotal),
        overpaymentTotal: toFiniteNumber(row.overpaymentTotal),
        invoiceCount: toFiniteNumber(row.invoiceCount),
        overdueCount: toFiniteNumber(row.overdueCount),
        criticalCount: toFiniteNumber(row.criticalCount),
        semanticsMode: semantics,
        sourceVersion,
      })),
      obligations: {
        semantics: "invoice_level_obligations",
        approved: toFiniteNumber(panelScope.canonical.summary.approvedTotal),
        paid: toFiniteNumber(panelScope.canonical.summary.paidTotal),
        debt: toFiniteNumber(panelScope.canonical.summary.debtTotal),
        overpaymentCompensationApplied: false,
        debtFormulaHint: obligationsDebtFormulaHint,
      },
      spend: {
        semantics: "allocation_level_spend",
        approved: toFiniteNumber(panelScope.spend.header.approved),
        paid: toFiniteNumber(panelScope.spend.header.paid),
        toPay: toFiniteNumber(panelScope.spend.header.toPay),
        overpay: toFiniteNumber(panelScope.spend.header.overpay),
        allocationCoverageHint: spendAllocationCoverageHint,
      },
      metricSourceMap,
      workInclusion,
      uiExplainer,
      diagnostics: {
        sourceVersion: trimText(panelScope.meta.sourceVersion) || "director_finance_panel_scope_v4",
        payloadShapeVersion: trimText(panelScope.meta.payloadShapeVersion) || "v4",
        usedFallback: false,
        displayMode: panelScope.displayMode,
        owner: trimText(panelScope.meta.owner) || "backend",
        generatedAt: trimText(panelScope.meta.generatedAt) || null,
        financeSummarySource: "summary_v4",
        supplierSource: "supplier_rows_v4",
        objectSource: "object_rows_v4",
        spendSource: "panel_spend_header",
      },
    };
  }

  return {
    mode,
    semantics,
    summary: {
      approvedTotal: toFiniteNumber(panelScope.canonical.summary.approvedTotal),
      paidTotal: toFiniteNumber(panelScope.canonical.summary.paidTotal),
      debtTotal: toFiniteNumber(panelScope.canonical.summary.debtTotal),
      overpaymentTotal: toFiniteNumber(panelScope.canonical.summary.overpaymentTotal),
      overdueCount: toFiniteNumber(panelScope.canonical.summary.overdueCount),
      overdueAmount: toFiniteNumber(panelScope.canonical.summary.overdueAmount),
      criticalCount: toFiniteNumber(panelScope.canonical.summary.criticalCount),
      criticalAmount: toFiniteNumber(panelScope.canonical.summary.criticalAmount),
      debtCount: toFiniteNumber(panelScope.canonical.summary.debtCount),
      partialCount: toFiniteNumber(panelScope.canonical.summary.partialCount),
      partialPaidTotal: toFiniteNumber(panelScope.canonical.summary.partialPaidTotal),
    },
    suppliers: panelScope.canonical.suppliers.map((row) => ({
      supplierId: trimText(row.supplierId) || null,
      supplierName: trimText(row.supplierName) || "вЂ”",
      approvedTotal: toFiniteNumber(row.approvedTotal),
      paidTotal: toFiniteNumber(row.paidTotal),
      debtTotal: toFiniteNumber(row.debtTotal),
      overpaymentTotal: toFiniteNumber(row.overpaymentTotal),
      invoiceCount: toFiniteNumber(row.invoiceCount),
      overdueCount: toFiniteNumber(row.overdueCount),
      criticalCount: toFiniteNumber(row.criticalCount),
      semanticsMode: semantics,
      sourceVersion,
    })),
    objects: panelScope.canonical.objects.map((row) => ({
      objectKey: trimText(row.objectKey) || "Без объекта",
      objectId: trimText(row.objectId) || null,
      objectCode: trimText(row.objectCode) || null,
      objectName: trimText(row.objectName) || "Без объекта",
      approvedTotal: toFiniteNumber(row.approvedTotal),
      paidTotal: toFiniteNumber(row.paidTotal),
      debtTotal: toFiniteNumber(row.debtTotal),
      overpaymentTotal: toFiniteNumber(row.overpaymentTotal),
      invoiceCount: toFiniteNumber(row.invoiceCount),
      overdueCount: toFiniteNumber(row.overdueCount),
      criticalCount: toFiniteNumber(row.criticalCount),
      semanticsMode: semantics,
      sourceVersion,
    })),
    obligations: {
      semantics: "invoice_level_obligations",
      approved: toFiniteNumber(panelScope.canonical.summary.approvedTotal),
      paid: toFiniteNumber(panelScope.canonical.summary.paidTotal),
      debt: toFiniteNumber(panelScope.canonical.summary.debtTotal),
      overpaymentCompensationApplied: false,
      debtFormulaHint: obligationsDebtFormulaHint,
    },
    spend: {
      semantics: "allocation_level_spend",
      approved: toFiniteNumber(panelScope.spend.header.approved),
      paid: toFiniteNumber(panelScope.spend.header.paid),
      toPay: toFiniteNumber(panelScope.spend.header.toPay),
      overpay: toFiniteNumber(panelScope.spend.header.overpay),
      allocationCoverageHint: spendAllocationCoverageHint,
    },
    metricSourceMap,
    workInclusion,
    uiExplainer,
    diagnostics: {
      sourceVersion: trimText(panelScope.meta.sourceVersion) || "director_finance_panel_scope_v4",
      payloadShapeVersion: trimText(panelScope.meta.payloadShapeVersion) || "v4",
      usedFallback: false,
      displayMode: panelScope.displayMode,
      owner: trimText(panelScope.meta.owner) || "backend",
      generatedAt: trimText(panelScope.meta.generatedAt) || null,
      financeSummarySource: "summary_v4",
      supplierSource: "supplier_rows_v4",
      objectSource: "object_rows_v4",
      spendSource: "panel_spend_header",
    },
  };
};

const buildCompatibilityFinRep = (scope: DirectorFinanceCanonicalScope): FinRep => ({
  summary: {
    approved: scope.summary.approvedTotal,
    paid: scope.summary.paidTotal,
    partialPaid: scope.summary.partialPaidTotal,
    toPay: scope.summary.debtTotal,
    overdueCount: scope.summary.overdueCount,
    overdueAmount: scope.summary.overdueAmount,
    criticalCount: scope.summary.criticalCount,
    criticalAmount: scope.summary.criticalAmount,
    partialCount: scope.summary.partialCount,
    debtCount: scope.summary.debtCount,
  },
  report: {
    suppliers: scope.suppliers.map((row) => ({
      supplier: row.supplierName,
      count: row.invoiceCount,
      approved: row.approvedTotal,
      paid: row.paidTotal,
      toPay: row.debtTotal,
      overdueCount: row.overdueCount,
      criticalCount: row.criticalCount,
    })),
  },
});

async function loadLegacyDirectorFinanceSpendRows(args: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
}): Promise<FinSpendRow[]> {
  let query = supabase
    .from("v_director_finance_spend_kinds_v3")
    .select(
      "proposal_id,proposal_no,supplier,kind_code,kind_name,approved_alloc,paid_alloc,paid_alloc_cap,overpay_alloc,director_approved_at",
    );

  if (args.periodFromIso) query = query.gte("director_approved_at", args.periodFromIso);
  if (args.periodToIso) query = query.lte("director_approved_at", args.periodToIso);

  const { data, error } = await query;
  if (error) throw error;
  return normalizeFinSpendRows(data);
}

async function loadLegacyDirectorFinanceRows(): Promise<FinanceRow[]> {
  const list = await listAccountantInbox();
  return (Array.isArray(list) ? list : [])
    .map(mapToFinanceRow)
    .filter((row) => !!row && !!row.id)
    .filter((row) => Number.isFinite(Number(row.amount)));
}

export async function loadDirectorFinanceSupportRows(args: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
}): Promise<DirectorFinanceSupportRowsResult> {
  const observation = beginPlatformObservability({
    screen: "director",
    surface: "finance_support_rows",
    category: "fetch",
    event: "load_finance_support_rows",
    sourceKind: "legacy:accountant_inbox+spend_view",
  });
  try {
    const issues: DirectorFinanceScreenScopeIssue[] = [];

    const [financeRowsResult, spendRowsResult] = await Promise.allSettled([
      loadLegacyDirectorFinanceRows(),
      loadLegacyDirectorFinanceSpendRows({
        periodFromIso: args.periodFromIso,
        periodToIso: args.periodToIso,
      }),
    ]);

    const financeRows = financeRowsResult.status === "fulfilled" ? financeRowsResult.value : [];
    const spendRows = spendRowsResult.status === "fulfilled" ? spendRowsResult.value : [];

    if (financeRowsResult.status === "rejected") {
      issues.push({ scope: "finance_rows", error: financeRowsResult.reason });
    }
    if (spendRowsResult.status === "rejected") {
      issues.push({ scope: "spend_rows", error: spendRowsResult.reason });
    }

    if (financeRowsResult.status === "rejected" && spendRowsResult.status === "rejected") {
      throw financeRowsResult.reason ?? spendRowsResult.reason;
    }

    const result = {
      financeRows,
      spendRows,
      issues,
    };
    observation.success({
      rowCount: financeRows.length + spendRows.length,
      fallbackUsed: issues.length > 0,
      extra: {
        financeRows: financeRows.length,
        spendRows: spendRows.length,
        issues: issues.length,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "load_finance_support_rows",
    });
    throw error;
  }
}

async function loadDirectorFinancePrimaryScope(
  args: DirectorFinanceScreenScopeArgs & {
    dueDaysDefault: number;
    criticalDays: number;
  },
): Promise<DirectorFinancePrimaryScopeResult> {
  const issues: DirectorFinanceScreenScopeIssue[] = [];
  let panelScopeV4: DirectorFinancePanelScopeV4 | null = null;

  try {
    panelScopeV4 = await fetchDirectorFinancePanelScopeV4ViaRpc({
      objectId: args.objectId,
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
      dueDaysDefault: args.dueDaysDefault,
      criticalDays: args.criticalDays,
      limit: 50,
      offset: 0,
    });
  } catch (error) {
    issues.push({ scope: "panel_scope", error });
  }

  return {
    panelScopeV4,
    issues,
  };
}

export async function loadDirectorFinanceScreenScope(
  args: DirectorFinanceScreenScopeArgs,
): Promise<DirectorFinanceScreenScopeResult> {
  const observation = beginPlatformObservability({
    screen: "director",
    surface: "finance_panel",
    category: "fetch",
    event: "load_finance_scope",
    sourceKind: "rpc:director_finance_panel_scope_v4",
  });
  const dueDaysDefault = Number(args.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(args.criticalDays ?? 14) || 14;
  const primaryScope = await loadDirectorFinancePrimaryScope({
    ...args,
    dueDaysDefault,
    criticalDays,
  });
  const resolvedPanelScope = primaryScope.panelScopeV4;
  const supportRowsReason = "not_requested";
  // The screen keeps a compatibility FinRep projection for existing consumers, but request truth
  // and summary truth already come from the backend-owned v4 panel scope.
  const summaryCompatibilityOverlay = false;

  if (!resolvedPanelScope) {
    const hardCutError =
      primaryScope.issues.find((issue) => issue.scope === "panel_scope")?.error ??
      new Error("director finance panel scope v4 unavailable");
    observation.error(hardCutError, {
      rowCount: 0,
      errorStage: "load_finance_scope",
      sourceKind: "rpc:director_finance_panel_scope_v4",
      extra: {
        scopeKey: `finance:${args.objectId ?? ""}:${args.periodFromIso ?? ""}:${args.periodToIso ?? ""}`,
      },
    });
    throw hardCutError;
  }

  const canonicalScope = buildDirectorFinanceCanonicalScope(resolvedPanelScope);

  const result: DirectorFinanceScreenScopeResult = {
    financeRows: [],
    spendRows: [],
    panelScope: resolvedPanelScope,
    canonicalScope,
    finRep: buildCompatibilityFinRep(canonicalScope),
    finSpendSummary: resolvedPanelScope.spend,
    financeDisplayMode: resolvedPanelScope.displayMode,
    issues: primaryScope.issues,
    supportRowsLoaded: false,
    cutoverMeta: {
      primaryOwner: "rpc_v4",
      contractVersion: "v4",
      supportRowsReason,
      backendFirstPrimary: true,
      summaryCompatibilityOverlay,
      financeMode: canonicalScope.mode,
      financeSemantics: canonicalScope.semantics,
    },
    sourceMeta: {
      financeSummary: "rpc_panel_scope_v4_canonical",
      spendSummary: "rpc_panel_scope_v4_canonical",
      financeRows: "not_loaded",
      spendRows: "not_loaded",
      panelScope: "rpc_v4",
      financeDisplayMode: resolvedPanelScope.displayMode,
    },
  };
  observation.success({
    rowCount: 0,
    sourceKind: result.sourceMeta.panelScope,
    fallbackUsed: false,
    extra: {
      issues: result.issues.length,
      supportRowsLoaded: false,
      supportRowsReason,
      financeRows: 0,
      spendRows: 0,
      financeSummary: result.sourceMeta.financeSummary,
      financeDisplayMode: result.financeDisplayMode,
      financeMode: result.cutoverMeta.financeMode,
      financeSemantics: result.cutoverMeta.financeSemantics,
      supplierRows: canonicalScope.suppliers.length,
      spendSummary: result.sourceMeta.spendSummary,
      primaryOwner: result.cutoverMeta.primaryOwner,
      contractVersion: result.cutoverMeta.contractVersion,
      summaryCompatibilityOverlay,
      owner: resolvedPanelScope.meta.owner,
      version: resolvedPanelScope.meta.payloadShapeVersion ?? resolvedPanelScope.meta.sourceVersion,
      totalCount: resolvedPanelScope.pagination.total,
      scopeKey: `finance:${args.objectId ?? ""}:${args.periodFromIso ?? ""}:${args.periodToIso ?? ""}`,
    },
  });
  return result;
}
