import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const cleanupSourceFiles = [
  "scripts/release/releaseStateCleanupCore.ts",
  "scripts/release/releaseTargetScope.ts",
  "scripts/release/releaseWaveDirtyScope.ts",
  "scripts/release/classifyDirtyWorktreeByWave.ts",
  "scripts/release/planReleaseStateCleanupCommitBuckets.ts",
  "scripts/release/parkBlockedWaveState.ts",
  "scripts/release/normalizeReleaseProofTriplet.ts",
  "scripts/release/stabilizeGeneratedReleaseArtifacts.ts",
  "scripts/release/runReleaseVerifyCore.ts",
  "scripts/release/runReleaseVerifyOwner.ts",
  "scripts/release/runReleaseVerifyMobile.ts",
  "scripts/release/runProductionReleaseStateCleanupProof.ts",
  "scripts/release/runProductionReleaseStateCleanupCloseoutProof.ts",
  "scripts/release/runProductionReleaseStateCleanupIsolatedCloseoutProof.ts",
  "scripts/audit/runProductionReleaseWaveInventory.ts",
  "scripts/audit/runReleaseGuardConsistencyAudit.ts",
  "scripts/audit/runGeneratedArtifactHygieneAudit.ts",
  "scripts/audit/runProductionReleaseSecretScan.ts",
];

export function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function cleanupSources(): string {
  return cleanupSourceFiles.map(read).join("\n");
}

export function tempReleaseRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-state-cleanup-"));
  fs.mkdirSync(path.join(root, "scripts", "release"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "release", "releaseGuard.shared.ts"), "\n", "utf8");
  return root;
}

export function writeText(root: string, relativePath: string, value: string): void {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function writeJson(root: string, relativePath: string, value: unknown): void {
  writeText(root, relativePath, JSON.stringify(value, null, 2));
}
