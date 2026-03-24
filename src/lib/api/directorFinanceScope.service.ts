import { supabase } from "../supabaseClient";
import { listAccountantInbox } from "./accountant";
import {
  computeFinanceRep,
  computeFinanceSpendSummary,
  fetchDirectorFinancePanelScopeV2ViaRpc,
  fetchDirectorFinancePanelScopeViaRpc,
  mapToFinanceRow,
  normalizeFinSpendRows,
  type DirectorFinancePanelScopeV2,
  type DirectorFinancePanelScope,
  type FinRep,
  type FinSpendRow,
  type FinSpendSummary,
  type FinanceRow,
} from "../../screens/director/director.finance";

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
  panelScope: DirectorFinancePanelScope | DirectorFinancePanelScopeV2 | null;
  issues: DirectorFinanceScreenScopeIssue[];
  supportRowsLoaded: boolean;
  sourceMeta: {
    financeSummary: "rpc_panel_scope_v2" | "rpc_panel_scope_v1" | "client_compute";
    spendSummary: "rpc_panel_scope_v2" | "rpc_panel_scope_v1" | "client_compute";
    financeRows: "legacy_accountant_inbox" | "not_loaded";
    spendRows: "legacy_spend_view" | "not_loaded";
    panelScope: "rpc_v2" | "rpc_v1" | "client_fallback";
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

  return {
    financeRows,
    spendRows,
    issues,
  };
}

export async function loadDirectorFinanceScreenScope(
  args: DirectorFinanceScreenScopeArgs,
): Promise<DirectorFinanceScreenScopeResult> {
  const dueDaysDefault = Number(args.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(args.criticalDays ?? 14) || 14;
  const includeSupportRows = args.includeSupportRows === true;
  const issues: DirectorFinanceScreenScopeIssue[] = [];
  let panelScope: DirectorFinancePanelScope | null = null;
  let panelScopeV2: DirectorFinancePanelScopeV2 | null = null;
  let financeRows: FinanceRow[] = [];
  let spendRows: FinSpendRow[] = [];
  let supportRowsLoaded = false;

  try {
    panelScopeV2 = await fetchDirectorFinancePanelScopeV2ViaRpc({
      objectId: args.objectId,
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
      limit: 50,
      offset: 0,
    });
  } catch (error) {
    issues.push({ scope: "panel_scope", error });
  }

  if (!panelScopeV2) {
    try {
      panelScope = await fetchDirectorFinancePanelScopeViaRpc({
        periodFromIso: args.periodFromIso,
        periodToIso: args.periodToIso,
        dueDaysDefault,
        criticalDays,
      });
    } catch (error) {
      issues.push({ scope: "panel_scope", error });
    }
  }

  const resolvedPanelScope = panelScopeV2 ?? panelScope;

  if (includeSupportRows || !resolvedPanelScope) {
    const supportRows = await loadDirectorFinanceSupportRows({
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
    });
    financeRows = supportRows.financeRows;
    spendRows = supportRows.spendRows;
    supportRowsLoaded = true;
    issues.push(...supportRows.issues);
  }

  return {
    financeRows,
    spendRows,
    panelScope: resolvedPanelScope,
    finRep:
      resolvedPanelScope != null
        ? { summary: resolvedPanelScope.summary, report: resolvedPanelScope.report }
        : computeFinanceRep(financeRows, {
            dueDaysDefault,
            criticalDays,
            periodFromIso: args.periodFromIso,
            periodToIso: args.periodToIso,
          }),
    finSpendSummary:
      resolvedPanelScope?.spend ??
      computeFinanceSpendSummary(spendRows),
    issues,
    supportRowsLoaded,
    sourceMeta: {
      financeSummary: panelScopeV2 ? "rpc_panel_scope_v2" : panelScope ? "rpc_panel_scope_v1" : "client_compute",
      spendSummary: panelScopeV2 ? "rpc_panel_scope_v2" : panelScope ? "rpc_panel_scope_v1" : "client_compute",
      financeRows: supportRowsLoaded ? "legacy_accountant_inbox" : "not_loaded",
      spendRows: supportRowsLoaded ? "legacy_spend_view" : "not_loaded",
      panelScope: panelScopeV2 ? "rpc_v2" : panelScope ? "rpc_v1" : "client_fallback",
    },
  };
}
