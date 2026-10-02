import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  AFFECTED_JEST_EXECUTION_PROFILE,
  AFFECTED_JEST_OLD_SPACE_MIB,
} from "./affectedJestSharding";
import { runJestShard } from "./runVerificationGate";

function values(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv.filter((value) => value.startsWith(prefix)).map((value) => value.slice(prefix.length));
}

function value(name: string): string | undefined {
  return values(name)[0];
}

function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function run(): Promise<void> {
  const root = process.cwd();
  const suites = [...new Set(values("suite"))].sort((left, right) => left.localeCompare(right, "en"));
  const outputArg = value("output-dir");
  const timeoutMs = Number(value("technical-timeout-ms") ?? 600_000);
  if (!outputArg || suites.length === 0) {
    throw new Error("usage: --output-dir=<path> --suite=<path> [--suite=<path>...] [--technical-timeout-ms=<ms>]");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 30_000) throw new Error("calibration_timeout_invalid");
  for (const suite of suites) {
    const absolute = path.resolve(root, suite);
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) {
      throw new Error(`calibration_suite_missing_or_outside_root:${suite}`);
    }
  }

  const outputDir = path.resolve(root, outputArg);
  const runId = new Date().toISOString().replace(/[:.]/gu, "-");
  const planPath = path.join(outputDir, "plan.json");
  const summaryPath = path.join(outputDir, "summary.json");
  writeJson(planPath, {
    schema: "verification-affected-jest-calibration-plan/v1",
    execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
    enforced_node_old_space_mib: AFFECTED_JEST_OLD_SPACE_MIB,
    selected_suites: suites,
    suite_sources: suites.map((suite) => ({
      suite,
      sha256: sha256(fs.readFileSync(path.resolve(root, suite))),
    })),
  });

  const runtime = await runJestShard({
    root,
    outputDir,
    runId,
    shardId: 0,
    resourceWaveId: 0,
    suites,
    technicalDeadlineAtMs: Date.now() + timeoutMs,
  });
  const exactPass = runtime.closeObserved &&
    runtime.observedExitCode === 0 &&
    runtime.withinTechnicalDeadline &&
    !runtime.timedOut &&
    !runtime.orphanDetected &&
    runtime.missingSuites.length === 0 &&
    runtime.memoryEvidenceStatus === "COMPLETE" &&
    runtime.memoryEvidenceBlocker == null &&
    runtime.memoryPeakBytes > 0 &&
    runtime.result.success === true;
  writeJson(summaryPath, {
    schema: "verification-affected-jest-calibration-summary/v1",
    execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
    enforced_node_old_space_mib: AFFECTED_JEST_OLD_SPACE_MIB,
    final_status: exactPass
      ? "GREEN_AFFECTED_JEST_CALIBRATION_BATCH_EXACT_PASS"
      : "STOP_AFFECTED_JEST_CALIBRATION_BATCH_NOT_EXACT_PASS",
    shard_manifest: {
      runtime: [{
        shard_id: runtime.shardId,
        resource_wave_id: runtime.resourceWaveId,
        started_at: runtime.startedAt,
        ended_at: runtime.endedAt,
        close_observed: runtime.closeObserved,
        close_observed_at: runtime.closeObservedAt,
        observed_exit_code: runtime.observedExitCode,
        within_technical_deadline: runtime.withinTechnicalDeadline,
        observed_suites: runtime.observedSuites,
        missing_suites: runtime.missingSuites,
        status: runtime.status,
        signal: runtime.signal,
        timed_out: runtime.timedOut,
        termination_attempted: runtime.terminationAttempted,
        termination_succeeded: runtime.terminationSucceeded,
        orphan_detected: runtime.orphanDetected,
        process_tree_memory_path: path.relative(root, runtime.memoryEvidencePath).replace(/\\/gu, "/"),
        process_tree_memory_status: runtime.memoryEvidenceStatus,
        process_tree_memory_blocker: runtime.memoryEvidenceBlocker,
        process_tree_memory_peak_bytes: runtime.memoryPeakBytes,
        process_tree_memory_descendants_observed: runtime.memoryDescendantsObserved,
        process_tree_memory_samples: runtime.memorySamples,
      }],
    },
    production_touched: false,
    deploy_started: false,
    release_started: false,
    fake_green_claimed: false,
  });

  process.stdout.write(`${JSON.stringify({
    final_status: exactPass
      ? "GREEN_AFFECTED_JEST_CALIBRATION_BATCH_EXACT_PASS"
      : "STOP_AFFECTED_JEST_CALIBRATION_BATCH_NOT_EXACT_PASS",
    plan_path: path.relative(root, planPath).replace(/\\/gu, "/"),
    summary_path: path.relative(root, summaryPath).replace(/\\/gu, "/"),
    result_path: path.relative(root, runtime.resultPath).replace(/\\/gu, "/"),
    suite_count: suites.length,
    process_tree_peak_bytes: runtime.memoryPeakBytes,
  }, null, 2)}\n`);
  if (!exactPass) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("/scripts/verification/runAffectedJestCalibrationBatch.ts")) {
  void run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
