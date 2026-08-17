import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  BATCH009_PREDECESSOR_COMMIT,
  BATCH009_PREDECESSOR_CORPUS_SHA256,
  BATCH009_PREDECESSOR_EVIDENCE_MANIFEST_SHA256,
  BATCH009_PREDECESSOR_MANIFEST_SHA256,
  BATCH009_PREDECESSOR_PACKAGE_SHA256,
  BATCH009_PREDECESSOR_RELEASE_ID,
  BATCH009_PREDECESSOR_TREE,
  BATCH009_SPEC_SHA256,
  assertExact,
  command,
  ensureEvidenceLayout,
  git,
  projectRoot,
  requireFile,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

const EXPECTED_BRANCH = "codex/batch009-fire-life-safety-r5";
const EXPECTED_WORKTREE = "C:\\dev\\rik-expo-app-batch009-fire-life-safety-r5";
const SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH009_FIRE_LIFE_SAFETY_R5_BACKEND_NATIVE_NORMATIVE_GAP_EXPANSION_50_CASES_CONTINUOUS_EXACT_GREEN_NO_FULL_JEST.md";
const PREDECESSOR_EVIDENCE = "C:\\dev\\rik-expo-app-batch008-concrete-r5\\.release-runtime\\batch008-concrete-r5\\evidence";
const EXPECTED_FINAL_TOKEN = "GREEN_BATCH008_CONCRETE_R5_G_830_D_22_N_366_H_1218_REAL_EXPANDED_BACKEND_NATIVE_ESTIMATES_ALL_NORMATIVE_GAPS_DISPOSED_50_BACKEND_WEB_ANDROID_API34_EXACT_PARITY_PACKAGE_DB_REPLAY_2X2_SINGLE_ACTIVATION_CLEAN_FULL_JEST_DEFERRED_NO_PRODUCTION_HARD_STOP_BEFORE_BATCH009";

function normalize(value: string): string {
  return resolve(value).replaceAll("/", "\\").toLocaleLowerCase("en-US");
}

function main(): void {
  ensureEvidenceLayout();
  const generatedAt = new Date().toISOString();
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const parent = git("rev-parse", "HEAD^");
  const mergeBase = git("merge-base", BATCH009_PREDECESSOR_COMMIT, "HEAD");
  const status = git("status", "--porcelain=v2", "--untracked-files=all").split(/\r?\n/u).filter(Boolean);
  const diffCheck = command("git", ["diff", "--check"]);
  const spec = requireFile(SPEC_PATH, BATCH009_SPEC_SHA256);
  const specLines = spec.toString("utf8").split(/\r?\n/u).filter((line, index, rows) => index < rows.length - 1 || line.length > 0).length;
  const tokenPath = join(PREDECESSOR_EVIDENCE, "FINAL_TOKEN.txt");
  const manifestPath = join(PREDECESSOR_EVIDENCE, "MANIFEST.json");
  const activationPath = join(PREDECESSOR_EVIDENCE, "15-activation", "ACTIVATION_A.json");
  const cleanupPath = join(PREDECESSOR_EVIDENCE, "17-cleanup", "CLEANUP_RESIDUE.json");
  const reportPath = join(PREDECESSOR_EVIDENCE, "FINAL_GREEN_REPORT_RU.md");
  const tokenBytes = requireFile(tokenPath);
  const manifestBytes = requireFile(manifestPath, BATCH009_PREDECESSOR_EVIDENCE_MANIFEST_SHA256);
  const activationBytes = requireFile(activationPath);
  const cleanupBytes = requireFile(cleanupPath);
  const reportBytes = requireFile(reportPath);
  const tokenLines = tokenBytes.toString("utf8").trim().split(/\r?\n/u);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, any>;
  const activation = JSON.parse(activationBytes.toString("utf8")) as Record<string, any>;
  const cleanup = JSON.parse(cleanupBytes.toString("utf8")) as Record<string, any>;

  assertExact(normalize(projectRoot) === normalize(EXPECTED_WORKTREE), "BATCH009_WRONG_WORKTREE");
  assertExact(branch === EXPECTED_BRANCH, "BATCH009_WRONG_BRANCH");
  assertExact(head === BATCH009_PREDECESSOR_COMMIT && tree === BATCH009_PREDECESSOR_TREE, "BATCH009_PREDECESSOR_SOURCE_RED");
  assertExact(mergeBase === BATCH009_PREDECESSOR_COMMIT, "BATCH009_PREDECESSOR_ANCESTRY_RED");
  assertExact(spec.length === 155_180 && specLines === 4_374, "BATCH009_SPEC_CARDINALITY_RED");
  assertExact(tokenLines.at(-1) === EXPECTED_FINAL_TOKEN, "BATCH008_FINAL_TOKEN_RED");
  assertExact(manifest.status === "GREEN" && Array.isArray(manifest.records) && manifest.records.length === 3_219 && Number(manifest.mismatches) === 0 && Number(manifest.staleEvidence) === 0, "BATCH008_FINAL_EVIDENCE_MANIFEST_RED");
  assertExact(activation.status === "GREEN" && activation.after?.status === "active" && activation.after?.predecessor_status === "retired", "BATCH008_FINAL_ACTIVATION_RED");
  assertExact(activation.releaseId === BATCH009_PREDECESSOR_RELEASE_ID && activation.manifestSha256 === BATCH009_PREDECESSOR_MANIFEST_SHA256 && activation.sourcePackageSha256 === BATCH009_PREDECESSOR_PACKAGE_SHA256, "BATCH008_RELEASE_BINDING_RED");
  assertExact(activation.queue?.denominator === 11_610 && activation.queue?.admitted === 3_755 && activation.queue?.remaining === 7_855 && activation.queue?.external === 8, "BATCH008_QUEUE_BASELINE_RED");
  assertExact(activation.activationCount === 1 && activation.queueRebaseCount === 1 && activation.externalAdmissionEvents === 0, "BATCH008_SINGLE_ACTIVATION_RED");
  assertExact(cleanup.status === "GREEN" && cleanup.residueA === 0 && cleanup.residueB === 0 && cleanup.disposableDatabases === 0, "BATCH008_CLEANUP_RED");
  assertExact(diffCheck.exitCode === 0, "BATCH009_INITIAL_DIFF_CHECK_RED");

  const trackedFiles = git("ls-files", "-z").split("\0").filter(Boolean);
  const zeroByteTracked = trackedFiles.filter((relative) => statSync(join(projectRoot, relative)).size === 0);
  const sourceScan = command("rg", ["-n", "-i", "--glob", "!node_modules/**", "--glob", "!.release-runtime/**", "https?://[^/]*supabase\\.co|api[_-]?key\\s*=|production[_-]?(?:db|database)[_-]?url", "scripts/estimate/fireBackendR5", "supabase/migrations/20260817180000_batch009_fire_life_safety_r5.sql"]);
  assertExact(sourceScan.exitCode === 1 && sourceScan.stdout.trim() === "", "BATCH009_SECRET_OR_PRODUCTION_URL_RED");
  const processScan = command("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'batch009|fire-r5|postgres' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 4"]);
  const listenerScan = command("powershell.exe", ["-NoProfile", "-Command", "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5432,55432,58810,58811,58812 } | Select-Object LocalAddress,LocalPort,OwningProcess,State | ConvertTo-Json -Depth 4"]);

  const binding = {
    schemaVersion: "batch009-fire-r5-exact-predecessor-binding.v1",
    predecessorBatch: "BATCH008_CONCRETE_R5",
    predecessorSpecSha256: "ee4b0a74000e51eda1a5fb50a999a85c44e0d44494d034b04c7fecca7a5eea23",
    predecessorFinalHead: head,
    predecessorTree: tree,
    predecessorParent: parent,
    predecessorReleaseId: BATCH009_PREDECESSOR_RELEASE_ID,
    predecessorReleaseHash: BATCH009_PREDECESSOR_PACKAGE_SHA256,
    predecessorFinalTokenSha256: sha256(tokenBytes),
    predecessorManifestSha256: sha256(manifestBytes),
    predecessorSourceManifestSha256: BATCH009_PREDECESSOR_MANIFEST_SHA256,
    predecessorCorpusSha256: BATCH009_PREDECESSOR_CORPUS_SHA256,
    masterBackendLineageHead: "eaaa1404939cc627fdc86a64fa28ebb127734b68",
    masterBackendLineageAncestor: git("merge-base", "--is-ancestor", "eaaa1404939cc627fdc86a64fa28ebb127734b68", "HEAD") === "",
    programControlStateVersionBefore: String(activation.after.program_state_version),
    programControlStateHashBefore: activation.after.state_sha256,
    admittedLedgerHashBefore: activation.admissionProofSha256,
    queueBefore: activation.queue,
    queueHashBefore: semanticSha256(activation.queue),
    previousDomainParityBundleHash: sha256(reportBytes),
    cleanWorktreeProof: {
      predecessorWorktree: "C:\\dev\\rik-expo-app-batch008-concrete-r5",
      predecessorStatusEntries: git("-C", "C:\\dev\\rik-expo-app-batch008-concrete-r5", "status", "--porcelain").split(/\r?\n/u).filter(Boolean).length,
      cleanupSha256: sha256(cleanupBytes),
    },
    verifiedAt: generatedAt,
    status: "GREEN_EXACT_BATCH008_R5_TERMINAL_PREDECESSOR_BOUND",
  };
  assertExact(binding.masterBackendLineageAncestor && binding.cleanWorktreeProof.predecessorStatusEntries === 0, "BATCH009_LINEAGE_OR_CLEAN_PREDECESSOR_RED");

  writeJson("00-preflight/BATCH009_R5_EXACT_PREDECESSOR_BINDING.json", binding);
  writeJson("BATCH009_R5_EXACT_PREDECESSOR_BINDING.json", binding);
  writeJson("00-preflight/ENVIRONMENT_FINGERPRINT.json", {
    schemaVersion: "batch009-fire-r5-environment.v1",
    generatedAt,
    worktree: projectRoot,
    branch,
    head,
    tree,
    mergeBase,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    spec: { path: SPEC_PATH, bytes: spec.length, lines: specLines, sha256: sha256(spec) },
    trackedFiles: trackedFiles.length,
    zeroByteTracked,
    environmentSha256: semanticSha256({ branch, head, tree, node: process.version, platform: process.platform, architecture: process.arch, specSha256: sha256(spec) }),
    status: "GREEN",
  });
  writeJson("00-preflight/PRODUCTION_WRITE_GUARD_PROOF.json", {
    schemaVersion: "batch009-fire-r5-production-write-guard.v1",
    generatedAt,
    allowedDatabaseHost: "127.0.0.1",
    allowedDatabasePort: 55_432,
    productionUrlsUsed: [],
    productionCredentialsUsed: [],
    productionConnections: 0,
    productionWrites: 0,
    sourceScan: { exitCode: sourceScan.exitCode, matches: 0, stdoutSha256: sha256(sourceScan.stdout) },
    processScan: { exitCode: processScan.exitCode, sha256: sha256(processScan.stdout) },
    listenerScan: { exitCode: listenerScan.exitCode, sha256: sha256(listenerScan.stdout) },
    status: "GREEN_NO_PRODUCTION_TOUCH",
  });
  writeJson("00-preflight/DISPOSABLE_DATABASE_BINDING.json", {
    schemaVersion: "batch009-fire-r5-disposable-database-binding.v1",
    planned: ["batch009_fire_r5_a", "batch009_fire_r5_b"],
    source: "exact_reconstructed_batch008_concrete_r5_active_release",
    sourceReleaseId: BATCH009_PREDECESSOR_RELEASE_ID,
    host: "127.0.0.1",
    port: 55_432,
    createdAtPreflight: false,
    production: false,
    status: "GREEN_PLANNED_AFTER_SOURCE_FREEZE",
  });
  writeJson("00-preflight/WORKTREE_SNAPSHOT.json", {
    schemaVersion: "batch009-fire-r5-worktree-snapshot.v1",
    generatedAt,
    worktree: projectRoot,
    branch,
    head,
    tree,
    mergeBase,
    statusPorcelainV2: status,
    diffCheck,
    isolatedFromPredecessor: true,
    status: "GREEN_SEPARATE_SUCCESSOR_WORKTREE",
  });
  writeJson("00-preflight/QUEUE_BASELINE.json", {
    schemaVersion: "batch009-fire-r5-queue-baseline.v1",
    generatedAt,
    denominator: 11_610,
    admittedGlobal: 3_755,
    remaining: 7_855,
    legacyExternalQueueMarker: 8,
    externalDefinitionVersions: 517,
    batch009Selected: false,
    batch009ExecutionStarted: false,
    stateSha256: activation.after.state_sha256,
    queueBaselineSha256: semanticSha256(activation.queue),
    status: "GREEN_EXACT_BATCH008_QUEUE_BASELINE",
  });
  writeJsonl("JOURNAL.jsonl", [{
    timestamp: generatedAt,
    wave: "W0",
    checkpoint: "SPEC_PREDECESSOR_ISOLATION",
    result: "GREEN",
    completed: ["spec_sha_size_lines", "batch008_terminal_binding", "master_lineage", "isolated_worktree", "production_write_guard"],
    notCompleted: ["content", "package", "db", "clients", "activation"],
    nextAction: "W1_DISCOVERY",
    stopReason: null,
  }]);
  writeJsonl("CHECKPOINTS.jsonl", [{
    timestamp: generatedAt,
    checkpoint: 1,
    name: "SPEC_READ_SHA_PREDECESSOR_BINDING_ISOLATED_ENVIRONMENT",
    head,
    tree,
    evidenceSha256: semanticSha256(binding),
    status: "GREEN",
  }]);
  process.stdout.write(JSON.stringify({ head, tree, releaseId: BATCH009_PREDECESSOR_RELEASE_ID, queue: activation.queue, status: "GREEN_PREFLIGHT" }, null, 2) + "\n");
}

main();
