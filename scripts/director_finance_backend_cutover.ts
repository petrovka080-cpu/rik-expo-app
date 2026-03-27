import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import dotenv from "dotenv";
import type {
  DirectorFinancePanelScope,
  DirectorFinancePanelScopeV2,
  DirectorFinancePanelScopeV3,
  DirectorFinanceRowV2,
  FinSpendRow,
  FinSupplierPanelState,
} from "../src/screens/director/director.finance";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };
type UnknownRecord = Record<string, unknown>;

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
(globalThis as GlobalDevFlag).__DEV__ = false;

const DUE_DAYS_DEFAULT = 7;
const CRITICAL_DAYS = 14;
const projectRoot = process.cwd();
const runtimeSummaryPath = path.join(projectRoot, "artifacts/director-finance-runtime.summary.json");
const fullOutPath = path.join(projectRoot, "artifacts/director-finance-backend-cutover.json");
const summaryOutPath = path.join(projectRoot, "artifacts/director-finance-backend-cutover.summary.json");

type NumericParity = {
  left: number;
  right: number;
  delta: number;
  match: boolean;
};

type LegacyOrderedRow = {
  requestId: string | null;
  objectId: string | null;
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
  status: "pending" | "approved" | "paid" | "overdue";
};

type LegacySupplierRow = {
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

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const readJson = (fullPath: string): UnknownRecord | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as UnknownRecord;
};

const isPassedRuntimeSummary = (summary: UnknownRecord | null) => summary?.status === "passed";

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runNpx = (args: string[], timeoutMs = 15 * 60 * 1000) => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: timeoutMs,
    });
  }
  return spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });
};

const md5Lower = (value: string) =>
  createHash("md5").update(String(value ?? "").trim().toLowerCase(), "utf8").digest("hex");

const invoiceSignature = (invoice: {
  title: string;
  amount: number;
  paid: number;
  rest: number;
  isOverdue: boolean;
  isCritical: boolean;
  approvedIso: string | null;
  invoiceIso: string | null;
  dueIso: string | null;
}) =>
  [
    invoice.title,
    Number(invoice.amount ?? 0).toFixed(2),
    Number(invoice.paid ?? 0).toFixed(2),
    Number(invoice.rest ?? 0).toFixed(2),
    invoice.isOverdue ? "1" : "0",
    invoice.isCritical ? "1" : "0",
    invoice.approvedIso ?? "",
    invoice.invoiceIso ?? "",
    invoice.dueIso ?? "",
  ].join("|");

const compareStringSets = (left: string[], right: string[]) => {
  const safeLeft = [...left].sort();
  const safeRight = [...right].sort();
  if (safeLeft.length !== safeRight.length) {
    return {
      match: false,
      leftCount: safeLeft.length,
      rightCount: safeRight.length,
      mismatchCount: Math.abs(safeLeft.length - safeRight.length),
      sampleLeft: safeLeft.slice(0, 5),
      sampleRight: safeRight.slice(0, 5),
    };
  }

  let mismatchCount = 0;
  for (let index = 0; index < safeLeft.length; index += 1) {
    if (safeLeft[index] !== safeRight[index]) mismatchCount += 1;
  }

  return {
    match: mismatchCount === 0,
    leftCount: safeLeft.length,
    rightCount: safeRight.length,
    mismatchCount,
    sampleLeft: safeLeft.slice(0, 5),
    sampleRight: safeRight.slice(0, 5),
  };
};

const buildLegacyFinanceContext = (rows: DirectorFinanceRowV2[], spendRows: FinSpendRow[], criticalDays: number) => {
  const orderedRows: LegacyOrderedRow[] = [];
  const supplierMap = new Map<string, LegacySupplierRow>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const supplierName = String(row.supplierName ?? "").trim() || "—";
    const amountTotal = Number(row.amountTotal ?? 0);
    const amountPaid = Number(row.amountPaid ?? 0);
    const amountDebt = Number(row.amountDebt ?? 0);
    const isOverdue = row.isOverdue === true;
    const overdueDays = Number.isFinite(Number(row.overdueDays)) ? Number(row.overdueDays) : null;
    const isCritical = isOverdue && Number(overdueDays ?? 0) >= criticalDays;
    const supplierId = String(row.supplierId ?? "").trim() || md5Lower(supplierName);

    orderedRows.push({
      requestId: String(row.requestId ?? "").trim() || null,
      objectId: String(row.objectId ?? "").trim() || null,
      supplierId,
      supplierName,
      proposalId: String(row.proposalId ?? "").trim() || null,
      invoiceNumber: String(row.invoiceNumber ?? "").trim() || null,
      amountTotal,
      amountPaid,
      amountDebt,
      dueDate: row.dueDate ?? null,
      isOverdue,
      overdueDays,
      status:
        row.status === "pending" || row.status === "approved" || row.status === "paid" || row.status === "overdue"
          ? row.status
          : "pending",
    });

    const supplierAgg = supplierMap.get(supplierName) ?? {
      id: supplierId,
      supplierId,
      supplierName,
      payable: 0,
      paid: 0,
      debt: 0,
      overpayment: 0,
      overdueAmount: 0,
      criticalAmount: 0,
      invoiceCount: 0,
      debtCount: 0,
      overdueCount: 0,
      criticalCount: 0,
    };
    supplierAgg.payable += amountTotal;
    supplierAgg.paid += amountPaid;
    supplierAgg.debt += amountDebt;
    supplierAgg.invoiceCount += 1;
    if (amountDebt > 0) supplierAgg.debtCount += 1;
    if (isOverdue) {
      supplierAgg.overdueCount += 1;
      supplierAgg.overdueAmount += amountDebt;
    }
    if (isCritical) {
      supplierAgg.criticalCount += 1;
      supplierAgg.criticalAmount += amountDebt;
    }
    supplierMap.set(supplierName, supplierAgg);
  }

  for (const row of Array.isArray(spendRows) ? spendRows : []) {
    const supplierName = String(row?.supplier ?? "").trim() || "—";
    const supplierAgg = supplierMap.get(supplierName);
    if (!supplierAgg) continue;
    supplierAgg.overpayment += Number(row?.overpay_alloc ?? 0) || 0;
    supplierMap.set(supplierName, supplierAgg);
  }

  orderedRows.sort((left, right) => {
    if (Number(left.isOverdue) !== Number(right.isOverdue)) {
      return Number(right.isOverdue) - Number(left.isOverdue);
    }
    const leftDue = left.dueDate ?? "9999-12-31";
    const rightDue = right.dueDate ?? "9999-12-31";
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
    if (left.amountDebt !== right.amountDebt) return right.amountDebt - left.amountDebt;
    if (left.supplierName !== right.supplierName) return left.supplierName.localeCompare(right.supplierName);
    return (left.proposalId ?? "").localeCompare(right.proposalId ?? "");
  });

  const supplierRows = Array.from(supplierMap.values()).sort((left, right) => {
    if (left.debt !== right.debt) return right.debt - left.debt;
    return left.supplierName.localeCompare(right.supplierName);
  });

  return {
    orderedRows,
    supplierRows,
    overpayBySupplier: Object.fromEntries(supplierRows.map((row) => [row.supplierName, row.overpayment])),
  };
};

async function main() {
  const financeScopeService = await import("../src/lib/api/directorFinanceScope.service");
  const finance = await import("../src/screens/director/director.finance");
  const pdfSourceService = await import("../src/lib/api/directorPdfSource.service");
  const supabaseModule = await import("../src/lib/supabaseClient");
  const financeScopeServiceSource = fs.readFileSync(
    path.join(projectRoot, "src/lib/api/directorFinanceScope.service.ts"),
    "utf8",
  );
  const financePanelSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/director/director.finance.panel.ts"),
    "utf8",
  );

  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"]);
  const eslintRun = runNpx([
    "eslint",
    "src/screens/director/director.finance.panel.ts",
    "src/screens/director/director.finance.ts",
    "src/lib/api/directorPdfSource.service.ts",
    "scripts/director_finance_runtime_verify.ts",
    "scripts/director_finance_backend_cutover.ts",
  ]);
  const existingRuntimeSummary = readJson(runtimeSummaryPath);
  const shouldReuseRuntimeSummary = isPassedRuntimeSummary(existingRuntimeSummary);
  const runtimeRun = shouldReuseRuntimeSummary
    ? {
        status: 0,
        stdout: "Reused existing passed director finance runtime summary artifact.",
        stderr: "",
      }
    : runNpx(["tsx", "scripts/director_finance_runtime_verify.ts"], 20 * 60 * 1000);
  const runtimeSummary = shouldReuseRuntimeSummary ? existingRuntimeSummary : readJson(runtimeSummaryPath);

  const scope = await financeScopeService.loadDirectorFinanceScreenScope({
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
    includeSupportRows: false,
  });
  const supportRows = await financeScopeService.loadDirectorFinanceSupportRows({
    periodFromIso: null,
    periodToIso: null,
  });
  const computedSpend = finance.computeFinanceSpendSummary(supportRows.spendRows);

  const panelScopeV1: DirectorFinancePanelScope | null = await finance.fetchDirectorFinancePanelScopeViaRpc({
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
  });
  const panelScopeV2All: DirectorFinancePanelScopeV2 | null = await finance.fetchDirectorFinancePanelScopeV2ViaRpc({
    periodFromIso: null,
    periodToIso: null,
    limit: 1000,
    offset: 0,
  });
  const panelScopeV3: DirectorFinancePanelScopeV3 | null = await finance.fetchDirectorFinancePanelScopeV3ViaRpc({
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
    limit: 50,
    offset: 0,
  });
  const pdfSource = await pdfSourceService.getDirectorFinancePdfSource({
    periodFrom: null,
    periodTo: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS,
  });

  const legacyContext = buildLegacyFinanceContext(panelScopeV2All?.rows ?? [], supportRows.spendRows, CRITICAL_DAYS);

  const summaryParity = panelScopeV1 && panelScopeV2All && panelScopeV3
    ? {
        totalPayable: compareNumber(panelScopeV3.summaryV3.totalPayable, panelScopeV1.summary.approved),
        totalApproved: compareNumber(panelScopeV3.summaryV3.totalApproved, panelScopeV1.summary.approved),
        totalPaid: compareNumber(panelScopeV3.summaryV3.totalPaid, panelScopeV1.summary.paid),
        totalDebt: compareNumber(panelScopeV3.summaryV3.totalDebt, panelScopeV1.summary.toPay),
        totalOverpayment: compareNumber(panelScopeV3.summaryV3.totalOverpayment, computedSpend.header.overpay),
        overdueAmount: compareNumber(panelScopeV3.summaryV3.overdueAmount, panelScopeV1.summary.overdueAmount),
        criticalAmount: compareNumber(panelScopeV3.summaryV3.criticalAmount, panelScopeV1.summary.criticalAmount),
        overdueCount: compareNumber(panelScopeV3.summaryV3.overdueCount, panelScopeV1.summary.overdueCount),
        criticalCount: compareNumber(panelScopeV3.summaryV3.criticalCount, panelScopeV1.summary.criticalCount),
        debtCount: compareNumber(panelScopeV3.summaryV3.debtCount, panelScopeV1.summary.debtCount),
        partialCount: compareNumber(panelScopeV3.summaryV3.partialCount, panelScopeV1.summary.partialCount),
        partialPaid: compareNumber(panelScopeV3.summaryV3.partialPaid, panelScopeV1.summary.partialPaid),
        rowCount: compareNumber(panelScopeV3.summaryV3.rowCount, panelScopeV2All.pagination.total),
        supplierRowCount: compareNumber(panelScopeV3.summaryV3.supplierRowCount, panelScopeV1.report.suppliers.length),
      }
    : null;

  const spendParity = panelScopeV1 && panelScopeV3
    ? {
        approved: compareNumber(panelScopeV3.spend.header.approved, panelScopeV1.spend.header.approved),
        paid: compareNumber(panelScopeV3.spend.header.paid, panelScopeV1.spend.header.paid),
        toPay: compareNumber(panelScopeV3.spend.header.toPay, panelScopeV1.spend.header.toPay),
        overpay: compareNumber(panelScopeV3.spend.header.overpay, panelScopeV1.spend.header.overpay),
        kindRowsCount: compareNumber(panelScopeV3.spend.kindRows.length, panelScopeV1.spend.kindRows.length),
        overpaySuppliersCount: compareNumber(
          panelScopeV3.spend.overpaySuppliers.length,
          panelScopeV1.spend.overpaySuppliers.length,
        ),
      }
    : null;

  const rowFieldMismatchCounts = {
    requestId: 0,
    objectId: 0,
    supplierId: 0,
    supplierName: 0,
    proposalId: 0,
    invoiceNumber: 0,
    amountTotal: 0,
    amountPaid: 0,
    amountDebt: 0,
    dueDate: 0,
    isOverdue: 0,
    overdueDays: 0,
    status: 0,
  };
  const expectedRows = (panelScopeV2All?.rows ?? []).slice(0, panelScopeV3?.rows.length ?? 0);
  for (let index = 0; index < expectedRows.length; index += 1) {
    const expected = expectedRows[index];
    const actual = panelScopeV3?.rows[index];
    if (!actual) continue;
    if (String(expected.requestId ?? "") !== String(actual.requestId ?? "")) rowFieldMismatchCounts.requestId += 1;
    if (String(expected.objectId ?? "") !== String(actual.objectId ?? "")) rowFieldMismatchCounts.objectId += 1;
    if (String(expected.supplierId ?? "") !== String(actual.supplierId ?? "")) rowFieldMismatchCounts.supplierId += 1;
    if (String(expected.supplierName ?? "") !== String(actual.supplierName ?? "")) rowFieldMismatchCounts.supplierName += 1;
    if (String(expected.proposalId ?? "") !== String(actual.proposalId ?? "")) rowFieldMismatchCounts.proposalId += 1;
    if (String(expected.invoiceNumber ?? "") !== String(actual.invoiceNumber ?? "")) rowFieldMismatchCounts.invoiceNumber += 1;
    if (!compareNumber(expected.amountTotal, actual.amountTotal).match) rowFieldMismatchCounts.amountTotal += 1;
    if (!compareNumber(expected.amountPaid, actual.amountPaid).match) rowFieldMismatchCounts.amountPaid += 1;
    if (!compareNumber(expected.amountDebt, actual.amountDebt).match) rowFieldMismatchCounts.amountDebt += 1;
    if (String(expected.dueDate ?? "") !== String(actual.dueDate ?? "")) rowFieldMismatchCounts.dueDate += 1;
    if (Boolean(expected.isOverdue) !== Boolean(actual.isOverdue)) rowFieldMismatchCounts.isOverdue += 1;
    if (!compareNumber(expected.overdueDays ?? 0, actual.overdueDays ?? 0).match) rowFieldMismatchCounts.overdueDays += 1;
    if (String(expected.status ?? "") !== String(actual.status ?? "")) rowFieldMismatchCounts.status += 1;
  }
  const rowParity = panelScopeV2All && panelScopeV3
    ? {
        countParity: compareNumber(panelScopeV3.rows.length, expectedRows.length),
        totalCountParity: compareNumber(panelScopeV3.pagination.total, panelScopeV2All.pagination.total),
        mismatchCount: Object.values(rowFieldMismatchCounts).reduce((sum, value) => sum + value, 0),
        fieldMismatchCounts: rowFieldMismatchCounts,
      }
    : null;

  const supplierFieldMismatchCounts = {
    supplierId: 0,
    supplierName: 0,
    payable: 0,
    paid: 0,
    debt: 0,
    overpayment: 0,
    overdueAmount: 0,
    criticalAmount: 0,
    invoiceCount: 0,
    debtCount: 0,
    overdueCount: 0,
    criticalCount: 0,
  };
  const expectedSupplierRows = legacyContext.supplierRows.slice(0, panelScopeV3?.supplierRows.length ?? 0);
  for (let index = 0; index < expectedSupplierRows.length; index += 1) {
    const expected = expectedSupplierRows[index];
    const actual = panelScopeV3?.supplierRows[index];
    if (!actual) continue;
    if (String(expected.supplierId) !== String(actual.supplierId)) supplierFieldMismatchCounts.supplierId += 1;
    if (String(expected.supplierName) !== String(actual.supplierName)) supplierFieldMismatchCounts.supplierName += 1;
    if (!compareNumber(expected.payable, actual.payable).match) supplierFieldMismatchCounts.payable += 1;
    if (!compareNumber(expected.paid, actual.paid).match) supplierFieldMismatchCounts.paid += 1;
    if (!compareNumber(expected.debt, actual.debt).match) supplierFieldMismatchCounts.debt += 1;
    if (!compareNumber(expected.overpayment, actual.overpayment).match) supplierFieldMismatchCounts.overpayment += 1;
    if (!compareNumber(expected.overdueAmount, actual.overdueAmount).match) supplierFieldMismatchCounts.overdueAmount += 1;
    if (!compareNumber(expected.criticalAmount, actual.criticalAmount).match) supplierFieldMismatchCounts.criticalAmount += 1;
    if (!compareNumber(expected.invoiceCount, actual.invoiceCount).match) supplierFieldMismatchCounts.invoiceCount += 1;
    if (!compareNumber(expected.debtCount, actual.debtCount).match) supplierFieldMismatchCounts.debtCount += 1;
    if (!compareNumber(expected.overdueCount, actual.overdueCount).match) supplierFieldMismatchCounts.overdueCount += 1;
    if (!compareNumber(expected.criticalCount, actual.criticalCount).match) supplierFieldMismatchCounts.criticalCount += 1;
  }
  const supplierRowsParity = panelScopeV3
    ? {
        countParity: compareNumber(panelScopeV3.supplierRows.length, legacyContext.supplierRows.length),
        mismatchCount: Object.values(supplierFieldMismatchCounts).reduce((sum, value) => sum + value, 0),
        fieldMismatchCounts: supplierFieldMismatchCounts,
        stableIdsPresent:
          panelScopeV3.supplierRows.every((row) => String(row.id ?? "").trim() && String(row.supplierId ?? "").trim()) &&
          new Set(panelScopeV3.supplierRows.map((row) => String(row.id))).size === panelScopeV3.supplierRows.length,
      }
    : null;

  const selectedSupplierName =
    panelScopeV3?.supplierRows[0]?.supplierName ??
    panelScopeV1?.report.suppliers[0]?.supplier ??
    null;
  const supplierExpected: FinSupplierPanelState | null =
    selectedSupplierName
      ? await finance.fetchDirectorFinanceSupplierScopeViaRpc({
          supplier: selectedSupplierName,
          periodFromIso: null,
          periodToIso: null,
          dueDaysDefault: DUE_DAYS_DEFAULT,
          criticalDays: CRITICAL_DAYS,
        })
      : null;
  const supplierScopeV2: FinSupplierPanelState | null =
    selectedSupplierName
      ? await finance.fetchDirectorFinanceSupplierScopeV2ViaRpc({
          supplier: selectedSupplierName,
          periodFromIso: null,
          periodToIso: null,
          dueDaysDefault: DUE_DAYS_DEFAULT,
          criticalDays: CRITICAL_DAYS,
        })
      : null;
  const rawSupplierScopeV2 =
    selectedSupplierName
      ? await supabaseModule.supabase.rpc("director_finance_supplier_scope_v2", {
          p_supplier: selectedSupplierName,
          p_kind_name: null,
          p_object_id: undefined,
          p_from: null,
          p_to: null,
          p_due_days: DUE_DAYS_DEFAULT,
          p_critical_days: CRITICAL_DAYS,
        })
      : null;
  const rawSupplierRecord = asRecord(rawSupplierScopeV2?.data);
  const rawSupplierMeta = asRecord(rawSupplierRecord.meta);
  const rawSupplierSummary = asRecord(rawSupplierRecord.summary);
  const supplierScopeV2Parity =
    supplierScopeV2 && supplierExpected
      ? {
          amount: compareNumber(supplierScopeV2.amount ?? supplierScopeV2.toPay ?? 0, supplierExpected.amount ?? supplierExpected.toPay ?? 0),
          count: compareNumber(supplierScopeV2.count ?? 0, supplierExpected.count ?? 0),
          overdueCount: compareNumber(supplierScopeV2.overdueCount ?? 0, supplierExpected.overdueCount ?? 0),
          criticalCount: compareNumber(supplierScopeV2.criticalCount ?? 0, supplierExpected.criticalCount ?? 0),
          invoiceSet: compareStringSets(
            supplierScopeV2.invoices.map((invoice) => invoiceSignature(invoice)),
            supplierExpected.invoices.map((invoice) => invoiceSignature(invoice)),
          ),
          rawOverpayment: compareNumber(
            rawSupplierRecord.overpayment ?? rawSupplierSummary.overpayment,
            legacyContext.overpayBySupplier[selectedSupplierName ?? ""] ?? 0,
          ),
          rawVersion: String(rawSupplierRecord.version ?? ""),
          rawPayloadShapeVersion: String(rawSupplierMeta.payloadShapeVersion ?? rawSupplierMeta.payload_shape_version ?? ""),
          rpcError: rawSupplierScopeV2?.error ? String(rawSupplierScopeV2.error.message ?? rawSupplierScopeV2.error) : null,
        }
      : null;

  const summaryParityOk = summaryParity ? Object.values(summaryParity).every((entry) => entry.match) : false;
  const spendParityOk = spendParity ? Object.values(spendParity).every((entry) => entry.match) : false;
  const rowParityOk =
    rowParity != null &&
    rowParity.countParity.match &&
    rowParity.totalCountParity.match &&
    rowParity.mismatchCount === 0;
  const supplierRowsParityOk =
    supplierRowsParity != null &&
    supplierRowsParity.countParity.match &&
    supplierRowsParity.mismatchCount === 0 &&
    supplierRowsParity.stableIdsPresent;
  const supplierScopeV2ParityOk =
    supplierScopeV2Parity != null &&
    supplierScopeV2Parity.amount.match &&
    supplierScopeV2Parity.count.match &&
    supplierScopeV2Parity.overdueCount.match &&
    supplierScopeV2Parity.criticalCount.match &&
    supplierScopeV2Parity.invoiceSet.match &&
    supplierScopeV2Parity.rawOverpayment.match &&
    supplierScopeV2Parity.rawVersion === "v2" &&
    supplierScopeV2Parity.rawPayloadShapeVersion === "v2" &&
    !supplierScopeV2Parity.rpcError;
  const debtParityOk =
    !!summaryParity?.totalDebt.match &&
    !!summaryParity?.debtCount.match &&
    supplierRowsParity != null &&
    supplierRowsParity.fieldMismatchCounts.debt === 0 &&
    supplierRowsParity.fieldMismatchCounts.debtCount === 0;
  const overpaymentParityOk =
    !!summaryParity?.totalOverpayment.match &&
    supplierRowsParity != null &&
    supplierRowsParity.fieldMismatchCounts.overpayment === 0 &&
    !!supplierScopeV2Parity?.rawOverpayment.match;
  const overdueParityOk =
    !!summaryParity?.overdueAmount.match &&
    !!summaryParity?.overdueCount.match &&
    supplierRowsParity != null &&
    supplierRowsParity.fieldMismatchCounts.overdueAmount === 0 &&
    supplierRowsParity.fieldMismatchCounts.overdueCount === 0;
  const criticalParityOk =
    !!summaryParity?.criticalAmount.match &&
    !!summaryParity?.criticalCount.match &&
    supplierRowsParity != null &&
    supplierRowsParity.fieldMismatchCounts.criticalAmount === 0 &&
    supplierRowsParity.fieldMismatchCounts.criticalCount === 0;

  const tscPassed = tscRun.status === 0;
  const eslintPassed = eslintRun.status === 0;
  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const iosResidual =
    typeof runtimeSummary?.iosResidual === "string" && runtimeSummary.iosResidual.trim()
      ? runtimeSummary.iosResidual.trim()
      : null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const primaryOwner = scope.cutoverMeta.primaryOwner;
  const contractVersion = scope.cutoverMeta.contractVersion;
  const fallbackUsed =
    primaryOwner !== "rpc_v3" || scope.supportRowsLoaded || scope.cutoverMeta.summaryCompatibilityOverlay;
  const clientOwnedFinanceTruthRemoved =
    primaryOwner === "rpc_v3" &&
    contractVersion === "v3" &&
    scope.supportRowsLoaded === false &&
    scope.cutoverMeta.summaryCompatibilityOverlay === false &&
    panelScopeV3?.meta.owner === "backend" &&
    panelScopeV3?.meta.payloadShapeVersion === "v3";
  const contractShapeOk =
    !!panelScopeV3 &&
    panelScopeV3.meta.owner === "backend" &&
    panelScopeV3.meta.payloadShapeVersion === "v3" &&
    panelScopeV3.meta.sourceVersion === "director_finance_panel_scope_v3" &&
    typeof panelScopeV3.meta.generatedAt === "string" &&
    panelScopeV3.meta.generatedAt.includes("T");
  const pdfSourceAcceptable =
    pdfSource.source !== "legacy:director_finance_ui_payload" &&
    pdfSource.source !== "legacy:listAccountantInbox";
  const serviceTypeHardCutOk =
    !/client_fallback/.test(financeScopeServiceSource) &&
    !/compatibility_fallback/.test(financeScopeServiceSource) &&
    !/rpc_panel_scope_v2/.test(financeScopeServiceSource) &&
    !/rpc_panel_scope_v1/.test(financeScopeServiceSource) &&
    !/rpc_summary_v1_overlay/.test(financeScopeServiceSource) &&
    !/client_compute/.test(financeScopeServiceSource) &&
    !/primaryOwner:\s*"rpc_v3"\s*\|/.test(financeScopeServiceSource) &&
    !/contractVersion:\s*"v3"\s*\|/.test(financeScopeServiceSource) &&
    !/panelScope:\s*"rpc_v3"\s*\|/.test(financeScopeServiceSource);
  const primaryScopeHardCutOk =
    !/fetchDirectorFinancePanelScopeV2ViaRpc\s*\(/.test(financeScopeServiceSource) &&
    !/fetchDirectorFinancePanelScopeViaRpc\s*\(/.test(financeScopeServiceSource) &&
    !/fetchDirectorFinanceSummaryViaRpc\s*\(/.test(financeScopeServiceSource);
  const supplierScopeHardCutOk =
    !/fetchDirectorFinanceSupplierScopeViaRpc\s*\(/.test(financePanelSource) &&
    !/computeFinanceSupplierPanel\s*\(/.test(financePanelSource);

  const status =
    tscPassed &&
    eslintPassed &&
    runtimeRun.status === 0 &&
    runtimeGateOk &&
    primaryOwner === "rpc_v3" &&
    contractVersion === "v3" &&
    fallbackUsed === false &&
    clientOwnedFinanceTruthRemoved &&
    contractShapeOk &&
    summaryParityOk &&
    spendParityOk &&
    rowParityOk &&
    supplierRowsParityOk &&
    supplierScopeV2ParityOk &&
    debtParityOk &&
    overpaymentParityOk &&
    overdueParityOk &&
    criticalParityOk &&
    serviceTypeHardCutOk &&
    primaryScopeHardCutOk &&
    supplierScopeHardCutOk &&
    pdfSourceAcceptable
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    primaryOwner,
    contractVersion,
    fallbackUsed,
    supportRowsLoaded: scope.supportRowsLoaded,
    supportRowsReason: scope.cutoverMeta.supportRowsReason,
    backendFirstPrimary: scope.cutoverMeta.backendFirstPrimary,
    summaryCompatibilityOverlay: scope.cutoverMeta.summaryCompatibilityOverlay,
    sourceMeta: scope.sourceMeta,
    cutoverMeta: scope.cutoverMeta,
    issues: scope.issues.map((issue) => ({
      scope: issue.scope,
      error: issue.error instanceof Error ? issue.error.message : String(issue.error ?? ""),
    })),
    staticChecks: {
      tscPassed,
      eslintPassed,
      tscRun: {
        status: tscRun.status,
        stdout: tscRun.stdout,
        stderr: tscRun.stderr,
      },
      eslintRun: {
        status: eslintRun.status,
        stdout: eslintRun.stdout,
        stderr: eslintRun.stderr,
      },
    },
    runtime: {
      reusedExistingSummary: shouldReuseRuntimeSummary,
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeGateOk,
      runtimeRun: {
        status: runtimeRun.status,
        stdout: runtimeRun.stdout,
        stderr: runtimeRun.stderr,
      },
      runtimeSummary,
    },
    panelScopeV1: panelScopeV1
      ? {
          suppliers: panelScopeV1.report.suppliers.length,
          spendKinds: panelScopeV1.spend.kindRows.length,
        }
      : null,
    panelScopeV2: panelScopeV2All
      ? {
          rows: panelScopeV2All.rows.length,
          pagination: panelScopeV2All.pagination,
        }
      : null,
    panelScopeV3: panelScopeV3
      ? {
          rows: panelScopeV3.rows.length,
          pagination: panelScopeV3.pagination,
          supplierRows: panelScopeV3.supplierRows.length,
          meta: panelScopeV3.meta,
        }
      : null,
    summaryParity,
    spendParity,
    rowParity,
    supplierRowsParity,
    supplierScopeV2Parity,
    debtParityOk,
    overpaymentParityOk,
    overdueParityOk,
    criticalParityOk,
    clientOwnedFinanceTruthRemoved,
    contractShapeOk,
    serviceTypeHardCutOk,
    primaryScopeHardCutOk,
    supplierScopeHardCutOk,
    pdfSource: {
      source: pdfSource.source,
      sourceBranch: pdfSource.branchMeta.sourceBranch,
      fallbackReason: pdfSource.branchMeta.fallbackReason ?? null,
      financeRows: pdfSource.financeRows.length,
      spendRows: pdfSource.spendRows.length,
      acceptable: pdfSourceAcceptable,
    },
    selectedSupplier: selectedSupplierName,
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    primaryOwner: artifact.primaryOwner,
    contractVersion: artifact.contractVersion,
    fallbackUsed: artifact.fallbackUsed,
    supportRowsLoaded: artifact.supportRowsLoaded,
    backendFirstPrimary: artifact.backendFirstPrimary,
    clientOwnedFinanceTruthRemoved: artifact.clientOwnedFinanceTruthRemoved,
    contractShapeOk: artifact.contractShapeOk,
    serviceTypeHardCutOk: artifact.serviceTypeHardCutOk,
    primaryScopeHardCutOk: artifact.primaryScopeHardCutOk,
    supplierScopeHardCutOk: artifact.supplierScopeHardCutOk,
    summaryParityOk,
    spendParityOk,
    rowParityOk,
    supplierRowsParityOk,
    supplierScopeV2ParityOk,
    debtParityOk,
    overpaymentParityOk,
    overdueParityOk,
    criticalParityOk,
    pdfSource: artifact.pdfSource,
    tscPassed,
    eslintPassed,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
    runtimeSummaryReused: shouldReuseRuntimeSummary,
    runtimeGateOk,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
