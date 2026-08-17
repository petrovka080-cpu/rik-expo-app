import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (7).md",
);
const SPEC_SHA256 = "4bd245a1537da872dbc6ce6681c6571baeb146aa1123b5402e71bbec10050b62";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r56/evidence/01-preservation");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R56_CLEAN_CHECKPOINT_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R56_CLEAN_CHECKPOINT_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(git(["merge-base", BASE_COMMIT, head]) === BASE_COMMIT, "R56_CLEAN_CHECKPOINT_MERGE_BASE_DRIFT");
  invariant(git(["status", "--porcelain=v1"]) === "", "R56_CLEAN_CHECKPOINT_DIRTY_WORKTREE");

  const changedPaths = git(["diff", "--name-only", `${BASE_COMMIT}..${head}`, "--"])
    .split(/\r?\n/u)
    .filter(Boolean);
  const files = changedPaths.map((path) => {
    const absolutePath = resolve(path);
    invariant(existsSync(absolutePath), `R56_CLEAN_CHECKPOINT_FILE_MISSING:${path}`);
    return {
      path: path.replace(/\\/gu, "/"),
      bytes: statSync(absolutePath).size,
      sha256: sha256File(absolutePath),
      gitBlob: git(["rev-parse", `${head}:${path}`]),
    };
  });
  const commits = git(["rev-list", "--reverse", `${BASE_COMMIT}..${head}`])
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((commit) => ({
      commit,
      subject: git(["show", "-s", "--format=%s", commit]),
      tree: git(["rev-parse", `${commit}^{tree}`]),
    }));

  const bundlePath = resolve(EVIDENCE_ROOT, "CURRENT_R56_CLEAN_POST_691ACB78_INCREMENTAL.bundle");
  mkdirSync(dirname(bundlePath), { recursive: true });
  execFileSync("git", ["bundle", "create", bundlePath, "HEAD", `^${BASE_COMMIT}`], { stdio: "pipe" });
  execFileSync("git", ["bundle", "verify", bundlePath], { stdio: "pipe" });

  const probeGitDir = resolve(EVIDENCE_ROOT, "clean-restore-probe.git");
  if (!existsSync(probeGitDir)) execFileSync("git", ["init", "--bare", probeGitDir], { stdio: "pipe" });
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    resolve("."),
    `${BASE_COMMIT}:refs/heads/r56-prerequisite`,
  ], { stdio: "pipe" });
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    "--force",
    bundlePath,
    "HEAD:refs/heads/r56-clean-checkpoint",
  ], { stdio: "pipe" });
  const probeHead = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r56-clean-checkpoint"]);
  const probeTree = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r56-clean-checkpoint^{tree}"]);
  invariant(probeHead === head, `R56_CLEAN_CHECKPOINT_RESTORE_HEAD_DRIFT:${probeHead}:${head}`);
  invariant(probeTree === tree, `R56_CLEAN_CHECKPOINT_RESTORE_TREE_DRIFT:${probeTree}:${tree}`);

  const evidencePath = resolve(EVIDENCE_ROOT, "CURRENT_R56_CLEAN_DESCENDANT_CHECKPOINT.json");
  const evidence = {
    schemaVersion: "p0-one-monolith-r56-clean-descendant-checkpoint.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    worktree: resolve("."),
    branch,
    baseCommit: BASE_COMMIT,
    mergeBase: git(["merge-base", BASE_COMMIT, head]),
    head,
    tree,
    cleanStatus: true,
    commits,
    files,
    bundle: {
      path: relative(resolve("."), bundlePath).replace(/\\/gu, "/"),
      bytes: statSync(bundlePath).size,
      sha256: sha256File(bundlePath),
      verify: "GREEN",
      prerequisite: BASE_COMMIT,
    },
    restoreProbe: {
      gitDir: relative(resolve("."), probeGitDir).replace(/\\/gu, "/"),
      head: probeHead,
      tree: probeTree,
      exactHead: probeHead === head,
      exactTree: probeTree === tree,
    },
    status: "GREEN_CLEAN_HEAD_DESCENDANT_691ACB78_RESTORABLE",
  };
  writeJson(evidencePath, evidence);
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    branch,
    head,
    tree,
    commits: commits.length,
    changedFiles: files.length,
    bundleSha256: evidence.bundle.sha256,
    evidencePath,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
