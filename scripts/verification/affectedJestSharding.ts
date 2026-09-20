import crypto from "node:crypto";
import fs from "node:fs";
import { availableParallelism as osAvailableParallelism } from "node:os";
import path from "node:path";

import {
  planWeightedJestShards,
  validateWeightedJestShardPlan,
  type WeightedJestManifestEntry,
} from "../release/runDeterministicShardedFullJest";

export type AffectedJestRuntimeCalibration = {
  schema: "verification-affected-jest-runtime-calibration/v1";
  source_gate: string;
  source_sha: string;
  execution_profile?: string;
  measured_at?: string | null;
  measurement_scope?: string;
  suites: Record<string, number>;
  conservative_unmeasured_suites?: Record<string, {
    weight_ms: number;
    basis: string;
  }>;
  resource_policy?: {
    standard_wave_minimum_free_physical_bytes: number;
    closeout_reserve_bytes: number;
    maximum_standard_process_roots?: number;
    unmeasured_standard_root_peak_bytes?: number;
  };
  resource_profiles?: Record<string, {
    scheduling:
      | "exclusive_process_tree"
      | "nested_process_tree"
      | "paired_standard_process_tree"
      | "standard_outer_jest";
    outer_jest_processes: 1;
    nested_node_workers: number;
    child_old_space_mib: number | null;
    minimum_free_physical_bytes: number;
    observed_peak_tree_working_set_bytes: number | null;
    evidence: string;
    paired_with?: string;
    companion_standard_roots?: number;
    nested_wave_group?: string;
  }>;
};

export type AffectedJestResourceWave = {
  wave_id: number;
  resource_class:
    | "exclusive_process_tree"
    | "nested_with_standard_companions"
    | "standard_outer_jest";
  maximum_parallel_process_roots: number;
  nested_node_workers: number;
  minimum_free_physical_bytes: number;
  closeout_reserve_bytes: number;
  predicted_duration_weight_ms: number;
  estimated_peak_process_tree_bytes: number;
  memory_estimate_basis: string;
  shards: ReturnType<typeof planWeightedJestShards>;
};

const DEFAULT_CALIBRATION_PATH = path.join(
  "verification",
  "v1",
  "affected-jest-runtime-calibration.json",
);

export const MAX_LOCAL_AFFECTED_JEST_SHARDS = 4;
export const AFFECTED_JEST_EXECUTION_PROFILE = "run-in-band:no-detect-open-handles:sandbox-injected-math:progress-reporter/v2";
export const AFFECTED_JEST_PLANNING_WEIGHT_UNIT = "estimated-milliseconds";

export function estimateUnmeasuredAffectedJestRuntimeMs(input: {
  sourceBytes: number;
  declaredTests: number;
}): number {
  // This is an explicit scheduling estimate, not an observed duration. Startup,
  // transform work and assertion count remain separate terms in one time unit.
  return Math.max(1_000, Math.ceil(
    750 + Math.max(0, input.sourceBytes) / 128 + Math.max(0, input.declaredTests) * 250,
  ));
}

export function resolveAffectedJestShardCount(
  suiteCount: number,
  availableParallelism = osAvailableParallelism(),
): number {
  return Math.max(1, Math.min(suiteCount, availableParallelism, MAX_LOCAL_AFFECTED_JEST_SHARDS));
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function applyAffectedJestRuntimeCalibration(
  manifest: readonly WeightedJestManifestEntry[],
  runtimeMsBySuite: Readonly<Record<string, number>>,
): WeightedJestManifestEntry[] {
  return manifest.map((entry) => {
    const measuredRuntimeMs = runtimeMsBySuite[entry.test_path];
    return {
      ...entry,
      weight: Number.isFinite(measuredRuntimeMs) && measuredRuntimeMs > 0
        ? Math.ceil(measuredRuntimeMs)
        : entry.weight,
    };
  });
}

type ResourceProfile = NonNullable<AffectedJestRuntimeCalibration["resource_profiles"]>[string];

function estimateShardPeakBytes(input: {
  shard: ReturnType<typeof planWeightedJestShards>[number];
  profiles: Readonly<Record<string, ResourceProfile>>;
  unmeasuredRootPeakBytes: number;
}): number {
  return Math.max(
    input.unmeasuredRootPeakBytes,
    ...input.shard.test_files.map((testPath) =>
      input.profiles[testPath]?.observed_peak_tree_working_set_bytes ?? 0
    ),
  );
}

function nestedWorkersForShard(
  shard: ReturnType<typeof planWeightedJestShards>[number],
  profiles: Readonly<Record<string, ResourceProfile>>,
): number {
  return Math.max(0, ...shard.test_files.map((testPath) =>
    profiles[testPath]?.nested_node_workers ?? 0
  ));
}

function planCompanionShards(input: {
  available: readonly WeightedJestManifestEntry[];
  pinned: readonly WeightedJestManifestEntry[];
  rootCount: number;
  targetWeight: number;
}): {
  shards: ReturnType<typeof planWeightedJestShards>;
  assignedPaths: Set<string>;
} {
  const rootCount = input.rootCount;
  if (rootCount === 0) return { shards: [], assignedPaths: new Set() };
  const assignments: WeightedJestManifestEntry[][] = Array.from({ length: rootCount }, () => []);
  const assignmentWeights = Array.from({ length: rootCount }, () => 0);
  for (const pinned of input.pinned) {
    const target = assignmentWeights
      .map((weight, index) => ({ weight, index }))
      .sort((left, right) => left.weight - right.weight || left.index - right.index)[0];
    assignments[target.index].push(pinned);
    assignmentWeights[target.index] += pinned.weight;
  }
  const assignedPaths = new Set(input.pinned.map((entry) => entry.test_path));
  const candidates = input.available
    .filter((entry) => !assignedPaths.has(entry.test_path))
    .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"));
  const weightOf = (entries: readonly WeightedJestManifestEntry[]) =>
    entries.reduce((total, entry) => total + entry.weight, 0);
  for (const candidate of candidates) {
    const viable = assignments
      .map((entries, index) => ({ index, weight: weightOf(entries) }))
      .filter(({ weight }) => weight + candidate.weight <= input.targetWeight)
      .sort((left, right) => left.weight - right.weight || left.index - right.index);
    const target = viable[0];
    if (!target) continue;
    assignments[target.index].push(candidate);
    assignedPaths.add(candidate.test_path);
  }
  return {
    assignedPaths,
    shards: assignments
      .filter((entries) => entries.length > 0)
      .map((entries, shardId) => ({
        shard_id: shardId,
        weight: weightOf(entries),
        test_files: entries
          .map((entry) => entry.test_path)
          .sort((left, right) => left.localeCompare(right, "en")),
      })),
  };
}

function planMemoryAwareStandardShards(input: {
  entries: readonly WeightedJestManifestEntry[];
  shardCount: number;
  profiles: Readonly<Record<string, ResourceProfile>>;
  unmeasuredRootPeakBytes: number;
}): ReturnType<typeof planWeightedJestShards> {
  const highMemory = input.entries
    .filter((entry) =>
      (input.profiles[entry.test_path]?.observed_peak_tree_working_set_bytes ?? 0)
        > input.unmeasuredRootPeakBytes
    )
    .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"));
  if (highMemory.length === 0 || input.shardCount <= 1) {
    return planWeightedJestShards(input.entries, input.shardCount);
  }
  const highMemoryPaths = new Set(highMemory.map((entry) => entry.test_path));
  const assignments: WeightedJestManifestEntry[][] = Array.from(
    { length: input.shardCount },
    (_, index) => index === 0 ? [...highMemory] : [],
  );
  const weights = assignments.map((entries) =>
    entries.reduce((total, entry) => total + entry.weight, 0)
  );
  for (const entry of input.entries
    .filter((candidate) => !highMemoryPaths.has(candidate.test_path))
    .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"))) {
    const target = weights
      .map((weight, index) => ({ weight, index }))
      .sort((left, right) => left.weight - right.weight || left.index - right.index)[0];
    assignments[target.index].push(entry);
    weights[target.index] += entry.weight;
  }
  return assignments
    .filter((entries) => entries.length > 0)
    .map((entries, shardId) => ({
      shard_id: shardId,
      weight: entries.reduce((total, entry) => total + entry.weight, 0),
      test_files: entries
        .map((entry) => entry.test_path)
        .sort((left, right) => left.localeCompare(right, "en")),
    }));
}

export function buildAffectedJestShardPlan(input: {
  root: string;
  suites: readonly string[];
  shardCount: number;
  calibrationPath?: string;
}) {
  const calibrationPath = path.resolve(
    input.root,
    input.calibrationPath ?? DEFAULT_CALIBRATION_PATH,
  );
  const calibrationBytes = fs.readFileSync(calibrationPath);
  const calibration = JSON.parse(calibrationBytes.toString("utf8")) as AffectedJestRuntimeCalibration;
  if (calibration.schema !== "verification-affected-jest-runtime-calibration/v1") {
    throw new Error(`invalid_affected_jest_runtime_calibration:${calibration.schema}`);
  }
  const calibrationExecutionProfile = calibration.execution_profile ?? "legacy-unspecified";
  const executionProfileCompatible = calibrationExecutionProfile === AFFECTED_JEST_EXECUTION_PROFILE;
  const staticManifest = [...input.suites]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((testPath): WeightedJestManifestEntry => {
      const source = fs.readFileSync(path.join(input.root, testPath));
      const declaredTests = (source.toString("utf8").match(/\b(?:it|test)\s*\(/g) ?? []).length;
      return {
        test_path: testPath,
        source_bytes: source.byteLength,
        declared_tests: declaredTests,
        weight: estimateUnmeasuredAffectedJestRuntimeMs({
          sourceBytes: source.byteLength,
          declaredTests,
        }),
        content_sha256: sha256(source),
      };
    });
  const availableCalibratedSelectedSuites = staticManifest.filter((entry) =>
    Number.isFinite(calibration.suites[entry.test_path]) && calibration.suites[entry.test_path] > 0
  ).length;
  const appliedRuntimeCalibration = executionProfileCompatible ? calibration.suites : {};
  const calibratedSelectedSuites = executionProfileCompatible ? availableCalibratedSelectedSuites : 0;
  const configuredConservativeWeights = calibration.conservative_unmeasured_suites ?? {};
  const appliedConservativeWeights = executionProfileCompatible
    ? Object.fromEntries(Object.entries(configuredConservativeWeights)
      .filter(([, value]) => Number.isFinite(value.weight_ms) && value.weight_ms > 0)
      .map(([testPath, value]) => [testPath, value.weight_ms]))
    : {};
  const conservativeSelectedSuites = staticManifest.filter((entry) =>
    appliedRuntimeCalibration[entry.test_path] == null &&
    appliedConservativeWeights[entry.test_path] != null
  ).length;
  const manifest = applyAffectedJestRuntimeCalibration(
    applyAffectedJestRuntimeCalibration(staticManifest, appliedConservativeWeights),
    appliedRuntimeCalibration,
  );
  const configuredResourceProfiles = calibration.resource_profiles ?? {};
  const appliedResourceProfiles = executionProfileCompatible ? configuredResourceProfiles : {};
  const exclusiveEntries = manifest
    .filter((entry) => appliedResourceProfiles[entry.test_path]?.scheduling === "exclusive_process_tree")
    .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"));
  const nestedEntries = manifest
    .filter((entry) => appliedResourceProfiles[entry.test_path]?.scheduling === "nested_process_tree")
    .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"));
  const nonStandardPaths = new Set([...exclusiveEntries, ...nestedEntries].map((entry) => entry.test_path));
  const pairedEntries = manifest.filter((entry) =>
    appliedResourceProfiles[entry.test_path]?.scheduling === "paired_standard_process_tree"
  );
  const pairedPaths = new Set(pairedEntries.map((entry) => entry.test_path));
  let standardEntries = manifest.filter((entry) => !nonStandardPaths.has(entry.test_path));
  let nextShardId = 0;
  const closeoutReserveBytes = calibration.resource_policy?.closeout_reserve_bytes ?? 0;
  const unmeasuredRootPeakBytes = calibration.resource_policy?.unmeasured_standard_root_peak_bytes
    ?? 0;
  const resourceWaves: AffectedJestResourceWave[] = exclusiveEntries.map((entry, waveId) => {
    const resourceProfile = appliedResourceProfiles[entry.test_path];
    const shard = planWeightedJestShards([entry], 1)[0];
    shard.shard_id = nextShardId++;
    const estimatedPeakBytes = estimateShardPeakBytes({
      shard,
      profiles: appliedResourceProfiles,
      unmeasuredRootPeakBytes,
    });
    return {
      wave_id: waveId,
      resource_class: "exclusive_process_tree",
      maximum_parallel_process_roots: 1,
      nested_node_workers: resourceProfile.nested_node_workers,
      minimum_free_physical_bytes: resourceProfile.minimum_free_physical_bytes,
      closeout_reserve_bytes: closeoutReserveBytes,
      predicted_duration_weight_ms: shard.weight,
      estimated_peak_process_tree_bytes: estimatedPeakBytes,
      memory_estimate_basis: "single exclusive root; maximum configured observed suite-tree peak",
      shards: [shard],
    };
  });
  const nestedGroups = new Map<string, WeightedJestManifestEntry[]>();
  for (const entry of nestedEntries) {
    const configuredGroup = appliedResourceProfiles[entry.test_path]?.nested_wave_group?.trim();
    const groupId = configuredGroup || `single:${entry.test_path}`;
    nestedGroups.set(groupId, [...(nestedGroups.get(groupId) ?? []), entry]);
  }
  for (const groupEntries of nestedGroups.values()) {
    const groupPaths = new Set(groupEntries.map((entry) => entry.test_path));
    const resourceProfiles = groupEntries.map((entry) => appliedResourceProfiles[entry.test_path]);
    const pinned = pairedEntries
      .filter((candidate) => groupPaths.has(appliedResourceProfiles[candidate.test_path]?.paired_with ?? ""))
      .sort((left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"));
    const generalAvailable = standardEntries.filter((candidate) =>
      !pairedPaths.has(candidate.test_path)
      && (appliedResourceProfiles[candidate.test_path]?.observed_peak_tree_working_set_bytes ?? 0)
        <= unmeasuredRootPeakBytes
    );
    const companionPlan = planCompanionShards({
      available: generalAvailable,
      pinned,
      rootCount: Math.max(
        pinned.length > 0 ? 1 : 0,
        ...resourceProfiles.map((profile) => profile.companion_standard_roots ?? pinned.length),
      ),
      targetWeight: Math.max(...groupEntries.map((entry) => entry.weight)),
    });
    const nestedShards = groupEntries.map((entry) => planWeightedJestShards([entry], 1)[0]);
    const waveShards = [...nestedShards, ...companionPlan.shards];
    for (const shard of waveShards) shard.shard_id = nextShardId++;
    const assigned = new Set([...companionPlan.assignedPaths, ...pinned.map((item) => item.test_path)]);
    standardEntries = standardEntries.filter((candidate) => !assigned.has(candidate.test_path));
    const estimatedPeakBytes = waveShards.reduce((total, shard) => total + estimateShardPeakBytes({
      shard,
      profiles: appliedResourceProfiles,
      unmeasuredRootPeakBytes,
    }), 0);
    resourceWaves.push({
      wave_id: resourceWaves.length,
      resource_class: "nested_with_standard_companions",
      maximum_parallel_process_roots: waveShards.length,
      nested_node_workers: waveShards.reduce(
        (total, shard) => total + nestedWorkersForShard(shard, appliedResourceProfiles),
        0,
      ),
      minimum_free_physical_bytes: Math.max(
        ...resourceProfiles.map((profile) => profile.minimum_free_physical_bytes),
        estimatedPeakBytes,
      ),
      closeout_reserve_bytes: closeoutReserveBytes,
      predicted_duration_weight_ms: Math.max(...waveShards.map((shard) => shard.weight)),
      estimated_peak_process_tree_bytes: estimatedPeakBytes,
      memory_estimate_basis: "sum of per-root maximum observed suite-tree peaks; unmeasured roots use the configured conservative estimate",
      shards: waveShards,
    });
  }
  const unassignedPaired = standardEntries.filter((entry) => pairedPaths.has(entry.test_path));
  if (unassignedPaired.length > 0) {
    throw new Error(`affected_jest_paired_resource_profile_target_missing:${unassignedPaired.map((entry) => entry.test_path).join(",")}`);
  }
  if (standardEntries.length > 0) {
    const maximumStandardRoots = calibration.resource_policy?.maximum_standard_process_roots
      ?? input.shardCount;
    const standardShards = planMemoryAwareStandardShards({
      entries: standardEntries,
      shardCount: Math.min(input.shardCount, maximumStandardRoots, standardEntries.length),
      profiles: appliedResourceProfiles,
      unmeasuredRootPeakBytes,
    });
    for (const shard of standardShards) shard.shard_id = nextShardId++;
    const estimatedPeakBytes = standardShards.reduce((total, shard) => total + estimateShardPeakBytes({
      shard,
      profiles: appliedResourceProfiles,
      unmeasuredRootPeakBytes,
    }), 0);
    resourceWaves.push({
      wave_id: resourceWaves.length,
      resource_class: "standard_outer_jest",
      maximum_parallel_process_roots: standardShards.length,
      nested_node_workers: standardShards.reduce(
        (total, shard) => total + nestedWorkersForShard(shard, appliedResourceProfiles),
        0,
      ),
      minimum_free_physical_bytes:
        Math.max(
          calibration.resource_policy?.standard_wave_minimum_free_physical_bytes ?? 0,
          estimatedPeakBytes,
        ),
      closeout_reserve_bytes: closeoutReserveBytes,
      predicted_duration_weight_ms: Math.max(...standardShards.map((shard) => shard.weight)),
      estimated_peak_process_tree_bytes: estimatedPeakBytes,
      memory_estimate_basis: "sum of per-root maximum observed suite-tree peaks; unmeasured roots use the configured conservative estimate",
      shards: standardShards,
    });
  }
  const shards = resourceWaves.flatMap((wave) => wave.shards);
  const validation = validateWeightedJestShardPlan(manifest, shards);
  if (validation.missing.length || validation.duplicates.length || validation.unexpected.length) {
    throw new Error(`invalid_affected_jest_shard_plan:${JSON.stringify(validation)}`);
  }
  return {
    calibration,
    calibration_path: path.relative(input.root, calibrationPath).replace(/\\/g, "/"),
    calibration_sha256: sha256(calibrationBytes),
    calibration_coverage: {
      selected_suites: staticManifest.length,
      available_calibrated_selected_suites: availableCalibratedSelectedSuites,
      calibrated_selected_suites: calibratedSelectedSuites,
      conservative_prior_selected_suites: conservativeSelectedSuites,
      estimated_unmeasured_selected_suites:
        staticManifest.length - calibratedSelectedSuites - conservativeSelectedSuites,
      unmeasured_selected_suites: staticManifest.length - calibratedSelectedSuites,
      configured_calibration_suites: Object.keys(calibration.suites).length,
      configured_conservative_prior_suites: Object.keys(configuredConservativeWeights).length,
      calibration_execution_profile: calibrationExecutionProfile,
      target_execution_profile: AFFECTED_JEST_EXECUTION_PROFILE,
      execution_profile_compatible: executionProfileCompatible,
      incompatible_runtime_values_applied: false,
      weight_unit: AFFECTED_JEST_PLANNING_WEIGHT_UNIT,
      unmeasured_model: "max(1000,ceil(750+source_bytes/128+declared_tests*250))",
      measured_values_are_planning_weights_not_slo_prediction: true,
      conservative_prior_values_are_not_current_measurements: true,
      configured_resource_profiles: Object.keys(configuredResourceProfiles).length,
      applied_selected_resource_profiles: manifest.filter((entry) => appliedResourceProfiles[entry.test_path] != null).length,
      resource_profiles_execution_compatible: executionProfileCompatible,
    },
    manifest,
    manifest_sha256: sha256(
      manifest
        .map((entry) => `${entry.test_path}\0${entry.content_sha256}\0${entry.weight}`)
        .join("\n"),
    ),
    shards,
    resource_plan: {
      schema: "verification-affected-jest-resource-plan/v1" as const,
      mode: "bounded_resource_waves" as const,
      waves: resourceWaves,
      predicted_critical_path_weight_ms: resourceWaves.reduce(
        (total, wave) => total + wave.predicted_duration_weight_ms,
        0,
      ),
      measured_values_are_planning_weights_not_slo_prediction: true,
    },
    validation,
  };
}
