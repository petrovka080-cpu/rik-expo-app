import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectPassingJestRuntimeMeasurements,
  refreshAffectedJestRuntimeCalibration,
} from "../../scripts/verification/refreshAffectedJestRuntimeCalibration";
import { AFFECTED_JEST_EXECUTION_PROFILE } from "../../scripts/verification/affectedJestSharding";

const SUITE = "tests/releasePipeline/verificationImpactAnalyzer.contract.test.ts";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("affected Jest partial calibration", () => {
  let tempRoot: string;
  const projectRoot = process.cwd();

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-partial-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  function fixture(timedOut = false) {
    const planPath = path.join(tempRoot, "plan.json");
    const basePath = path.join(tempRoot, "calibration.json");
    const shardRoot = path.join(tempRoot, "shard-0");
    const resultPath = path.join(shardRoot, "jest-result.json");
    const memoryPath = path.join(shardRoot, "process-tree-memory.json");
    const gateSummaryPath = path.join(tempRoot, "summary.json");
    writeJson(planPath, { selected_suites: [SUITE] });
    writeJson(basePath, {
      schema: "verification-affected-jest-runtime-calibration/v1",
      source_gate: "base",
      source_sha: "base",
      execution_profile: "run-in-band:no-detect-open-handles:sandbox-injected-math:progress-reporter/v2",
      suites: { [SUITE]: 9999 },
      resource_profiles: {
        [SUITE]: {
          scheduling: "standard_outer_jest",
          outer_jest_processes: 1,
          nested_node_workers: 0,
          child_old_space_mib: null,
          minimum_free_physical_bytes: 999,
          observed_peak_tree_working_set_bytes: 999,
          evidence: "old",
        },
      },
    });
    writeJson(resultPath, {
      success: true,
      numFailedTestSuites: 0,
      numFailedTests: 0,
      numPendingTestSuites: 0,
      numPendingTests: 0,
      numTotalTestSuites: 1,
      testResults: [{
        name: path.join(projectRoot, SUITE),
        status: "passed",
        startTime: 1_000,
        endTime: 4_210,
      }],
    });
    writeJson(memoryPath, {
      status: "COMPLETE",
      blocker: null,
      writer_complete: true,
      memory_peak_bytes: 2_050_527_232,
      samples: 42,
      descendants_observed: 3,
      completed_at: new Date().toISOString(),
    });
    writeJson(gateSummaryPath, {
      shard_manifest: {
        runtime: [{
          shard_id: 0,
          close_observed: true,
          observed_exit_code: 0,
          within_technical_deadline: !timedOut,
          observed_suites: [SUITE],
          missing_suites: [],
          timed_out: timedOut,
          orphan_detected: false,
          process_tree_memory_path: memoryPath,
          process_tree_memory_status: "COMPLETE",
          process_tree_memory_blocker: null,
          process_tree_memory_peak_bytes: 2_050_527_232,
          process_tree_memory_descendants_observed: 3,
          process_tree_memory_samples: 42,
        }],
      },
    });
    return { planPath, basePath, resultPath, gateSummaryPath };
  }

  it("merges exact PASS measurements with per-suite and process-tree provenance", () => {
    const paths = fixture();
    const refreshed = refreshAffectedJestRuntimeCalibration({
      root: projectRoot,
      planPath: paths.planPath,
      baseCalibrationPath: paths.basePath,
      resultFiles: [paths.resultPath],
      allowPartialPassing: true,
      gateSummaryPath: paths.gateSummaryPath,
    });

    expect(refreshed.suites[SUITE]).toBe(3_210);
    expect(refreshed.execution_profile).toBe(AFFECTED_JEST_EXECUTION_PROFILE);
    expect(refreshed.compatible_prior_execution_profiles).toEqual([
      "run-in-band:no-detect-open-handles:sandbox-injected-math:progress-reporter/v2",
    ]);
    expect(refreshed.suite_provenance?.[SUITE]).toMatchObject({
      result_status: "passed",
      result_success: true,
      runtime_ms: 3_210,
      process_tree_memory_status: "COMPLETE",
      process_tree_peak_bytes: 2_050_527_232,
      close_observed: true,
      timed_out: false,
      orphan_detected: false,
    });
    expect(refreshed.resource_profiles?.[SUITE]).toMatchObject({
      minimum_free_physical_bytes: 2_050_527_232,
      observed_peak_tree_working_set_bytes: 2_050_527_232,
    });
  });

  it("rejects a timed-out shard even when Jest JSON says PASS", () => {
    const paths = fixture(true);
    expect(() => refreshAffectedJestRuntimeCalibration({
      root: projectRoot,
      planPath: paths.planPath,
      baseCalibrationPath: paths.basePath,
      resultFiles: [paths.resultPath],
      allowPartialPassing: true,
      gateSummaryPath: paths.gateSummaryPath,
    })).toThrow("gate_summary_shard_not_exact_pass:0");
  });

  it("maps an isolated Windows runner path to the exact canonical plan suite", () => {
    const resultPath = path.join(tempRoot, "distributed-jest-result.json");
    writeJson(resultPath, {
      testResults: [{
        name: `D:\\a\\_temp\\s279-candidate\\${SUITE.replaceAll("/", "\\")}`,
        status: "passed",
        startTime: 2_000,
        endTime: 5_210,
      }],
    });

    expect(collectPassingJestRuntimeMeasurements({
      root: projectRoot,
      targetSuites: [SUITE],
      resultFiles: [resultPath],
    })).toEqual({ [SUITE]: 3_210 });
  });
});
