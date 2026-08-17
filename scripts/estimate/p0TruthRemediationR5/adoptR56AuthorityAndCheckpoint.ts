import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (7).md",
);
const SPEC_SHA256 = "4bd245a1537da872dbc6ce6681c6571baeb146aa1123b5402e71bbec10050b62";
const SPEC_BYTES = 142_063;
const SPEC_LINES = 2_901;
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const R55_SPEC_SHA256 = "c73e44df9bd8fbf04186965bbeb4f834fce21328d77741d6e36ec0a633911cba";
const R55_EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r55/evidence");
const R56_EVIDENCE_ROOT = resolve(".release-runtime/p0-one-monolith-r56/evidence");
const R56_PRESERVATION_ROOT = resolve(R56_EVIDENCE_ROOT, "01-preservation");
const R56_RESTORE_ROOT = resolve(R56_PRESERVATION_ROOT, "current-dirty-restore-probe");
const R56_OBJECT_ROOT = resolve(R56_PRESERVATION_ROOT, "current-dirty-objects");

const INHERITED_CLOSED_GATES = [
  {
    claim: "bounded two RED plus one previously GREEN backend rerun",
    path: "05-baseline/EXACT15_POST_REPAIR_BOUNDED_3_OF_3.json",
    expectedVerdict: "GREEN_3_OF_3_POST_REPAIR_BOUNDED",
  },
  {
    claim: "fresh Exact15 compile/recalculate/artifact/history backend gate",
    path: "05-baseline/EXACT15_POST_REPAIR_FRESH_15_OF_15.json",
    expectedStatus: "GREEN",
    expectedDenominator: 15,
  },
  {
    claim: "empty-database candidate rebuild parity",
    path: "05-baseline/EXACT15_CANDIDATE_REBUILD_PARITY.json",
    expectedVerdict: "GREEN_REPRODUCIBLE_15_OF_15",
  },
  {
    claim: "semantic_owner before/after computational and cost parity for 776 rows",
    path: "07-boq/SEMANTIC_OWNER_NUMERIC_PARITY.json",
    expectedVerdict: "GREEN_776_OF_776_SEMANTIC_OWNER_ONLY_WITH_COST_PARITY",
  },
  {
    claim: "semantic_owner repair second-run idempotency",
    path: "07-boq/SEMANTIC_OWNER_REPAIR_IDEMPOTENCY.json",
    expectedVerdict: "GREEN_IDEMPOTENT_CHANGED_ROWS_0",
  },
  {
    claim: "predecessor revision and artifact readability",
    path: "07-boq/PREDECESSOR_REVISIONS_26_PRESERVATION.json",
    expectedVerdict: "GREEN_26_OF_26_PREDECESSOR_REVISIONS_PRESERVED",
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

function git(args: readonly string[], options: { cwd?: string } = {}): string {
  return execFileSync("git", [...args], {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function logicalLineCount(bytes: Buffer): number {
  const text = bytes.toString("utf8");
  return text.split(/\r?\n/u).length - (text.endsWith("\n") ? 1 : 0);
}

function dirtyEntries(): Array<{ status: string; path: string }> {
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const tokens = raw.toString("utf8").split("\0").filter(Boolean);
  const entries: Array<{ status: string; path: string }> = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const status = token.slice(0, 2);
    invariant(!/[RC]/u.test(status), `R56_CHECKPOINT_RENAME_OR_COPY_REQUIRES_EXPLICIT_HANDLING:${token}`);
    entries.push({ status, path: token.slice(3).replace(/\\/gu, "/") });
  }
  return entries;
}

function listFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort((left, right) => left.localeCompare(right));
}

function verifyInheritedGate(
  gate: (typeof INHERITED_CLOSED_GATES)[number],
): Json {
  const absolutePath = resolve(R55_EVIDENCE_ROOT, gate.path);
  invariant(existsSync(absolutePath), `R56_INHERITED_GATE_MISSING:${gate.path}`);
  const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as Json;
  if ("expectedVerdict" in gate) {
    invariant(parsed.verdict === gate.expectedVerdict, `R56_INHERITED_GATE_VERDICT_DRIFT:${gate.path}`);
  }
  if ("expectedStatus" in gate) {
    invariant(parsed.status === gate.expectedStatus, `R56_INHERITED_GATE_STATUS_DRIFT:${gate.path}`);
  }
  if ("expectedDenominator" in gate) {
    invariant(parsed.denominator === gate.expectedDenominator, `R56_INHERITED_GATE_DENOMINATOR_DRIFT:${gate.path}`);
  }
  return {
    claim: gate.claim,
    sourceSpec: "R5.5",
    sourceSpecSha256: R55_SPEC_SHA256,
    sourceEvidencePath: relative(resolve("."), absolutePath).replace(/\\/gu, "/"),
    bytes: statSync(absolutePath).size,
    sha256: sha256File(absolutePath),
    observedSchemaVersion: parsed.schemaVersion ?? null,
    observedVerdict: parsed.verdict ?? null,
    observedStatus: parsed.status ?? null,
    observedDenominator: parsed.denominator ?? null,
    adoptionPolicy: "INHERITED_CLOSED_COMPUTATIONAL_GATE_NOT_RELABELED_AS_R56_EXECUTION",
  };
}

function main(): void {
  const specBytes = readFileSync(SPEC_PATH);
  const specLines = logicalLineCount(specBytes);
  invariant(sha256(specBytes) === SPEC_SHA256, "R56_SPEC_SHA256_MISMATCH");
  invariant(specBytes.byteLength === SPEC_BYTES, `R56_SPEC_BYTES_MISMATCH:${specBytes.byteLength}`);
  invariant(specLines === SPEC_LINES, `R56_SPEC_LINES_MISMATCH:${specLines}`);

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R56_WRONG_BRANCH:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(git(["merge-base", BASE_COMMIT, head]) === BASE_COMMIT, "R56_LINEAGE_MERGE_BASE_DRIFT");

  const capturedAt = new Date().toISOString();
  writeJson(resolve(R56_EVIDENCE_ROOT, "00-spec/R56_SPEC_FINGERPRINT.json"), {
    schemaVersion: "p0-one-monolith-r56-spec-fingerprint.v1",
    capturedAt,
    path: SPEC_PATH.replace(/\\/gu, "/"),
    libraryVersion: 6,
    lines: specLines,
    bytes: specBytes.byteLength,
    sha256: sha256(specBytes),
    status: "GREEN_AUTHORITY_VERIFIED",
  });
  writeJson(resolve(R56_EVIDENCE_ROOT, "00-spec/AUTHORITY_AND_SUPERSEDED_SPECS.json"), {
    schemaVersion: "p0-one-monolith-r56-authority.v1",
    capturedAt,
    activeSpec: "P0 ONE MONOLITH ESTIMATE PLATFORM R5.6",
    activeSpecSha256: SPEC_SHA256,
    superseded: ["R4.x", "R5.0", "R5.1", "R5.2", "R5.3", "R5.4", "R5.5", "all intermediate instructions"],
    branch,
    lineageBase: BASE_COMMIT,
    currentHead: head,
    currentTree: tree,
    status: "R56_ONLY",
  });

  const dirty = dirtyEntries();
  invariant(dirty.length > 0, "R56_AUTHORITY_ADOPTION_EXPECTED_DIRTY_SUCCESSOR_STATE");
  const files = dirty.map((entry) => {
    const absolutePath = resolve(entry.path);
    invariant(existsSync(absolutePath), `R56_CHECKPOINT_PATH_MISSING:${entry.path}`);
    const bytes = readFileSync(absolutePath);
    const digest = sha256(bytes);
    const objectPath = resolve(R56_OBJECT_ROOT, `${digest}.bin`);
    const restorePath = resolve(R56_RESTORE_ROOT, entry.path.replace(/[/:]/gu, "_"));
    mkdirSync(dirname(objectPath), { recursive: true });
    mkdirSync(dirname(restorePath), { recursive: true });
    copyFileSync(absolutePath, objectPath);
    copyFileSync(absolutePath, restorePath);
    invariant(sha256File(objectPath) === digest, `R56_CHECKPOINT_OBJECT_COPY_DRIFT:${entry.path}`);
    invariant(sha256File(restorePath) === digest, `R56_CHECKPOINT_RESTORE_COPY_DRIFT:${entry.path}`);
    let headBlob: string | null = null;
    if (entry.status !== "??") {
      try {
        headBlob = git(["rev-parse", `${head}:${entry.path}`]);
      } catch {
        headBlob = null;
      }
    }
    return {
      path: entry.path,
      gitStatus: entry.status,
      bytes: bytes.byteLength,
      sha256: digest,
      headBlob,
      object: relative(resolve("."), objectPath).replace(/\\/gu, "/"),
      restoreProbe: relative(resolve("."), restorePath).replace(/\\/gu, "/"),
      restoreProbeSha256: sha256File(restorePath),
    };
  });

  const bundlePath = resolve(R56_PRESERVATION_ROOT, "CURRENT_R56_POST_691ACB78_INCREMENTAL.bundle");
  mkdirSync(dirname(bundlePath), { recursive: true });
  execFileSync("git", ["bundle", "create", bundlePath, "HEAD", `^${BASE_COMMIT}`], { stdio: "pipe" });
  execFileSync("git", ["bundle", "verify", bundlePath], { stdio: "pipe" });
  const probeGitDir = resolve(R56_PRESERVATION_ROOT, "restore-probe.git");
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
    bundlePath,
    "HEAD:refs/heads/r56-authority-checkpoint",
  ], { stdio: "pipe" });
  const probeHead = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r56-authority-checkpoint"]);
  const probeTree = git([`--git-dir=${probeGitDir}`, "rev-parse", "refs/heads/r56-authority-checkpoint^{tree}"]);
  invariant(probeHead === head && probeTree === tree, "R56_BUNDLE_RESTORE_PROBE_DRIFT");

  writeJson(resolve(R56_PRESERVATION_ROOT, "CURRENT_R56_DIRTY_WORKTREE_CHECKPOINT.json"), {
    schemaVersion: "p0-one-monolith-r56-current-dirty-checkpoint.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    worktree: resolve("."),
    branch,
    baseCommit: BASE_COMMIT,
    head,
    tree,
    dirtyFileCount: files.length,
    files,
    bundle: {
      path: relative(resolve("."), bundlePath).replace(/\\/gu, "/"),
      bytes: statSync(bundlePath).size,
      sha256: sha256File(bundlePath),
      prerequisite: BASE_COMMIT,
      verify: "GREEN",
    },
    status: "GREEN_CURRENT_R56_DIRTY_BYTES_PRESERVED",
  });
  writeJson(resolve(R56_PRESERVATION_ROOT, "CURRENT_R56_DIRTY_WORKTREE_RESTORE_PROBE.json"), {
    schemaVersion: "p0-one-monolith-r56-current-dirty-restore-probe.v1",
    capturedAt,
    specSha256: SPEC_SHA256,
    sourceHead: head,
    sourceTree: tree,
    probeGitDir: relative(resolve("."), probeGitDir).replace(/\\/gu, "/"),
    probeHead,
    probeTree,
    exactHead: probeHead === head,
    exactTree: probeTree === tree,
    exactDirtyBytes: files.every((file) => file.sha256 === file.restoreProbeSha256),
    status: "GREEN_EXACT_COMMIT_TREE_AND_DIRTY_BYTES_RESTORABLE",
  });

  const oldFrozenPath = resolve(R55_EVIDENCE_ROOT, "05-baseline/EXACT15_FROZEN_IDS.json");
  const oldFrozenBytes = readFileSync(oldFrozenPath);
  const oldFrozen = JSON.parse(oldFrozenBytes.toString("utf8")) as Json;
  invariant(oldFrozen.specSha256 === R55_SPEC_SHA256 && oldFrozen.denominator === 15, "R56_R55_FROZEN_IDS_SOURCE_DRIFT");
  invariant(Array.isArray(oldFrozen.catalogIds) && oldFrozen.catalogIds.length === 15, "R56_FROZEN_CATALOG_DENOMINATOR_DRIFT");
  writeJson(resolve(R56_EVIDENCE_ROOT, "05-baseline/EXACT15_FROZEN_IDS.json"), {
    schemaVersion: "p0-one-monolith-r56-exact15-frozen-ids.v1",
    specSha256: SPEC_SHA256,
    requestedIds: oldFrozen.requestedIds,
    catalogIds: oldFrozen.catalogIds,
    denominator: 15,
    idSetSha256: oldFrozen.sha256,
    adoptedFrom: {
      spec: "R5.5",
      specSha256: R55_SPEC_SHA256,
      path: relative(resolve("."), oldFrozenPath).replace(/\\/gu, "/"),
      bytes: oldFrozenBytes.byteLength,
      sha256: sha256(oldFrozenBytes),
    },
    policy: "IDENTITY_SET_REBOUND_TO_R56_WITHOUT_RELABELLING_HISTORICAL_EXECUTION",
  });

  const inheritedGates = INHERITED_CLOSED_GATES.map(verifyInheritedGate);
  const completeR55EvidenceManifest = listFiles(R55_EVIDENCE_ROOT).map((path) => ({
    path: relative(resolve("."), path).replace(/\\/gu, "/"),
    bytes: statSync(path).size,
    sha256: sha256File(path),
  }));
  writeJson(resolve(R56_EVIDENCE_ROOT, "05-baseline/R56_INHERITED_EXACT15_POST_FROZEN_PROGRESS.json"), {
    schemaVersion: "p0-one-monolith-r56-inherited-exact15-progress.v1",
    capturedAt,
    activeSpecSha256: SPEC_SHA256,
    sourceSpecSha256: R55_SPEC_SHA256,
    chronology: "GATES_EXECUTED_AND_CLOSED_BEFORE_R56_AUTHORITY_ADOPTION",
    inheritedGates,
    inheritedGateCount: inheritedGates.length,
    r55EvidenceFileCount: completeR55EvidenceManifest.length,
    r55EvidenceManifestSha256: sha256(JSON.stringify(completeR55EvidenceManifest)),
    remainingR56SpecificGates: [
      "4272/4272 BATCH001-008",
      "Asphalt 63/63 and BOQ 3709/3709",
      "11610/11610",
      "inline per-field norms and compact help",
      "compact standard PDF",
      "canonical search and parameter/norm/BOQ/duplicate gates",
      "core 17/17, Web desktop/mobile, Android API 34",
      "single atomic localhost:8081 cutover",
    ],
    status: "GREEN_INHERITED_GATES_VERIFIED_R56_SPECIFIC_GATES_PENDING",
  });
  writeJson(resolve(R56_EVIDENCE_ROOT, "05-baseline/R55_EVIDENCE_IMMUTABILITY_MANIFEST.json"), {
    schemaVersion: "p0-one-monolith-r56-r55-evidence-immutability-manifest.v1",
    capturedAt,
    activeSpecSha256: SPEC_SHA256,
    sourceSpecSha256: R55_SPEC_SHA256,
    files: completeR55EvidenceManifest,
    aggregateSha256: sha256(JSON.stringify(completeR55EvidenceManifest)),
    status: "GREEN_R55_EVIDENCE_CAPTURED_READ_ONLY",
  });

  process.stdout.write(`${JSON.stringify({
    status: "GREEN_R56_AUTHORITY_AND_DIRTY_CHECKPOINT",
    spec: { sha256: SPEC_SHA256, bytes: specBytes.byteLength, lines: specLines },
    branch,
    head,
    tree,
    dirtyFileCount: files.length,
    inheritedGateCount: inheritedGates.length,
    r55EvidenceFileCount: completeR55EvidenceManifest.length,
    overallR56Status: "RED_R56_SPECIFIC_GATES_PENDING",
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
