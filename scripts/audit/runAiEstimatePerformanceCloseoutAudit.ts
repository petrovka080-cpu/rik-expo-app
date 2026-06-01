import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  AI_ESTIMATE_PERFORMANCE_ARTIFACT_DIR,
  AI_ESTIMATE_PERFORMANCE_GREEN_STATUS,
} from "../../src/lib/ai/performance";
import { releaseVerifyAllowedDirtyFiles, releaseVerifyBlockingDirtyFiles } from "../release/releaseVerifyDirtyScope";

const ARTIFACT_DIR = path.join(process.cwd(), AI_ESTIMATE_PERFORMANCE_ARTIFACT_DIR);

const REQUIRED_ARTIFACTS = [
  "latency_report.json",
  "memory_report.json",
  "cost_guard.json",
  "rate_limits.json",
  "proof_runner_isolation.json",
  "failure_loops.json",
  "web_results.json",
  "android_api34_results.json",
  "web_screenshots.json",
  "android_screenshots.json",
  "android_ui_dumps.json",
  "failures.json",
  "matrix.json",
  "proof.md",
] as const;

function artifact(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readJson<T = Record<string, unknown>>(name: string): T | null {
  const filePath = artifact(name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifact(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function gitStatusFiles(): string[] {
  return gitOutput(["status", "--short"], "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(2).trim().replace(/\\/g, "/");
      return rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() ?? rawPath : rawPath;
    });
}

function nonArtifactDirtyFiles(): string[] {
  return gitStatusFiles().filter((file) => !file.startsWith("artifacts/"));
}

function branchPushed(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function bool(value: unknown): boolean {
  return value === true;
}

export function runAiEstimatePerformanceCloseoutAudit() {
  const failures: string[] = [];
  const missingArtifacts = REQUIRED_ARTIFACTS.filter((name) => !fs.existsSync(artifact(name)));
  failures.push(...missingArtifacts.map((name) => `artifact_missing:${name}`));

  const matrix = readJson<Record<string, unknown>>("matrix.json") ?? {};
  const latency = readJson<Record<string, unknown>>("latency_report.json") ?? {};
  const memory = readJson<Record<string, unknown>>("memory_report.json") ?? {};
  const costGuard = readJson<Record<string, unknown>>("cost_guard.json") ?? {};
  const rateLimits = readJson<Record<string, unknown>>("rate_limits.json") ?? {};
  const proofIsolation = readJson<Record<string, unknown>>("proof_runner_isolation.json") ?? {};
  const failureLoops = readJson<Record<string, unknown>>("failure_loops.json") ?? {};
  const webResults = readJson<Record<string, unknown>>("web_results.json") ?? {};
  const androidResults = readJson<Record<string, unknown>>("android_api34_results.json") ?? {};
  const releaseGuard = fs.existsSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"))
    ? fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8")
    : "";

  if (matrix.final_status !== AI_ESTIMATE_PERFORMANCE_GREEN_STATUS) failures.push(`matrix_not_green:${String(matrix.final_status)}`);
  if (!bool(latency.latency_budget_passed)) failures.push("latency_budget_failed");
  if (!bool(memory.memoryBudgetPassed)) failures.push("memory_budget_failed");
  if (!bool(costGuard.cost_guard_ready)) failures.push("cost_guard_not_ready");
  if (!bool(rateLimits.rate_limiter_ready)) failures.push("rate_limiter_not_ready");
  if (!bool(proofIsolation.proof_runner_isolation_ready)) failures.push("proof_runner_isolation_failed");
  if (bool(proofIsolation.proof_runner_production_calls_found)) failures.push("proof_runner_production_calls_found");
  if (!bool(failureLoops.failure_loop_guard_ready)) failures.push("failure_loop_guard_not_ready");
  if (bool(failureLoops.repeated_failed_prompt_loop_found)) failures.push("repeated_failed_prompt_loop_found");
  if (!bool(webResults.web_live_app_tested)) failures.push("web_sample_missing");
  if (!bool(androidResults.android_api34_tested)) failures.push("android_api34_sample_missing");
  if (!bool(androidResults.api36_rejected)) failures.push("api36_not_rejected");
  if (!releaseGuard.includes("ai-estimate-enterprise-load-performance-cost-proof")) failures.push("release_guard_missing");
  if (process.env.AI_ESTIMATE_ENTERPRISE_LOAD_BRANCH_PUSHED === "1" && !branchPushed()) failures.push("branch_not_pushed");
  const dirtyFiles = gitStatusFiles();
  const nonArtifactDirty = nonArtifactDirtyFiles();
  const releaseVerifyAllowedDirty = releaseVerifyAllowedDirtyFiles(nonArtifactDirty);
  const releaseVerifyBlockingDirty = releaseVerifyBlockingDirtyFiles(nonArtifactDirty);
  if (process.env.AI_ESTIMATE_ENTERPRISE_LOAD_FINAL_WORKTREE_CLEAN === "1" && releaseVerifyBlockingDirty.length > 0) {
    failures.push(`worktree_dirty:${releaseVerifyBlockingDirty.join(",")}`);
  }

  const passed = failures.length === 0;
  const audit = {
    closeout_audit_passed: passed,
    all_latency_budgets_met: bool(latency.latency_budget_passed),
    memory_budget_met: bool(memory.memoryBudgetPassed),
    no_proof_runner_production_calls: !bool(proofIsolation.proof_runner_production_calls_found),
    no_live_web_blocking: matrix.live_web_blocking_found === false,
    no_unbounded_model_loop: matrix.unbounded_model_loop_found === false,
    no_unbounded_pdf_loop: matrix.unbounded_pdf_loop_found === false,
    no_unbounded_product_search_loop: matrix.unbounded_product_search_loop_found === false,
    no_repeated_failed_prompt_loop: matrix.repeated_failed_prompt_loop_found === false,
    rate_limits_active: bool(rateLimits.rate_limiter_ready),
    web_proof_exists: bool(webResults.web_live_app_tested),
    android_api34_proof_exists: bool(androidResults.android_api34_tested),
    release_guard_added: releaseGuard.includes("ai-estimate-enterprise-load-performance-cost-proof"),
    commit_pushed: branchPushed() || process.env.AI_ESTIMATE_ENTERPRISE_LOAD_BRANCH_PUSHED === "1",
    worktree_clean:
      dirtyFiles.length === 0 ||
      (process.env.AI_ESTIMATE_ENTERPRISE_LOAD_FINAL_WORKTREE_CLEAN === "1" && releaseVerifyBlockingDirty.length === 0),
    release_verify_generated_artifact_dirty_paths: dirtyFiles.filter((file) => file.startsWith("artifacts/")),
    release_verify_allowed_dirty_paths: process.env.RELEASE_GUARD_IN_PROGRESS === "1" ? releaseVerifyAllowedDirty : [],
    release_verify_blocking_dirty_paths: releaseVerifyBlockingDirty,
    failures,
    fake_green_claimed: false,
  };
  writeJson("closeout_audit.json", audit);

  if (passed) {
    writeJson("matrix.json", {
      ...matrix,
      closeout_audit_passed: true,
      fake_green_claimed: false,
    });
  }

  if (!passed) {
    throw new Error(`AI_ESTIMATE_PERFORMANCE_CLOSEOUT_AUDIT_FAILED:${failures.join(";")}`);
  }
  return audit;
}

if (require.main === module) {
  runAiEstimatePerformanceCloseoutAudit();
}
