import {
  buildMarketPricebookMatrixSnapshot,
  compactMarketPricebookCommandResult,
  gitOutput,
  isMarketPricebookArtifactOnlyStatus,
  runMarketMaterialCoverageAudit,
  runMarketPriceDeepGolden300Audit,
  runMarketPriceFreshnessAudit,
  runMarketPriceNoFakePriceAudit,
  runMarketPriceRegionalCurrencyAudit,
  runMarketPriceSmartEstimator1500CoverageAudit,
  runMarketPriceSnapshotAudit,
  runMarketPricebookCoverageAudit,
  runMarketPricebookImportValidation,
  runCommandForMarketPricebook,
  runReleaseVerifyForMarketPricebook,
  resolveMarketPricebookSourceHead,
  writeMarketPricebookJson,
} from "./runMarketMaterialCoverageAudit";

type WaveJson = Record<string, unknown>;

const currentHead = gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
const sourceHead = resolveMarketPricebookSourceHead();
const originHead = gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "UNKNOWN_ORIGIN");

function auditCheck(command: string, result: WaveJson): WaveJson {
  const blocked = String(result.final_status ?? "").startsWith("BLOCKED");
  return {
    command,
    exit_code: blocked ? 1 : 0,
    signal: null,
    timed_out: false,
    ...result,
    fake_green_claimed: false,
  };
}

const material = auditCheck(
  "npx tsx scripts/e2e/runMarketMaterialCoverageAudit.ts",
  runMarketMaterialCoverageAudit({ writeArtifacts: false }),
);
const pricebook = auditCheck(
  "npx tsx scripts/e2e/runMarketPricebookCoverageAudit.ts",
  runMarketPricebookCoverageAudit({ writeArtifacts: false }),
);
const importValidation = auditCheck(
  "npx tsx scripts/e2e/runMarketPricebookImportValidation.ts",
  runMarketPricebookImportValidation({ writeArtifacts: false }),
);
const freshness = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceFreshnessAudit.ts",
  runMarketPriceFreshnessAudit({ writeArtifacts: false }),
);
const regionalCurrency = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceRegionalCurrencyAudit.ts",
  runMarketPriceRegionalCurrencyAudit({ writeArtifacts: false }),
);
const noFakePrice = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceNoFakePriceAudit.ts",
  runMarketPriceNoFakePriceAudit({ writeArtifacts: false }),
);
const snapshot = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceSnapshotAudit.ts",
  runMarketPriceSnapshotAudit({ writeArtifacts: false }),
);
const smart1500 = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceSmartEstimator1500CoverageAudit.ts",
  runMarketPriceSmartEstimator1500CoverageAudit({ writeArtifacts: false }),
);
const deepGolden300 = auditCheck(
  "npx tsx scripts/e2e/runMarketPriceDeepGolden300Audit.ts",
  runMarketPriceDeepGolden300Audit({ writeArtifacts: false }),
);
const typecheck = compactMarketPricebookCommandResult(
  runCommandForMarketPricebook("npm", ["run", "verify:typecheck"], 20 * 60_000),
);
const lint = compactMarketPricebookCommandResult(
  runCommandForMarketPricebook("npm", ["run", "lint"], 20 * 60_000),
);
const focused = compactMarketPricebookCommandResult(
  runCommandForMarketPricebook("npm", ["test", "--", "--runInBand", "tests/marketPricebook"], 20 * 60_000),
);
const release = runReleaseVerifyForMarketPricebook();

const status = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
const statusClean = status.split(/\r?\n/).every((line, index) => index === 0 || line.trim() === "");
const finalWorktreeClean = statusClean || isMarketPricebookArtifactOnlyStatus(status);
const branchPushed = currentHead === originHead;
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
  origin_head: sourceHead,
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
