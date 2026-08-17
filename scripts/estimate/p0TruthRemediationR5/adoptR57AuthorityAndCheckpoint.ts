import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (9).md",
);
const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const SPEC_BYTES = 180_765;
const SPEC_LINES = 3_371;
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const R56_SPEC_SHA256 = "4bd245a1537da872dbc6ce6681c6571baeb146aa1123b5402e71bbec10050b62";
const R55_SPEC_SHA256 = "c73e44df9bd8fbf04186965bbeb4f834fce21328d77741d6e36ec0a633911cba";
const EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence");
const PRESERVATION_ROOT = resolve(EVIDENCE_ROOT, "01-preservation");

const FROZEN_GATES = [
  {
    claim: "fresh Exact15 compile/recalculate/PDF/procurement/history 15/15",
    path: ".release-runtime/p0-one-monolith-r55/evidence/05-baseline/EXACT15_POST_REPAIR_FRESH_15_OF_15.json",
    sourceSpecSha256: R55_SPEC_SHA256,
    expectedStatus: "GREEN",
    expectedDenominator: 15,
  },
  {
    claim: "Exact15 fresh candidate rebuild reproducibility 15/15",
    path: ".release-runtime/p0-one-monolith-r56/evidence/05-baseline/EXACT15_CANDIDATE_REBUILD_PARITY.json",
    sourceSpecSha256: R56_SPEC_SHA256,
    expectedVerdict: "GREEN_REPRODUCIBLE_15_OF_15",
  },
  {
    claim: "semantic_owner computational/cost parity 776/776",
    path: ".release-runtime/p0-one-monolith-r56/evidence/07-boq/SEMANTIC_OWNER_NUMERIC_PARITY.json",
    sourceSpecSha256: R56_SPEC_SHA256,
    expectedVerdict: "GREEN_776_OF_776_SEMANTIC_OWNER_ONLY_WITH_COST_PARITY",
  },
  {
    claim: "semantic_owner repair idempotency changed rows 0",
    path: ".release-runtime/p0-one-monolith-r56/evidence/07-boq/SEMANTIC_OWNER_REPAIR_IDEMPOTENCY.json",
    sourceSpecSha256: R56_SPEC_SHA256,
    expectedVerdict: "GREEN_IDEMPOTENT_CHANGED_ROWS_0",
  },
  {
    claim: "predecessor revisions 26/26 preserved",
    path: ".release-runtime/p0-one-monolith-r56/evidence/07-boq/PREDECESSOR_REVISIONS_26_PRESERVATION.json",
    sourceSpecSha256: R56_SPEC_SHA256,
    expectedVerdict: "GREEN_26_OF_26_PREDECESSOR_REVISIONS_PRESERVED",
  },
  {
    claim: "clean post-691acb78 successor checkpoint",
    path: ".release-runtime/p0-one-monolith-r56/evidence/01-preservation/CURRENT_R56_CLEAN_DESCENDANT_CHECKPOINT.json",
    sourceSpecSha256: R56_SPEC_SHA256,
    expectedStatus: "GREEN_CLEAN_HEAD_DESCENDANT_691ACB78_RESTORABLE",
  },
] as const;

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

function dirtyEntries(): Array<{ status: string; path: string }> {
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return raw.toString("utf8").split("\0").filter(Boolean).map((token) => {
    const status = token.slice(0, 2);
    invariant(!/[RC]/u.test(status), `R57_CHECKPOINT_RENAME_OR_COPY_REQUIRES_EXPLICIT_HANDLING:${token}`);
    return { status, path: token.slice(3).replace(/\\/gu, "/") };
  });
}

function verifyFrozenGate(gate: (typeof FROZEN_GATES)[number]): Json {
  const path = resolve(gate.path);
  invariant(existsSync(path), `R57_FROZEN_GATE_MISSING:${gate.path}`);
  const bytes = readFileSync(path);
  const parsed = JSON.parse(bytes.toString("utf8")) as Json;
  if ("expectedStatus" in gate) {
    invariant(parsed.status === gate.expectedStatus, `R57_FROZEN_GATE_STATUS_DRIFT:${gate.path}`);
  }
  if ("expectedVerdict" in gate) {
    invariant(parsed.verdict === gate.expectedVerdict, `R57_FROZEN_GATE_VERDICT_DRIFT:${gate.path}`);
  }
  if ("expectedDenominator" in gate) {
    invariant(parsed.denominator === gate.expectedDenominator, `R57_FROZEN_GATE_DENOMINATOR_DRIFT:${gate.path}`);
  }
  return {
    claim: gate.claim,
    sourceSpecSha256: gate.sourceSpecSha256,
    path: gate.path.replace(/\\/gu, "/"),
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    observedSchemaVersion: parsed.schemaVersion ?? null,
    observedStatus: parsed.status ?? null,
    observedVerdict: parsed.verdict ?? null,
    observedDenominator: parsed.denominator ?? null,
    policy: "FROZEN_GREEN_INTEGRITY_ONLY_NO_RERUN_WITHOUT_DRIFT",
  };
}

function main(): void {
  const specBytes = readFileSync(SPEC_PATH);
  invariant(sha256(specBytes) === SPEC_SHA256, "R57_SPEC_SHA256_MISMATCH");
  invariant(specBytes.byteLength === SPEC_BYTES, `R57_SPEC_BYTES_MISMATCH:${specBytes.byteLength}`);
  invariant(lineCount(specBytes) === SPEC_LINES, `R57_SPEC_LINES_MISMATCH:${lineCount(specBytes)}`);

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R57_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(git(["merge-base", BASE_COMMIT, head]) === BASE_COMMIT, "R57_LINEAGE_DRIFT");
  const capturedAt = new Date().toISOString();

  writeJson(resolve(EVIDENCE_ROOT, "00-spec/R57_SPEC_FINGERPRINT.json"), {
    schemaVersion: "p0-one-monolith-r57-spec-fingerprint.v1",
    capturedAt,
    path: SPEC_PATH.replace(/\\/gu, "/"),
    libraryVersion: 7,
    bytes: specBytes.byteLength,
    lines: lineCount(specBytes),
    sha256: sha256(specBytes),
    status: "GREEN_AUTHORITY_VERIFIED",
  });
  writeJson(resolve(EVIDENCE_ROOT, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), {
    schemaVersion: "p0-one-monolith-r57-authority.v1",
    capturedAt,
    activeSpec: "P0 ONE MONOLITH ESTIMATE PLATFORM R5.7",
    activeSpecSha256: SPEC_SHA256,
    superseded: ["R4.x", "R5.0", "R5.1", "R5.2", "R5.3", "R5.4", "R5.5", "R5.6", "all intermediate instructions"],
    boqRowQuotaPolicy: "DISABLED_NO_MINIMUM_TARGET_OR_MAXIMUM",
    exact15Policy: "FROZEN_GREEN_NO_RERUN_WITHOUT_DRIFT",
    currentHead: head,
    currentTree: tree,
    status: "R57_ONLY",
  });

  const frozenGates = FROZEN_GATES.map(verifyFrozenGate);
  writeJson(resolve(EVIDENCE_ROOT, "05-baseline/EXACT15_FROZEN_GREEN_INTEGRITY.json"), {
    schemaVersion: "p0-one-monolith-r57-exact15-frozen-integrity.v1",
    capturedAt,
    activeSpecSha256: SPEC_SHA256,
    frozenGates,
    frozenGateCount: frozenGates.length,
    rerunPerformed: false,
    integrityStatus: "GREEN_FROZEN_EXACT15_INTEGRITY",
    overallR57Status: "RED_GLOBAL_4272_11610_PROFESSIONAL_COMPLETENESS_PENDING",
  });

  const oldFrozenPath = resolve(".release-runtime/p0-one-monolith-r56/evidence/05-baseline/EXACT15_FROZEN_IDS.json");
  const oldFrozenBytes = readFileSync(oldFrozenPath);
  const oldFrozen = JSON.parse(oldFrozenBytes.toString("utf8")) as Json;
  invariant(oldFrozen.specSha256 === R56_SPEC_SHA256 && oldFrozen.denominator === 15, "R57_EXACT15_ID_SET_SOURCE_DRIFT");
  writeJson(resolve(EVIDENCE_ROOT, "05-baseline/EXACT15_FROZEN_IDS.json"), {
    schemaVersion: "p0-one-monolith-r57-exact15-frozen-ids.v1",
    specSha256: SPEC_SHA256,
    requestedIds: oldFrozen.requestedIds,
    catalogIds: oldFrozen.catalogIds,
    denominator: 15,
    idSetSha256: oldFrozen.idSetSha256,
    adoptedFrom: {
      specSha256: R56_SPEC_SHA256,
      path: relative(resolve("."), oldFrozenPath).replace(/\\/gu, "/"),
      bytes: oldFrozenBytes.byteLength,
      sha256: sha256(oldFrozenBytes),
    },
    policy: "IDENTITY_SET_PRESERVED_FROZEN_NO_COMPUTATIONAL_RERUN",
  });

  const dirty = dirtyEntries();
  invariant(dirty.length > 0, "R57_AUTHORITY_CHECKPOINT_EXPECTED_CURRENT_DELTA");
  const objectRoot = resolve(PRESERVATION_ROOT, "current-dirty-objects");
  const restoreRoot = resolve(PRESERVATION_ROOT, "current-dirty-restore-probe");
  const files = dirty.map((entry) => {
    const path = resolve(entry.path);
    invariant(existsSync(path), `R57_CHECKPOINT_FILE_MISSING:${entry.path}`);
    const bytes = readFileSync(path);
    const digest = sha256(bytes);
    const objectPath = resolve(objectRoot, `${digest}.bin`);
    const restorePath = resolve(restoreRoot, entry.path.replace(/[/:]/gu, "_"));
    mkdirSync(dirname(objectPath), { recursive: true });
    mkdirSync(dirname(restorePath), { recursive: true });
    copyFileSync(path, objectPath);
    copyFileSync(path, restorePath);
    invariant(sha256File(objectPath) === digest && sha256File(restorePath) === digest,
      `R57_CHECKPOINT_COPY_DRIFT:${entry.path}`);
    return {
      path: entry.path,
      gitStatus: entry.status,
      bytes: bytes.byteLength,
      sha256: digest,
      object: relative(resolve("."), objectPath).replace(/\\/gu, "/"),
      restoreProbe: relative(resolve("."), restorePath).replace(/\\/gu, "/"),
    };
  });

  const bundlePath = resolve(PRESERVATION_ROOT, "CURRENT_R57_POST_691ACB78_INCREMENTAL.bundle");
  mkdirSync(dirname(bundlePath), { recursive: true });
  execFileSync("git", ["bundle", "create", bundlePath, "HEAD", `^${BASE_COMMIT}`], { stdio: "pipe" });
  execFileSync("git", ["bundle", "verify", bundlePath], { stdio: "pipe" });
  const probeGitDir = resolve(PRESERVATION_ROOT, "restore-probe.git");
  if (!existsSync(probeGitDir)) execFileSync("git", ["init", "--bare", probeGitDir], { stdio: "pipe" });
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    resolve("."),
    `${BASE_COMMIT}:refs/heads/r57-prerequisite`,
  ], { stdio: "pipe" });
  execFileSync("git", [
    `--git-dir=${probeGitDir}`,
    "fetch",
    "--force",
    bundlePath,
    "HEAD:refs/heads/r57-authority-checkpoint",
  ], { stdio: "pipe" });
  const probeHead = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r57-authority-checkpoint"]);
  const probeTree = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r57-authority-checkpoint^{tree}"]);
  invariant(probeHead === head && probeTree === tree, "R57_RESTORE_PROBE_HEAD_TREE_DRIFT");
  writeJson(resolve(PRESERVATION_ROOT, "CURRENT_R57_DIRTY_WORKTREE_CHECKPOINT.json"), {
    schemaVersion: "p0-one-monolith-r57-dirty-checkpoint.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    branch,
    baseCommit: BASE_COMMIT,
    head,
    tree,
    files,
    dirtyFileCount: files.length,
    bundle: {
      path: relative(resolve("."), bundlePath).replace(/\\/gu, "/"),
      bytes: statSync(bundlePath).size,
      sha256: sha256File(bundlePath),
      prerequisite: BASE_COMMIT,
      verify: "GREEN",
    },
    status: "GREEN_R57_CURRENT_DELTA_PRESERVED",
  });
  writeJson(resolve(PRESERVATION_ROOT, "CURRENT_R57_DIRTY_WORKTREE_RESTORE_PROBE.json"), {
    schemaVersion: "p0-one-monolith-r57-dirty-restore-probe.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    sourceHead: head,
    sourceTree: tree,
    probeHead,
    probeTree,
    exactHead: probeHead === head,
    exactTree: probeTree === tree,
    exactDirtyBytes: files.every((file) => sha256File(resolve(file.restoreProbe)) === file.sha256),
    status: "GREEN_EXACT_COMMIT_TREE_AND_DIRTY_BYTES_RESTORABLE",
  });

  const inheritedCensusPath = resolve(
    ".release-runtime/p0-one-monolith-r56/evidence/02-data-before/BATCH001_008_BASELINE_CENSUS_4272.json",
  );
  invariant(existsSync(inheritedCensusPath), "R57_INHERITED_4272_CENSUS_MISSING");
  const inheritedCensus = JSON.parse(readFileSync(inheritedCensusPath, "utf8")) as Json;
  invariant(inheritedCensus.observedActiveBatch008Definitions === 4_272, "R57_INHERITED_4272_DENOMINATOR_DRIFT");
  writeJson(resolve(EVIDENCE_ROOT, "02-data-before/R56_READ_ONLY_CENSUS_INHERITANCE.json"), {
    schemaVersion: "p0-one-monolith-r57-inherited-r56-census.v1",
    capturedAt,
    activeSpecSha256: SPEC_SHA256,
    sourcePath: relative(resolve("."), inheritedCensusPath).replace(/\\/gu, "/"),
    sourceSha256: sha256File(inheritedCensusPath),
    definitions: inheritedCensus.observedActiveBatch008Definitions,
    sourceDatabaseWrites: inheritedCensus.sourceDatabaseWrites,
    professionalCompletenessScope: "INCOMPLETE_UNDER_R57_REQUIRES_EXTENDED_R57_CENSUS",
    status: "GREEN_DENOMINATOR_INHERITED_R57_PROFESSIONAL_CENSUS_PENDING",
  });

  process.stdout.write(`${JSON.stringify({
    status: "GREEN_R57_AUTHORITY_AND_CURRENT_CHECKPOINT",
    spec: { sha256: SPEC_SHA256, bytes: specBytes.byteLength, lines: lineCount(specBytes) },
    branch,
    head,
    tree,
    dirtyFileCount: files.length,
    frozenGateCount: frozenGates.length,
    exact15Rerun: false,
    overallR57Status: "RED_GLOBAL_4272_11610_PROFESSIONAL_COMPLETENESS_PENDING",
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
