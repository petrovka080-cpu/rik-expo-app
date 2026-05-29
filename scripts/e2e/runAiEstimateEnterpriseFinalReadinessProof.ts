import { execSync } from "node:child_process";

import {
  assertAiEstimateEnterpriseFinalReadinessGreen,
  writeAiEstimateEnterpriseFinalReadinessArtifacts,
} from "../audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";
import { runAndroidApi34AiEstimateFinalReadinessSmoke } from "./runAndroidApi34AiEstimateFinalReadinessSmoke";
import { runAiEstimateFinalReadinessPdfProof } from "./runAiEstimateFinalReadinessPdfProof";

function env(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function run(command: string): void {
  execSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 120_000,
  });
}

export function runAiEstimateEnterpriseFinalReadinessProof() {
  const verification = {
    typecheckPassed: env("AI_ESTIMATE_FINAL_READINESS_TYPECHECK_PASSED"),
    lintPassed: env("AI_ESTIMATE_FINAL_READINESS_LINT_PASSED"),
    gitDiffCheckPassed: env("AI_ESTIMATE_FINAL_READINESS_GIT_DIFF_CHECK_PASSED"),
    targetedTestsPassed: env("AI_ESTIMATE_FINAL_READINESS_TARGETED_TESTS_PASSED"),
    architectureTestsPassed: env("AI_ESTIMATE_FINAL_READINESS_ARCHITECTURE_TESTS_PASSED"),
    playwrightWebPassed: env("AI_ESTIMATE_FINAL_READINESS_PLAYWRIGHT_WEB_PASSED"),
    androidApi34SmokePassed: env("AI_ESTIMATE_FINAL_READINESS_ANDROID_API34_SMOKE_PASSED"),
    pdfFinalProofPassed: env("AI_ESTIMATE_FINAL_READINESS_PDF_FINAL_PROOF_PASSED"),
    runtimeProofPassed: true,
    fullJestPassed: env("AI_ESTIMATE_FINAL_READINESS_FULL_JEST_PASSED"),
    releaseVerifyPassed: env("AI_ESTIMATE_FINAL_READINESS_RELEASE_VERIFY_PASSED"),
    commitCreated: env("AI_ESTIMATE_FINAL_READINESS_COMMIT_CREATED"),
    branchPushed: env("AI_ESTIMATE_FINAL_READINESS_BRANCH_PUSHED"),
    finalWorktreeClean: env("AI_ESTIMATE_FINAL_READINESS_FINAL_WORKTREE_CLEAN"),
  };

  run("npx tsx scripts/audit/runAiEstimateFinalReadinessMatrixLedgerAudit.ts");
  run("npx tsx scripts/audit/runAiEstimateObservabilityAudit.ts");
  run("npx tsx scripts/audit/runAiEstimateRollbackKillSwitchAudit.ts");
  run("npx tsx scripts/audit/runAiEstimateCanaryReadinessAudit.ts");
  run("npx tsx scripts/audit/runAiEstimateSafetyAbuseAudit.ts");
  runAiEstimateFinalReadinessPdfProof();
  runAndroidApi34AiEstimateFinalReadinessSmoke();

  const report = writeAiEstimateEnterpriseFinalReadinessArtifacts({
    verification,
    ignoreNonArtifactDirtyPaths: true,
  });
  if (report.matrix.blockers.some((blocker) => blocker === "UNKNOWN_NEEDS_TRACE")) {
    throw new Error("UNKNOWN_NEEDS_TRACE");
  }
  if (verification.releaseVerifyPassed) {
    assertAiEstimateEnterpriseFinalReadinessGreen({ verification });
  }
  return {
    classification: report.matrix.final_status === "GREEN_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_GO_READY"
      ? "FINAL_READINESS_GO"
      : "FINAL_READINESS_NO_GO",
    report,
  };
}

if (require.main === module) {
  const result = runAiEstimateEnterpriseFinalReadinessProof();
  if (result.classification !== "FINAL_READINESS_GO" && env("AI_ESTIMATE_FINAL_READINESS_RELEASE_VERIFY_PASSED")) {
    throw new Error(`${result.classification}:${result.report.matrix.blockers.join(";")}`);
  }
}
