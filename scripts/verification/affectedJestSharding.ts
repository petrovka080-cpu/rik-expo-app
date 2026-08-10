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
  suites: Record<string, number>;
};

const DEFAULT_CALIBRATION_PATH = path.join(
  "verification",
  "v1",
  "affected-jest-runtime-calibration.json",
);

export const MAX_LOCAL_AFFECTED_JEST_SHARDS = 3;

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
        ? Math.max(entry.weight, Math.ceil(measuredRuntimeMs))
        : entry.weight,
    };
  });
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
  const staticManifest = [...input.suites]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((testPath): WeightedJestManifestEntry => {
      const source = fs.readFileSync(path.join(input.root, testPath));
      const declaredTests = (source.toString("utf8").match(/\b(?:it|test)\s*\(/g) ?? []).length;
      return {
        test_path: testPath,
        source_bytes: source.byteLength,
        declared_tests: declaredTests,
        weight: Math.max(1, source.byteLength + declaredTests * 4096),
        content_sha256: sha256(source),
      };
    });
  const manifest = applyAffectedJestRuntimeCalibration(staticManifest, calibration.suites);
  const shards = planWeightedJestShards(manifest, input.shardCount);
  const validation = validateWeightedJestShardPlan(manifest, shards);
  if (validation.missing.length || validation.duplicates.length || validation.unexpected.length) {
    throw new Error(`invalid_affected_jest_shard_plan:${JSON.stringify(validation)}`);
  }
  return {
    calibration,
    calibration_path: path.relative(input.root, calibrationPath).replace(/\\/g, "/"),
    calibration_sha256: sha256(calibrationBytes),
    manifest,
    manifest_sha256: sha256(
      manifest
        .map((entry) => `${entry.test_path}\0${entry.content_sha256}\0${entry.weight}`)
        .join("\n"),
    ),
    shards,
    validation,
  };
}
