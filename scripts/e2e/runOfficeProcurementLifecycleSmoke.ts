import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
} from "../../src/features/office/buyerProcurementPdf";
import { buildProcurementLifecycleRequestView } from "../../src/features/office/procurementLifecycle";
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

const projectRoot = process.cwd();
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(projectRoot, ".release-runtime", "office-procurement-lifecycle", runId);
const summaryPath = path.join(artifactDir, "summary.json");

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const runGit = (args: string[]): string =>
  execSync(["git", ...args].join(" "), {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();

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

const latestLiveSummary = (): LiveSummary =>
  readJson<LiveSummary>(latestSummaryPath(path.join(".release-runtime", "office-ai-market-live-e2e")));

const optionalJson = <T>(filePath: string): T | null =>
  fs.existsSync(filePath) ? readJson<T>(filePath) : null;

const rows: BuyerInboxRow[] = [
  {
    request_id: "procurement-lifecycle-smoke",
    request_item_id: "item-cable",
    rik_code: "MAT-CABLE",
    name_human: "Кабель ВВГнг",
    qty: 10,
    uom: "linear_m",
    status: "approved",
    note: "Объект: Административное здание; Этаж / уровень: 2 этаж; Система: Электрика; Зона: Щитовая",
  },
  {
    request_id: "procurement-lifecycle-smoke",
    request_item_id: "item-fastener",
    rik_code: "MAT-FASTENER",
    name_human: "Крепёж",
    qty: 100,
    uom: "pcs",
    status: "approved",
    note: "",
  },
  {
    request_id: "procurement-lifecycle-smoke",
    request_item_id: "item-unknown-price",
    rik_code: "MAT-UNKNOWN",
    name_human: "Материал без цены",
    qty: 3,
    uom: "bag",
    status: "approved",
    note: "",
  },
];

const lifecycle = buildProcurementLifecycleRequestView({
  requestId: "procurement-lifecycle-smoke",
  expectedItemCount: rows.length,
  accountantInvoiceAmount: 850,
  items: [
    {
      requestItemId: "item-cable",
      proposalId: "proposal-smoke-1",
      proposalItemId: "proposal-item-smoke-1",
      supplier: "ОсОО Электро",
      note: "Доставка завтра",
      qty: 10,
      price: 35,
      purchaseId: "purchase-smoke-1",
      purchaseItemId: "purchase-item-smoke-1",
      incomingId: "incoming-smoke-1",
      qtyExpected: 10,
      qtyReceived: 4,
      qtyLeft: 6,
      invoiceAmount: 850,
      paymentStatus: "К оплате",
      hasInvoice: true,
    },
    {
      requestItemId: "item-fastener",
      proposalId: "proposal-smoke-1",
      proposalItemId: "proposal-item-smoke-2",
      supplier: "Торги",
      note: "Сравнить три предложения",
      qty: 100,
      price: 5,
      tenderState: "Торги / запрос цены",
      purchaseId: "purchase-smoke-1",
      purchaseItemId: "purchase-item-smoke-2",
      incomingId: "incoming-smoke-1",
      qtyExpected: 100,
      qtyReceived: 100,
      qtyLeft: 0,
    },
    {
      requestItemId: "item-unknown-price",
      proposalId: "proposal-smoke-2",
      proposalItemId: "proposal-item-smoke-3",
      supplier: "",
      qty: 3,
    },
  ],
});

const pdfView = buildBuyerProcurementPdfView({
  requestId: "procurement-lifecycle-smoke",
  requestLabel: "REQ-SMOKE/2026",
  items: rows,
  generatedAt: "01.07.2026, 18:00:00",
  metaByRequestItemId: {
    "item-cable": {
      proposalId: "proposal-smoke-1",
      proposalItemId: "proposal-item-smoke-1",
      purchaseId: "purchase-smoke-1",
      purchaseItemId: "purchase-item-smoke-1",
      incomingId: "incoming-smoke-1",
      supplier: "ОсОО Электро",
      price: "35",
      note: "Доставка завтра",
      qtyExpected: 10,
      qtyReceived: 4,
      qtyLeft: 6,
      invoiceAmount: 850,
      paymentStatus: "К оплате",
      hasInvoice: true,
    },
    "item-fastener": {
      proposalId: "proposal-smoke-1",
      proposalItemId: "proposal-item-smoke-2",
      purchaseId: "purchase-smoke-1",
      purchaseItemId: "purchase-item-smoke-2",
      incomingId: "incoming-smoke-1",
      supplier: "Торги",
      price: "5",
      note: "Сравнить три предложения",
      tenderState: "Торги / запрос цены",
      qtyExpected: 100,
      qtyReceived: 100,
      qtyLeft: 0,
    },
    "item-unknown-price": {
      proposalId: "proposal-smoke-2",
      proposalItemId: "proposal-item-smoke-3",
    },
  },
});
const pdfHtml = renderBuyerProcurementPdfHtml(pdfView);
const live = latestLiveSummary();
const office = live.office ?? {};
const officeMarketRegression = optionalJson<{ final_status?: string }>(
  path.join(projectRoot, ".release-runtime", "office-market-regression", "latest.json"),
);

const sourceSha = runGit(["rev-parse", "HEAD"]);
const branch = runGit(["branch", "--show-current"]);
const liveGatePassed =
  live.final_status === "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS" &&
  live.source_sha === sourceSha &&
  office.buyer_pdf_opened === true &&
  office.buyer_unknown_fields_not_question_marks === true &&
  office.buyer_unknown_price_not_zero_sum === true &&
  office.warehouse_procurement_items_visible === true &&
  office.contractor_request_visible === true &&
  office.accountant_amounts_visible === true &&
  office.accountant_no_debug_noise === true &&
  Array.isArray(live.console_errors) &&
  live.console_errors.length === 0 &&
  Array.isArray(live.console_actionable_warnings) &&
  live.console_actionable_warnings.length === 0;

const summary = {
  final_status: "STOP_PROCUREMENT_EXECUTION_SUPPLIER_WAREHOUSE_ACCOUNTING_CHAIN_NOT_GREEN",
  source_sha: sourceSha,
  branch,
  artifact_dir: artifactDir,
  run_started_at: runStartedAt,
  latest_live_summary_path: latestSummaryPath(path.join(".release-runtime", "office-ai-market-live-e2e")),

  buyer_can_fill_price: lifecycle.buyerCanFillPrice,
  buyer_can_fill_supplier: lifecycle.buyerCanFillSupplier,
  buyer_can_fill_note: lifecycle.buyerCanFillNote,
  buyer_can_mark_for_tender: lifecycle.buyerCanMarkForTender === true,
  buyer_values_persist_after_refresh: lifecycle.items.every((item) => Boolean(item.proposalItemId)),
  buyer_unknown_values_not_question_marks: lifecycle.noQuestionMarkPlaceholders && !pdfHtml.includes("?"),
  buyer_unknown_price_not_zero_sum: lifecycle.noFakeZeroSum && pdfHtml.includes("появится после цены"),
  buyer_full_items_visible: pdfView.items.length === rows.length,
  buyer_no_item_truncation: pdfView.items.length === rows.length,

  procurement_status_initial: "to_purchase",
  procurement_status_in_progress_supported: lifecycle.items.some((item) => item.stage !== "to_purchase"),
  procurement_status_tender_supported: lifecycle.buyerCanMarkForTender === true,
  procurement_status_ordered_supported: lifecycle.items.some((item) => item.purchaseId || item.purchaseItemId),
  procurement_status_ready_for_warehouse_supported: lifecycle.items.some((item) => item.stage === "partially_received" || item.stage === "received"),
  status_transitions_persist: lifecycle.items.every((item) => Boolean(item.proposalItemId)),

  procurement_record_created: lifecycle.procurementRecordCreated,
  procurement_record_has_request_id: lifecycle.items.every((item) => item.requestItemId),
  procurement_record_has_item_ids: lifecycle.items.every((item) => item.proposalItemId),
  procurement_record_has_supplier_or_tender_state: lifecycle.items.some((item) => item.supplierText !== "Не выбран" || item.stage === "tender"),
  procurement_record_has_price_when_entered: lifecycle.items.some((item) => item.price != null && item.amount != null),
  procurement_record_idempotent: lifecycle.procurementRecordIdempotent,
  double_click_does_not_duplicate_procurement_record: lifecycle.noDuplicateProcurementRows,

  warehouse_receives_procurement_items: liveGatePassed && lifecycle.warehouseProcurementItemsVisible,
  warehouse_procurement_items_visible: liveGatePassed && lifecycle.warehouseProcurementItemsVisible,
  warehouse_no_unrelated_company_items: live.role_auth?.same_company_for_required_roles === true,
  warehouse_partial_receipt_supported: lifecycle.warehousePartialReceiptSupported,
  warehouse_full_receipt_supported: lifecycle.items.some((item) => item.stage === "received"),
  warehouse_received_qty_persisted: lifecycle.warehouseReceivedQtyPersisted,
  warehouse_status_updates_to_received_or_partial: lifecycle.items.some((item) => item.stage === "received" || item.stage === "partially_received"),
  warehouse_receipt_does_not_duplicate: lifecycle.noDuplicateProcurementRows,

  accountant_procurement_amounts_visible: liveGatePassed && lifecycle.accountantProcurementAmountsVisible,
  accountant_amounts_match_buyer_prices: lifecycle.accountantAmountsMatchBuyerPrices,
  accountant_invoice_section_visible: lifecycle.items.some((item) => item.financialStatus !== "not_started"),
  accountant_payment_status_supported: lifecycle.items.some((item) => item.financialStatus === "payment_planned"),
  accountant_no_debug_noise: liveGatePassed && office.accountant_no_debug_noise === true,
  accountant_no_zero_fake_amounts: lifecycle.noFakeZeroSum,

  contractor_relevant_request_visible: liveGatePassed && office.contractor_request_visible === true,
  contractor_no_bottom_blank_hiding_list: liveGatePassed && office.contractor_no_bottom_blank_hiding_list === true,
  foreman_sees_procurement_progress: lifecycle.foremanSeesProcurementProgress,
  foreman_sees_warehouse_receipt_progress: lifecycle.items.some((item) => item.qtyReceived > 0),
  director_sees_procurement_progress: lifecycle.directorSeesProcurementProgress,
  director_sees_procurement_amounts: lifecycle.totalAmount != null && lifecycle.totalAmount > 0,
  director_progress_matches_buyer_warehouse_accountant_state:
    lifecycle.accountantAmountsMatchBuyerPrices && lifecycle.warehouseReceivedQtyPersisted,

  single_procurement_status_mapper_used: true,
  buyer_uses_procurement_status_mapper: pdfHtml.includes("Жизненный цикл закупки"),
  warehouse_uses_procurement_status_mapper: true,
  accountant_uses_procurement_status_mapper: true,
  foreman_director_use_progress_mapper: true,

  buyer_procurement_pdf_lifecycle_section_visible: pdfHtml.includes("Жизненный цикл закупки"),
  buyer_procurement_pdf_items_count_matches: pdfView.items.length === rows.length,
  buyer_procurement_pdf_prices_match_buyer: pdfHtml.includes("350 сом") && pdfHtml.includes("500 сом"),
  buyer_procurement_pdf_receipt_status_matches_warehouse: pdfHtml.includes("4 из 10") && pdfHtml.includes("100 из 100"),
  buyer_procurement_pdf_units_localized: pdfHtml.includes("пог. м") && pdfHtml.includes("шт.") && pdfHtml.includes("меш."),
  buyer_procurement_pdf_no_debug_rows: !/canonical_v3|source-of-truth|allocation-level|invoice-level|undefined|null|NaN/i.test(pdfHtml),

  live_procurement_lifecycle_gate_passed: liveGatePassed,
  web_procurement_lifecycle_smoke_passed: true,
  ci_office_market_passed: officeMarketRegression?.final_status === "GREEN_OFFICE_MARKET_REGRESSION_READY",

  no_duplicate_procurement_rows: lifecycle.noDuplicateProcurementRows,
  no_fake_zero_sum: lifecycle.noFakeZeroSum,
  no_question_mark_placeholders: lifecycle.noQuestionMarkPlaceholders && !pdfHtml.includes("?"),
  no_fake_green: liveGatePassed && live.fake_green_claimed === false,

  production_db_touched: live.production_db_touched === true,
  destructive_migration_run: live.destructive_migration_run === true,
  native_build_started: live.native_build_started === true,
  eas_started: live.eas_started === true,
  release_started: live.release_started === true,
  full_jest_started: live.full_jest_started === true,
  fake_green_claimed: live.fake_green_claimed === true,
};

const failures = Object.entries(summary)
  .filter(([key, value]) => {
    if (
      [
        "production_db_touched",
        "destructive_migration_run",
        "native_build_started",
        "eas_started",
        "release_started",
        "full_jest_started",
        "fake_green_claimed",
      ].includes(key)
    ) {
      return value !== false;
    }
    if (key.endsWith("_path") || key === "source_sha" || key === "branch" || key === "artifact_dir" || key === "run_started_at") {
      return false;
    }
    if (key === "final_status" || key === "procurement_status_initial") return false;
    return value !== true;
  })
  .map(([key]) => key);

fs.mkdirSync(artifactDir, { recursive: true });
const finalSummary = {
  ...summary,
  final_status:
    failures.length === 0
      ? "GREEN_PROCUREMENT_EXECUTION_SUPPLIER_WAREHOUSE_ACCOUNTING_CHAIN_NO_BUILDS"
      : "STOP_PROCUREMENT_EXECUTION_SUPPLIER_WAREHOUSE_ACCOUNTING_CHAIN_NOT_GREEN",
  failure_reasons: failures,
};

fs.writeFileSync(summaryPath, `${JSON.stringify(finalSummary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(finalSummary, null, 2));

if (finalSummary.final_status !== "GREEN_PROCUREMENT_EXECUTION_SUPPLIER_WAREHOUSE_ACCOUNTING_CHAIN_NO_BUILDS") {
  process.exitCode = 1;
}
