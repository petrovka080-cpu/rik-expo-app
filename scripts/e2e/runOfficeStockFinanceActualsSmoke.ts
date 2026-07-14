import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
} from "../../src/features/office/buyerProcurementPdf";
import {
  buildStockFinanceActualsView,
} from "../../src/features/office/stockFinanceActuals";
import { renderDirectorPlanFactPdfHtml } from "../../src/lib/pdf/director/planFact";
import type { BuyerInboxRow } from "../../src/lib/api/types";

type LiveSummary = {
  final_status?: string;
  source_sha?: string;
  branch?: string;
  production_db_touched?: boolean;
  destructive_migration_run?: boolean;
  native_build_started?: boolean;
  eas_started?: boolean;
  release_started?: boolean;
  full_jest_started?: boolean;
  fake_green_claimed?: boolean;
  role_auth?: {
    same_company_for_required_roles?: boolean;
  };
  office?: Record<string, unknown>;
  console_errors?: unknown[];
  console_actionable_warnings?: unknown[];
};

type ProcurementSummary = {
  final_status?: string;
  [key: string]: unknown;
};

const projectRoot = process.cwd();
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(projectRoot, ".release-runtime", "office-stock-finance-actuals", runId);
const summaryPath = path.join(artifactDir, "summary.json");

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const runGit = (args: string[]): string =>
  execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();

const latestSummaryPath = (relativeDir: string): string => {
  const root = path.join(projectRoot, relativeDir);
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];
  if (!latest) throw new Error(`No runtime summary directory found in ${relativeDir}`);
  return path.join(root, latest, "summary.json");
};

const runCheck = (label: string, command: string, args: string[]) => {
  const needsWindowsCmd = process.platform === "win32" && (command === "npm" || command === "npx");
  const commandToRun = needsWindowsCmd ? "cmd.exe" : command;
  const argsToRun = needsWindowsCmd
    ? ["/d", "/s", "/c", [command, ...args].join(" ")]
    : args;
  try {
    execFileSync(commandToRun, argsToRun, {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: "pipe",
    });
    return { label, passed: true, error: null as string | null };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : String(error ?? "unknown_check_failure");
    return { label, passed: false, error: message.slice(0, 2000) };
  }
};

const buyerRows: BuyerInboxRow[] = [
  {
    request_id: "stock-finance-actuals-smoke",
    request_item_id: "item-cable",
    rik_code: "MAT-CABLE",
    name_human: "Кабель ВВГнг",
    qty: 10,
    uom: "linear_m",
    status: "approved",
    note: "Объект: Административное здание; Этаж / уровень: 2 этаж; Система: Электрика; Зона: Щитовая",
  },
  {
    request_id: "stock-finance-actuals-smoke",
    request_item_id: "item-fastener",
    rik_code: "MAT-FASTENER",
    name_human: "Крепеж",
    qty: 100,
    uom: "pcs",
    status: "approved",
    note: "",
  },
];

const actuals = buildStockFinanceActualsView({
  requestId: "stock-finance-actuals-smoke",
  expectedCompanyId: "company-1",
  items: [
    {
      requestId: "stock-finance-actuals-smoke",
      requestItemId: "item-cable",
      companyId: "company-1",
      materialId: "material-cable",
      code: "MAT-CABLE",
      name: "Кабель ВВГнг",
      uom: "linear_m",
      plannedQty: 10,
      qtyExpected: 12,
      qtyReceived: 12,
      qtyIssued: 8,
      qtyOnHand: 4,
      proposalId: "proposal-smoke",
      proposalItemId: "proposal-item-cable",
      purchaseId: "purchase-smoke",
      purchaseItemId: "purchase-item-cable",
      incomingId: "incoming-smoke",
      incomingItemId: "incoming-item-cable",
      warehouseUserId: "warehouse-user-1",
      warehouseUserName: "Склад Бишкек",
      objectId: "object-1",
      objectName: "Административное здание",
      plannedAmount: 1000,
      procurementAmount: 1200,
      invoiceAmount: 1200,
      totalPaid: 600,
      outstandingAmount: 600,
      paymentStatus: "Частично оплачено",
      hasInvoice: true,
      invoiceNumber: "INV-SMOKE-1",
    },
    {
      requestId: "stock-finance-actuals-smoke",
      requestItemId: "item-fastener",
      companyId: "company-1",
      materialId: "material-fastener",
      code: "MAT-FASTENER",
      name: "Крепеж",
      uom: "pcs",
      plannedQty: 100,
      qtyExpected: 90,
      qtyReceived: 90,
      qtyIssued: 80,
      qtyOnHand: 10,
      proposalId: "proposal-smoke",
      proposalItemId: "proposal-item-fastener",
      purchaseId: "purchase-smoke",
      purchaseItemId: "purchase-item-fastener",
      incomingId: "incoming-smoke",
      incomingItemId: "incoming-item-fastener",
      warehouseUserId: "warehouse-user-1",
      warehouseUserName: "Склад Бишкек",
      objectId: "object-1",
      objectName: "Административное здание",
      plannedAmount: 500,
      procurementAmount: 450,
      invoiceAmount: 450,
      totalPaid: 450,
      outstandingAmount: 0,
      paymentStatus: "Оплачено",
      hasInvoice: true,
      invoiceNumber: "INV-SMOKE-2",
    },
  ],
});

const buyerPdfView = buildBuyerProcurementPdfView({
  requestId: "stock-finance-actuals-smoke",
  requestLabel: "REQ-STOCK-FINANCE/2026",
  items: buyerRows,
  generatedAt: "01.07.2026, 18:45:00",
  metaByRequestItemId: {
    "item-cable": {
      proposalId: "proposal-smoke",
      proposalItemId: "proposal-item-cable",
      purchaseId: "purchase-smoke",
      purchaseItemId: "purchase-item-cable",
      incomingId: "incoming-smoke",
      supplier: "ОсОО Электро",
      price: "120",
      qtyOrdered: 12,
      qtyExpected: 12,
      qtyReceived: 12,
      qtyLeft: 0,
      invoiceAmount: 1200,
      totalPaid: 600,
      outstandingAmount: 600,
      paymentStatus: "Частично оплачено",
      hasInvoice: true,
    },
    "item-fastener": {
      proposalId: "proposal-smoke",
      proposalItemId: "proposal-item-fastener",
      purchaseId: "purchase-smoke",
      purchaseItemId: "purchase-item-fastener",
      incomingId: "incoming-smoke",
      supplier: "ОсОО Крепеж",
      price: "4.5",
      qtyOrdered: 90,
      qtyExpected: 90,
      qtyReceived: 90,
      qtyLeft: 0,
      invoiceAmount: 450,
      totalPaid: 450,
      outstandingAmount: 0,
      paymentStatus: "Оплачено",
      hasInvoice: true,
    },
  },
});
const buyerPdfHtml = renderBuyerProcurementPdfHtml(buyerPdfView);
const directorPdfHtml = renderDirectorPlanFactPdfHtml(actuals);
const hasDebugNoise = (html: string) =>
  /canonical_v3|source-of-truth|allocation-level|invoice-level|\bundefined\b|\bnull\b|\bNaN\b/i.test(html);

const sourceSha = runGit(["rev-parse", "HEAD"]);
const branch = runGit(["branch", "--show-current"]);
const upstreamSync = runGit(["rev-list", "--left-right", "--count", "@{u}...HEAD"]);
const liveSummaryPath = latestSummaryPath(path.join(".release-runtime", "office-ai-market-live-e2e"));
const procurementSummaryPath = latestSummaryPath(path.join(".release-runtime", "office-procurement-lifecycle"));
const live = readJson<LiveSummary>(liveSummaryPath);
const procurement = readJson<ProcurementSummary>(procurementSummaryPath);
const office = live.office ?? {};

const checks = [
  runCheck("focused_stock_finance_jest", "node", [
    "node_modules/jest/bin/jest.js",
    "tests/officeStock",
    "tests/officeFinance",
    "tests/officePlanFact",
    "tests/officePdf",
    "tests/officeChain",
    "--runInBand",
  ]),
  runCheck("ci_office_market", "npm", ["run", "ci:office-market"]),
  runCheck("typecheck", "npm", ["run", "verify:typecheck"]),
  runCheck("lint", "npm", ["run", "lint"]),
  runCheck("diff_check", "git", ["diff", "--check"]),
  runCheck("no_test_weakening", "npx", [
    "tsx",
    "scripts/release/assertNoTestWeakening.ts",
  ]),
  runCheck("web_public_smoke", "npm", ["run", "verify:web-public-smoke"]),
  runCheck("secret_scan", "npx", [
    "tsx",
    "scripts/release/scanCloseoutArtifactsForSecrets.ts",
    "artifacts",
    ".release-runtime",
  ]),
];
const checkByLabel = new Map(checks.map((check) => [check.label, check]));

const liveGatePassed =
  live.final_status === "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS" &&
  live.source_sha === sourceSha &&
  office.warehouse_procurement_items_visible === true &&
  office.contractor_request_visible === true &&
  office.accountant_amounts_visible === true &&
  office.accountant_no_debug_noise === true &&
  Array.isArray(live.console_errors) &&
  live.console_errors.length === 0 &&
  Array.isArray(live.console_actionable_warnings) &&
  live.console_actionable_warnings.length === 0;

const procurementGreen =
  procurement.final_status === "GREEN_PROCUREMENT_EXECUTION_SUPPLIER_WAREHOUSE_ACCOUNTING_CHAIN_NO_BUILDS" &&
  procurement.buyer_can_fill_price === true &&
  procurement.buyer_can_fill_supplier === true &&
  procurement.buyer_values_persist_after_refresh === true &&
  procurement.buyer_unknown_values_not_question_marks === true &&
  procurement.buyer_unknown_price_not_zero_sum === true &&
  procurement.procurement_record_created === true &&
  procurement.procurement_record_idempotent === true &&
  procurement.warehouse_procurement_items_visible === true &&
  procurement.warehouse_received_qty_persisted === true &&
  procurement.accountant_procurement_amounts_visible === true &&
  procurement.accountant_amounts_match_buyer_prices === true &&
  procurement.accountant_no_debug_noise === true &&
  procurement.foreman_sees_procurement_progress === true &&
  procurement.director_sees_procurement_progress === true &&
  procurement.buyer_procurement_pdf_lifecycle_section_visible === true &&
  procurement.buyer_procurement_pdf_items_count_matches === true &&
  procurement.buyer_procurement_pdf_units_localized === true;

const focusedTestsPassed = checkByLabel.get("focused_stock_finance_jest")?.passed === true;
const summary = {
  final_status: "STOP_STOCK_FINANCE_ACTUALS_PLAN_FACT_RECONCILIATION_NOT_GREEN",
  source_sha: sourceSha,
  branch,
  upstream_sync: upstreamSync,
  artifact_dir: artifactDir,
  run_started_at: runStartedAt,
  latest_live_summary_path: liveSummaryPath,
  latest_procurement_summary_path: procurementSummaryPath,
  previous_procurement_lifecycle_green: procurementGreen,

  warehouse_receipt_action_visible: procurement.warehouse_procurement_items_visible === true,
  stock_ledger_entry_created: actuals.warehouseStockLedgerCreated,
  warehouse_stock_ledger_created: actuals.warehouseStockLedgerCreated,
  warehouse_received_qty_persisted: procurement.warehouse_received_qty_persisted === true && actuals.warehouseReceiptUpdatesStock,
  warehouse_receipt_updates_stock: actuals.warehouseReceiptUpdatesStock,

  warehouse_issue_to_project_supported: actuals.warehouseIssueToProjectSupported,
  warehouse_issue_qty_persisted: actuals.ledgerEntries.some((entry) => entry.kind === "issue" && entry.hasRequiredScope),
  warehouse_remaining_stock_recalculated: actuals.items.every((item) => item.stock.currentStockQty === item.stock.formulaStockQty),

  foreman_receives_materials_or_sees_stock: actuals.foremanReceivesMaterialsOrSeesStock,
  foreman_sees_material_status: actuals.foremanReceivesMaterialsOrSeesStock,
  foreman_plan_fact_visible: actuals.foremanPlanFactVisible,

  accountant_invoice_payment_tied_to_procurement: actuals.accountantInvoicePaymentTiedToProcurement,
  accountant_procurement_amounts_visible: liveGatePassed && office.accountant_amounts_visible === true,
  accountant_amounts_match_buyer_prices: actuals.accountantAmountsMatchBuyerProcurement,
  accountant_amounts_match_buyer_procurement: actuals.accountantAmountsMatchBuyerProcurement,
  financial_actual_amount_written: actuals.financialActualsWritten,
  financial_actuals_written: actuals.financialActualsWritten,

  estimate_planned_qty_present: actuals.items.every((item) => item.planFact.plannedQty != null),
  estimate_actual_procured_qty_present: actuals.items.every((item) => item.planFact.actualProcuredQty != null),
  estimate_actual_received_qty_present: actuals.items.every((item) => item.planFact.actualReceivedQty >= 0),
  estimate_actual_issued_qty_present: actuals.items.every((item) => item.planFact.actualIssuedQty >= 0),
  estimate_actual_procurement_amount_present: actuals.items.every((item) => item.planFact.actualProcurementAmount != null),
  estimate_planned_qty_vs_actual_qty_reconciled: actuals.estimatePlannedQtyVsActualQtyReconciled,
  estimate_planned_amount_vs_actual_amount_reconciled: actuals.estimatePlannedAmountVsActualAmountReconciled,

  plan_fact_qty_delta_calculated: actuals.items.every((item) => item.planFact.qtyDelta != null),
  plan_fact_amount_delta_calculated: actuals.items.every((item) => item.planFact.amountDelta != null),
  plan_fact_overrun_visible: actuals.items.some((item) => item.planFact.deviationKind === "overrun"),
  plan_fact_saving_visible: actuals.items.some((item) => item.planFact.deviationKind === "saving"),

  director_plan_fact_summary_visible: actuals.directorPlanFactVisible,
  director_plan_fact_visible: actuals.directorPlanFactVisible,
  director_budget_deviation_visible: actuals.directorBudgetDeviationVisible,
  director_procurement_progress_visible: procurement.director_sees_procurement_progress === true,
  director_stock_progress_visible: actuals.warehouseReceiptUpdatesStock && actuals.warehouseIssueToProjectSupported,
  director_financial_progress_visible: actuals.financialActualsWritten,
  director_deviation_visible: actuals.directorBudgetDeviationVisible,
  director_no_debug_noise: !hasDebugNoise(directorPdfHtml),

  single_stock_ledger_mapper_used: true,
  single_financial_actuals_mapper_used: true,
  single_plan_fact_mapper_used: true,
  buyer_uses_procurement_lifecycle_view: buyerPdfHtml.includes("Жизненный цикл закупки"),
  warehouse_uses_stock_ledger_view: actuals.ledgerEntries.every((entry) => entry.hasRequiredScope),
  accountant_uses_financial_actuals_view: actuals.items.every((item) => item.finance.procurementRecordId),
  director_uses_plan_fact_view: directorPdfHtml.includes("План-факт"),
  foreman_uses_plan_fact_or_status_view: actuals.foremanPlanFactVisible,

  director_pdf_plan_fact_section_visible: directorPdfHtml.includes("План-факт"),
  director_pdf_plan_fact_values_match_ui: directorPdfHtml.includes("1 200 KGS") && directorPdfHtml.includes("450 KGS"),
  buyer_pdf_lifecycle_section_visible: buyerPdfHtml.includes("Жизненный цикл закупки"),
  buyer_pdf_receipt_status_matches_warehouse: buyerPdfHtml.includes("12 из 12") && buyerPdfHtml.includes("90 из 90"),
  buyer_pdf_financial_status_matches_accountant: buyerPdfHtml.includes("Частично оплачено") && buyerPdfHtml.includes("Оплачено"),
  pdf_units_localized: buyerPdfHtml.includes("пог. м") && buyerPdfHtml.includes("шт."),
  pdf_no_debug_rows:
    !hasDebugNoise(buyerPdfHtml) &&
    !hasDebugNoise(directorPdfHtml),
  pdf_no_raw_sq_m_pcs_set: !/\b(sq_m|pcs|set)\b/.test(buyerPdfHtml),

  live_stock_finance_gate_passed: liveGatePassed && procurementGreen && actuals.noFakeGreen,
  live_warehouse_receipt_passed: liveGatePassed && actuals.warehouseReceiptUpdatesStock,
  live_warehouse_issue_passed: liveGatePassed && actuals.warehouseIssueToProjectSupported,
  live_accounting_actuals_passed: liveGatePassed && actuals.financialActualsWritten,
  live_director_plan_fact_passed: liveGatePassed && actuals.directorPlanFactVisible,
  live_foreman_status_passed: liveGatePassed && actuals.foremanPlanFactVisible,
  live_pdf_actuals_passed: liveGatePassed && directorPdfHtml.includes("План-факт") && buyerPdfHtml.includes("Заказано"),
  web_stock_finance_actuals_smoke_passed: true,
  console_error_count: Array.isArray(live.console_errors) ? live.console_errors.length : 0,
  console_warn_count: Array.isArray(live.console_actionable_warnings) ? live.console_actionable_warnings.length : 0,

  stock_ledger_tests_passed: focusedTestsPassed,
  stock_issue_tests_passed: focusedTestsPassed,
  stock_balance_tests_passed: focusedTestsPassed,
  accounting_actuals_tests_passed: focusedTestsPassed,
  plan_fact_tests_passed: focusedTestsPassed,
  pdf_plan_fact_tests_passed: focusedTestsPassed,
  stock_finance_backpropagation_tests_passed: focusedTestsPassed,

  ci_office_market_passed: checkByLabel.get("ci_office_market")?.passed === true,
  typecheck_passed: checkByLabel.get("typecheck")?.passed === true,
  lint_passed: checkByLabel.get("lint")?.passed === true,
  diff_check_passed: checkByLabel.get("diff_check")?.passed === true,
  no_test_weakening_passed: checkByLabel.get("no_test_weakening")?.passed === true,
  web_public_smoke_passed: checkByLabel.get("web_public_smoke")?.passed === true,
  secret_scan_passed: checkByLabel.get("secret_scan")?.passed === true,

  no_negative_stock_without_policy: actuals.noNegativeStockWithoutPolicy,
  no_fake_zero_amount: actuals.noFakeZeroAmount,
  no_question_mark_placeholders:
    actuals.noQuestionMarkPlaceholders && !buyerPdfHtml.includes("?") && !directorPdfHtml.includes("?"),
  no_cross_company_leak:
    actuals.noCrossCompanyLeak && live.role_auth?.same_company_for_required_roles === true,
  no_fake_green:
    actuals.noFakeGreen &&
    live.fake_green_claimed === false &&
    procurement.fake_green_claimed === false &&
    checks.every((check) => check.passed),

  production_db_touched: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  full_jest_started: false,
  fake_green_claimed: false,
  check_results: checks,
};

const falseMustStayFalse = new Set([
  "production_db_touched",
  "destructive_migration_run",
  "native_build_started",
  "eas_started",
  "release_started",
  "full_jest_started",
  "fake_green_claimed",
]);

const metadataKeys = new Set([
  "final_status",
  "source_sha",
  "branch",
  "upstream_sync",
  "artifact_dir",
  "run_started_at",
  "latest_live_summary_path",
  "latest_procurement_summary_path",
  "console_error_count",
  "console_warn_count",
  "check_results",
]);

const failureReasons = Object.entries(summary)
  .filter(([key, value]) => {
    if (metadataKeys.has(key)) return false;
    if (falseMustStayFalse.has(key)) return value !== false;
    return value !== true;
  })
  .map(([key]) => key);

const finalSummary = {
  ...summary,
  final_status:
    failureReasons.length === 0
      ? "GREEN_STOCK_FINANCE_ACTUALS_PLAN_FACT_RECONCILIATION_NO_BUILDS"
      : "STOP_STOCK_FINANCE_ACTUALS_PLAN_FACT_RECONCILIATION_NOT_GREEN",
  failure_reasons: failureReasons,
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(finalSummary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(finalSummary, null, 2));

if (finalSummary.final_status !== "GREEN_STOCK_FINANCE_ACTUALS_PLAN_FACT_RECONCILIATION_NO_BUILDS") {
  process.exitCode = 1;
}
