import { spawn, spawnSync } from "node:child_process";
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
const DEFAULT_STEP_TIMEOUT_MS = 180_000;

function parseStepTimeoutMs(): number {
  const raw = process.env.EXTERNAL_LIVE_PROOF_STEP_TIMEOUT_MS;
  if (!raw) return DEFAULT_STEP_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("EXTERNAL_LIVE_PROOF_STEP_TIMEOUT_MS must be a positive number.");
  }
  return value;
}

function tsxCommand(): { command: string; argsPrefix: string[] } {
  return {
    command: process.execPath,
    argsPrefix: [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs")],
  };
}

function tail(value: string, limit = 2500): string {
  if (value.length <= limit) return value;
  return value.slice(value.length - limit);
}

function cleanupProcessTree(pid: number | undefined): Pick<
  ExternalLiveProofStepResult,
  "cleanup_command" | "cleanup_exit_code" | "cleanup_stdout_tail" | "cleanup_stderr_tail"
> {
  if (!pid) {
    return {
      cleanup_command: null,
      cleanup_exit_code: null,
      cleanup_stdout_tail: "",
      cleanup_stderr_tail: "",
    };
  }

  const cleanupCommand = process.platform === "win32"
    ? { command: "taskkill", args: ["/PID", String(pid), "/T", "/F"] }
    : { command: "kill", args: ["-TERM", `-${pid}`] };
  const result = spawnSync(cleanupCommand.command, cleanupCommand.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
    windowsHide: true,
  });

  return {
    cleanup_command: [cleanupCommand.command, ...cleanupCommand.args].join(" "),
    cleanup_exit_code: typeof result.status === "number" ? result.status : null,
    cleanup_stdout_tail: redactLiveProofOutput(String(result.stdout ?? "")),
    cleanup_stderr_tail: redactLiveProofOutput(`${String(result.stderr ?? "")}${result.error ? `\n${result.error.message}` : ""}`),
  };
}

function runStep(plan: ExternalLiveProofStepPlan, timeoutMs: number): Promise<ExternalLiveProofStepResult> {
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
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    let timer: ReturnType<typeof setTimeout>;
    const child = spawn(command.command, [...command.argsPrefix, plan.runner], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const finish = (
      exitCode: number | null,
      spawnError: string,
      timedOut: boolean,
      cleanup: Pick<
        ExternalLiveProofStepResult,
        "cleanup_command" | "cleanup_exit_code" | "cleanup_stdout_tail" | "cleanup_stderr_tail"
      >,
    ) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const blocked = plan.mode === "blocked_preflight" && exitCode !== 0 && !timedOut;
      const passed = exitCode === 0 && !timedOut;
      const failed = !passed && !blocked && !timedOut;
      resolve({
        ...plan,
        exit_code: exitCode,
        status: passed ? "passed" : blocked ? "blocked" : timedOut ? "timeout" : failed ? "failed" : "not_run",
        timeout_ms: timeoutMs,
        timed_out: timedOut,
        ...cleanup,
        stdout_tail: redactLiveProofOutput(tail(stdout)),
        stderr_tail: redactLiveProofOutput(tail(`${spawnError}\n${stderr}`)),
      });
    };

    timer = setTimeout(() => {
      const cleanup = cleanupProcessTree(child.pid);
      finish(null, `Timed out after ${timeoutMs}ms`, true, cleanup);
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      finish(typeof code === "number" ? code : null, "", false, {
        cleanup_command: null,
        cleanup_exit_code: null,
        cleanup_stdout_tail: "",
        cleanup_stderr_tail: "",
      });
    });
    child.on("error", (error) => {
      finish(null, error instanceof Error ? error.message : String(error), false, {
        cleanup_command: null,
        cleanup_exit_code: null,
        cleanup_stdout_tail: "",
        cleanup_stderr_tail: "",
      });
    });
  });
}

loadAuditEnvFiles();

async function main() {
  const stepTimeoutMs = parseStepTimeoutMs();
  const plan = buildExternalLiveProofCloseoutPlan();
  const stepResults: ExternalLiveProofStepResult[] = [];

  for (const step of plan.steps) {
    stepResults.push(await runStep(step, stepTimeoutMs));
  }

  const finalMatrix = readFinal50k92Matrix();
  const finalStatus = typeof finalMatrix.final_status === "string" ? finalMatrix.final_status : "MISSING";
  const externalBlockers = Array.isArray(finalMatrix.external_blockers) ? finalMatrix.external_blockers : [];
  const greenReady = finalStatus === "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY";
  const timedOut = stepResults.some((step) => step.timed_out);

  const result: ExternalLiveProofCloseoutResult = {
    ...plan,
    strict,
    after_gates: afterGates,
    steps: stepResults,
    final_matrix: finalMatrix,
    final_status: timedOut ? "BLOCKED_EXTERNAL_LIVE_PROOF_TIMEOUT" : finalStatus,
    external_blockers: timedOut
      ? [
          ...externalBlockers,
          ...stepResults
            .filter((step) => step.timed_out)
            .map((step) => ({
              classification: "BLOCKED_EXTERNAL_LIVE_PROOF_TIMEOUT",
              gate: step.id,
              runner: step.runner,
              timeout_ms: step.timeout_ms,
            })),
        ]
      : externalBlockers,
    green_ready: greenReady && !timedOut,
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

  if (strict && (!result.green_ready || timedOut)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
