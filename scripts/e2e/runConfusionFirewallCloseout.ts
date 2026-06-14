import {
  buildConfusionFirewallMatrixSnapshot,
  currentHeadAtWriteTime,
  gitOutput,
  runCarpetNoMasonryAudit,
  runCommandForConfusionFirewall,
  runConfusionFirewall1500Audit,
  runConfusionPairHardAudit,
  runCrossDomainEstimateLeakAudit,
  runExpandedPdfSignatureAudit,
  runReleaseVerifyForConfusionFirewall,
  sourceCodeHead,
  writeConfusionFirewallJson,
} from "./confusionFirewall1500RealWorkCases";
import { GREEN_CONFUSION_FIREWALL_1500 } from "../../src/lib/ai/workOntology/confusionFirewall";

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

const firewall1500 = runConfusionFirewall1500Audit();
const pairHard = runConfusionPairHardAudit();
const crossDomain = runCrossDomainEstimateLeakAudit();
const carpetNoMasonry = runCarpetNoMasonryAudit();
const expandedPdf = runExpandedPdfSignatureAudit();

const typecheck = runCommandForConfusionFirewall("npm", ["run", "verify:typecheck"], 20 * 60_000);
const lint = runCommandForConfusionFirewall("npm", ["run", "lint"], 20 * 60_000);
const focused = runCommandForConfusionFirewall(
  "npm",
  [
    "test",
    "--",
    "--runInBand",
    "tests/workOntology/ukladkaDoesNotTriggerKladka.contract.test.ts",
    "tests/workOntology/objectDominatesOperation.contract.test.ts",
    "tests/workOntology/masonryRequiresMasonryObject.contract.test.ts",
    "tests/workOntology/confusionFirewall1500.contract.test.ts",
    "tests/workOntology/confusionPairHardSet.contract.test.ts",
    "tests/workOntology/noFirstItemFallback.contract.test.ts",
    "tests/workOntology/noRandomChoice.contract.test.ts",
    "tests/workOntology/noGenericFallbackForKnownWork.contract.test.ts",
    "tests/professionalEstimateTemplates/laminateDoesNotUseMasonryRows.contract.test.ts",
    "tests/professionalEstimateTemplates/tileDoesNotUseBrickMasonryRows.contract.test.ts",
    "tests/professionalEstimateTemplates/rowProvenanceRequired.contract.test.ts",
    "tests/pdf/expandedEstimateNoFullNamesAppendix.contract.test.ts",
    "tests/pdf/expandedEstimateSignatureBlocks.contract.test.ts",
    "tests/pdf/expandedEstimateReadableRows.contract.test.ts",
  ],
  20 * 60_000,
);
const release = runReleaseVerifyForConfusionFirewall();

const failures: string[] = [];
if (!worktreeCleanBefore) failures.push("WORKTREE_NOT_CLEAN_BEFORE_CLOSEOUT");
if (headBefore !== originBefore) failures.push("LOCAL_HEAD_NOT_EQUAL_ORIGIN_BEFORE_CLOSEOUT");
if (firewall1500.final_status !== GREEN_CONFUSION_FIREWALL_1500) failures.push(`FIREWALL_1500_${String(firewall1500.final_status)}`);
if (pairHard.final_status !== "GREEN_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT_READY") {
  failures.push(`CONFUSION_PAIR_${String(pairHard.final_status)}`);
}
if (crossDomain.final_status !== "GREEN_CONFUSION_FIREWALL_CROSS_DOMAIN_ESTIMATE_LEAK_AUDIT_READY") {
  failures.push(`CROSS_DOMAIN_${String(crossDomain.final_status)}`);
}
if (carpetNoMasonry.final_status !== "GREEN_CONFUSION_FIREWALL_CARPET_NO_MASONRY_READY") {
  failures.push(`CARPET_${String(carpetNoMasonry.final_status)}`);
}
if (expandedPdf.final_status !== "GREEN_CONFUSION_FIREWALL_EXPANDED_PDF_SIGNATURE_READY") {
  failures.push(`EXPANDED_PDF_${String(expandedPdf.final_status)}`);
}
if (!passed(typecheck)) failures.push("TYPECHECK_FAILED");
if (!passed(lint)) failures.push("LINT_FAILED");
if (!passed(focused)) failures.push("FOCUSED_TESTS_FAILED");
if (release.final_status !== "GREEN_CONFUSION_FIREWALL_RELEASE_VERIFY_READY") failures.push("RELEASE_VERIFY_FAILED");

const proof = {
  final_status: failures.length === 0
    ? GREEN_CONFUSION_FIREWALL_1500
    : "BLOCKED_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT",
  source_code_head: sourceCodeHead(),
  artifact_commit_before_closeout: currentHeadAtWriteTime(),
  origin_head: originBefore,
  branch: gitOutput(["branch", "--show-current"], "unknown"),
  branch_pushed: headBefore === originBefore,
  typecheck_passed: passed(typecheck),
  lint_passed: passed(lint),
  focused_tests_passed: passed(focused),
  firewall_1500_audit_passed: firewall1500.final_status === GREEN_CONFUSION_FIREWALL_1500,
  confusion_pair_hard_audit_passed: pairHard.final_status === "GREEN_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT_READY",
  cross_domain_leak_audit_passed: crossDomain.final_status === "GREEN_CONFUSION_FIREWALL_CROSS_DOMAIN_ESTIMATE_LEAK_AUDIT_READY",
  carpet_no_masonry_audit_passed: carpetNoMasonry.final_status === "GREEN_CONFUSION_FIREWALL_CARPET_NO_MASONRY_READY",
  expanded_pdf_signature_audit_passed: expandedPdf.final_status === "GREEN_CONFUSION_FIREWALL_EXPANDED_PDF_SIGNATURE_READY",
  release_verify_passed: release.final_status === "GREEN_CONFUSION_FIREWALL_RELEASE_VERIFY_READY",
  post_push_release_verify_passed: release.final_status === "GREEN_CONFUSION_FIREWALL_RELEASE_VERIFY_READY" && headBefore === originBefore,
  local_head_equals_origin_head: headBefore === originBefore,
  final_worktree_clean: worktreeCleanBefore,
  no_ios_runtime_claimed: true,
  ios_build_started: false,
  eas_build_started: false,
  testflight_started: false,
  production_db_write_attempted: false,
  platform_checks: {
    typecheck,
    lint,
    focused,
    release,
  },
  audit_results: {
    firewall1500,
    pairHard,
    crossDomain,
    carpetNoMasonry,
    expandedPdf,
  },
  failures,
  fake_green_claimed: false,
};

writeConfusionFirewallJson("CLOSEOUT_PROOF.json", proof);
writeConfusionFirewallJson("matrix.json", buildConfusionFirewallMatrixSnapshot(proof));

console.log(JSON.stringify(proof, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
