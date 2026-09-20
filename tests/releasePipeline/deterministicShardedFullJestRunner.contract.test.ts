import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  classifyCompletedShardJestCacheCleanupError,
  cleanupCompletedShardJestCache,
  planJestShardMicrobatches,
  planWeightedJestShards,
  resolveAllowedWorkspaceOverlayPaths,
  validateWeightedJestShardPlan,
  type WeightedJestManifestEntry,
} from "../../scripts/release/runDeterministicShardedFullJest";
import {
  applyAffectedJestRuntimeCalibration,
  AFFECTED_JEST_EXECUTION_PROFILE,
  buildAffectedJestShardPlan,
  estimateUnmeasuredAffectedJestRuntimeMs,
  MAX_LOCAL_AFFECTED_JEST_SHARDS,
  resolveAffectedJestShardCount,
} from "../../scripts/verification/affectedJestSharding";
import {
  affectedJestCliArgs,
  AFFECTED_VERIFICATION_BUDGET_MS,
  AFFECTED_VERIFICATION_TECHNICAL_TIMEOUT_MS,
  evaluateVerificationShardMemoryTerminal,
  evaluateVerificationShardProcessTerminal,
  evaluateAffectedVerificationPlanReadiness,
  runJestShard,
} from "../../scripts/verification/runVerificationGate";

function entry(testPath: string, weight: number): WeightedJestManifestEntry {
  return {
    test_path: testPath,
    source_bytes: weight,
    declared_tests: 1,
    weight,
    content_sha256: `sha-${testPath}`,
  };
}

describe("deterministic sharded full Jest runner", () => {
  const manifest = [
    entry("tests/a.test.ts", 90),
    entry("tests/b.test.ts", 80),
    entry("tests/c.test.ts", 70),
    entry("tests/d.test.ts", 60),
    entry("tests/e.test.ts", 50),
    entry("tests/f.test.ts", 40),
  ];

  it("assigns every manifest file exactly once with stable weighted balancing", () => {
    const first = planWeightedJestShards(manifest, 3);
    const second = planWeightedJestShards([...manifest].reverse(), 3);

    expect(second).toEqual(first);
    expect(validateWeightedJestShardPlan(manifest, first)).toEqual({
      missing: [],
      duplicates: [],
      unexpected: [],
    });
    expect(first.map((shard) => shard.weight)).toEqual([130, 130, 130]);
  });

  it("rejects duplicate, missing, and unexpected shard membership", () => {
    const invalid = planWeightedJestShards(manifest, 3);
    invalid[0].test_files.push("tests/a.test.ts", "tests/unexpected.test.ts");
    invalid[1].test_files = invalid[1].test_files.filter((file) => file !== "tests/b.test.ts");

    expect(validateWeightedJestShardPlan(manifest, invalid)).toEqual({
      missing: ["tests/b.test.ts"],
      duplicates: ["tests/a.test.ts"],
      unexpected: ["tests/unexpected.test.ts"],
    });
  });

  it("recycles the Jest process in deterministic bounded microbatches without changing membership", () => {
    const shard = {
      shard_id: 0,
      weight: 390,
      test_files: manifest.map((item) => item.test_path),
    };

    const microbatches = planJestShardMicrobatches(shard, 2);

    expect(microbatches).toEqual([
      { microbatch_id: 0, test_files: ["tests/a.test.ts", "tests/b.test.ts"] },
      { microbatch_id: 1, test_files: ["tests/c.test.ts", "tests/d.test.ts"] },
      { microbatch_id: 2, test_files: ["tests/e.test.ts", "tests/f.test.ts"] },
    ]);
    expect(microbatches.flatMap((item) => item.test_files)).toEqual(shard.test_files);
  });

  it("keeps measured long-running affected suites on separate bounded shards", () => {
    const calibrated = applyAffectedJestRuntimeCalibration(manifest, {
      "tests/a.test.ts": 600_000,
      "tests/b.test.ts": 300_000,
      "tests/c.test.ts": 200_000,
      "tests/d.test.ts": 100_000,
    });
    const shards = planWeightedJestShards(calibrated, 4);

    expect(validateWeightedJestShardPlan(calibrated, shards)).toEqual({
      missing: [],
      duplicates: [],
      unexpected: [],
    });
    expect(
      ["tests/a.test.ts", "tests/b.test.ts", "tests/c.test.ts", "tests/d.test.ts"].map((testPath) =>
        shards.find((shard) => shard.test_files.includes(testPath))?.shard_id,
      ),
    ).toEqual([0, 1, 2, 3]);
    expect(applyAffectedJestRuntimeCalibration([entry("tests/fast.test.ts", 90)], {
      "tests/fast.test.ts": 10,
    })[0].weight).toBe(10);
    expect(estimateUnmeasuredAffectedJestRuntimeMs({ sourceBytes: 32_000, declaredTests: 8 }))
      .toBe(3_000);
  });

  it("does not apply runtime measurements captured under an incompatible execution profile", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-calibration-"));
    try {
      fs.mkdirSync(path.join(root, "tests"), { recursive: true });
      fs.writeFileSync(path.join(root, "tests", "a.test.ts"), "test('a', () => undefined);\n", "utf8");
      fs.writeFileSync(path.join(root, "tests", "b.test.ts"), "test('b', () => undefined);\n", "utf8");
      const calibrationPath = path.join(root, "calibration.json");
      fs.writeFileSync(calibrationPath, JSON.stringify({
        schema: "verification-affected-jest-runtime-calibration/v1",
        source_gate: "legacy-proof",
        source_sha: "legacy-sha",
        execution_profile: "legacy-run-in-band:detect-open-handles",
        suites: { "tests/a.test.ts": 600_000 },
      }), "utf8");

      const plan = buildAffectedJestShardPlan({
        root,
        suites: ["tests/a.test.ts", "tests/b.test.ts"],
        shardCount: 2,
        calibrationPath,
      });

      expect(plan.calibration_coverage).toMatchObject({
        available_calibrated_selected_suites: 1,
        calibrated_selected_suites: 0,
        unmeasured_selected_suites: 2,
        target_execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
        execution_profile_compatible: false,
        incompatible_runtime_values_applied: false,
      });
      expect(plan.manifest.map((item) => item.weight)).toEqual([1_001, 1_001]);
      expect(plan.shards.map((shard) => shard.test_files.length)).toEqual([1, 1]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("bounds local affected concurrency without changing suite membership", () => {
    expect(MAX_LOCAL_AFFECTED_JEST_SHARDS).toBe(4);
    expect(resolveAffectedJestShardCount(65, 8)).toBe(4);
    expect(resolveAffectedJestShardCount(2, 8)).toBe(2);
    expect(resolveAffectedJestShardCount(65, 1)).toBe(1);

    const shards = planWeightedJestShards(manifest, resolveAffectedJestShardCount(manifest.length, 8));
    expect(validateWeightedJestShardPlan(manifest, shards)).toEqual({
      missing: [],
      duplicates: [],
      unexpected: [],
    });
  });

  it("puts nested child-process suites in exclusive waves without losing normal suites", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-resource-waves-"));
    try {
      fs.mkdirSync(path.join(root, "tests"), { recursive: true });
      for (const name of ["nested-a", "nested-b", "normal-a", "normal-b"]) {
        fs.writeFileSync(path.join(root, "tests", `${name}.test.ts`), `test('${name}', () => undefined);\n`, "utf8");
      }
      const calibrationPath = path.join(root, "calibration.json");
      fs.writeFileSync(calibrationPath, JSON.stringify({
        schema: "verification-affected-jest-runtime-calibration/v1",
        source_gate: "resource-profile-proof",
        source_sha: "fixture-sha",
        execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
        resource_policy: {
          standard_wave_minimum_free_physical_bytes: 400,
          closeout_reserve_bytes: 50,
        },
        resource_profiles: {
          "tests/nested-a.test.ts": {
            scheduling: "exclusive_process_tree",
            outer_jest_processes: 1,
            nested_node_workers: 2,
            child_old_space_mib: 1536,
            minimum_free_physical_bytes: 500,
            observed_peak_tree_working_set_bytes: 300,
            evidence: "fixture-a",
          },
          "tests/nested-b.test.ts": {
            scheduling: "exclusive_process_tree",
            outer_jest_processes: 1,
            nested_node_workers: 1,
            child_old_space_mib: null,
            minimum_free_physical_bytes: 450,
            observed_peak_tree_working_set_bytes: 250,
            evidence: "fixture-b",
          },
        },
        suites: {
          "tests/nested-a.test.ts": 2_000,
          "tests/nested-b.test.ts": 3_000,
          "tests/normal-a.test.ts": 1_500,
          "tests/normal-b.test.ts": 1_000,
        },
      }), "utf8");

      const plan = buildAffectedJestShardPlan({
        root,
        suites: [
          "tests/normal-b.test.ts",
          "tests/nested-a.test.ts",
          "tests/normal-a.test.ts",
          "tests/nested-b.test.ts",
        ],
        shardCount: 2,
        calibrationPath,
      });

      expect(plan.resource_plan.waves.map((wave) => ({
        resourceClass: wave.resource_class,
        roots: wave.maximum_parallel_process_roots,
        children: wave.nested_node_workers,
        files: wave.shards.flatMap((shard) => shard.test_files),
      }))).toEqual([
        {
          resourceClass: "exclusive_process_tree",
          roots: 1,
          children: 1,
          files: ["tests/nested-b.test.ts"],
        },
        {
          resourceClass: "exclusive_process_tree",
          roots: 1,
          children: 2,
          files: ["tests/nested-a.test.ts"],
        },
        {
          resourceClass: "standard_outer_jest",
          roots: 2,
          children: 0,
          files: ["tests/normal-a.test.ts", "tests/normal-b.test.ts"],
        },
      ]);
      expect(validateWeightedJestShardPlan(plan.manifest, plan.shards)).toEqual({
        missing: [],
        duplicates: [],
        unexpected: [],
      });
      expect(plan.calibration_coverage.applied_selected_resource_profiles).toBe(2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("pairs a measured nested tree with bounded standard roots and accounts for every root peak", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-paired-resource-waves-"));
    try {
      const names = ["nested", "paired", "a", "b", "c", "d", "e"];
      fs.mkdirSync(path.join(root, "tests"), { recursive: true });
      for (const name of names) {
        fs.writeFileSync(path.join(root, "tests", `${name}.test.ts`), `test('${name}', () => undefined);\n`, "utf8");
      }
      const calibrationPath = path.join(root, "calibration.json");
      fs.writeFileSync(calibrationPath, JSON.stringify({
        schema: "verification-affected-jest-runtime-calibration/v1",
        source_gate: "paired-resource-profile-proof",
        source_sha: "fixture-sha",
        execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
        resource_policy: {
          standard_wave_minimum_free_physical_bytes: 0,
          closeout_reserve_bytes: 50,
          maximum_standard_process_roots: 4,
          unmeasured_standard_root_peak_bytes: 100,
        },
        resource_profiles: {
          "tests/nested.test.ts": {
            scheduling: "nested_process_tree",
            outer_jest_processes: 1,
            nested_node_workers: 2,
            child_old_space_mib: 1536,
            minimum_free_physical_bytes: 300,
            observed_peak_tree_working_set_bytes: 500,
            companion_standard_roots: 2,
            evidence: "nested-fixture",
          },
          "tests/paired.test.ts": {
            scheduling: "paired_standard_process_tree",
            paired_with: "tests/nested.test.ts",
            outer_jest_processes: 1,
            nested_node_workers: 1,
            child_old_space_mib: null,
            minimum_free_physical_bytes: 200,
            observed_peak_tree_working_set_bytes: 200,
            evidence: "paired-fixture",
          },
        },
        suites: {
          "tests/nested.test.ts": 100,
          "tests/paired.test.ts": 60,
          "tests/a.test.ts": 50,
          "tests/b.test.ts": 40,
          "tests/c.test.ts": 30,
          "tests/d.test.ts": 20,
          "tests/e.test.ts": 10,
        },
      }), "utf8");

      const plan = buildAffectedJestShardPlan({
        root,
        suites: names.map((name) => `tests/${name}.test.ts`),
        shardCount: 4,
        calibrationPath,
      });

      expect(plan.resource_plan.waves).toHaveLength(2);
      expect(plan.resource_plan.waves[0]).toMatchObject({
        resource_class: "nested_with_standard_companions",
        maximum_parallel_process_roots: 3,
        nested_node_workers: 3,
        predicted_duration_weight_ms: 100,
        estimated_peak_process_tree_bytes: 800,
        minimum_free_physical_bytes: 800,
      });
      expect(plan.resource_plan.waves[1]).toMatchObject({
        resource_class: "standard_outer_jest",
        maximum_parallel_process_roots: 1,
        predicted_duration_weight_ms: 20,
        estimated_peak_process_tree_bytes: 100,
      });
      expect(validateWeightedJestShardPlan(plan.manifest, plan.shards)).toEqual({
        missing: [],
        duplicates: [],
        unexpected: [],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("co-schedules measured nested trees and serializes their pinned companions in one bounded root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-grouped-nested-wave-"));
    try {
      const names = ["nested-a", "nested-b", "paired-a", "paired-b", "normal-a", "normal-b"];
      fs.mkdirSync(path.join(root, "tests"), { recursive: true });
      for (const name of names) {
        fs.writeFileSync(path.join(root, "tests", `${name}.test.ts`), `test('${name}', () => undefined);\n`, "utf8");
      }
      const calibrationPath = path.join(root, "calibration.json");
      fs.writeFileSync(calibrationPath, JSON.stringify({
        schema: "verification-affected-jest-runtime-calibration/v1",
        source_gate: "grouped-nested-resource-profile-proof",
        source_sha: "fixture-sha",
        execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
        resource_policy: {
          standard_wave_minimum_free_physical_bytes: 0,
          closeout_reserve_bytes: 50,
          maximum_standard_process_roots: 3,
          unmeasured_standard_root_peak_bytes: 100,
        },
        resource_profiles: {
          "tests/nested-a.test.ts": {
            scheduling: "nested_process_tree",
            outer_jest_processes: 1,
            nested_node_workers: 2,
            child_old_space_mib: 1536,
            minimum_free_physical_bytes: 500,
            observed_peak_tree_working_set_bytes: 500,
            companion_standard_roots: 1,
            nested_wave_group: "heavy-current-core",
            evidence: "nested-a-fixture",
          },
          "tests/nested-b.test.ts": {
            scheduling: "nested_process_tree",
            outer_jest_processes: 1,
            nested_node_workers: 1,
            child_old_space_mib: null,
            minimum_free_physical_bytes: 400,
            observed_peak_tree_working_set_bytes: 400,
            companion_standard_roots: 1,
            nested_wave_group: "heavy-current-core",
            evidence: "nested-b-fixture",
          },
          "tests/paired-a.test.ts": {
            scheduling: "paired_standard_process_tree",
            paired_with: "tests/nested-a.test.ts",
            outer_jest_processes: 1,
            nested_node_workers: 1,
            child_old_space_mib: null,
            minimum_free_physical_bytes: 200,
            observed_peak_tree_working_set_bytes: 200,
            evidence: "paired-a-fixture",
          },
          "tests/paired-b.test.ts": {
            scheduling: "paired_standard_process_tree",
            paired_with: "tests/nested-b.test.ts",
            outer_jest_processes: 1,
            nested_node_workers: 0,
            child_old_space_mib: null,
            minimum_free_physical_bytes: 300,
            observed_peak_tree_working_set_bytes: 300,
            evidence: "paired-b-fixture",
          },
        },
        suites: {
          "tests/nested-a.test.ts": 100,
          "tests/nested-b.test.ts": 80,
          "tests/paired-a.test.ts": 60,
          "tests/paired-b.test.ts": 50,
          "tests/normal-a.test.ts": 40,
          "tests/normal-b.test.ts": 30,
        },
      }), "utf8");

      const plan = buildAffectedJestShardPlan({
        root,
        suites: names.map((name) => `tests/${name}.test.ts`),
        shardCount: 4,
        calibrationPath,
      });

      expect(plan.resource_plan.waves).toHaveLength(2);
      expect(plan.resource_plan.waves[0]).toMatchObject({
        resource_class: "nested_with_standard_companions",
        maximum_parallel_process_roots: 3,
        nested_node_workers: 4,
        predicted_duration_weight_ms: 110,
        estimated_peak_process_tree_bytes: 1_200,
        minimum_free_physical_bytes: 1_200,
      });
      expect(plan.resource_plan.waves[0].shards.map((shard) => shard.test_files)).toEqual([
        ["tests/nested-a.test.ts"],
        ["tests/nested-b.test.ts"],
        ["tests/paired-a.test.ts", "tests/paired-b.test.ts"],
      ]);
      expect(plan.resource_plan.waves[1]).toMatchObject({
        resource_class: "standard_outer_jest",
        maximum_parallel_process_roots: 2,
        predicted_duration_weight_ms: 40,
        estimated_peak_process_tree_bytes: 200,
      });
      expect(validateWeightedJestShardPlan(plan.manifest, plan.shards)).toEqual({
        missing: [],
        duplicates: [],
        unexpected: [],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps the affected SLO separate from bounded process closeout without diagnostic overhead", () => {
    const args = affectedJestCliArgs({
      root: path.resolve("fixture-root"),
      suites: ["tests/a.test.ts"],
      resultPath: path.resolve("fixture-output", "jest.json"),
    });

    expect(AFFECTED_VERIFICATION_BUDGET_MS).toBe(600_000);
    expect(AFFECTED_VERIFICATION_TECHNICAL_TIMEOUT_MS).toBeGreaterThan(
      AFFECTED_VERIFICATION_BUDGET_MS,
    );
    expect(args).toContain("--runInBand");
    expect(args).not.toContain("--detectOpenHandles");
    expect(args.some((value) => value.includes("affectedJestProgressReporter.cjs"))).toBe(true);
  });

  it("rejects a plan-only GREEN when calibration is incomplete or the predicted critical path exceeds SLO", () => {
    expect(evaluateAffectedVerificationPlanReadiness({
      selectedSuites: 203,
      calibratedSuites: 203,
      executionProfileCompatible: true,
      predictedCriticalPathMs: 600_001,
      budgetMs: 600_000,
      missingSuites: 0,
      validationErrors: 0,
    })).toMatchObject({ passed: false, predicted_slo_feasible: false });
    expect(evaluateAffectedVerificationPlanReadiness({
      selectedSuites: 203,
      calibratedSuites: 202,
      executionProfileCompatible: true,
      predictedCriticalPathMs: 421_418,
      budgetMs: 600_000,
      missingSuites: 0,
      validationErrors: 0,
    })).toMatchObject({ passed: false, calibration_complete: false });
    expect(evaluateAffectedVerificationPlanReadiness({
      selectedSuites: 203,
      calibratedSuites: 203,
      executionProfileCompatible: true,
      predictedCriticalPathMs: 421_418,
      budgetMs: 600_000,
      missingSuites: 0,
      validationErrors: 0,
    })).toEqual({
      passed: true,
      calibration_complete: true,
      predicted_slo_feasible: true,
    });
  });

  it.each([
    ["success JSON after deadline", {
      resultSuccess: true,
      observedExitCode: 0,
      closeObserved: true,
      closeObservedAtMs: 1_001,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: false,
      orphanDetected: false,
      missingSuiteCount: 0,
    }],
    ["success JSON with nonzero exit", {
      resultSuccess: true,
      observedExitCode: 1,
      closeObserved: true,
      closeObservedAtMs: 999,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: false,
      orphanDetected: false,
      missingSuiteCount: 0,
    }],
    ["success JSON without observed close", {
      resultSuccess: true,
      observedExitCode: null,
      closeObserved: false,
      closeObservedAtMs: null,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: false,
      orphanDetected: false,
      missingSuiteCount: 0,
    }],
    ["partial success JSON at timeout", {
      resultSuccess: true,
      observedExitCode: 0,
      closeObserved: true,
      closeObservedAtMs: 999,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: true,
      orphanDetected: false,
      missingSuiteCount: 1,
    }],
    ["owned descendant still alive", {
      resultSuccess: true,
      observedExitCode: 0,
      closeObserved: true,
      closeObservedAtMs: 999,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: false,
      orphanDetected: true,
      missingSuiteCount: 0,
    }],
  ])("rejects %s", (_label, input) => {
    expect(evaluateVerificationShardProcessTerminal(input)).toMatchObject({ passed: false });
  });

  it("uses the observed child close time instead of a later polling time", () => {
    expect(evaluateVerificationShardProcessTerminal({
      resultSuccess: true,
      observedExitCode: 0,
      closeObserved: true,
      closeObservedAtMs: 999,
      technicalDeadlineAtMs: 1_000,
      timeoutTriggered: false,
      orphanDetected: false,
      missingSuiteCount: 0,
    })).toEqual({
      passed: true,
      close_observed: true,
      exit_zero_observed: true,
      within_technical_deadline: true,
      technical_timed_out: false,
      complete_expected_suites: true,
    });
  });

  it("requires a complete positive process-tree memory terminal on Windows", () => {
    expect(evaluateVerificationShardMemoryTerminal({
      platform: "win32",
      monitorExitCode: 0,
      evidence: {
        status: "COMPLETE",
        writer_complete: true,
        memory_peak_bytes: 2_048,
        descendants_observed: 2,
        samples: 7,
      },
    })).toEqual({
      status: "COMPLETE",
      blocker: null,
      peakBytes: 2_048,
      descendantsObserved: 2,
      samples: 7,
    });

    expect(evaluateVerificationShardMemoryTerminal({
      platform: "win32",
      monitorExitCode: 0,
      evidence: {
        status: "COMPLETE",
        writer_complete: true,
        memory_peak_bytes: 0,
      },
    })).toEqual({
      status: "INFRASTRUCTURE_RED",
      blocker: "MEMORY_EVIDENCE_MISSING_OR_INCOMPLETE",
      peakBytes: 0,
      descendantsObserved: 0,
      samples: 0,
    });
  });

  (process.platform === "win32" ? it : it.skip)(
    "binds a real Jest child tree to a complete nonzero memory receipt",
    async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "affected-jest-memory-smoke-"));
      try {
        const terminal = await runJestShard({
          root: path.resolve("."),
          outputDir,
          runId: "integration",
          shardId: 0,
          resourceWaveId: 0,
          suites: ["tests/releasePipeline/verificationShardMerger.contract.test.ts"],
          technicalDeadlineAtMs: Date.now() + 60_000,
        });

        expect(terminal).toMatchObject({
          status: 0,
          closeObserved: true,
          observedExitCode: 0,
          withinTechnicalDeadline: true,
          timedOut: false,
          orphanDetected: false,
          missingSuites: [],
          memoryEvidenceStatus: "COMPLETE",
          memoryEvidenceBlocker: null,
        });
        expect(terminal.memoryPeakBytes).toBeGreaterThan(0);
        expect(terminal.memoryDescendantsObserved).toBeGreaterThanOrEqual(1);
        expect(terminal.memorySamples).toBeGreaterThan(0);
        expect(fs.existsSync(terminal.memoryEvidencePath)).toBe(true);
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    },
    90_000,
  );

  it("captures an exact normalized current overlay when the command line cannot carry every path", () => {
    expect(resolveAllowedWorkspaceOverlayPaths({
      currentChangedFiles: ["tests\\b.test.ts", "src/a.ts", "src/a.ts"],
      explicitAllowedPaths: [],
      allowCurrentWorkspaceOverlay: true,
    })).toEqual(["src/a.ts", "tests/b.test.ts"]);
    expect(() => resolveAllowedWorkspaceOverlayPaths({
      currentChangedFiles: ["src/a.ts"],
      explicitAllowedPaths: ["src/a.ts"],
      allowCurrentWorkspaceOverlay: true,
    })).toThrow("current_workspace_overlay_cannot_be_combined_with_explicit_paths");
  });

  it("removes only a completed shard Jest cache after evidence materialization", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deterministic-jest-cache-cleanup-"));
    const shardDir = path.join(root, "shard-01");
    const cacheDir = path.join(shardDir, "jest-cache");
    const evidencePath = path.join(shardDir, "metadata.json");
    try {
      fs.mkdirSync(path.join(cacheDir, "transform", "deep"), { recursive: true });
      fs.writeFileSync(path.join(cacheDir, "transform", "deep", "generated-cache"), "cache", "utf8");
      fs.writeFileSync(evidencePath, "evidence", "utf8");

      expect(cleanupCompletedShardJestCache(shardDir)).toEqual({
        cache_directory: cacheDir,
        existed_before: true,
        attempted: true,
        succeeded: true,
        status: "REMOVED",
        blocking: false,
        error: null,
      });
      expect(fs.existsSync(cacheDir)).toBe(false);
      expect(fs.readFileSync(evidencePath, "utf8")).toBe("evidence");
      expect(cleanupCompletedShardJestCache(shardDir)).toEqual({
        cache_directory: cacheDir,
        existed_before: false,
        attempted: false,
        succeeded: true,
        status: "NOT_PRESENT",
        blocking: false,
        error: null,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("defers a transient disposable-cache cleanup error without masking integrity violations", () => {
    expect(classifyCompletedShardJestCacheCleanupError(new Error("EPERM: cache is busy"))).toEqual({
      status: "DEFERRED",
      blocking: false,
      error: "EPERM: cache is busy",
    });
    expect(classifyCompletedShardJestCacheCleanupError(
      new Error("completed_shard_jest_cache_is_symbolic_link"),
    )).toEqual({
      status: "BLOCKED",
      blocking: true,
      error: "completed_shard_jest_cache_is_symbolic_link",
    });
  });
});
