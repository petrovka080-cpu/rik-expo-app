import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  RELEASE_PIPELINE_ARTIFACT_DIR,
  releasePipelineRuntimeDir,
  SOURCE_TREE_PATTERNS,
  computeReleaseFingerprints,
  type ReleaseFingerprints,
} from "./computeReleaseFingerprints";

export const RELEASE_CANDIDATE_ARTIFACT_PATH = path.join(
  RELEASE_PIPELINE_ARTIFACT_DIR,
  "candidate.json",
);

export const RELEASE_CANDIDATE_STATES = [
  "DEVELOPING",
  "SOURCE_FROZEN",
  "STATIC_GREEN",
  "FOCUSED_GREEN",
  "FULL_JEST_GREEN",
  "WEB_GREEN",
  "ANDROID_API34_GREEN",
  "RELEASE_VERIFY_GREEN",
  "PROOF_COMMITTED",
  "PUSHED",
  "POST_PUSH_GREEN",
  "CLOSED",
  "CANCELLED_SOURCE_CHANGED_AFTER_FREEZE",
] as const;

export type ReleaseCandidateState = (typeof RELEASE_CANDIDATE_STATES)[number];

export type ReleaseCandidate = ReleaseFingerprints & {
  candidate_id: string;
  state: ReleaseCandidateState;
  source_commit: string;
  created_at: string;
  updated_at: string;
  source_changes_after_freeze: number;
  full_jest_runs_for_candidate: number;
  android_apk_builds_for_candidate: number;
  android_apk_installs_for_candidate: number;
  android_replays_for_candidate: number;
  fake_green_claimed: false;
};

export function releaseCandidateRuntimeStatePath(candidateHash: string): string {
  return path.join(releasePipelineRuntimeDir(candidateHash), "candidate_state.json");
}

const ORDERED_STATES: ReleaseCandidateState[] = [
  "DEVELOPING",
  "SOURCE_FROZEN",
  "STATIC_GREEN",
  "FOCUSED_GREEN",
  "FULL_JEST_GREEN",
  "WEB_GREEN",
  "ANDROID_API34_GREEN",
  "RELEASE_VERIFY_GREEN",
  "PROOF_COMMITTED",
  "PUSHED",
  "POST_PUSH_GREEN",
  "CLOSED",
];

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export function currentGitHead(): string {
  return runGit(["rev-parse", "HEAD"]);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function gitPathMatches(pathName: string, patterns: readonly string[]): boolean {
  const normalized = normalizePath(pathName);
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePath(pattern);
    return normalized === normalizedPattern || normalized.startsWith(`${normalizedPattern}/`);
  });
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => normalizePath(line.trim())).filter(Boolean);
}

export function listSourceWorktreeChanges(): string[] {
  const unstaged = splitLines(runGit(["diff", "--name-only"]));
  const staged = splitLines(runGit(["diff", "--cached", "--name-only"]));
  const untracked = splitLines(runGit(["ls-files", "--others", "--exclude-standard"]));
  return Array.from(new Set([...unstaged, ...staged, ...untracked]))
    .filter((filePath) => gitPathMatches(filePath, SOURCE_TREE_PATTERNS))
    .sort();
}

export function listStagedFiles(): string[] {
  return splitLines(runGit(["diff", "--cached", "--name-only"]));
}

export function loadReleaseCandidate(): ReleaseCandidate {
  const fingerprints = computeReleaseFingerprints();
  const parsed = JSON.parse(fs.readFileSync(releaseCandidateRuntimeStatePath(fingerprints.candidateHash), "utf8")) as ReleaseCandidate;
  if (!RELEASE_CANDIDATE_STATES.includes(parsed.state)) {
    throw new Error("BLOCKED_RELEASE_CANDIDATE_STATE_INVALID");
  }
  return parsed;
}

export function writeReleaseCandidate(candidate: ReleaseCandidate): ReleaseCandidate {
  const target = releaseCandidateRuntimeStatePath(candidate.candidateHash);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  return candidate;
}

export function createReleaseCandidate(state: ReleaseCandidateState = "DEVELOPING"): ReleaseCandidate {
  const fingerprints = computeReleaseFingerprints();
  const now = new Date().toISOString();
  return {
    candidate_id: `rc-${fingerprints.candidateHash.slice(0, 12)}`,
    state,
    source_commit: currentGitHead(),
    ...fingerprints,
    created_at: now,
    updated_at: now,
    source_changes_after_freeze: listSourceWorktreeChanges().length,
    full_jest_runs_for_candidate: 0,
    android_apk_builds_for_candidate: 0,
    android_apk_installs_for_candidate: 0,
    android_replays_for_candidate: 0,
    fake_green_claimed: false,
  };
}

export function canTransitionReleaseCandidate(from: ReleaseCandidateState, to: ReleaseCandidateState): boolean {
  if (to === "CANCELLED_SOURCE_CHANGED_AFTER_FREEZE") return true;
  const fromIndex = ORDERED_STATES.indexOf(from);
  const toIndex = ORDERED_STATES.indexOf(to);
  return fromIndex >= 0 && toIndex === fromIndex + 1;
}

export function transitionReleaseCandidate(to: ReleaseCandidateState): ReleaseCandidate {
  const current = loadReleaseCandidate();
  if (!canTransitionReleaseCandidate(current.state, to)) {
    throw new Error(`BLOCKED_RELEASE_CANDIDATE_INVALID_TRANSITION:${current.state}->${to}`);
  }
  return writeReleaseCandidate({
    ...current,
    state: to,
    updated_at: new Date().toISOString(),
    source_changes_after_freeze: listSourceWorktreeChanges().length,
  });
}

export function assertReleaseCandidateState(expected: ReleaseCandidateState): ReleaseCandidate {
  const candidate = loadReleaseCandidate();
  if (candidate.state !== expected) {
    throw new Error(`BLOCKED_RELEASE_CANDIDATE_STATE:${candidate.state}:expected:${expected}`);
  }
  return candidate;
}
