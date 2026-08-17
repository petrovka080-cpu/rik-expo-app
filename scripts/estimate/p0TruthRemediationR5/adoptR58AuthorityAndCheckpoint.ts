import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, unknown>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const SPEC_BYTES = 219_294;
const SPEC_LINES = 3_751;
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const R57_SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence");
const PRESERVATION_ROOT = resolve(EVIDENCE_ROOT, "01-preservation");
const RAW_FREEZE_ROOT = resolve(PRESERVATION_ROOT, "raw-freeze");

const FROZEN_DIRTY_FILES = [
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "scripts/estimate/p0TruthRemediationR5/validateR57AcceptedTraceBaselineCandidates.ts",
  "supabase/migrations/20260818030000_p0_r54_cumulative_manifest.sql",
  "supabase/migrations/20260818040000_p0_r57_cumulative_compiler_contract.sql",
] as const;

const EXPECTED_RAW_SHA256: Readonly<Record<(typeof FROZEN_DIRTY_FILES)[number], string>> = {
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts":
    "66a5697498ad1ceb417cd5690bd297becaf1012e665b2879e68b15814dc4270e",
  "scripts/estimate/p0TruthRemediationR5/validateR57AcceptedTraceBaselineCandidates.ts":
    "ccf32b7226230d919941353c770389a797a8e21bedaf92b9af0f58b93fdcbbc6",
  "supabase/migrations/20260818030000_p0_r54_cumulative_manifest.sql":
    "78b0789e8ef00de31de0f30dd3ded4d45043188f5431d7574084359c4f1408eb",
  "supabase/migrations/20260818040000_p0_r57_cumulative_compiler_contract.sql":
    "0a3b6c61c6654d4552f747262e7b922f2498034df32796c7352289a94bc0b97d",
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function lineCount(bytes: Buffer): number {
  const text = bytes.toString("utf8");
  return text.split(/\r?\n/u).length - (text.endsWith("\n") ? 1 : 0);
}

function rawCopyName(path: string): string {
  return path.replace(/[\\/:]/gu, "_");
}

function main(): void {
  const specBytes = readFileSync(SPEC_PATH);
  invariant(sha256(specBytes) === SPEC_SHA256, "R58_SPEC_SHA256_MISMATCH");
  invariant(specBytes.byteLength === SPEC_BYTES, `R58_SPEC_BYTES_MISMATCH:${specBytes.byteLength}`);
  invariant(lineCount(specBytes) === SPEC_LINES, `R58_SPEC_LINES_MISMATCH:${lineCount(specBytes)}`);

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const trackedPatch = resolve(RAW_FREEZE_ROOT, "CURRENT_R58_TRACKED_DIRTY.patch");
  const bundle = resolve(RAW_FREEZE_ROOT, "CURRENT_R58_POST_691ACB78_INCREMENTAL.bundle");
  invariant(existsSync(trackedPatch), "R58_RAW_FREEZE_PATCH_MISSING");
  invariant(existsSync(bundle), "R58_RAW_FREEZE_BUNDLE_MISSING");
  invariant(
    sha256File(trackedPatch) === "e1328f8d3cc324c601a7ebeb7e54b74639d06d7dc4b87ab28860ed0b8044ec17",
    "R58_RAW_FREEZE_PATCH_DRIFT",
  );
  invariant(
    sha256File(bundle) === "b499a1760922f1e089b5cd3b52439f67e9b561a35d9bcaaffece0867fb550249",
    "R58_RAW_FREEZE_BUNDLE_DRIFT",
  );
  execFileSync("git", ["bundle", "verify", bundle], { stdio: ["ignore", "pipe", "pipe"] });

  const frozenFiles = FROZEN_DIRTY_FILES.map((path) => {
    const restoreCopy = resolve(RAW_FREEZE_ROOT, rawCopyName(path));
    invariant(existsSync(restoreCopy), `R58_FROZEN_RESTORE_COPY_MISSING:${path}`);
    const restoreSha256 = sha256File(restoreCopy);
    invariant(restoreSha256 === EXPECTED_RAW_SHA256[path], `R58_FROZEN_RESTORE_COPY_DRIFT:${path}`);
    return {
      path,
      bytes: statSync(restoreCopy).size,
      sha256: restoreSha256,
      restoreCopy: relative(resolve("."), restoreCopy).replace(/\\/gu, "/"),
      exact: true,
    };
  });

  const probeGitDir = resolve(PRESERVATION_ROOT, "restore-probe.git");
  if (!existsSync(probeGitDir)) {
    execFileSync("git", ["init", "--bare", probeGitDir], { stdio: ["ignore", "pipe", "pipe"] });
  }
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    resolve("."),
    `${BASE_COMMIT}:refs/heads/r58-prerequisite`,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    "--force",
    bundle,
    "HEAD:refs/heads/r58-authority-checkpoint",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const probeHead = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r58-authority-checkpoint"]);
  const probeTree = git([
    `--git-dir=${probeGitDir}`,
    "rev-parse",
    "refs/heads/r58-authority-checkpoint^{tree}",
  ]);
  invariant(probeHead === head, "R58_RESTORE_PROBE_HEAD_DRIFT");
  invariant(probeTree === tree, "R58_RESTORE_PROBE_TREE_DRIFT");

  const r57FrozenPath = resolve(
    ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/EXACT15_FROZEN_GREEN_INTEGRITY.json",
  );
  invariant(existsSync(r57FrozenPath), "R58_FROZEN_EXACT15_EVIDENCE_MISSING");
  const r57Frozen = JSON.parse(readFileSync(r57FrozenPath, "utf8")) as Json;
  invariant(r57Frozen.activeSpecSha256 === R57_SPEC_SHA256, "R58_FROZEN_EXACT15_SOURCE_SPEC_DRIFT");
  invariant(r57Frozen.integrityStatus === "GREEN_FROZEN_EXACT15_INTEGRITY", "R58_FROZEN_EXACT15_STATUS_DRIFT");

  const capturedAt = new Date().toISOString();
  writeJson(resolve(EVIDENCE_ROOT, "00-spec/R58_SPEC_FINGERPRINT.json"), {
    schemaVersion: "p0-one-monolith-r58-spec-fingerprint.v1",
    capturedAt,
    path: SPEC_PATH.replace(/\\/gu, "/"),
    libraryVersion: 9,
    bytes: specBytes.byteLength,
    lines: lineCount(specBytes),
    sha256: sha256(specBytes),
    status: "GREEN_R58_AUTHORITY_VERIFIED",
  });
  writeJson(resolve(EVIDENCE_ROOT, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), {
    schemaVersion: "p0-one-monolith-r58-authority.v1",
    capturedAt,
    activeSpec: "P0 ONE MONOLITH ESTIMATE PLATFORM R5.8",
    activeSpecSha256: SPEC_SHA256,
    superseded: ["R4.x", "R5.0", "R5.1", "R5.2", "R5.3", "R5.4", "R5.5", "R5.6", "R5.7", "all intermediate instructions"],
    catalogPolicy: "11610_IS_INVENTORY_DENOMINATOR_NOT_ACTIVE_WORK_TARGET",
    effectiveWorkPolicy: "ONLY_ADJUDICATED_EFFECTIVE_WORK_RECEIVES_CANONICAL_ESTIMATE",
    exact15Policy: "FROZEN_GREEN_NO_RERUN_WITHOUT_DRIFT",
    currentHead: head,
    currentTree: tree,
    status: "R58_ONLY",
  });
  writeJson(resolve(PRESERVATION_ROOT, "R58_CURRENT_HEAD_TREE.json"), {
    schemaVersion: "p0-one-monolith-r58-current-head-tree.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    branch,
    baseCommit: BASE_COMMIT,
    head,
    tree,
    descendantOfBase: true,
    status: "GREEN_R58_SUCCESSOR_LINEAGE",
  });
  writeJson(resolve(PRESERVATION_ROOT, "CURRENT_R58_DIRTY_WORKTREE_CHECKPOINT.json"), {
    schemaVersion: "p0-one-monolith-r58-dirty-checkpoint.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    branch,
    baseCommit: BASE_COMMIT,
    head,
    tree,
    documentedStartingDirtyFileCount: 26,
    observedStartingDirtyFileCount: frozenFiles.length,
    discrepancy: {
      status: "EXPLAINED_BY_INTENTIONAL_POST_R57_COMMITS",
      commitsAfterR57Authority: [
        "c2308656 fix(estimate): enforce R5.7 composition truth without row quotas",
        "8f0fead0 audit(estimate): recover R5.7 accepted runtime baselines",
        "28bf82dc audit(estimate): checkpoint R5.7 candidate database boundary",
      ],
      dataLossClaimed: false,
    },
    files: frozenFiles,
    trackedPatch: {
      path: relative(resolve("."), trackedPatch).replace(/\\/gu, "/"),
      bytes: statSync(trackedPatch).size,
      sha256: sha256File(trackedPatch),
    },
    bundle: {
      path: relative(resolve("."), bundle).replace(/\\/gu, "/"),
      bytes: statSync(bundle).size,
      sha256: sha256File(bundle),
      prerequisite: BASE_COMMIT,
      verify: "GREEN",
    },
    status: "GREEN_R58_STARTING_DELTA_PRESERVED",
  });
  writeJson(resolve(PRESERVATION_ROOT, "CURRENT_R58_DIRTY_WORKTREE_RESTORE_PROBE.json"), {
    schemaVersion: "p0-one-monolith-r58-dirty-restore-probe.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    sourceHead: head,
    sourceTree: tree,
    probeHead,
    probeTree,
    exactHead: probeHead === head,
    exactTree: probeTree === tree,
    exactDirtyBytes: frozenFiles.every((file) => file.exact),
    frozenExact15Evidence: {
      path: relative(resolve("."), r57FrozenPath).replace(/\\/gu, "/"),
      sha256: sha256File(r57FrozenPath),
      rerunPerformed: false,
      status: r57Frozen.integrityStatus,
    },
    status: "GREEN_EXACT_COMMIT_TREE_AND_STARTING_DIRTY_BYTES_RESTORABLE",
  });

  process.stdout.write(`${JSON.stringify({
    status: "GREEN_R58_AUTHORITY_AND_STARTING_CHECKPOINT",
    spec: { sha256: SPEC_SHA256, bytes: specBytes.byteLength, lines: lineCount(specBytes) },
    branch,
    head,
    tree,
    observedStartingDirtyFileCount: frozenFiles.length,
    documentedStartingDirtyFileCount: 26,
    restoreProbe: "GREEN",
    exact15Rerun: false,
    overallR58Status: "RED_4272_ADMISSION_CATALOG_ADJUDICATION_SEARCH_AND_CUTOVER_PENDING",
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
