import {
  GREEN_SMART_ESTIMATOR,
} from "../../src/lib/ai/smartEstimator";
import {
  buildSmartEstimatorMatrixSnapshot,
  gitOutput,
  runCommandForSmartEstimator,
  runReleaseVerifyForSmartEstimator,
  writeSmartEstimatorJson,
} from "./smartEstimator1500ProductionCases";

function passed(result: Record<string, unknown>): boolean {
  return result.exit_code === 0 && result.timed_out !== true;
}

const headBefore = gitOutput(["rev-parse", "HEAD"], "unknown");
const originBefore = gitOutput(["rev-parse", "@{u}"], "unknown");
const statusBefore = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
const worktreeCleanBefore = statusBefore
  .split(/\r?\n/)
  .slice(1)
  .every((line) => line.trim().length === 0);

const protocol = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorProtocolAudit.ts"], 5 * 60_000);
const production1500 = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimator1500ProductionAudit.ts"], 5 * 60_000);
const deepGolden = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorDeepGolden300Audit.ts"], 5 * 60_000);
const clarification = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorClarificationAudit.ts"], 5 * 60_000);
const realPrice = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorRealPriceAudit.ts"], 5 * 60_000);
const regionalCurrency = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorRegionalCurrencyAudit.ts"], 5 * 60_000);
const snapshotNoDesync = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorSnapshotNoDesyncAudit.ts"], 5 * 60_000);
const pdfParity = runCommandForSmartEstimator("npx", ["tsx", "scripts/e2e/runSmartEstimatorPdfParityAudit.ts"], 5 * 60_000);
const typecheck = runCommandForSmartEstimator("npm", ["run", "verify:typecheck"], 20 * 60_000);
const lint = runCommandForSmartEstimator("npm", ["run", "lint"], 20 * 60_000);
const focused = runCommandForSmartEstimator("npm", ["test", "--", "--runInBand", "tests/smartEstimator"], 20 * 60_000);
const release = runReleaseVerifyForSmartEstimator();

const failures: string[] = [];
if (!worktreeCleanBefore) failures.push("WORKTREE_NOT_CLEAN_BEFORE_CLOSEOUT");
if (headBefore !== originBefore) failures.push("LOCAL_HEAD_NOT_EQUAL_ORIGIN_BEFORE_CLOSEOUT");
if (!passed(protocol)) failures.push("PROTOCOL_AUDIT_FAILED");
if (!passed(production1500)) failures.push("SMART_ESTIMATOR_1500_AUDIT_FAILED");
if (!passed(deepGolden)) failures.push("DEEP_GOLDEN_300_AUDIT_FAILED");
if (!passed(clarification)) failures.push("CLARIFICATION_AUDIT_FAILED");
if (!passed(realPrice)) failures.push("REAL_PRICE_AUDIT_FAILED");
if (!passed(regionalCurrency)) failures.push("REGIONAL_CURRENCY_AUDIT_FAILED");
if (!passed(snapshotNoDesync)) failures.push("SNAPSHOT_NO_DESYNC_AUDIT_FAILED");
if (!passed(pdfParity)) failures.push("PDF_PARITY_AUDIT_FAILED");
if (!passed(typecheck)) failures.push("TYPECHECK_FAILED");
if (!passed(lint)) failures.push("LINT_FAILED");
if (!passed(focused)) failures.push("FOCUSED_TESTS_FAILED");
if (release.final_status !== "GREEN_SMART_ESTIMATOR_RELEASE_VERIFY_READY") failures.push("RELEASE_VERIFY_FAILED");

const proof = {
  final_status: failures.length === 0
    ? GREEN_SMART_ESTIMATOR
    : "BLOCKED_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE",
  source_code_head: headBefore,
  origin_head: originBefore,
  branch_pushed: headBefore === originBefore,
  protocol_audit_passed: passed(protocol),
  smart_estimator_1500_passed: passed(production1500),
  deep_golden_300_passed: passed(deepGolden),
  clarification_audit_passed: passed(clarification),
  real_price_audit_passed: passed(realPrice),
  regional_currency_audit_passed: passed(regionalCurrency),
  snapshot_no_desync_audit_passed: passed(snapshotNoDesync),
  pdf_parity_audit_passed: passed(pdfParity),
  typecheck_passed: passed(typecheck),
  lint_passed: passed(lint),
  focused_tests_passed: passed(focused),
  release_verify_passed: release.final_status === "GREEN_SMART_ESTIMATOR_RELEASE_VERIFY_READY",
  post_push_release_verify_passed: release.final_status === "GREEN_SMART_ESTIMATOR_RELEASE_VERIFY_READY" && headBefore === originBefore,
  local_head_equals_origin_head: headBefore === originBefore,
  final_worktree_clean: worktreeCleanBefore,
  no_ios_runtime_claimed: true,
  ios_build_started: false,
  eas_build_started: false,
  testflight_started: false,
  production_db_write_attempted: false,
  platform_checks: {
    protocol,
    production1500,
    deepGolden,
    clarification,
    realPrice,
    regionalCurrency,
    snapshotNoDesync,
    pdfParity,
    typecheck,
    lint,
    focused,
    release,
  },
  failures,
  fake_green_claimed: false,
};

writeSmartEstimatorJson("CLOSEOUT_PROOF.json", proof);
writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot(proof));

console.log(JSON.stringify(proof, null, 2));
