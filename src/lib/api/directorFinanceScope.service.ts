import { supabase } from "../supabaseClient";
import { beginPlatformObservability } from "../observability/platformObservability";
import { listAccountantInbox } from "./accountant";
import {
  fetchDirectorFinancePanelScopeV3ViaRpc,
  mapToFinanceRow,
  normalizeFinSpendRows,
  type DirectorFinancePanelScopeV3,
  type FinRep,
  type FinSpendRow,
  type FinSpendSummary,
  type FinanceRow,
} from "../../screens/director/director.finance";

type DirectorFinanceDisplayMode = DirectorFinancePanelScopeV3["displayMode"];

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
  finRep: FinRep;
  finSpendSummary: FinSpendSummary;
  panelScope: DirectorFinancePanelScopeV3 | null;
  financeDisplayMode: DirectorFinanceDisplayMode;
  issues: DirectorFinanceScreenScopeIssue[];
  supportRowsLoaded: boolean;
  cutoverMeta: {
    primaryOwner: "rpc_v3";
    contractVersion: "v3";
    supportRowsReason: "not_requested" | "explicit_include";
    backendFirstPrimary: boolean;
    summaryCompatibilityOverlay: boolean;
  };
  sourceMeta: {
    financeSummary: "rpc_panel_scope_v3";
    spendSummary: "rpc_panel_scope_v3";
    financeRows: "legacy_accountant_inbox" | "not_loaded";
    spendRows: "legacy_spend_view" | "not_loaded";
    panelScope: "rpc_v3";
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
  includeSupportRows?: boolean;
};

type DirectorFinancePrimaryScopeResult = {
  panelScopeV3: DirectorFinancePanelScopeV3 | null;
  issues: DirectorFinanceScreenScopeIssue[];
};

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
  let panelScopeV3: DirectorFinancePanelScopeV3 | null = null;

  try {
    panelScopeV3 = await fetchDirectorFinancePanelScopeV3ViaRpc({
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
    panelScopeV3,
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
    sourceKind: "rpc:director_finance_panel_scope_v3",
  });
  const dueDaysDefault = Number(args.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(args.criticalDays ?? 14) || 14;
  const includeSupportRows = args.includeSupportRows === true;
  let financeRows: FinanceRow[] = [];
  let spendRows: FinSpendRow[] = [];
  let supportRowsLoaded = false;
  const primaryScope = await loadDirectorFinancePrimaryScope({
    ...args,
    dueDaysDefault,
    criticalDays,
  });
  const resolvedPanelScope = primaryScope.panelScopeV3;
  const supportRowsReason = includeSupportRows ? "explicit_include" : "not_requested";

  if (!resolvedPanelScope) {
    const hardCutError =
      primaryScope.issues.find((issue) => issue.scope === "panel_scope")?.error ??
      new Error("director finance panel scope v3 unavailable");
    observation.error(hardCutError, {
      rowCount: 0,
      errorStage: "load_finance_scope",
      sourceKind: "rpc:director_finance_panel_scope_v3",
      extra: {
        supportRowsRequested: includeSupportRows,
        scopeKey: `finance:${args.objectId ?? ""}:${args.periodFromIso ?? ""}:${args.periodToIso ?? ""}`,
      },
    });
    throw hardCutError;
  }

  if (supportRowsReason !== "not_requested") {
    const supportRows = await loadDirectorFinanceSupportRows({
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
    });
    financeRows = supportRows.financeRows;
    spendRows = supportRows.spendRows;
    supportRowsLoaded = true;
    primaryScope.issues.push(...supportRows.issues);
  }

  const result: DirectorFinanceScreenScopeResult = {
    financeRows,
    spendRows,
    panelScope: resolvedPanelScope,
    finRep: { summary: resolvedPanelScope.summary, report: resolvedPanelScope.report },
    finSpendSummary: resolvedPanelScope.spend,
    financeDisplayMode: resolvedPanelScope.displayMode,
    issues: primaryScope.issues,
    supportRowsLoaded,
    cutoverMeta: {
      primaryOwner: "rpc_v3",
      contractVersion: "v3",
      supportRowsReason,
      backendFirstPrimary: true,
      summaryCompatibilityOverlay: false,
    },
    sourceMeta: {
      financeSummary: "rpc_panel_scope_v3",
      spendSummary: "rpc_panel_scope_v3",
      financeRows: supportRowsLoaded ? "legacy_accountant_inbox" : "not_loaded",
      spendRows: supportRowsLoaded ? "legacy_spend_view" : "not_loaded",
      panelScope: "rpc_v3",
      financeDisplayMode: resolvedPanelScope.displayMode,
    },
  };
  observation.success({
    rowCount: financeRows.length + spendRows.length,
    sourceKind: result.sourceMeta.panelScope,
    fallbackUsed: false,
    extra: {
      issues: result.issues.length,
      supportRowsLoaded,
      supportRowsReason,
      financeRows: financeRows.length,
      spendRows: spendRows.length,
      financeSummary: result.sourceMeta.financeSummary,
      financeDisplayMode: result.financeDisplayMode,
      spendSummary: result.sourceMeta.spendSummary,
      primaryOwner: result.cutoverMeta.primaryOwner,
      contractVersion: result.cutoverMeta.contractVersion,
      summaryCompatibilityOverlay: false,
      owner: resolvedPanelScope.meta.owner,
      version: resolvedPanelScope.meta.payloadShapeVersion ?? resolvedPanelScope.meta.sourceVersion,
      totalCount: resolvedPanelScope.pagination.total,
      scopeKey: `finance:${args.objectId ?? ""}:${args.periodFromIso ?? ""}:${args.periodToIso ?? ""}`,
    },
  });
  return result;
}
