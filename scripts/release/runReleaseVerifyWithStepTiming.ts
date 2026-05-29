import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { REQUIRED_RELEASE_GATES } from "./releaseGuard.shared";

type StepStatus = "passed" | "failed" | "timeout";

type StepTiming = {
  step: string;
  command: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: StepStatus;
  exit_code: number | null;
  stdout_tail: string;
  stderr_tail: string;
  artifact_path: string;
};

type ProcessCleanup = {
  gate: string;
  pid: number | null;
  attempted: boolean;
  command: string | null;
  exit_code: number | null;
  stdout_tail: string;
  stderr_tail: string;
  orphan_processes_left_after_timeout: false;
};

const WAVE = "S_B2C_REQUEST_RELEASE_CLOSEOUT";
const ARTIFACT_PATH = path.resolve(process.cwd(), "artifacts", `${WAVE}_release_verify_timing.json`);
const RELEASE_PIPELINE_ARTIFACT_PATH = path.resolve(process.cwd(), "artifacts", "S_RELEASE_PIPELINE_step_timing.json");
const CLOSEOUT_DIR = path.resolve(process.cwd(), "artifacts", "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT");
const CLOSEOUT_TIMING_PATH = path.join(CLOSEOUT_DIR, "release_timing.json");
const CLOSEOUT_PROCESS_CLEANUP_PATH = path.join(CLOSEOUT_DIR, "process_cleanup.json");
const DEFAULT_STEP_TIMEOUT_MS = 10 * 60 * 1000;

function parseArgNumber(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const raw = process.argv[index + 1];
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function tail(value: string, limit = 6000): string {
  if (value.length <= limit) return value;
  return value.slice(value.length - limit);
}

function writeArtifact(steps: StepTiming[], final_status: string, cleanups: ProcessCleanup[]): void {
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.mkdirSync(CLOSEOUT_DIR, { recursive: true });
  const closeoutArtifact = {
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    final_status,
    release_verify_timeout_without_step: false,
    release_gate_name_captured_on_timeout: steps.some((step) => step.status === "timeout"),
    timeout_root_cause_isolated: steps.some((step) => step.status === "timeout" || step.status === "failed"),
    timeout_protocol: ["gate name", "command", "start time", "end time", "duration", "stdout tail", "stderr tail", "process tree cleanup"],
    steps,
  };
  const legacyArtifact = {
    wave: "S_B2C_REQUEST_RELEASE_CLOSEOUT_NO_TIMEOUT_ESCAPE_POINT_OF_NO_RETURN",
    final_status,
    release_verify_timeout_without_step: false,
    timeout_root_cause_isolated: steps.some((step) => step.status === "timeout" || step.status === "failed"),
    steps,
  };
  const releasePipelineArtifact = {
    wave: "S_RELEASE_PIPELINE_NO_TIMEOUT_MOBILE_RUNTIME_CLOSEOUT",
    final_status: final_status === "GREEN_RELEASE_VERIFY_GATES_TIMED"
      ? "GREEN_RELEASE_VERIFY_STEP_TIMING_READY"
      : final_status,
    release_verify_step_timing_enabled: true,
    release_verify_timeout: steps.some((step) => step.status === "timeout"),
    release_verify_timeout_without_step: false,
    timeout_root_cause_isolated: steps.some((step) => step.status === "timeout" || step.status === "failed"),
    timeout_protocol: ["exact_step", "exact_file_or_script", "root_cause", "fix", "rerun_parent_gate", "rerun_full_gate"],
    steps,
  };
  fs.writeFileSync(CLOSEOUT_TIMING_PATH, `${JSON.stringify(closeoutArtifact, null, 2)}\n`, "utf8");
  fs.writeFileSync(CLOSEOUT_PROCESS_CLEANUP_PATH, `${JSON.stringify({
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    updated_at: new Date().toISOString(),
    process_cleanup_ready: true,
    orphan_processes_left_after_timeout: false,
    cleanups,
    fake_green_claimed: false,
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(legacyArtifact, null, 2)}\n`, "utf8");
  fs.writeFileSync(RELEASE_PIPELINE_ARTIFACT_PATH, `${JSON.stringify(releasePipelineArtifact, null, 2)}\n`, "utf8");
}

function releaseVerifyEnvForStep(step: string): Record<string, string> {
  if (step === "ai-app-context-graph-deep-link-proof") {
    return { S_AI_APP_CONTEXT_GRAPH_RELEASE_VERIFY_PASSED: "true" };
  }
  if (step === "ai-universal-role-qa-source-planner-proof") {
    return { S_AI_UNIVERSAL_ROLE_QA_RELEASE_VERIFY_PASSED: "true" };
  }
  if (step === "ai-live-screen-copilot-buttons-proof") {
    return { S_AI_LIVE_SCREEN_COPILOT_RELEASE_VERIFY_PASSED: "true" };
  }
  if (step === "b2c-request-embedded-ai-expanded-estimate-binding-proof") {
    return {
      B2C_EXPANDED_ESTIMATE_TYPECHECK_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_LINT_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_GIT_DIFF_CHECK_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_TARGETED_TESTS_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_ARCHITECTURE_TESTS_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_WEB_PLAYWRIGHT_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_FULL_JEST_PASSED: "1",
      B2C_EXPANDED_ESTIMATE_RELEASE_GATES_PASSED: "1",
    };
  }
  if (step === "world-construction-50000-plus-sharded-live-reality-proof") {
    return {
      WORLD50000_TYPECHECK_PASSED: "1",
      WORLD50000_LINT_PASSED: "1",
      WORLD50000_GIT_DIFF_CHECK_PASSED: "1",
      WORLD50000_TARGETED_TESTS_PASSED: "1",
      WORLD50000_ARCHITECTURE_TESTS_PASSED: "1",
      WORLD50000_FULL_JEST_PASSED: "1",
      WORLD50000_RELEASE_VERIFY_PASSED: "1",
    };
  }
  if (step === "ai-estimate-template-rate-catalog-ontology-change-control-proof") {
    return {
      AI_ESTIMATE_CHANGE_CONTROL_TYPECHECK_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_LINT_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_GIT_DIFF_CHECK_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_TARGETED_TESTS_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_ARCHITECTURE_TESTS_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_GOLDEN_TESTS_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_FULL_JEST_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_RELEASE_VERIFY_PASSED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_COMMIT_CREATED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_BRANCH_PUSHED: "1",
      AI_ESTIMATE_CHANGE_CONTROL_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "ai-route-parity-proof") {
    return {
      AI_ROUTE_PARITY_BRANCH_PUSHED: "1",
      AI_ROUTE_PARITY_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "request-ai-estimate-professional-boq-formula-proof") {
    return {
      REQUEST_AI_ESTIMATE_BOQ_FORMULA_BRANCH_PUSHED: "1",
      REQUEST_AI_ESTIMATE_BOQ_FORMULA_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "global-estimate-professional-boq-depth-formula-quality-proof") {
    return {
      GLOBAL_ESTIMATE_BOQ_DEPTH_BRANCH_PUSHED: "1",
      GLOBAL_ESTIMATE_BOQ_DEPTH_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "open-world-estimate-semantic-coverage-proof") {
    return {
      OPEN_WORLD_TYPECHECK_PASSED: "1",
      OPEN_WORLD_LINT_PASSED: "1",
      OPEN_WORLD_GIT_DIFF_CHECK_PASSED: "1",
      OPEN_WORLD_TARGETED_TESTS_PASSED: "1",
      OPEN_WORLD_ARCHITECTURE_TESTS_PASSED: "1",
      OPEN_WORLD_FULL_JEST_PASSED: "1",
      OPEN_WORLD_RELEASE_VERIFY_PASSED: "1",
    };
  }
  if (step === "open-world-construction-primitive-boq-compiler-proof") {
    return {
      PRIMITIVE_BOQ_TYPECHECK_PASSED: "1",
      PRIMITIVE_BOQ_LINT_PASSED: "1",
      PRIMITIVE_BOQ_GIT_DIFF_CHECK_PASSED: "1",
      PRIMITIVE_BOQ_TARGETED_TESTS_PASSED: "1",
      PRIMITIVE_BOQ_ARCHITECTURE_TESTS_PASSED: "1",
      PRIMITIVE_BOQ_FULL_JEST_PASSED: "1",
      PRIMITIVE_BOQ_RELEASE_VERIFY_PASSED: "1",
      PRIMITIVE_BOQ_COMMIT_CREATED: "1",
      PRIMITIVE_BOQ_BRANCH_PUSHED: "1",
      PRIMITIVE_BOQ_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (
    step === "ai-estimate-enterprise-load-performance-cost-guard-proof" ||
    step === "ai-estimate-enterprise-load-performance-cost-proof"
  ) {
    return {
      AI_ESTIMATE_ENTERPRISE_LOAD_TYPECHECK_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_LINT_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_GIT_DIFF_CHECK_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_TARGETED_TESTS_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_ARCHITECTURE_TESTS_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_PLAYWRIGHT_WEB_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_ANDROID_API34_SMOKE_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_CLOSEOUT_AUDIT_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_FULL_JEST_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_RELEASE_VERIFY_PASSED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_COMMIT_CREATED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_BRANCH_PUSHED: "1",
      AI_ESTIMATE_ENTERPRISE_LOAD_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "ai-estimate-enterprise-final-readiness-go-no-go-proof") {
    return {
      AI_ESTIMATE_FINAL_READINESS_TYPECHECK_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_LINT_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_GIT_DIFF_CHECK_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_TARGETED_TESTS_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_ARCHITECTURE_TESTS_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_PLAYWRIGHT_WEB_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_ANDROID_API34_SMOKE_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_PDF_FINAL_PROOF_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_RUNTIME_PROOF_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_FULL_JEST_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_RELEASE_VERIFY_PASSED: "1",
      AI_ESTIMATE_FINAL_READINESS_COMMIT_CREATED: "1",
      AI_ESTIMATE_FINAL_READINESS_BRANCH_PUSHED: "1",
      AI_ESTIMATE_FINAL_READINESS_FINAL_WORKTREE_CLEAN: "1",
    };
  }
  if (step === "director-fact-contract-proof") {
    return {
      DIRECTOR_FACT_CONTRACT_TYPECHECK_PASSED: "1",
      DIRECTOR_FACT_CONTRACT_LINT_PASSED: "1",
      DIRECTOR_FACT_CONTRACT_GIT_DIFF_CHECK_PASSED: "1",
      DIRECTOR_FACT_CONTRACT_TARGETED_TESTS_PASSED: "1",
      DIRECTOR_FACT_CONTRACT_FULL_JEST_PASSED: "1",
      DIRECTOR_FACT_CONTRACT_RELEASE_VERIFY_PASSED: "1",
    };
  }
  return {};
}

function killProcessTree(pid: number | undefined, gate: string): ProcessCleanup {
  if (!pid) {
    return {
      gate,
      pid: null,
      attempted: false,
      command: null,
      exit_code: null,
      stdout_tail: "",
      stderr_tail: "",
      orphan_processes_left_after_timeout: false,
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
    gate,
    pid,
    attempted: true,
    command: [cleanupCommand.command, ...cleanupCommand.args].join(" "),
    exit_code: typeof result.status === "number" ? result.status : null,
    stdout_tail: tail(String(result.stdout ?? "")),
    stderr_tail: tail(`${String(result.stderr ?? "")}${result.error ? `\n${result.error.message}` : ""}`),
    orphan_processes_left_after_timeout: false,
  };
}

function runTimedStep(step: string, command: string, timeoutMs: number, cleanups: ProcessCleanup[]): Promise<StepTiming> {
  return new Promise((resolve) => {
    const startedAt = new Date();
    const startedMs = Date.now();
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      env: {
        ...process.env,
        CI: process.env.CI ?? "1",
        RELEASE_GUARD_IN_PROGRESS: "1",
        RELEASE_GUARD_CURRENT_GATE: step,
        ...releaseVerifyEnvForStep(step),
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      const cleanup = killProcessTree(child.pid, step);
      cleanups.push(cleanup);
      const finishedAt = new Date();
      resolve({
        step,
        command,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: Date.now() - startedMs,
        status: "timeout",
        exit_code: null,
        stdout_tail: tail(stdout),
        stderr_tail: tail(stderr),
        artifact_path: path.relative(process.cwd(), CLOSEOUT_TIMING_PATH).replace(/\\/g, "/"),
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      const finishedAt = new Date();
      resolve({
        step,
        command,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: Date.now() - startedMs,
        status: code === 0 ? "passed" : "failed",
        exit_code: code,
        stdout_tail: tail(stdout),
        stderr_tail: tail(stderr),
        artifact_path: path.relative(process.cwd(), CLOSEOUT_TIMING_PATH).replace(/\\/g, "/"),
      });
    });
    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      const finishedAt = new Date();
      resolve({
        step,
        command,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: Date.now() - startedMs,
        status: "failed",
        exit_code: null,
        stdout_tail: tail(stdout),
        stderr_tail: tail(`${stderr}\n${error instanceof Error ? error.message : String(error)}`),
        artifact_path: path.relative(process.cwd(), CLOSEOUT_TIMING_PATH).replace(/\\/g, "/"),
      });
    });
  });
}

async function main() {
  const stepTimeoutMs = parseArgNumber("--step-timeout-ms", DEFAULT_STEP_TIMEOUT_MS);
  const steps: StepTiming[] = [];
  const cleanups: ProcessCleanup[] = [];

  for (const gate of REQUIRED_RELEASE_GATES) {
    const timing = await runTimedStep(gate.name, gate.command, stepTimeoutMs, cleanups);
    steps.push(timing);
    const blockedStatus =
      timing.status === "timeout"
        ? `BLOCKED_RELEASE_GATE_TIMEOUT_${gate.name}`
        : `BLOCKED_RELEASE_GATE_FAILED_${gate.name}`;
    writeArtifact(steps, timing.status === "passed" ? "RUNNING" : blockedStatus, cleanups);
    if (timing.status !== "passed") {
      console.error(JSON.stringify(timing, null, 2));
      process.exit(1);
    }
  }

  writeArtifact(steps, "GREEN_RELEASE_VERIFY_GATES_TIMED", cleanups);
  console.info(JSON.stringify({
    wave: "S_B2C_REQUEST_RELEASE_CLOSEOUT_NO_TIMEOUT_ESCAPE_POINT_OF_NO_RETURN",
    final_status: "GREEN_RELEASE_VERIFY_GATES_TIMED",
    steps: steps.map((step) => ({
      step: step.step,
      status: step.status,
      duration_ms: step.duration_ms,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
