import fs from "fs";
import path from "path";
import dotenv from "dotenv";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
(globalThis as GlobalDevFlag).__DEV__ = false;

const DUE_DAYS_DEFAULT = 7;
const CRITICAL_DAYS = 14;

type NumericParity = {
  left: number;
  right: number;
  delta: number;
  match: boolean;
};

const compareNumber = (left: unknown, right: unknown, epsilon = 0.001): NumericParity => {
  const a = Number(left ?? 0);
  const b = Number(right ?? 0);
  const safeA = Number.isFinite(a) ? a : 0;
  const safeB = Number.isFinite(b) ? b : 0;
  const delta = safeA - safeB;
  return {
    left: safeA,
    right: safeB,
    delta,
    match: Math.abs(delta) <= epsilon,
  };
};

async function main() {
  const financeScopeService = await import("../src/lib/api/directorFinanceScope.service");
  const finance = await import("../src/screens/director/director.finance");
  const pdfSourceService = await import("../src/lib/api/directorPdfSource.service");

  const scope = await financeScopeService.loadDirectorFinanceScreenScope({
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
  });

  const supportRows = await financeScopeService.loadDirectorFinanceSupportRows({
    periodFromIso: null,
    periodToIso: null,
  });

  const computedRep = finance.computeFinanceRep(supportRows.financeRows, {
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
    periodFromIso: null,
    periodToIso: null,
  });
  const computedSpend = finance.computeFinanceSpendSummary(supportRows.spendRows);
  const panelScopeV1 = await finance.fetchDirectorFinancePanelScopeViaRpc({
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
  });
  const panelScopeV2 = await finance.fetchDirectorFinancePanelScopeV2ViaRpc({
    periodFromIso: null,
    periodToIso: null,
    limit: 1000,
    offset: 0,
  });
  const summaryV2 = await finance.fetchDirectorFinanceSummaryV2ViaRpc({
    periodFromIso: null,
    periodToIso: null,
  });
  const pdfSource = await pdfSourceService.getDirectorFinancePdfSource({
    periodFrom: null,
    periodTo: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
  });

  const summaryParity = {
    approved: compareNumber(scope.canonicalScope.obligations.approved, panelScopeV1?.summary.approved ?? computedRep.summary.approved),
    paid: compareNumber(scope.canonicalScope.obligations.paid, panelScopeV1?.summary.paid ?? computedRep.summary.paid),
    toPay: compareNumber(scope.canonicalScope.obligations.debt, panelScopeV1?.summary.toPay ?? computedRep.summary.toPay),
    overdueCount: compareNumber(
      scope.canonicalScope.summary.overdueCount,
      panelScopeV1?.summary.overdueCount ?? computedRep.summary.overdueCount,
    ),
    overdueAmount: compareNumber(
      scope.canonicalScope.summary.overdueAmount,
      panelScopeV1?.summary.overdueAmount ?? computedRep.summary.overdueAmount,
    ),
    criticalCount: compareNumber(
      scope.canonicalScope.summary.criticalCount,
      panelScopeV1?.summary.criticalCount ?? computedRep.summary.criticalCount,
    ),
    criticalAmount: compareNumber(
      scope.canonicalScope.summary.criticalAmount,
      panelScopeV1?.summary.criticalAmount ?? computedRep.summary.criticalAmount,
    ),
    partialCount: compareNumber(
      scope.canonicalScope.summary.partialCount,
      panelScopeV1?.summary.partialCount ?? computedRep.summary.partialCount,
    ),
    debtCount: compareNumber(
      scope.canonicalScope.summary.debtCount,
      panelScopeV1?.summary.debtCount ?? computedRep.summary.debtCount,
    ),
  };

  const spendParity = {
    approved: compareNumber(scope.finSpendSummary.header.approved, computedSpend.header.approved),
    paid: compareNumber(scope.finSpendSummary.header.paid, computedSpend.header.paid),
    toPay: compareNumber(scope.finSpendSummary.header.toPay, computedSpend.header.toPay),
    overpay: compareNumber(scope.finSpendSummary.header.overpay, computedSpend.header.overpay),
    kindRowsCount: compareNumber(scope.finSpendSummary.kindRows.length, computedSpend.kindRows.length),
    overpaySuppliersCount: compareNumber(
      scope.finSpendSummary.overpaySuppliers.length,
      computedSpend.overpaySuppliers.length,
    ),
  };

  const supplierParity = {
    count: compareNumber(
      scope.canonicalScope.suppliers.length,
      panelScopeV1?.report.suppliers.length ?? computedRep.report.suppliers.length,
    ),
    topFiveMatch: scope.canonicalScope.suppliers.slice(0, 5).every((row, index) => {
      const target = panelScopeV1?.report.suppliers[index] ?? computedRep.report.suppliers[index];
      return (
        String(row.supplierName) === String(target?.supplier ?? "") &&
        Math.abs(Number(row.debtTotal ?? 0) - Number(target?.toPay ?? 0)) <= 0.001
      );
    }),
  };

  const summaryV2Parity = summaryV2
    ? {
        totalAmount: compareNumber(summaryV2.totalAmount, panelScopeV2?.summaryV2.totalAmount ?? summaryV2.totalAmount),
        totalPaid: compareNumber(summaryV2.totalPaid, panelScopeV2?.summaryV2.totalPaid ?? summaryV2.totalPaid),
        totalDebt: compareNumber(summaryV2.totalDebt, panelScopeV2?.summaryV2.totalDebt ?? summaryV2.totalDebt),
        overdueAmount: compareNumber(
          summaryV2.overdueAmount,
          panelScopeV2?.summaryV2.overdueAmount ?? summaryV2.overdueAmount,
        ),
        bySupplierCount: compareNumber(
          summaryV2.bySupplier.length,
          panelScopeV2?.summaryV2.bySupplier.length ?? summaryV2.bySupplier.length,
        ),
      }
    : null;

  const allNumericParity = [
    ...Object.values(summaryParity),
    ...Object.values(spendParity),
    ...(summaryV2Parity ? Object.values(summaryV2Parity) : []),
  ].every((entry) => entry.match);

  const status =
    scope.sourceMeta.panelScope === "rpc_v4" &&
    scope.supportRowsLoaded === false &&
    panelScopeV2 != null &&
    allNumericParity &&
    supplierParity.topFiveMatch &&
    pdfSource.source !== "legacy:director_finance_ui_payload"
      ? "passed"
      : "failed";

  const artifact = {
    status,
    generatedAt: new Date().toISOString(),
    sourceMeta: scope.sourceMeta,
    cutoverMeta: scope.cutoverMeta,
    issues: scope.issues.map((issue) => ({
      scope: issue.scope,
      error: issue.error instanceof Error ? issue.error.message : String(issue.error ?? ""),
    })),
    panelScopeV2: panelScopeV2
      ? {
          rows: panelScopeV2.rows.length,
          pagination: panelScopeV2.pagination,
          summaryV2BySupplier: panelScopeV2.summaryV2.bySupplier.length,
        }
      : null,
    panelScopeV1: panelScopeV1
      ? {
          suppliers: panelScopeV1.report.suppliers.length,
          spendKindRows: panelScopeV1.spend.kindRows.length,
        }
      : null,
    summaryParity,
    spendParity,
    supplierParity,
    summaryV2Parity,
    pdfSource: {
      source: pdfSource.source,
      sourceBranch: pdfSource.branchMeta.sourceBranch,
      fallbackReason: pdfSource.branchMeta.fallbackReason ?? null,
      financeRows: pdfSource.financeRows.length,
      spendRows: pdfSource.spendRows.length,
    },
  };

  const summary = {
    status,
    panelScope: scope.sourceMeta.panelScope,
    backendFirstPrimary: scope.cutoverMeta.backendFirstPrimary,
    supportRowsLoaded: scope.supportRowsLoaded,
    supportRowsReason: scope.cutoverMeta.supportRowsReason,
    issues: artifact.issues.length,
    summaryParityOk: Object.values(summaryParity).every((entry) => entry.match),
    spendParityOk: Object.values(spendParity).every((entry) => entry.match),
    supplierTopFiveMatch: supplierParity.topFiveMatch,
    summaryV2ParityOk: summaryV2Parity
      ? Object.values(summaryV2Parity).every((entry) => entry.match)
      : false,
    pdfSource: artifact.pdfSource,
  };

  const artifactsDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, "director-finance-cutover-v2.json"),
    JSON.stringify(artifact, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, "director-finance-cutover-v2.summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
