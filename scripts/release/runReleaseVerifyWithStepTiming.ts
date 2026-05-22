import { spawn } from "node:child_process";
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
};

const WAVE = "S_B2C_REQUEST_RELEASE_CLOSEOUT";
const ARTIFACT_PATH = path.resolve(process.cwd(), "artifacts", `${WAVE}_release_verify_timing.json`);
const RELEASE_PIPELINE_ARTIFACT_PATH = path.resolve(process.cwd(), "artifacts", "S_RELEASE_PIPELINE_step_timing.json");
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

function writeArtifact(steps: StepTiming[], final_status: string): void {
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
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
  return {};
}

function runTimedStep(step: string, command: string, timeoutMs: number): Promise<StepTiming> {
  return new Promise((resolve) => {
    const startedAt = new Date();
    const startedMs = Date.now();
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, CI: process.env.CI ?? "1", ...releaseVerifyEnvForStep(step) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGTERM");
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
      });
    });
  });
}

async function main() {
  const stepTimeoutMs = parseArgNumber("--step-timeout-ms", DEFAULT_STEP_TIMEOUT_MS);
  const steps: StepTiming[] = [];

  for (const gate of REQUIRED_RELEASE_GATES) {
    const timing = await runTimedStep(gate.name, gate.command, stepTimeoutMs);
    steps.push(timing);
    writeArtifact(steps, timing.status === "passed" ? "RUNNING" : `BLOCKED_EXACT_RELEASE_STEP_${gate.name}`);
    if (timing.status !== "passed") {
      console.error(JSON.stringify(timing, null, 2));
      process.exit(1);
    }
  }

  writeArtifact(steps, "GREEN_RELEASE_VERIFY_GATES_TIMED");
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
