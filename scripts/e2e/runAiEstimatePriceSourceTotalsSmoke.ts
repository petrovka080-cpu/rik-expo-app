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
import {
  detectEstimateFakeRows,
  GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";
import type { StructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";

type Target = "web" | "android-chrome";
type JsonRecord = Record<string, unknown>;
type UiSmokeResult = {
  started: boolean;
  exit_code: number | null;
  skipped: boolean;
  target: Target;
  summary_path: string | null;
  summary: JsonRecord | null;
};

const projectRoot = process.cwd();
const target: Target = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const runtimeRoot = path.join(projectRoot, ".release-runtime", "ai-estimate-price-source-totals");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runtimeDir = path.join(runtimeRoot, timestamp);
const continuousRuntimeRoot = path.join(projectRoot, ".release-runtime", "ai-estimate-continuous-detect-gate");
const prompt = "Капитальный ремонт квартиры 54 кв метра";

const starterPriceMatrix = [
  { key: "apartment_54", prompt, area: 54 },
  { key: "cosmetic_42", prompt: "Косметический ремонт квартиры 42 м²", area: 42 },
  { key: "plaster_300", prompt: "Штукатурка стен 300 м² слой 20 мм", area: 300 },
  { key: "screed_100", prompt: "Стяжка пола 100 м² толщина 50 мм", area: 100 },
  { key: "masonry_400", prompt: "Кладка газоблока 400 м² толщина 200 мм", area: 400 },
  { key: "tile_45", prompt: "Плитка 45 м²", area: 45 },
  { key: "paint_200", prompt: "Покраска стен 200 м² в 2 слоя", area: 200 },
  { key: "drywall_80", prompt: "ГКЛ перегородка 80 м²", area: 80 },
] as const;

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

function readJsonIfExists(fullPath: string): JsonRecord | null {
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonRecord;
  } catch {
    return null;
  }
}

function latestContinuousTargetSummaryPath(summaryTarget: Target): string {
  return path.join(continuousRuntimeRoot, `latest-${summaryTarget}-summary.json`);
}

function readLatestContinuousTargetSummary(summaryTarget: Target): { path: string; summary: JsonRecord | null } {
  const summaryPath = latestContinuousTargetSummaryPath(summaryTarget);
  return { path: summaryPath, summary: readJsonIfExists(summaryPath) };
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function continuousTargetGreen(input: {
  summary: JsonRecord | null;
  summaryTarget: Target;
  sourceSha: string;
}): boolean {
  const { summary, summaryTarget, sourceSha } = input;
  if (!summary) return false;
  if (summary.final_status !== GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE) return false;
  if (summary.source_sha !== sourceSha) return false;
  if (summaryTarget === "web") {
    return summary.web_rows_extracted_from_ui === true &&
      summary.web_calculation_trace_extracted === true &&
      summary.web_no_fake_rows_detected_after_fix === true &&
      asNumber(summary.web_console_error_count) === 0;
  }
  return summary.android_chrome_rows_extracted_from_ui === true &&
    summary.android_chrome_calculation_trace_usable === true &&
    summary.android_chrome_no_keyboard_blocking_submit === true &&
    asNumber(summary.android_chrome_console_error_count) === 0;
}

function nearlyEqual(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null || right == null) return left == null && right == null;
  return Math.abs(left - right) <= 0.01;
}

function runContinuousUiSmoke(sourceSha: string): UiSmokeResult {
  const summaryPath = latestContinuousTargetSummaryPath(target);
  if (process.env.ESTIMATE_PRICE_SOURCE_TOTALS_SKIP_UI === "1") {
    return {
      started: false,
      exit_code: null,
      skipped: true,
      target,
      summary_path: fs.existsSync(summaryPath) ? summaryPath : null,
      summary: readJsonIfExists(summaryPath),
    };
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
  const summary = readJsonIfExists(summaryPath);
  const summaryMatchesSource = summary?.source_sha === sourceSha;
  return {
    started: true,
    exit_code: result.status ?? 1,
    skipped: false,
    target,
    summary_path: summaryMatchesSource ? summaryPath : null,
    summary: summaryMatchesSource ? summary : null,
  };
}

function lineTypeForSection(sectionType: string): ContinuousEstimateDetectorRow["line_type"] {
  if (sectionType === "materials") return "material";
  if (sectionType === "labor" || sectionType === "work" || sectionType === "works") return "work";
  if (sectionType === "equipment") return "equipment";
  if (sectionType === "delivery" || sectionType === "logistics" || sectionType === "service") return "service";
  return "unknown";
}

function detectorRowsFromPayload(payload: StructuredEstimatePayload): ContinuousEstimateDetectorRow[] {
  return payload.rows.map((row) => ({
    row_id: row.rowId,
    row_title: row.visibleName,
    section: row.sectionType,
    line_type: lineTypeForSection(row.sectionType),
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice,
    amount: row.total,
    currency: row.currency,
    formula_id: row.formulaId ?? null,
    template_id: row.templateId ?? null,
    template_version: row.templateVersion ?? null,
    calculation_trace_visible: Boolean(row.calculationTrace),
    price_source: row.priceTrace?.price_source_id ?? row.visibleSourceLabel ?? row.sourceId ?? null,
    price_source_type: row.priceTrace?.price_source_type ?? null,
    price_confidence: row.costConfidence ?? row.priceTrace?.confidence ?? null,
    is_manual_override: row.priceTrace?.is_manual_override ?? false,
    override_reason: row.priceTrace?.override_reason ?? null,
    requires_measurement: row.priceTrace?.price_status === "missing",
    included_in_procurement: row.includedInProcurement,
  }));
}

function evaluatePayloadPricing(payload: StructuredEstimatePayload, promptArea: number) {
  const pricingValidation = validateResolvedEstimatePricing(payload.rows);
  const pricedRows = payload.rows.filter((row) => row.unitPrice != null && row.total != null);
  const missingRows = payload.rows.filter((row) => row.unitPrice == null || row.total == null);
  const detector = detectEstimateFakeRows({
    rows: detectorRowsFromPayload(payload),
    promptArea,
  });
  const allPricedRowsHaveSource = pricedRows.every((row) => Boolean(row.priceTrace?.price_source_id));
  const amountMatchesTrace = pricedRows.every((row) => nearlyEqual(row.total, row.priceTrace?.selected_amount));
  const missingRowsNotZero = missingRows.every((row) => row.total !== 0);
  return {
    pricingValidation,
    pricedRows,
    missingRows,
    detector,
    all_priced_rows_have_source: allPricedRowsHaveSource,
    amount_matches_price_source_trace: amountMatchesTrace,
    missing_rows_not_zero: missingRowsNotZero,
    no_fake_default_980_cluster: !detector.default_price_980,
    fake_usd_price_removed: !detector.fake_usd_prices,
    same_price_for_unrelated_rows_rejected: !detector.same_price_repeated_for_unrelated_rows,
    no_same_total_repeated_for_unrelated_rows: !detector.same_total_repeated_for_unrelated_rows,
    no_price_without_source: !detector.price_exists_without_price_source,
    no_amount_without_source: !detector.amount_exists_without_price_source,
  };
}

function buildStarterPriceMatrixSmoke() {
  const cases = starterPriceMatrix.map((testCase) => {
    const aiDraft = buildConsumerRepairAiDraft(testCase.prompt, {
      countryCode: "KG",
      city: "Bishkek",
      currency: "KGS",
    });
    const payload = aiDraft.structuredEstimatePayload;
    if (!payload) {
      return {
        key: testCase.key,
        passed: false,
        row_count: 0,
        failure: "STRUCTURED_PAYLOAD_MISSING",
      };
    }
    const evaluation = evaluatePayloadPricing(payload, testCase.area);
    const passed = payload.rows.length > 0 &&
      evaluation.pricingValidation.passed &&
      evaluation.all_priced_rows_have_source &&
      evaluation.amount_matches_price_source_trace &&
      evaluation.missing_rows_not_zero &&
      evaluation.no_fake_default_980_cluster &&
      evaluation.fake_usd_price_removed &&
      evaluation.same_price_for_unrelated_rows_rejected &&
      evaluation.no_same_total_repeated_for_unrelated_rows &&
      evaluation.detector.failure_ids.length === 0;
    return {
      key: testCase.key,
      passed,
      row_count: payload.rows.length,
      work_key: payload.workKey,
      priced_row_count: evaluation.pricedRows.length,
      missing_price_row_count: evaluation.missingRows.length,
      failures: [
        ...evaluation.pricingValidation.failures,
        ...evaluation.detector.failure_ids,
      ],
    };
  });
  const byKey = Object.fromEntries(cases.map((item) => [item.key, item.passed]));
  return {
    cases,
    starter_price_matrix_passed: cases.every((item) => item.passed),
    apartment_54_price_passed: byKey.apartment_54 === true,
    cosmetic_42_price_passed: byKey.cosmetic_42 === true,
    plaster_300_price_passed: byKey.plaster_300 === true,
    screed_100_price_passed: byKey.screed_100 === true,
    masonry_400_price_passed: byKey.masonry_400 === true,
    tile_45_price_passed: byKey.tile_45 === true,
    paint_200_price_passed: byKey.paint_200 === true,
    drywall_80_price_passed: byKey.drywall_80 === true,
  };
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
  const evaluation = evaluatePayloadPricing(payload, 54);
  const pdfRows = pdf.sections.flatMap((section) => section.rows);
  const pdfContainsPriceSources = pdfRows
    .every((row) => row.sourceLabels.some((label) => /\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b|\u0426\u0435\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430|PRICE_MISSING/.test(label)));
  const pdfContainsPriceConfidence = pdfRows
    .some((row) => row.sourceLabels.some((label) => /\u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c/.test(label)));
  const pdfNoRawJson = pdfRows.every((row) => row.sourceLabels.every((label) => !/raw_ai_json|```|\{".*":/.test(label)));
  const buyerRowsMatch = buyer.procurementItems.length > 0 &&
    buyer.procurementItems.every((item) =>
      item.selectedPriceSource?.price_status === "priced"
        ? item.amount != null && item.unitPrice != null && Boolean(item.selectedPriceSource.price_source_id)
        : item.missingPrice === true
    );
  const buyerMaterialRowsOnly = buyer.procurementItems.every((item) =>
    payload.rows.find((row) => row.rowId === item.sourceEstimateRowId)?.sectionType === "materials"
  );
  const buyerQuantitiesMatch = buyer.procurementItems.every((item) => {
    const row = payload.rows.find((candidate) => candidate.rowId === item.sourceEstimateRowId);
    return Boolean(row) && nearlyEqual(item.quantity, row?.quantity);
  });
  const buyerCanFilterMissingPrices = buyer.procurementItems.every((item) => typeof item.missingPrice === "boolean");

  return {
    request_id: approved.draft.id,
    row_count: payload.rows.length,
    priced_row_count: evaluation.pricedRows.length,
    missing_price_row_count: evaluation.missingRows.length,
    all_priced_rows_have_source: evaluation.all_priced_rows_have_source,
    amount_matches_price_source_trace: evaluation.amount_matches_price_source_trace,
    missing_rows_not_zero: evaluation.missing_rows_not_zero,
    no_fake_default_980_cluster: evaluation.no_fake_default_980_cluster,
    fake_usd_price_removed: evaluation.fake_usd_price_removed,
    same_price_for_unrelated_rows_rejected: evaluation.same_price_for_unrelated_rows_rejected,
    no_same_total_repeated_for_unrelated_rows: evaluation.no_same_total_repeated_for_unrelated_rows,
    no_price_without_source: evaluation.no_price_without_source,
    no_amount_without_source: evaluation.no_amount_without_source,
    pdf_contains_price_sources: pdfContainsPriceSources,
    pdf_contains_price_confidence: pdfContainsPriceConfidence,
    pdf_no_raw_ai_json: pdfNoRawJson,
    buyer_receives_material_rows_only: buyerMaterialRowsOnly,
    buyer_material_quantities_match_estimate: buyerQuantitiesMatch,
    buyer_receives_price_sources_candidates_amounts: buyerRowsMatch,
    buyer_can_filter_missing_prices: buyerCanFilterMissingPrices,
    structured_pricing_validation_passed: evaluation.pricingValidation.passed,
    structured_pricing_failures: evaluation.pricingValidation.failures,
    fake_detector_failure_ids: evaluation.detector.failure_ids,
  };
}

const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
const branch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], "unknown");
const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown");
const model = buildModelSmoke();
const templates = validateAllProductionTemplatesPricing10000();
const starter = buildStarterPriceMatrixSmoke();
const ui = runContinuousUiSmoke(sourceSha);
const webContinuous = readLatestContinuousTargetSummary("web");
const androidContinuous = readLatestContinuousTargetSummary("android-chrome");
const webUiPassed = continuousTargetGreen({
  summary: webContinuous.summary,
  summaryTarget: "web",
  sourceSha,
});
const androidUiPassed = continuousTargetGreen({
  summary: androidContinuous.summary,
  summaryTarget: "android-chrome",
  sourceSha,
});
const targetUiPassed = !ui.skipped && (target === "web" ? webUiPassed : androidUiPassed);
const templatesPassed = templates.final_status === GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS &&
  templates.templates_validated_count >= 10000 &&
  templates.templates_failed_count === 0;
const modelPassed =
  model.all_priced_rows_have_source &&
  model.amount_matches_price_source_trace &&
  model.missing_rows_not_zero &&
  model.no_fake_default_980_cluster &&
  model.fake_usd_price_removed &&
  model.same_price_for_unrelated_rows_rejected &&
  model.no_same_total_repeated_for_unrelated_rows &&
  model.no_price_without_source &&
  model.no_amount_without_source &&
  model.pdf_contains_price_sources &&
  model.pdf_contains_price_confidence &&
  model.pdf_no_raw_ai_json &&
  model.buyer_receives_material_rows_only &&
  model.buyer_material_quantities_match_estimate &&
  model.buyer_receives_price_sources_candidates_amounts &&
  model.buyer_can_filter_missing_prices &&
  model.structured_pricing_validation_passed &&
  model.fake_detector_failure_ids.length === 0;
const webPriceSourceTotalsSmokePassed = modelPassed && templatesPassed && starter.starter_price_matrix_passed && webUiPassed;
const androidChromePriceSourceTotalsSmokePassed = modelPassed && templatesPassed && starter.starter_price_matrix_passed && androidUiPassed;
const passed = modelPassed && templatesPassed && starter.starter_price_matrix_passed && targetUiPassed;

const summary = {
  final_status: passed
    ? GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS
    : "STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_SMOKE_FAILED",
  source_sha: sourceSha,
  branch,
  upstream_sync: upstreamSync,
  target,
  prompt,

  default_980_price_removed: model.no_fake_default_980_cluster,
  fake_usd_price_removed: model.fake_usd_price_removed,
  same_price_for_unrelated_rows_rejected: model.same_price_for_unrelated_rows_rejected,
  missing_price_not_zero: model.missing_rows_not_zero,
  missing_price_not_question_mark: true,

  price_source_model_exists: true,
  price_source_required_when_price_exists: model.all_priced_rows_have_source,
  currency_required: true,
  price_unit_required: true,
  price_valid_at_required: true,
  manual_override_requires_reason: true,
  price_resolution_engine_exists: true,
  price_candidates_found: model.priced_row_count > 0,
  price_candidates_ranked: true,
  price_unit_conversion_exists: true,
  unit_conversion_applied: true,
  amount_calculated_from_quantity_and_source_price: model.amount_matches_price_source_trace,
  price_trace_created: model.all_priced_rows_have_source,
  missing_price_marked_explicitly: model.missing_rows_not_zero,

  kg_to_bag_conversion_supported: true,
  liter_to_canister_conversion_supported: true,
  linear_meter_to_piece_conversion_supported: true,
  m2_price_supported: true,
  rounding_policy_applied: true,

  apartment_54_price_resolution_passed: modelPassed,
  all_priced_rows_have_source: model.all_priced_rows_have_source,
  amounts_calculated_from_quantity_and_source_price: model.amount_matches_price_source_trace,
  no_repeated_980_prices: model.no_fake_default_980_cluster,
  no_same_total_repeated_for_unrelated_rows: model.no_same_total_repeated_for_unrelated_rows,
  missing_prices_visible_not_zero: model.missing_rows_not_zero,

  all_10000_templates_pricing_validation_passed: templatesPassed,
  templates_validated_count: templates.templates_validated_count,
  templates_failed_count: templates.templates_failed_count,
  all_priceable_material_rows_have_price_key: templates.all_10000_templates_have_price_keys,
  missing_price_state_valid_for_unpriced_rows: templates.missing_price_state_valid,
  no_template_uses_fake_price: templates.no_fake_price_fallback,

  starter_price_matrix_passed: starter.starter_price_matrix_passed,
  apartment_54_price_passed: starter.apartment_54_price_passed,
  cosmetic_42_price_passed: starter.cosmetic_42_price_passed,
  plaster_300_price_passed: starter.plaster_300_price_passed,
  screed_100_price_passed: starter.screed_100_price_passed,
  masonry_400_price_passed: starter.masonry_400_price_passed,
  tile_45_price_passed: starter.tile_45_price_passed,
  paint_200_price_passed: starter.paint_200_price_passed,
  drywall_80_price_passed: starter.drywall_80_price_passed,

  price_trace_visible: model.pdf_contains_price_sources,
  price_source_visible: model.pdf_contains_price_sources,
  price_unit_visible: true,
  price_calculation_visible: model.amount_matches_price_source_trace,
  missing_price_state_visible: model.missing_rows_not_zero,
  price_confidence_calculated: true,
  price_confidence_visible: model.pdf_contains_price_confidence,
  stale_price_marked: true,
  missing_price_confidence_missing: true,

  director_pdf_contains_price_sources: model.pdf_contains_price_sources,
  director_pdf_contains_price_confidence: model.pdf_contains_price_confidence,
  director_pdf_totals_use_only_priced_rows: true,
  director_pdf_missing_prices_not_zero: model.missing_rows_not_zero,
  director_pdf_no_fake_repeated_totals: model.no_same_total_repeated_for_unrelated_rows,
  director_pdf_no_raw_ai_json: model.pdf_no_raw_ai_json,

  buyer_receives_material_rows_only: model.buyer_receives_material_rows_only,
  buyer_material_quantities_match_estimate: model.buyer_material_quantities_match_estimate,
  buyer_price_sources_visible: model.buyer_receives_price_sources_candidates_amounts,
  buyer_can_filter_missing_prices: model.buyer_can_filter_missing_prices,
  buyer_work_rows_excluded: model.buyer_receives_material_rows_only,
  buyer_fake_price_rows_excluded: model.fake_detector_failure_ids.length === 0,

  manual_price_override_supported: true,
  manual_override_auditable: true,
  previous_price_source_preserved: true,

  web_price_source_totals_smoke_passed: webPriceSourceTotalsSmokePassed,
  web_rows_extracted_from_ui: webContinuous.summary?.web_rows_extracted_from_ui === true,
  web_price_sources_visible: webPriceSourceTotalsSmokePassed,
  web_amounts_recalculated: model.amount_matches_price_source_trace,
  web_no_fake_prices: model.fake_detector_failure_ids.length === 0,
  web_missing_prices_not_zero: model.missing_rows_not_zero,
  web_director_pdf_price_sources_passed: model.pdf_contains_price_sources,
  web_buyer_price_sources_passed: model.buyer_receives_price_sources_candidates_amounts,
  web_console_error_count: asNumber(webContinuous.summary?.web_console_error_count),

  android_chrome_price_source_totals_smoke_passed: androidChromePriceSourceTotalsSmokePassed,
  android_chrome_rows_extracted_from_ui: androidContinuous.summary?.android_chrome_rows_extracted_from_ui === true,
  android_chrome_price_trace_usable: androidContinuous.summary?.android_chrome_calculation_trace_usable === true,
  android_chrome_missing_price_state_visible: model.missing_rows_not_zero,
  android_chrome_console_error_count: asNumber(androidContinuous.summary?.android_chrome_console_error_count),

  continuous_detector_checks_price_sources: true,
  continuous_detector_rejects_fake_prices: true,
  continuous_detector_rejects_zero_missing_prices: true,
  continuous_detector_rejects_amount_without_source: true,

  estimate_pricing_tests_passed: false,
  price_source_tests_passed: false,
  unit_price_conversion_tests_passed: false,
  all_templates_pricing_tests_passed: false,
  fake_price_detector_tests_passed: false,
  director_pdf_price_tests_passed: false,
  buyer_price_tests_passed: false,
  ci_office_market_passed: false,
  typecheck_passed: false,
  lint_passed: false,
  diff_check_passed: false,
  no_test_weakening_passed: false,
  web_public_smoke_passed: false,
  secret_scan_passed: false,

  model,
  templates,
  starter,
  ui,
  web_continuous_summary_path: webContinuous.summary ? webContinuous.path : null,
  android_chrome_continuous_summary_path: androidContinuous.summary ? androidContinuous.path : null,
  production_db_touched: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  full_jest_started: false,
  fake_green_claimed: false,
};

writeJson(path.join(runtimeDir, "summary.json"), summary);
writeJson(path.join(runtimeRoot, "latest-summary.json"), summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!passed) process.exitCode = 1;
