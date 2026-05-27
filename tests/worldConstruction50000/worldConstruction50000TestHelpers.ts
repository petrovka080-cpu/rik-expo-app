import fs from "node:fs";
import path from "node:path";

import {
  WORLD_50000_ARTIFACT_DIR,
  WORLD_50000_CASES_PER_SHARD,
  WORLD_50000_GOVERNED_TOTAL,
  WORLD_50000_SHARDS_TOTAL,
  buildWorld50000AllGovernedCases,
  buildWorld50000AmbiguousCase,
  buildWorld50000DangerousCase,
  buildWorld50000GovernedCase,
  buildWorld50000ShardArtifacts,
  buildWorld50000ShardCases,
  buildWorld50000UnknownCase,
  sourceHasExactPromptLookup,
  validateWorld50000Case,
} from "../../scripts/e2e/worldConstruction50000RealityProof.shared";

export {
  WORLD_50000_ARTIFACT_DIR,
  WORLD_50000_CASES_PER_SHARD,
  WORLD_50000_GOVERNED_TOTAL,
  WORLD_50000_SHARDS_TOTAL,
  buildWorld50000AllGovernedCases,
  buildWorld50000AmbiguousCase,
  buildWorld50000DangerousCase,
  buildWorld50000GovernedCase,
  buildWorld50000ShardArtifacts,
  buildWorld50000ShardCases,
  buildWorld50000UnknownCase,
  sourceHasExactPromptLookup,
  validateWorld50000Case,
};

export function repoText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function world50000ProofSource(): string {
  return [
    "scripts/e2e/worldConstruction50000RealityProof.shared.ts",
    "scripts/e2e/runWorldConstruction50000ShardProof.ts",
    "scripts/e2e/runWorldConstruction50000ShardMerge.ts",
    "scripts/e2e/runWorldConstructionLiveRealitySampleProof.ts",
    "scripts/e2e/runWorldConstructionPdfExtractionSample.ts",
    "scripts/e2e/runAndroidApi34WorldConstruction50000LiveSample.ts",
  ].map(repoText).join("\n");
}

export function readWorld50000Matrix(): Record<string, unknown> | null {
  const filePath = path.join(WORLD_50000_ARTIFACT_DIR, "matrix.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

export function expectGeneratedCasePasses(index: number): void {
  const result = validateWorld50000Case(buildWorld50000GovernedCase(index));
  expect(result.passed).toBe(true);
  expect(result.failureCodes).toEqual([]);
}
