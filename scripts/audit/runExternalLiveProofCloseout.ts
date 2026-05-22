import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  buildExternalLiveProofCloseoutPlan,
  loadAuditEnvFiles,
  readFinal50k92Matrix,
  redactLiveProofOutput,
  writeExternalLiveProofCloseoutArtifacts,
  type ExternalLiveProofCloseoutResult,
  type ExternalLiveProofStepPlan,
  type ExternalLiveProofStepResult,
} from "./externalLiveProofCloseout.shared";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const afterGates = args.has("--after-gates");

function tsxCommand(): { command: string; argsPrefix: string[] } {
  return {
    command: process.execPath,
    argsPrefix: [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs")],
  };
}

function runStep(plan: ExternalLiveProofStepPlan): ExternalLiveProofStepResult {
  const env = {
    ...process.env,
    ...(afterGates
      ? {
          RLS_DYNAMIC_FULL_JEST_PASSED: "1",
          RLS_DYNAMIC_RELEASE_VERIFY_PASSED: "1",
          WHOLE_APP_50K_FULL_JEST_PASSED: "1",
          WHOLE_APP_50K_RELEASE_VERIFY_PASSED: "1",
        }
      : {}),
  };
  const command = tsxCommand();
  const result = spawnSync(command.command, [...command.argsPrefix, plan.runner], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const exitCode = typeof result.status === "number" ? result.status : null;
  const spawnError = result.error instanceof Error ? result.error.message : "";
  const blocked = plan.mode === "blocked_preflight" && exitCode !== 0;
  const passed = exitCode === 0;
  const failed = !passed && !blocked;

  return {
    ...plan,
    exit_code: exitCode,
    status: passed ? "passed" : blocked ? "blocked" : failed ? "failed" : "not_run",
    stdout_tail: redactLiveProofOutput(result.stdout ?? ""),
    stderr_tail: redactLiveProofOutput(`${spawnError}\n${result.stderr ?? ""}`),
  };
}

loadAuditEnvFiles();

const plan = buildExternalLiveProofCloseoutPlan();
const stepResults = plan.steps.map(runStep);
const finalMatrix = readFinal50k92Matrix();
const finalStatus = typeof finalMatrix.final_status === "string" ? finalMatrix.final_status : "MISSING";
const externalBlockers = Array.isArray(finalMatrix.external_blockers) ? finalMatrix.external_blockers : [];
const greenReady = finalStatus === "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY";

const result: ExternalLiveProofCloseoutResult = {
  ...plan,
  strict,
  after_gates: afterGates,
  steps: stepResults,
  final_matrix: finalMatrix,
  final_status: finalStatus,
  external_blockers: externalBlockers,
  green_ready: greenReady,
};

writeExternalLiveProofCloseoutArtifacts(result);
console.log(JSON.stringify({
  final_status: result.final_status,
  green_ready: result.green_ready,
  can_run_all_live_proofs: result.can_run_all_live_proofs,
  external_blockers: result.external_blockers,
  missing_requirements: result.missing_requirements,
  fake_green_claimed: result.fake_green_claimed,
}, null, 2));

if (strict && !greenReady) process.exit(1);
