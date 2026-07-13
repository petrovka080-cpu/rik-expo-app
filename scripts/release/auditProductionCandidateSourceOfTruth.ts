import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const PRODUCTION_SOURCE_OF_TRUTH_WAVE =
  "S_PRODUCTION_SOURCE_OF_TRUTH_RELEASE_CANDIDATE_CI_BASELINE_AND_STAGING_DEPLOY_GUARD_POINT_OF_NO_RETURN" as const;
export const GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY =
  "GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY" as const;
export const STOP_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_NOT_READY =
  "STOP_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_NOT_READY" as const;
export const DEFAULT_PRODUCTION_CANDIDATE_BRANCH = "release/production-candidate" as const;

type EnvLike = Record<string, string | undefined>;
type GitStateOverride = Partial<{
  headSha: string;
  originMainSha: string;
  mergeBaseWithMain: string;
  aheadBehindMain: string;
  status: string;
  upstreamSync: string;
  originMainIsAncestor: boolean;
  verified11610ShaIsAncestor: boolean;
}>;

export type ProductionCandidateSourceOfTruthSummary = ReturnType<typeof buildProductionCandidateSourceOfTruthSummary>;

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function gitSucceeds(args: string[]): boolean {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  return result.status === 0;
}

function currentBranch(env: EnvLike): string {
  return (
    env.GITHUB_HEAD_REF ||
    env.GITHUB_REF_NAME ||
    env.BRANCH ||
    gitOutput(["branch", "--show-current"]) ||
    "unknown"
  );
}

function upstreamSync(): string {
  return gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "upstream_missing").replace(/\s+/g, " ");
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

export function buildProductionCandidateSourceOfTruthSummary(input: {
  env?: EnvLike;
  candidateBranch?: string;
  verified11610Sha?: string | null;
  requireUpstream?: boolean;
  gitState?: GitStateOverride;
} = {}) {
  const env = input.env ?? process.env;
  const gitState = input.gitState ?? {};
  const candidateBranch = input.candidateBranch ?? DEFAULT_PRODUCTION_CANDIDATE_BRANCH;
  const verified11610Sha = String(input.verified11610Sha ?? "").trim();
  const headSha = gitState.headSha ?? gitOutput(["rev-parse", "HEAD"]);
  const originMainSha = gitState.originMainSha ?? gitOutput(["rev-parse", "--verify", "origin/main"]);
  const branch = currentBranch(env);
  const mergeBaseWithMain = gitState.mergeBaseWithMain ?? (originMainSha ? gitOutput(["merge-base", "HEAD", "origin/main"]) : "");
  const aheadBehindMain = gitState.aheadBehindMain ?? (originMainSha
    ? gitOutput(["rev-list", "--left-right", "--count", "origin/main...HEAD"]).replace(/\s+/g, " ")
    : "");
  const status = gitState.status ?? gitOutput(["status", "--porcelain=v1", "--untracked-files=all"]);
  const sync = gitState.upstreamSync ?? upstreamSync();
  const originMainIsAncestor = gitState.originMainIsAncestor ?? (
    originMainSha ? gitSucceeds(["merge-base", "--is-ancestor", "origin/main", "HEAD"]) : false
  );
  const verified11610ShaIsAncestor = gitState.verified11610ShaIsAncestor ?? (verified11610Sha
    ? gitSucceeds(["merge-base", "--is-ancestor", verified11610Sha, "HEAD"])
    : false);

  const blockers = [
    validSha(headSha) ? "" : "STOP_PRODUCTION_SOURCE_SHA_MISSING",
    branch === candidateBranch ? "" : "STOP_PRODUCTION_CANDIDATE_BRANCH_NOT_CHECKED_OUT",
    originMainSha ? "" : "STOP_ORIGIN_MAIN_NOT_AVAILABLE",
    originMainIsAncestor ? "" : "STOP_ORIGIN_MAIN_NOT_ANCESTOR",
    validSha(verified11610Sha) ? "" : "STOP_VERIFIED_11610_SHA_MISSING",
    verified11610ShaIsAncestor ? "" : "STOP_VERIFIED_11610_SHA_NOT_ANCESTOR",
    status.length === 0 ? "" : "STOP_PRODUCTION_WORKTREE_NOT_CLEAN",
    input.requireUpstream && sync !== "0 0" ? "STOP_PRODUCTION_HEAD_NOT_UPSTREAM" : "",
  ].filter(Boolean);

  return {
    wave: PRODUCTION_SOURCE_OF_TRUTH_WAVE,
    final_status: blockers.length === 0
      ? GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY
      : STOP_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_NOT_READY,
    candidate_branch: candidateBranch,
    current_branch: branch,
    head_sha: headSha || null,
    head_sha_valid: validSha(headSha),
    origin_main_sha: originMainSha || null,
    merge_base_with_origin_main: mergeBaseWithMain || null,
    ahead_behind_origin_main: aheadBehindMain || null,
    origin_main_is_ancestor: originMainIsAncestor,
    verified_11610_sha: verified11610Sha || null,
    verified_11610_sha_is_ancestor: verified11610ShaIsAncestor,
    upstream_sync: sync,
    upstream_required: Boolean(input.requireUpstream),
    worktree_clean: status.length === 0,
    dirty_files: status.split(/\r?\n/).filter(Boolean),
    source_of_truth_doc: "docs/release/PRODUCTION_SOURCE_OF_TRUTH.md",
    production_deploy_started: false,
    staging_deploy_started: false,
    native_build_started: false,
    main_merge_started: false,
    default_branch_changed: false,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

function writeSummary(filePath: string, summary: ProductionCandidateSourceOfTruthSummary): void {
  const fullPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

if (require.main === module) {
  const summary = buildProductionCandidateSourceOfTruthSummary({
    candidateBranch: argValue("candidate-branch") ?? DEFAULT_PRODUCTION_CANDIDATE_BRANCH,
    verified11610Sha: argValue("verified-11610-sha"),
    requireUpstream: hasFlag("require-upstream"),
  });
  const summaryFile = argValue("summary-file");
  if (summaryFile) writeSummary(summaryFile, summary);
  if (hasFlag("json") || !summaryFile) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(summary.final_status);
  }
  if (summary.final_status !== GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY) {
    process.exitCode = 1;
  }
}
