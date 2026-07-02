import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";
import {
  GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
  validateAllProductionTemplatesPricing10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { validateResolvedEstimatePricing } from "../../src/features/estimates/pricing/priceResolutionEngine";

type Target = "web" | "android-chrome";

const projectRoot = process.cwd();
const target: Target = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const runtimeRoot = path.join(projectRoot, ".release-runtime", "ai-estimate-price-source-totals");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runtimeDir = path.join(runtimeRoot, timestamp);
const prompt = "Капитальный ремонт квартиры 54 кв метра";

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
      windowsHide: true,
    }).trim();
  } catch {
    return fallback;
  }
}

function writeJson(fullPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nearlyEqual(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null || right == null) return left == null && right == null;
  return Math.abs(left - right) <= 0.01;
}

function runContinuousUiSmoke(): { started: boolean; exit_code: number | null; skipped: boolean } {
  if (process.env.ESTIMATE_PRICE_SOURCE_TOTALS_SKIP_UI === "1") {
    return { started: false, exit_code: null, skipped: true };
  }
  const result = spawnSync(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32"
    ? ["/c", "npx", "tsx", "scripts/e2e/runAiEstimateContinuousDetectGate.ts", "--phase=post-fix", "--repeat=3"]
    : ["tsx", "scripts/e2e/runAiEstimateContinuousDetectGate.ts", "--phase=post-fix", "--repeat=3"], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      ESTIMATE_SMOKE_TARGET: target,
    },
  });
  return { started: true, exit_code: result.status ?? 1, skipped: false };
}

function buildModelSmoke() {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(prompt, {
    countryCode: "KG",
    city: "Bishkek",
    currency: "KGS",
  });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "price-source-totals-smoke",
    problemText: prompt,
    repairType: "apartment_capital_renovation",
    city: "Bishkek",
    addressText: "Bishkek, price source smoke",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const payload = approved.structuredEstimatePayload;
  if (!payload) throw new Error("PRICE_SOURCE_TOTALS_SMOKE_STRUCTURED_PAYLOAD_MISSING");
  const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: approved.draft,
    items: approved.items,
    media: approved.media,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  if (!pdf) throw new Error("PRICE_SOURCE_TOTALS_SMOKE_PDF_MISSING");
  const buyer = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    sourceRequestId: approved.draft.id,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const pricingValidation = validateResolvedEstimatePricing(payload.rows);
  const pricedRows = payload.rows.filter((row) => row.unitPrice != null && row.total != null);
  const missingRows = payload.rows.filter((row) => row.unitPrice == null || row.total == null);
  const amountMatchesTrace = pricedRows.every((row) => nearlyEqual(row.total, row.priceTrace?.selected_amount));
  const allPricedRowsHaveSource = pricedRows.every((row) => Boolean(row.priceTrace?.price_source_id));
  const missingRowsNotZero = missingRows.every((row) => row.total !== 0);
  const noFakeDefault980Cluster = payload.rows.filter((row) => row.unitPrice === 980).length < Math.max(4, Math.ceil(payload.rows.length * 0.12));
  const pdfContainsPriceSources = pdf.sections.flatMap((section) => section.rows)
    .every((row) => row.sourceLabels.some((label) => /\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b|\u0426\u0435\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430|PRICE_MISSING/.test(label)));
  const buyerRowsMatch = buyer.procurementItems.length > 0 &&
    buyer.procurementItems.every((item) =>
      item.selectedPriceSource?.price_status === "priced"
        ? item.amount != null && item.unitPrice != null && Boolean(item.selectedPriceSource.price_source_id)
        : item.missingPrice === true
    );
  const buyerMaterialRowsOnly = buyer.procurementItems.every((item) =>
    payload.rows.find((row) => row.rowId === item.sourceEstimateRowId)?.sectionType === "materials"
  );

  return {
    request_id: approved.draft.id,
    row_count: payload.rows.length,
    priced_row_count: pricedRows.length,
    missing_price_row_count: missingRows.length,
    all_priced_rows_have_source: allPricedRowsHaveSource,
    amount_matches_price_source_trace: amountMatchesTrace,
    missing_rows_not_zero: missingRowsNotZero,
    no_fake_default_980_cluster: noFakeDefault980Cluster,
    pdf_contains_price_sources: pdfContainsPriceSources,
    buyer_receives_material_rows_only: buyerMaterialRowsOnly,
    buyer_receives_price_sources_candidates_amounts: buyerRowsMatch,
    structured_pricing_validation_passed: pricingValidation.passed,
    structured_pricing_failures: pricingValidation.failures,
  };
}

const model = buildModelSmoke();
const templates = validateAllProductionTemplatesPricing10000();
const ui = runContinuousUiSmoke();
const passed =
  model.all_priced_rows_have_source &&
  model.amount_matches_price_source_trace &&
  model.missing_rows_not_zero &&
  model.no_fake_default_980_cluster &&
  model.pdf_contains_price_sources &&
  model.buyer_receives_material_rows_only &&
  model.buyer_receives_price_sources_candidates_amounts &&
  model.structured_pricing_validation_passed &&
  templates.final_status === GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS &&
  (ui.skipped || ui.exit_code === 0);

const summary = {
  final_status: passed
    ? GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS
    : "STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_SMOKE_FAILED",
  source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
  branch: gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], "unknown"),
  target,
  prompt,
  model,
  templates,
  ui,
  production_db_touched: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  fake_green_claimed: false,
};

writeJson(path.join(runtimeDir, "summary.json"), summary);
writeJson(path.join(runtimeRoot, "latest-summary.json"), summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!passed) process.exitCode = 1;
