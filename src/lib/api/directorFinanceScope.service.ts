import { supabase } from "../supabaseClient";
import { listAccountantInbox } from "./accountant";
import {
  addDaysIso,
  computeFinanceRep,
  computeFinanceSpendSummary,
  fetchDirectorFinancePanelScopeViaRpc,
  mapToFinanceRow,
  mid,
  nnum,
  normalizeFinSpendRows,
  parseMid,
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
  panelScope: DirectorFinancePanelScope | null;
  issues: DirectorFinanceScreenScopeIssue[];
  supportRowsLoaded: boolean;
  sourceMeta: {
    financeSummary: "rpc_panel_scope" | "client_compute";
    spendSummary: "rpc_panel_scope" | "client_compute";
    financeRows: "legacy_accountant_inbox" | "not_loaded";
    spendRows: "legacy_spend_view" | "not_loaded";
  };
};

export type DirectorFinanceSupportRowsResult = {
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
  issues: DirectorFinanceScreenScopeIssue[];
};

type DirectorFinanceScreenScopeArgs = {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  includeSupportRows?: boolean;
};

const sortFinanceRowsForScreen = (
  rows: FinanceRow[],
  dueDaysDefault: number,
): FinanceRow[] => {
  const sorted = [...rows];
  const now = mid(new Date());

  sorted.sort((left, right) => {
    const leftPaid = nnum(left.amount) > 0 && Math.max(nnum(left.amount) - nnum(left.paidAmount), 0) <= 0;
    const rightPaid = nnum(right.amount) > 0 && Math.max(nnum(right.amount) - nnum(right.paidAmount), 0) <= 0;

    const leftDueIso =
      left.dueDate ??
      (left.invoiceDate ? addDaysIso(left.invoiceDate, dueDaysDefault) : null) ??
      (left.approvedAtIso ? addDaysIso(left.approvedAtIso, dueDaysDefault) : null);
    const rightDueIso =
      right.dueDate ??
      (right.invoiceDate ? addDaysIso(right.invoiceDate, dueDaysDefault) : null) ??
      (right.approvedAtIso ? addDaysIso(right.approvedAtIso, dueDaysDefault) : null);

    const leftDue = parseMid(leftDueIso) ?? 0;
    const rightDue = parseMid(rightDueIso) ?? 0;
    const leftRest = Math.max(nnum(left.amount) - nnum(left.paidAmount), 0);
    const rightRest = Math.max(nnum(right.amount) - nnum(right.paidAmount), 0);
    const leftOverdue = !leftPaid && leftRest > 0 && leftDue && leftDue < now ? 1 : 0;
    const rightOverdue = !rightPaid && rightRest > 0 && rightDue && rightDue < now ? 1 : 0;

    if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue;
    return (leftDue || 0) - (rightDue || 0);
  });

  return sorted;
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
  dueDaysDefault?: number;
}): Promise<DirectorFinanceSupportRowsResult> {
  const dueDaysDefault = Number(args.dueDaysDefault ?? 7) || 7;
  const issues: DirectorFinanceScreenScopeIssue[] = [];

  const [financeRowsResult, spendRowsResult] = await Promise.allSettled([
    loadLegacyDirectorFinanceRows(),
    loadLegacyDirectorFinanceSpendRows({
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
    }),
  ]);

  const financeRows =
    financeRowsResult.status === "fulfilled"
      ? sortFinanceRowsForScreen(financeRowsResult.value, dueDaysDefault)
      : [];
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
  let financeRows: FinanceRow[] = [];
  let spendRows: FinSpendRow[] = [];
  let supportRowsLoaded = false;

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

  if (includeSupportRows || !panelScope) {
    const supportRows = await loadDirectorFinanceSupportRows({
      periodFromIso: args.periodFromIso,
      periodToIso: args.periodToIso,
      dueDaysDefault,
    });
    financeRows = supportRows.financeRows;
    spendRows = supportRows.spendRows;
    supportRowsLoaded = true;
    issues.push(...supportRows.issues);
  }

  return {
    financeRows,
    spendRows,
    panelScope,
    finRep:
      panelScope != null
        ? { summary: panelScope.summary, report: panelScope.report }
        : computeFinanceRep(financeRows, {
            dueDaysDefault,
            criticalDays,
            periodFromIso: args.periodFromIso,
            periodToIso: args.periodToIso,
          }),
    finSpendSummary:
      panelScope?.spend ??
      computeFinanceSpendSummary(spendRows),
    issues,
    supportRowsLoaded,
    sourceMeta: {
      financeSummary: panelScope ? "rpc_panel_scope" : "client_compute",
      spendSummary: panelScope ? "rpc_panel_scope" : "client_compute",
      financeRows: supportRowsLoaded ? "legacy_accountant_inbox" : "not_loaded",
      spendRows: supportRowsLoaded ? "legacy_spend_view" : "not_loaded",
    },
  };
}
