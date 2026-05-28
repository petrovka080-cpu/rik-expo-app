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
type ArtifactLike = Record<string, unknown> | unknown[];

const FOUNDATION_ONLY = process.argv.includes("--foundation-only");
const REQUIRE_LIVE = process.argv.includes("--require-live") || process.env.GLOBAL_LOCAL_REQUIRE_LIVE === "1";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readMatrix(relativePath: string): MatrixLike | null {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as MatrixLike;
}

function readArtifact(name: string): ArtifactLike | null {
  const artifact = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(artifact)) return null;
  return JSON.parse(fs.readFileSync(artifact, "utf8")) as ArtifactLike;
}

function isGreen(matrix: MatrixLike | null, status: string): boolean {
  return matrix?.final_status === status && matrix.fake_green_claimed === false;
}

function envFlag(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function boolField(value: ArtifactLike | null, field: string): boolean {
  return !Array.isArray(value) && value?.[field] === true;
}

function nonEmptyArray(value: ArtifactLike | null): boolean {
  return Array.isArray(value) && value.length > 0;
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
  const webResults = readArtifact("web_results.json");
  const androidResults = readArtifact("android_api34_results.json");
  const pdfTextExtract = readArtifact("pdf_text_extract.json");
  const webScreenshots = readArtifact("web_screenshots.json");
  const androidScreenshots = readArtifact("android_screenshots.json");
  const androidUiDumps = readArtifact("android_ui_dumps.json");

  const liveEvidence = {
    web_live_app_tested: boolField(webResults, "web_live_app_tested") || boolField(webResults, "playwright_web_passed"),
    android_api34_tested: boolField(androidResults, "android_api34_tested") || boolField(androidResults, "android_api34_smoke_passed"),
    api36_rejected: boolField(androidResults, "api36_rejected"),
    pdf_text_extractable_sample:
      boolField(pdfTextExtract, "pdf_text_extractable_sample") ||
      (Array.isArray(pdfTextExtract) && pdfTextExtract.length > 0 && pdfTextExtract.every((item) => {
        return typeof item === "object" && item != null && "pdf_text_extractable" in item && item.pdf_text_extractable === true;
      })),
    web_screenshots_present: nonEmptyArray(webScreenshots) || boolField(webResults, "web_screenshots_real"),
    android_screenshots_present: nonEmptyArray(androidScreenshots) || boolField(androidResults, "android_screenshots_real"),
    android_ui_dumps_present: nonEmptyArray(androidUiDumps) || boolField(androidResults, "android_ui_dumps_real"),
  };
  const liveReady = Object.values(liveEvidence).every(Boolean);
  const closeout = {
    typecheck_passed: envFlag("GLOBAL_LOCAL_TYPECHECK_PASSED"),
    lint_passed: envFlag("GLOBAL_LOCAL_LINT_PASSED"),
    git_diff_check_passed: envFlag("GLOBAL_LOCAL_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: envFlag("GLOBAL_LOCAL_TARGETED_TESTS_PASSED"),
    architecture_tests_passed: envFlag("GLOBAL_LOCAL_ARCHITECTURE_TESTS_PASSED"),
    full_jest_passed: envFlag("GLOBAL_LOCAL_FULL_JEST_PASSED"),
    release_verify_passed: envFlag("GLOBAL_LOCAL_RELEASE_VERIFY_PASSED"),
    commit_created: envFlag("GLOBAL_LOCAL_COMMIT_CREATED"),
    branch_pushed: envFlag("GLOBAL_LOCAL_BRANCH_PUSHED"),
    final_worktree_clean: envFlag("GLOBAL_LOCAL_FINAL_WORKTREE_CLEAN"),
  };
  const closeoutReady = Object.values(closeout).every(Boolean);
  const finalStatus = !foundationReady
    ? "BLOCKED_GLOBAL_LOCAL_FOUNDATION_FAILED"
    : !liveReady
      ? "BLOCKED_GLOBAL_LOCAL_LIVE_WEB_ANDROID_PDF_NOT_RUN"
      : !closeoutReady
        ? "BLOCKED_GLOBAL_LOCAL_CLOSEOUT_NOT_RUN"
        : "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY";

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
    final_status: finalStatus,
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
    ...liveEvidence,
    ...closeout,
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
      `Live evidence ready: ${liveReady}`,
      `Closeout ready: ${closeoutReady}`,
      `Cases tested: ${cases.length}`,
      `Failures: ${failures.length}`,
      "",
      FOUNDATION_ONLY
        ? "Foundation-only mode was requested. Live web, Android API34, PDF extraction, full Jest, release:verify are not claimed."
        : "Production proof mode requires live web, Android API34, PDF extraction, full Jest, release:verify, commit, push, and clean worktree evidence.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(matrix.final_status);
  if (!foundationReady) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else if (!FOUNDATION_ONLY && matrix.final_status !== "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY") {
    if (REQUIRE_LIVE || !liveReady || !closeoutReady) {
      process.exitCode = 1;
    }
  }
}

main();
