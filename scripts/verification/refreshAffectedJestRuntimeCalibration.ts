import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  AFFECTED_JEST_EXECUTION_PROFILE,
  AFFECTED_JEST_OLD_SPACE_MIB,
  type AffectedJestRuntimeCalibration,
} from "./affectedJestSharding";
import { classifyAffectedVerificationSuites } from "./runVerificationGate";

type VerificationPlan = { selected_suites?: unknown };
type JestSuiteResult = {
  name?: unknown;
  testFilePath?: unknown;
  status?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  perfStats?: { runtime?: unknown };
};
type JestResult = {
  success?: unknown;
  numFailedTestSuites?: unknown;
  numFailedTests?: unknown;
  numPendingTestSuites?: unknown;
  numPendingTests?: unknown;
  numTotalTestSuites?: unknown;
  testResults?: unknown;
};
type ProcessTreeMemory = {
  status?: unknown;
  blocker?: unknown;
  writer_complete?: unknown;
  memory_peak_bytes?: unknown;
  samples?: unknown;
  descendants_observed?: unknown;
  completed_at?: unknown;
};
type GateShardRuntime = {
  shard_id?: unknown;
  close_observed?: unknown;
  observed_exit_code?: unknown;
  within_technical_deadline?: unknown;
  observed_suites?: unknown;
  missing_suites?: unknown;
  timed_out?: unknown;
  orphan_detected?: unknown;
  process_tree_memory_path?: unknown;
  process_tree_memory_status?: unknown;
  process_tree_memory_blocker?: unknown;
  process_tree_memory_peak_bytes?: unknown;
  process_tree_memory_descendants_observed?: unknown;
  process_tree_memory_samples?: unknown;
};
type GateSummary = { shard_manifest?: { runtime?: unknown } };

type PassingMeasurement = {
  suite: string;
  runtimeMs: number;
  resultPath: string;
  resultSha256: string;
  memoryPath: string;
  memorySha256: string;
  peakBytes: number;
  samples: number;
  descendants: number;
  gateSummaryPath: string;
  gateSummarySha256: string;
};

function values(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv.filter((value) => value.startsWith(prefix)).map((value) => value.slice(prefix.length));
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedSuitePath(root: string, value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const absolute = path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  if (!relative.startsWith("../") && !path.isAbsolute(relative)) return relative;

  // Distributed Windows runners execute the exact candidate under an isolated
  // temporary root. Retain only a known repository-owned source suffix and
  // require that suffix to resolve to a real file in the canonical checkout;
  // the caller still requires the result to be a member of the exact plan.
  const portableAbsolute = absolute.replace(/\\/g, "/");
  for (const marker of ["/scripts/", "/src/", "/tests/"]) {
    const markerIndex = portableAbsolute.lastIndexOf(marker);
    if (markerIndex < 0) continue;
    const candidate = portableAbsolute.slice(markerIndex + 1);
    const canonical = path.resolve(root, candidate);
    if (fs.existsSync(canonical) && fs.statSync(canonical).isFile()) return candidate;
  }
  return null;
}

function positiveRuntimeMs(result: JestSuiteResult): number | null {
  const direct = Number(result.perfStats?.runtime);
  if (Number.isFinite(direct) && direct > 0) return Math.ceil(direct);
  const start = Number(result.startTime);
  const end = Number(result.endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? Math.ceil(end - start) : null;
}

function requiredNonNegativeInteger(value: unknown, code: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function sameSortedValues(left: readonly string[], right: readonly string[]): boolean {
  return [...left].sort().join("\0") === [...right].sort().join("\0");
}

export function collectPartialPassingJestRuntimeMeasurements(input: {
  root: string;
  targetSuites: readonly string[];
  resultFiles: readonly string[];
  gateSummaryPath: string;
}): PassingMeasurement[] {
  const target = new Set(input.targetSuites);
  const gateBytes = fs.readFileSync(input.gateSummaryPath);
  const gate = JSON.parse(gateBytes.toString("utf8")) as GateSummary;
  const runtimes = gate.shard_manifest?.runtime;
  if (!Array.isArray(runtimes)) throw new Error("gate_summary_shard_runtime_missing");
  const measurements: PassingMeasurement[] = [];
  const seen = new Set<string>();

  for (const resultFile of input.resultFiles) {
    const resultBytes = fs.readFileSync(resultFile);
    const result = JSON.parse(resultBytes.toString("utf8")) as JestResult;
    if (!Array.isArray(result.testResults) || result.testResults.length === 0) {
      throw new Error(`jest_result_test_results_missing:${resultFile}`);
    }
    if (
      result.success !== true ||
      requiredNonNegativeInteger(result.numFailedTestSuites, "jest_result_failed_suite_count_invalid") !== 0 ||
      requiredNonNegativeInteger(result.numFailedTests, "jest_result_failed_test_count_invalid") !== 0 ||
      requiredNonNegativeInteger(result.numPendingTestSuites, "jest_result_pending_suite_count_invalid") !== 0 ||
      requiredNonNegativeInteger(result.numPendingTests, "jest_result_pending_test_count_invalid") !== 0 ||
      requiredNonNegativeInteger(result.numTotalTestSuites, "jest_result_total_suite_count_invalid") !== result.testResults.length
    ) {
      throw new Error(`partial_jest_result_not_exact_pass:${resultFile}`);
    }

    const suites = (result.testResults as JestSuiteResult[]).map((raw) => {
      const suite = normalizedSuitePath(input.root, raw.name ?? raw.testFilePath);
      const runtimeMs = positiveRuntimeMs(raw);
      if (!suite || !target.has(suite)) throw new Error(`partial_jest_result_suite_outside_plan:${String(suite)}`);
      if (raw.status !== "passed" || runtimeMs == null) throw new Error(`partial_jest_result_suite_not_passed:${suite}`);
      if (seen.has(suite)) throw new Error(`partial_jest_result_duplicate_suite:${suite}`);
      seen.add(suite);
      return { suite, runtimeMs };
    });

    const shardMatch = path.basename(path.dirname(resultFile)).match(/^shard-(\d+)$/u);
    if (!shardMatch) throw new Error(`partial_jest_result_shard_path_invalid:${resultFile}`);
    const shardId = Number(shardMatch[1]);
    const runtime = (runtimes as GateShardRuntime[]).find((entry) => Number(entry.shard_id) === shardId);
    if (!runtime) throw new Error(`gate_summary_shard_runtime_missing:${shardId}`);
    const observedSuites = Array.isArray(runtime.observed_suites)
      ? runtime.observed_suites.filter((suite): suite is string => typeof suite === "string")
      : [];
    if (
      runtime.close_observed !== true ||
      Number(runtime.observed_exit_code) !== 0 ||
      runtime.within_technical_deadline !== true ||
      runtime.timed_out !== false ||
      runtime.orphan_detected !== false ||
      !Array.isArray(runtime.missing_suites) || runtime.missing_suites.length !== 0 ||
      !sameSortedValues(observedSuites, suites.map(({ suite }) => suite))
    ) {
      throw new Error(`gate_summary_shard_not_exact_pass:${shardId}`);
    }

    const memoryPath = path.resolve(input.root, String(runtime.process_tree_memory_path ?? ""));
    const expectedMemoryPath = path.join(path.dirname(resultFile), "process-tree-memory.json");
    if (memoryPath !== expectedMemoryPath || !fs.existsSync(memoryPath)) {
      throw new Error(`process_tree_memory_path_mismatch:${shardId}`);
    }
    const memoryBytes = fs.readFileSync(memoryPath);
    const memory = JSON.parse(memoryBytes.toString("utf8")) as ProcessTreeMemory;
    const peakBytes = requiredNonNegativeInteger(memory.memory_peak_bytes, "process_tree_memory_peak_invalid");
    const samples = requiredNonNegativeInteger(memory.samples, "process_tree_memory_samples_invalid");
    const descendants = requiredNonNegativeInteger(
      memory.descendants_observed,
      "process_tree_memory_descendants_invalid",
    );
    if (
      memory.status !== "COMPLETE" || memory.writer_complete !== true || memory.blocker != null ||
      typeof memory.completed_at !== "string" || !memory.completed_at || peakBytes <= 0 || samples <= 0 ||
      runtime.process_tree_memory_status !== "COMPLETE" || runtime.process_tree_memory_blocker != null ||
      Number(runtime.process_tree_memory_peak_bytes) !== peakBytes ||
      Number(runtime.process_tree_memory_samples) !== samples ||
      Number(runtime.process_tree_memory_descendants_observed) !== descendants
    ) {
      throw new Error(`process_tree_memory_not_exact_complete:${shardId}`);
    }

    for (const suite of suites) {
      measurements.push({
        ...suite,
        resultPath: resultFile,
        resultSha256: sha256(resultBytes),
        memoryPath,
        memorySha256: sha256(memoryBytes),
        peakBytes,
        samples,
        descendants,
        gateSummaryPath: input.gateSummaryPath,
        gateSummarySha256: sha256(gateBytes),
      });
    }
  }

  if (measurements.length === 0) throw new Error("partial_passing_runtime_measurements_empty");
  return measurements.sort((left, right) => left.suite.localeCompare(right.suite, "en"));
}

export function collectPassingJestRuntimeMeasurements(input: {
  root: string;
  targetSuites: readonly string[];
  resultFiles: readonly string[];
}): Record<string, number> {
  const target = new Set(input.targetSuites);
  const measurements: Record<string, number> = {};
  for (const resultFile of input.resultFiles) {
    const result = JSON.parse(fs.readFileSync(resultFile, "utf8")) as JestResult;
    if (!Array.isArray(result.testResults)) throw new Error(`jest_result_test_results_missing:${resultFile}`);
    for (const raw of result.testResults as JestSuiteResult[]) {
      const suite = normalizedSuitePath(input.root, raw.name ?? raw.testFilePath);
      const runtimeMs = positiveRuntimeMs(raw);
      if (suite && target.has(suite) && raw.status === "passed" && runtimeMs != null) {
        measurements[suite] = runtimeMs;
      }
    }
  }
  const missing = input.targetSuites.filter((suite) => measurements[suite] == null);
  if (missing.length > 0) throw new Error(`passing_runtime_measurement_missing:${missing.join(",")}`);
  return measurements;
}

export function refreshAffectedJestRuntimeCalibration(input: {
  root: string;
  planPath: string;
  baseCalibrationPath: string;
  resultFiles: readonly string[];
  allowPartialPassing?: boolean;
  gateSummaryPath?: string;
}): AffectedJestRuntimeCalibration & Record<string, unknown> {
  const planBytes = fs.readFileSync(input.planPath);
  const plan = JSON.parse(planBytes.toString("utf8")) as VerificationPlan;
  if (!Array.isArray(plan.selected_suites) || !plan.selected_suites.every((item) => typeof item === "string")) {
    throw new Error("verification_plan_selected_suites_invalid");
  }
  const selected = classifyAffectedVerificationSuites(plan.selected_suites as string[]);
  if (selected.jest.length === 0) throw new Error("verification_plan_jest_suites_empty");
  for (const suite of selected.jest) {
    if (!fs.existsSync(path.join(input.root, suite))) throw new Error(`verification_plan_suite_missing:${suite}`);
  }
  const base = JSON.parse(fs.readFileSync(input.baseCalibrationPath, "utf8")) as AffectedJestRuntimeCalibration;
  if (base.schema !== "verification-affected-jest-runtime-calibration/v1") {
    throw new Error(`invalid_affected_jest_runtime_calibration:${String(base.schema)}`);
  }
  const sourceManifest = selected.jest.map((suite) =>
    `${suite}\0${sha256(fs.readFileSync(path.join(input.root, suite)))}`
  ).join("\n");
  const relative = (file: string) => path.relative(input.root, file).replace(/\\/g, "/");
  const measuredAt = new Date().toISOString();
  if (input.allowPartialPassing) {
    if (!input.gateSummaryPath) throw new Error("partial_gate_summary_required");
    const partial = collectPartialPassingJestRuntimeMeasurements({
      root: input.root,
      targetSuites: selected.jest,
      resultFiles: input.resultFiles,
      gateSummaryPath: input.gateSummaryPath,
    });
    const measured = Object.fromEntries(partial.map(({ suite, runtimeMs }) => [suite, runtimeMs]));
    const provenance = Object.fromEntries(partial.map((measurement) => [measurement.suite, {
      suite_sha256: sha256(fs.readFileSync(path.join(input.root, measurement.suite))),
      execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
      result_path: relative(measurement.resultPath),
      result_sha256: measurement.resultSha256,
      result_status: "passed" as const,
      result_success: true as const,
      runtime_ms: measurement.runtimeMs,
      runtime_source: "testResults[].perfStats.runtime or endTime-startTime",
      process_tree_memory_path: relative(measurement.memoryPath),
      process_tree_memory_sha256: measurement.memorySha256,
      process_tree_memory_status: "COMPLETE" as const,
      process_tree_peak_bytes: measurement.peakBytes,
      process_tree_samples: measurement.samples,
      process_tree_descendants_observed: measurement.descendants,
      gate_summary_path: relative(measurement.gateSummaryPath),
      gate_summary_sha256: measurement.gateSummarySha256,
      close_observed: true as const,
      timed_out: false as const,
      orphan_detected: false as const,
      measured_at: measuredAt,
    }]));
    const resourceProfiles = { ...(base.resource_profiles ?? {}) };
    for (const measurement of partial) {
      const existing = resourceProfiles[measurement.suite];
      resourceProfiles[measurement.suite] = {
        scheduling: existing?.scheduling ?? "standard_outer_jest",
        outer_jest_processes: 1,
        nested_node_workers: existing?.nested_node_workers ?? 0,
        child_old_space_mib: existing?.child_old_space_mib ?? AFFECTED_JEST_OLD_SPACE_MIB,
        minimum_free_physical_bytes: measurement.peakBytes,
        observed_peak_tree_working_set_bytes: measurement.peakBytes,
        ...(existing?.paired_with ? { paired_with: existing.paired_with } : {}),
        ...(existing?.companion_standard_roots != null
          ? { companion_standard_roots: existing.companion_standard_roots }
          : {}),
        ...(existing?.nested_wave_group ? { nested_wave_group: existing.nested_wave_group } : {}),
        evidence: `${relative(measurement.gateSummaryPath)} + ${relative(measurement.memoryPath)}; exact PASS, close observed, timeout false, orphan false`,
      };
    }
    const compatiblePriorExecutionProfiles = [...new Set([
      ...(base.compatible_prior_execution_profiles ?? []),
      ...(base.execution_profile && base.execution_profile !== AFFECTED_JEST_EXECUTION_PROFILE
        ? [base.execution_profile]
        : []),
    ])].sort();
    const measuredStandardRootPeakBytes = partial.reduce((maximum, measurement) =>
      resourceProfiles[measurement.suite]?.scheduling === "standard_outer_jest"
        ? Math.max(maximum, measurement.peakBytes)
        : maximum, 0);
    const resourcePolicy = {
      ...(base.resource_policy ?? {
        standard_wave_minimum_free_physical_bytes: 0,
        closeout_reserve_bytes: 0,
      }),
      unmeasured_standard_root_peak_bytes: Math.max(
        base.resource_policy?.unmeasured_standard_root_peak_bytes ?? 0,
        measuredStandardRootPeakBytes,
      ),
    };
    const priorPartial = Array.isArray((base as Record<string, unknown>).partial_measurement_evidence)
      ? (base as Record<string, unknown>).partial_measurement_evidence as unknown[]
      : [];
    return {
      ...base,
      source_gate: "S27.8 exact completed affected roots plus preserved compatible calibration",
      source_sha: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: input.root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
      execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
      compatible_prior_execution_profiles: compatiblePriorExecutionProfiles,
      measured_at: measuredAt,
      measurement_scope: `${base.measurement_scope ?? ""} Partial S27.8 refresh adds ${partial.length} exact current PASS suite measurements only; unobserved and timed-out suites retain prior compatible values.`,
      suites: Object.fromEntries(Object.entries({ ...base.suites, ...measured })
        .sort(([left], [right]) => left.localeCompare(right, "en"))),
      suite_provenance: Object.fromEntries(Object.entries({ ...(base.suite_provenance ?? {}), ...provenance })
        .sort(([left], [right]) => left.localeCompare(right, "en"))),
      resource_policy: resourcePolicy,
      resource_profiles: resourceProfiles,
      partial_measurement_evidence: [
        ...priorPartial,
        {
          measured_at: measuredAt,
          execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
          plan_path: relative(input.planPath),
          plan_sha256: sha256(planBytes),
          gate_summary_path: relative(input.gateSummaryPath),
          gate_summary_sha256: sha256(fs.readFileSync(input.gateSummaryPath)),
          measured_suite_count: partial.length,
          measured_suites: partial.map(({ suite }) => suite),
          result_files: input.resultFiles.map((file) => ({
            path: relative(file),
            sha256: sha256(fs.readFileSync(file)),
          })),
          unmeasured_selected_suites_preserved: selected.jest.length - partial.length,
          timed_out_suites_accepted: 0,
          orphaned_suites_accepted: 0,
        },
      ],
    };
  }
  const measured = collectPassingJestRuntimeMeasurements({
    root: input.root,
    targetSuites: selected.jest,
    resultFiles: input.resultFiles,
  });
  return {
    ...base,
    source_gate: "S27.5 affected terminal plus exact scoped PASS recoveries",
    source_sha: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: input.root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim(),
    execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
    measured_at: measuredAt,
    measurement_scope: `All ${selected.jest.length} current Jest-owned affected suites have positive terminal durations from a passing result under the configured run-in-band profile. ${selected.playwright.length} Playwright-owned Web suites are explicitly excluded from Jest calibration and require their separate explicit browser execution/evidence. Measurements are scheduling weights, not correctness or SLO evidence.`,
    suites: Object.fromEntries(Object.entries({ ...base.suites, ...measured })
      .sort(([left], [right]) => left.localeCompare(right, "en"))),
    measurement_evidence: {
      plan_path: relative(input.planPath),
      plan_sha256: sha256(planBytes),
      jest_suite_count: selected.jest.length,
      playwright_suite_count: selected.playwright.length,
      excluded_playwright_suites: selected.playwright,
      jest_suite_source_manifest_sha256: sha256(sourceManifest),
      result_files: input.resultFiles.map((file) => ({
        path: relative(file),
        sha256: sha256(fs.readFileSync(file)),
      })),
    },
  };
}

function run(): void {
  const root = process.cwd();
  const planArg = values("plan")[0];
  const resultArgs = values("result");
  const outputArg = values("output")[0];
  const baseArg = values("base-calibration")[0] ?? "verification/v1/affected-jest-runtime-calibration.json";
  const gateSummaryArg = values("gate-summary")[0];
  const allowPartialPassing = process.argv.includes("--allow-partial-passing");
  if (!planArg || resultArgs.length === 0 || !outputArg) {
    throw new Error("usage: --plan=<path> --result=<path> [--result=<path>...] --output=<path> [--base-calibration=<path>] [--allow-partial-passing --gate-summary=<path>]");
  }
  const calibration = refreshAffectedJestRuntimeCalibration({
    root,
    planPath: path.resolve(root, planArg),
    baseCalibrationPath: path.resolve(root, baseArg),
    resultFiles: resultArgs.map((file) => path.resolve(root, file)),
    allowPartialPassing,
    gateSummaryPath: gateSummaryArg ? path.resolve(root, gateSummaryArg) : undefined,
  });
  const outputPath = path.resolve(root, outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(calibration, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    output: path.relative(root, outputPath).replace(/\\/g, "/"),
    sha256: sha256(fs.readFileSync(outputPath)),
    calibrated_suites: Object.keys(calibration.suites).length,
    measurement_evidence: calibration.measurement_evidence,
  }, null, 2)}\n`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/verification/refreshAffectedJestRuntimeCalibration.ts")) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
