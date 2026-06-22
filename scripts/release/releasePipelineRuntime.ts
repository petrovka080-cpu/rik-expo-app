import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  RELEASE_PIPELINE_ARTIFACT_DIR,
  releasePipelineRuntimeDir,
  computeReleaseFingerprints,
} from "./computeReleaseFingerprints";
import type { ReleaseCandidate } from "./releaseCandidateState";

export type JsonObject = Record<string, unknown>;

export function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function readJsonObject(filePath: string): JsonObject {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object at ${filePath}`);
  }
  return parsed as JsonObject;
}

export function readJsonObjectIfExists(filePath: string): JsonObject | null {
  return fs.existsSync(filePath) ? readJsonObject(filePath) : null;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runGit(args: string[], options: { allowFailure?: boolean } = {}): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export function currentHead(): string {
  return runGit(["rev-parse", "HEAD"]);
}

export function currentBranch(): string {
  return runGit(["branch", "--show-current"]);
}

export function gitStatusSnapshot(): string {
  return runGit(["status", "--short", "--branch", "--untracked-files=all"], {
    allowFailure: false,
  }).replace(/\r\n/g, "\n");
}

function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function trackedFileHashes(): Record<string, string> {
  const output = runGit(["ls-files", "-z"]);
  const hashes: Record<string, string> = {};
  for (const rawPath of output.split("\0")) {
    const relativePath = normalizeRepoPath(rawPath.trim());
    if (!relativePath) continue;
    const absolutePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) continue;
    hashes[relativePath] = sha256(fs.readFileSync(absolutePath));
  }
  return hashes;
}

export function untrackedFilesSnapshot(): string[] {
  const output = runGit(["ls-files", "--others", "--exclude-standard", "-z"]);
  return output
    .split("\0")
    .map((rawPath) => normalizeRepoPath(rawPath.trim()))
    .filter(Boolean)
    .sort();
}

function listFilesRecursive(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  };
  visit(root);
  return files.sort();
}

export type ReleaseVerifyStrictSnapshot = {
  trackedHashes: Record<string, string>;
  untrackedFiles: string[];
  candidateHash: string;
  runtimeRoot: string;
  runtimeEvidenceHashes: Record<string, string>;
};

export function candidateRuntimeEvidenceHashes(candidateHash = computeReleaseFingerprints().candidateHash): {
  candidateHash: string;
  runtimeRoot: string;
  hashes: Record<string, string>;
} {
  const runtimeRoot = releasePipelineRuntimeDir(candidateHash);
  const hashes: Record<string, string> = {};
  for (const filePath of listFilesRecursive(runtimeRoot)) {
    const relativePath = normalizeRepoPath(path.relative(runtimeRoot, filePath));
    hashes[relativePath] = sha256(fs.readFileSync(filePath));
  }
  return { candidateHash, runtimeRoot, hashes };
}

export function releaseVerifyStrictSnapshot(): ReleaseVerifyStrictSnapshot {
  const runtime = candidateRuntimeEvidenceHashes();
  return {
    trackedHashes: trackedFileHashes(),
    untrackedFiles: untrackedFilesSnapshot(),
    candidateHash: runtime.candidateHash,
    runtimeRoot: runtime.runtimeRoot,
    runtimeEvidenceHashes: runtime.hashes,
  };
}

export function diffReleaseVerifyStrictSnapshots(
  before: ReleaseVerifyStrictSnapshot,
  after: ReleaseVerifyStrictSnapshot,
): string[] {
  const failures: string[] = [];
  if (!hasSameJson(before.trackedHashes, after.trackedHashes) || !hasSameJson(before.untrackedFiles, after.untrackedFiles)) {
    failures.push("VERIFY_MUTATED_WORKTREE");
  }
  if (before.candidateHash !== after.candidateHash || !hasSameJson(before.runtimeEvidenceHashes, after.runtimeEvidenceHashes)) {
    failures.push("VERIFY_MUTATED_RUNTIME_EVIDENCE");
  }
  return failures;
}

export function releaseRuntimeIsGitignored(): boolean {
  const result = spawnSync("git", ["check-ignore", "-q", ".release-runtime/probe.json"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  return result.status === 0;
}

export function candidateRuntimeDir(candidate: Pick<ReleaseCandidate, "candidateHash">): string {
  return releasePipelineRuntimeDir(candidate.candidateHash);
}

export function candidateAndroidRuntimeDir(candidate: Pick<ReleaseCandidate, "candidateHash">): string {
  return releasePipelineRuntimeDir(candidate.candidateHash, "android");
}

export function releaseRecoveryArtifactPath(name: string): string {
  return path.join(RELEASE_PIPELINE_ARTIFACT_DIR, name);
}

export function hasSameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
