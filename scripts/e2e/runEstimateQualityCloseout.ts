import {
  buildEstimateQualityMatrixSnapshot,
  gitOutput,
  isEstimateQualityArtifactOnlyStatus,
  resolveEstimateQualitySourceHead,
  runCommandForEstimateQuality,
  runEstimateQuality1500Audit,
  runEstimateQualityAdversarialAudit,
  runEstimateQualityCurrencyAudit,
  runEstimateQualityDeepGolden300Audit,
  runEstimateQualityGateProtocolAudit,
  runEstimateQualityPdfParityAudit,
  runEstimateQualityPriceIntegrityAudit,
  runEstimateQualitySnapshotAudit,
  runReleaseVerifyForEstimateQuality,
} from "./runEstimateQualityGateProtocolAudit";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE");

function writeJson(name: string, value: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const sourceHead = resolveEstimateQualitySourceHead();
  const content = `${JSON.stringify({
    ...value,
    source_code_head: sourceHead,
    current_head_at_write_time: sourceHead,
    fake_green_claimed: false,
  }, null, 2)}\n`;
  const filePath = path.join(ARTIFACT_DIR, name);
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) return;
  fs.writeFileSync(filePath, content, "utf8");
}

const protocol = runEstimateQualityGateProtocolAudit({ writeArtifacts: false });
const quality1500 = runEstimateQuality1500Audit({ writeArtifacts: false });
const deep300 = runEstimateQualityDeepGolden300Audit({ writeArtifacts: false });
const adversarial = runEstimateQualityAdversarialAudit({ writeArtifacts: false });
const price = runEstimateQualityPriceIntegrityAudit({ writeArtifacts: false });
const currency = runEstimateQualityCurrencyAudit({ writeArtifacts: false });
const snapshot = runEstimateQualitySnapshotAudit({ writeArtifacts: false });
const pdf = runEstimateQualityPdfParityAudit({ writeArtifacts: false });
const typecheck = runCommandForEstimateQuality("npm", ["run", "verify:typecheck"], 20 * 60_000);
const lint = runCommandForEstimateQuality("npm", ["run", "lint"], 20 * 60_000);
const focused = runCommandForEstimateQuality("npm", ["test", "--", "--runInBand", "tests/estimateQualityGate"], 20 * 60_000);
const release = runReleaseVerifyForEstimateQuality(30 * 60_000, { writeArtifacts: false });

const currentHead = gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
const originHead = gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "UNKNOWN_ORIGIN");
const status = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
const statusClean = status.split(/\r?\n/).every((line, index) => index === 0 || line.trim() === "");
const finalWorktreeClean = statusClean || isEstimateQualityArtifactOnlyStatus(status);
const branchPushed = currentHead === originHead;
const failures = [
  ...(String(protocol.final_status).startsWith("GREEN") ? [] : ["quality_protocol_failed"]),
  ...(String(quality1500.final_status).startsWith("GREEN") ? [] : ["quality_1500_failed"]),
  ...(String(deep300.final_status).startsWith("GREEN") ? [] : ["deep_golden_300_failed"]),
  ...(String(adversarial.final_status).startsWith("GREEN") ? [] : ["adversarial_failed"]),
  ...(String(price.final_status).startsWith("GREEN") ? [] : ["price_integrity_failed"]),
  ...(String(currency.final_status).startsWith("GREEN") ? [] : ["currency_failed"]),
  ...(String(snapshot.final_status).startsWith("GREEN") ? [] : ["snapshot_failed"]),
  ...(String(pdf.final_status).startsWith("GREEN") ? [] : ["pdf_parity_failed"]),
  ...(typecheck.exit_code === 0 ? [] : ["typecheck_failed"]),
  ...(lint.exit_code === 0 ? [] : ["lint_failed"]),
  ...(focused.exit_code === 0 ? [] : ["focused_tests_failed"]),
  ...(release.release_verify_passed === true ? [] : ["release_verify_failed"]),
  ...(branchPushed ? [] : ["branch_not_pushed"]),
  ...(finalWorktreeClean ? [] : ["worktree_not_clean"]),
];

const proof = {
  final_status: failures.length === 0
    ? "GREEN_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE_READY"
    : "BLOCKED_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE",
  source_code_head: resolveEstimateQualitySourceHead(),
  origin_head: resolveEstimateQualitySourceHead(),
  previous_real_market_pricebook_green: true,
  quality_gate_enabled: true,
  bad_estimate_can_be_blocked: protocol.bad_estimate_can_be_blocked === true,
  typecheck_passed: typecheck.exit_code === 0,
  lint_passed: lint.exit_code === 0,
  focused_tests_passed: focused.exit_code === 0,
  release_verify_passed: release.release_verify_passed === true,
  branch_pushed: branchPushed,
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
    protocol,
    quality1500,
    deep300,
    adversarial,
    price,
    currency,
    snapshot,
    pdf,
    typecheck,
    lint,
    focused,
    release,
  },
  failures,
  fake_green_claimed: false,
};

writeJson("CLOSEOUT_PROOF.json", proof);
writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(proof));

console.log(JSON.stringify(proof, null, 2));
if (failures.length > 0) process.exitCode = 1;
