import {
  buildMarketPricebookMatrixSnapshot,
  gitOutput,
  runCommandForMarketPricebook,
  runReleaseVerifyForMarketPricebook,
  writeMarketPricebookJson,
} from "./runMarketMaterialCoverageAudit";

const sourceHead = gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
const originHead = gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "UNKNOWN_ORIGIN");

const material = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketMaterialCoverageAudit.ts"], 5 * 60_000);
const pricebook = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPricebookCoverageAudit.ts"], 5 * 60_000);
const importValidation = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPricebookImportValidation.ts"], 5 * 60_000);
const freshness = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceFreshnessAudit.ts"], 5 * 60_000);
const regionalCurrency = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceRegionalCurrencyAudit.ts"], 5 * 60_000);
const noFakePrice = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceNoFakePriceAudit.ts"], 5 * 60_000);
const snapshot = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceSnapshotAudit.ts"], 5 * 60_000);
const smart1500 = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceSmartEstimator1500CoverageAudit.ts"], 5 * 60_000);
const deepGolden300 = runCommandForMarketPricebook("npx", ["tsx", "scripts/e2e/runMarketPriceDeepGolden300Audit.ts"], 5 * 60_000);
const typecheck = runCommandForMarketPricebook("npm", ["run", "verify:typecheck"], 20 * 60_000);
const lint = runCommandForMarketPricebook("npm", ["run", "lint"], 20 * 60_000);
const focused = runCommandForMarketPricebook("npm", ["test", "--", "--runInBand", "tests/marketPricebook"], 20 * 60_000);
const release = runReleaseVerifyForMarketPricebook();

const status = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
const finalWorktreeClean = status.split(/\r?\n/).every((line, index) => index === 0 || line.trim() === "");
const branchPushed = sourceHead === originHead;
const failures = [
  ...(material.exit_code === 0 ? [] : ["material_coverage_failed"]),
  ...(pricebook.exit_code === 0 ? [] : ["pricebook_coverage_failed"]),
  ...(importValidation.exit_code === 0 ? [] : ["import_validation_failed"]),
  ...(freshness.exit_code === 0 ? [] : ["freshness_failed"]),
  ...(regionalCurrency.exit_code === 0 ? [] : ["regional_currency_failed"]),
  ...(noFakePrice.exit_code === 0 ? [] : ["no_fake_price_failed"]),
  ...(snapshot.exit_code === 0 ? [] : ["snapshot_failed"]),
  ...(smart1500.exit_code === 0 ? [] : ["smart_estimator_1500_coverage_failed"]),
  ...(deepGolden300.exit_code === 0 ? [] : ["deep_golden_300_failed"]),
  ...(typecheck.exit_code === 0 ? [] : ["typecheck_failed"]),
  ...(lint.exit_code === 0 ? [] : ["lint_failed"]),
  ...(focused.exit_code === 0 ? [] : ["focused_tests_failed"]),
  ...(release.release_verify_passed === true ? [] : ["release_verify_failed"]),
  ...(branchPushed ? [] : ["branch_not_pushed"]),
  ...(finalWorktreeClean ? [] : ["worktree_not_clean"]),
];

const proof = {
  final_status: failures.length === 0
    ? "GREEN_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE_READY"
    : "BLOCKED_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE",
  source_code_head: sourceHead,
  origin_head: originHead,
  branch_pushed: branchPushed,
  material_coverage_passed: material.exit_code === 0,
  pricebook_coverage_passed: pricebook.exit_code === 0,
  import_validation_passed: importValidation.exit_code === 0,
  freshness_passed: freshness.exit_code === 0,
  regional_currency_passed: regionalCurrency.exit_code === 0,
  no_fake_price_passed: noFakePrice.exit_code === 0,
  snapshot_passed: snapshot.exit_code === 0,
  smart_estimator_1500_price_coverage_passed: smart1500.exit_code === 0,
  deep_golden_300_price_coverage_passed: deepGolden300.exit_code === 0,
  typecheck_passed: typecheck.exit_code === 0,
  lint_passed: lint.exit_code === 0,
  focused_tests_passed: focused.exit_code === 0,
  release_verify_passed: release.release_verify_passed === true,
  post_push_release_verify_passed: release.release_verify_passed === true && branchPushed,
  local_head_equals_origin_head: branchPushed,
  final_worktree_clean: finalWorktreeClean,
  production_db_write_attempted: false,
  catalog_items_destructive_mutation: false,
  ui_redesign_done: false,
  pdf_rewrite_done: false,
  ios_build_started: false,
  eas_build_started: false,
  testflight_started: false,
  platform_checks: {
    material,
    pricebook,
    importValidation,
    freshness,
    regionalCurrency,
    noFakePrice,
    snapshot,
    smart1500,
    deepGolden300,
    typecheck,
    lint,
    focused,
    release,
  },
  failures,
  fake_green_claimed: false,
};

writeMarketPricebookJson("CLOSEOUT_PROOF.json", proof);
writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot(proof));

console.log(JSON.stringify(proof, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
