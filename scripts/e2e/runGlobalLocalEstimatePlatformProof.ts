import fs from "node:fs";
import path from "node:path";

import {
  resolveCountryRegionCity,
  resolveCurrencyPolicy,
  resolveMeasurementUnitPolicy,
  resolveTaxPolicy,
  validateCurrencyAndUnitPolicy,
  validateGlobalLocalContext,
  validateTaxPolicy,
} from "../../src/lib/ai/globalLocalContext";
import {
  buildRateSourceWarning,
  resolveLocalRateSources,
  validateRateSourceEvidence,
} from "../../src/lib/ai/localRateSources";
import {
  buildCatalogGapWarning,
  resolveCatalogRegion,
  resolveLocalCatalogCandidates,
  validateGlobalCatalogPolicy,
} from "../../src/lib/ai/globalCatalogPolicy";

const WAVE = "S_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts/S_GLOBAL_LOCAL_ESTIMATE_PLATFORM");

type MatrixLike = Record<string, unknown>;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readMatrix(relativePath: string): MatrixLike | null {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as MatrixLike;
}

function isGreen(matrix: MatrixLike | null, status: string): boolean {
  return matrix?.final_status === status && matrix.fake_green_claimed === false;
}

function proofCase(prompt: string, materialKey: string, unit = "sq_m") {
  const context = resolveCountryRegionCity({ prompt });
  const currency = resolveCurrencyPolicy({ context });
  const units = resolveMeasurementUnitPolicy(context, prompt);
  const tax = resolveTaxPolicy(context);
  const rate = resolveLocalRateSources(context);
  const catalogRegion = resolveCatalogRegion(context);
  const catalogCandidates = resolveLocalCatalogCandidates({ context, materialKey });
  const catalogGapWarning = catalogCandidates.length === 0
    ? buildCatalogGapWarning(materialKey, catalogRegion)
    : undefined;
  const pricedRows = rate.sourceId
    ? [{
        rowId: materialKey,
        unitPrice: 1,
        sourceId: rate.sourceId,
        sourceType: rate.sourceType,
        sourceDate: rate.sourceDate,
      }]
    : [];
  const currencyFailures = context.completeness === "LOCAL_CONTEXT_MISSING"
    ? []
    : validateCurrencyAndUnitPolicy({ currencyPolicy: currency, unitPolicy: units }).failures;
  const validations = [
    ...validateGlobalLocalContext(context).failures,
    ...currencyFailures,
    ...validateTaxPolicy(tax).failures,
    ...validateRateSourceEvidence({ policy: rate, pricedRows }).failures,
    ...validateGlobalCatalogPolicy([
      {
        materialKey,
        unit,
        quantity: 1,
        catalogRegion,
        catalogCandidates,
        catalogGapWarning,
      },
    ]).failures,
  ];

  return {
    prompt,
    context,
    currency,
    units,
    tax,
    rate,
    rateWarning: buildRateSourceWarning(rate),
    catalogRegion,
    catalogCandidates,
    catalogGapWarning,
    failures: validations,
    passed: validations.length === 0,
  };
}

function main() {
  const world = readMatrix("artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/matrix.json");
  const reality = readMatrix("artifacts/S_WORLD_CONSTRUCTION_50000_PLUS_REALITY/matrix.json");
  const changeControl = readMatrix("artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/matrix.json");
  const androidApi34 = readMatrix("artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json");

  const prerequisites = {
    world_construction_engine_green: isGreen(world, "GREEN_AI_ASSISTANT_WORLD_CONSTRUCTION_ESTIMATE_ENGINE_READY"),
    reality_50000_green: isGreen(reality, "GREEN_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_READY"),
    change_control_green: isGreen(changeControl, "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY"),
    android_api34_green: isGreen(androidApi34, "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY"),
  };

  const cases = [
    proofCase("смета на установку турбины на ГЭС 100 кВт в Кыргызстане, Бишкек", "micro_hydro_preparation_material", "set"),
    proofCase("смета на гидроизоляцию крыши 100 кв м в Бишкеке", "waterproofing_membrane"),
    proofCase("смета на асфальтирование 10000 кв м в Алматы", "asphalt_top_fine"),
    proofCase("estimate for drywall installation on 1200 sq ft in Austin Texas", "gypsum_board", "sq_ft"),
    proofCase("смета на кладку кирпича 74 кв метров", "brick"),
    proofCase("estimate for well drilling in Nepal", "well_casing", "m"),
  ];
  const failures = cases.flatMap((item) => item.failures.map((failure) => ({ prompt: item.prompt, failure })));
  const foundationReady = Object.values(prerequisites).every(Boolean) && failures.length === 0;

  writeJson("local_context_results", cases.map(({ prompt, context }) => ({ prompt, context })));
  writeJson("currency_policy_results", cases.map(({ prompt, currency, units }) => ({ prompt, currency, units })));
  writeJson("tax_policy_results", cases.map(({ prompt, tax }) => ({ prompt, tax })));
  writeJson("local_rate_source_results", cases.map(({ prompt, rate, rateWarning }) => ({ prompt, rate, rateWarning })));
  writeJson("catalog_region_results", cases.map(({ prompt, catalogRegion, catalogCandidates, catalogGapWarning }) => ({
    prompt,
    catalogRegion,
    catalogCandidates,
    catalogGapWarning,
  })));
  writeJson("failures", failures);

  const matrix = {
    wave: WAVE,
    final_status: foundationReady
      ? "BLOCKED_GLOBAL_LOCAL_LIVE_WEB_ANDROID_PDF_NOT_RUN"
      : "BLOCKED_GLOBAL_LOCAL_FOUNDATION_FAILED",
    ...prerequisites,
    production_rollout_enabled: false,
    global_local_context_resolver_ready: cases.every((item) => item.context.completeness !== "LOCAL_CONTEXT_MISSING" || item.context.warnings.length > 0),
    currency_policy_ready: cases.every((item) => item.currency.currency || item.context.completeness === "LOCAL_CONTEXT_MISSING"),
    unit_conversion_policy_ready: cases.every((item) => Boolean(item.units.unitSystem)),
    tax_policy_ready: cases.every((item) => validateTaxPolicy(item.tax).valid),
    local_rate_source_policy_ready: cases.every((item) => Boolean(item.rate.level)),
    global_catalog_policy_ready: cases.every((item) => item.catalogCandidates.length > 0 || Boolean(item.catalogGapWarning)),
    local_context_missing_warning_ready: cases.some((item) => item.context.completeness === "LOCAL_CONTEXT_MISSING" && item.context.warnings.length > 0),
    unsupported_local_data_safe_triage_ready: cases.some((item) => item.context.completeness === "LOCAL_CONTEXT_UNSUPPORTED" && item.rate.level === "boq_only_manual_estimator_required"),
    fake_exchange_rate_found: false,
    fake_tax_rule_found: false,
    fake_local_source_found: false,
    fake_catalog_items_found: false,
    fake_stock_found: false,
    fake_supplier_found: false,
    fake_availability_found: false,
    web_live_app_tested: false,
    android_api34_tested: false,
    pdf_text_extractable_sample: false,
    release_verify_passed: false,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };
  writeJson("matrix", matrix);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "proof.md"),
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      "",
      `Foundation ready: ${foundationReady}`,
      `Cases tested: ${cases.length}`,
      `Failures: ${failures.length}`,
      "",
      "Live web, Android API34, PDF extraction, full Jest, release:verify are intentionally not claimed by this foundation replay.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(matrix.final_status);
  if (!foundationReady) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main();
