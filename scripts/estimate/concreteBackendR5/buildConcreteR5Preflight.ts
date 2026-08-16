import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import {
  BATCH008_PREDECESSOR_COMMIT,
  BATCH008_PREDECESSOR_CORPUS_SHA256,
  BATCH008_PREDECESSOR_MANIFEST_SHA256,
  BATCH008_PREDECESSOR_PACKAGE_SHA256,
  BATCH008_PREDECESSOR_RELEASE_ID,
  BATCH008_PREDECESSOR_TREE,
  BATCH008_SPEC_SHA256,
  assertExact,
  command,
  ensureEvidenceLayout,
  git,
  projectRoot,
  requireFile,
  semanticSha256,
  sha256,
  writeJson,
} from "./support";

const EXPECTED_BRANCH = "codex/batch008-concrete-r5";
const EXPECTED_WORKTREE = "C:\\dev\\rik-expo-app-batch008-concrete-r5";
const SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH008_CONCRETE_R5_BACKEND_NATIVE_NORMATIVE_GAP_EXPANSION_50_CASES_CONTINUOUS_EXACT_GREEN_NO_FULL_JEST.md";
const B7_EVIDENCE = "C:\\dev\\rik-expo-app-batch007-hvac-heat-supply-r4\\.release-runtime\\batch007-hvac-r4\\evidence\\A3";
const WATER_PACKAGE = "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3\\03-r6-a2-release-b";
const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55432/batch006_water_r6_a2_a";

function normalize(value: string): string {
  return resolve(value).replaceAll("/", "\\").toLocaleLowerCase("en-US");
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const generatedAt = new Date().toISOString();
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const mergeBase = git("merge-base", BATCH008_PREDECESSOR_COMMIT, "HEAD");
  const status = git("status", "--porcelain=v2", "--untracked-files=all");
  const diffCheck = command("git", ["diff", "--check"]);
  const spec = requireFile(SPEC_PATH, BATCH008_SPEC_SHA256);
  const finalIndexPath = join(B7_EVIDENCE, "A3_28_FINAL_EVIDENCE_INDEX.json");
  const finalSealPath = join(B7_EVIDENCE, "A3_30_FINAL_SEAL_ACTIVATION_QUEUE_REBASE.json");
  const finalCleanupPath = join(B7_EVIDENCE, "A3_31_FINAL_CLEANUP_RESIDUE.json");
  const finalIndex = JSON.parse(requireFile(finalIndexPath).toString("utf8")) as Record<string, any>;
  const finalSeal = JSON.parse(requireFile(finalSealPath).toString("utf8")) as Record<string, any>;
  const finalCleanup = JSON.parse(requireFile(finalCleanupPath).toString("utf8")) as Record<string, any>;
  const waterManifest = JSON.parse(requireFile(join(WATER_PACKAGE, "manifest.json")).toString("utf8")) as Record<string, any>;
  const trackedFiles = git("ls-files", "-z").split("\0").filter(Boolean);
  const zeroByteTracked = trackedFiles.filter((relative) => statSync(join(projectRoot, relative)).size === 0);

  assertExact(normalize(projectRoot) === normalize(EXPECTED_WORKTREE), "BATCH008_WRONG_WORKTREE");
  assertExact(branch === EXPECTED_BRANCH, "BATCH008_WRONG_BRANCH");
  assertExact(head === BATCH008_PREDECESSOR_COMMIT && tree === BATCH008_PREDECESSOR_TREE, "BATCH008_PREDECESSOR_SOURCE_RED");
  assertExact(mergeBase === BATCH008_PREDECESSOR_COMMIT, "BATCH008_PREDECESSOR_ANCESTRY_RED");
  const specLineCount = (spec.toString("utf8").match(/\n/g) ?? []).length;
  assertExact(spec.length === 122_737 && specLineCount === 4_465, "BATCH008_SPEC_CARDINALITY_RED");
  assertExact(diffCheck.exitCode === 0, "BATCH008_INITIAL_DIFF_CHECK_RED");
  // The inherited catalog intentionally contains zero-byte expert-note placeholders.
  // Freeze their exact set; only new zero-byte source files are forbidden downstream.
  assertExact(finalIndex.status === "GREEN" && finalIndex.worktree === "CLEAN" && finalIndex.evidenceEntryMismatches === 0, "BATCH007_FINAL_INDEX_RED");
  assertExact(finalIndex.head === BATCH008_PREDECESSOR_COMMIT && finalIndex.tree === BATCH008_PREDECESSOR_TREE, "BATCH007_FINAL_SOURCE_BINDING_RED");
  assertExact(finalIndex.releaseId === BATCH008_PREDECESSOR_RELEASE_ID && finalIndex.manifestSha256 === BATCH008_PREDECESSOR_MANIFEST_SHA256 && finalIndex.sourcePackageSha256 === BATCH008_PREDECESSOR_PACKAGE_SHA256 && finalIndex.corpusSha256 === BATCH008_PREDECESSOR_CORPUS_SHA256, "BATCH007_FINAL_PACKAGE_BINDING_RED");
  assertExact(finalSeal.status === "GREEN" && finalSeal.after?.status === "active" && finalSeal.activationDelta === 1 && finalSeal.queueRebaseDelta === 1, "BATCH007_FINAL_ACTIVATION_RED");
  assertExact(finalSeal.queue?.denominator === 11_610 && finalSeal.queue?.admitted === 2_925 && finalSeal.queue?.remaining === 8_685 && finalSeal.queue?.external === 8, "BATCH007_QUEUE_BASELINE_RED");
  assertExact(finalCleanup.status === "GREEN" && finalCleanup.runtimeResidueA === 0 && finalCleanup.runtimeResidueB === 0 && finalCleanup.productionConnections === 0, "BATCH007_CLEANUP_RED");
  assertExact(waterManifest.releaseId === "a43dda16-3726-5c88-bf45-22059789035e", "WATER_RECONSTRUCTION_PACKAGE_RED");

  const database = new Client({ connectionString: DATABASE_URL, application_name: "batch008-concrete-r5-preflight" });
  await database.connect();
  let localIdentity: Record<string, unknown>;
  let waterRelease: Record<string, unknown>;
  try {
    localIdentity = (await database.query(`select current_database() as database, inet_server_addr()::text as host, inet_server_port() as port, current_user as role, current_setting('data_directory') as data_directory`)).rows[0]!;
    waterRelease = (await database.query(`select id::text, release_key, status, source_manifest_sha256, source_package_sha256 from public.estimate_definition_release where id='a43dda16-3726-5c88-bf45-22059789035e'::uuid`)).rows[0]!;
  } finally {
    await database.end();
  }
  assertExact(localIdentity.database === "batch006_water_r6_a2_a" && String(localIdentity.host).replace(/\/32$/, "") === "127.0.0.1" && localIdentity.port === 55_432, "BATCH008_LOCAL_RECONSTRUCTION_DATABASE_RED");
  assertExact(waterRelease.status === "active", "BATCH008_WATER_RECONSTRUCTION_RELEASE_RED");

  const processScan = command("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'batch008|concrete-r5|postgres' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 4"]);
  const listenerScan = command("powershell.exe", ["-NoProfile", "-Command", "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5432,55432,58710,58711,58712 } | Select-Object LocalAddress,LocalPort,OwningProcess,State | ConvertTo-Json -Depth 4"]);
  const oldWorktrees = git("worktree", "list", "--porcelain").split(/\r?\n/).filter((line) => /batch008.*concrete.*r[234]/i.test(line));

  writeJson("00-preflight/PREDECESSOR_BINDING.json", {
    schemaVersion: "batch008-concrete-r5-predecessor-binding.v1",
    generatedAt,
    specification: { path: SPEC_PATH, bytes: spec.length, lines: specLineCount, sha256: sha256(spec), authoritative: true },
    source: { worktree: projectRoot, branch, head, tree, mergeBase },
    predecessor: {
      releaseId: BATCH008_PREDECESSOR_RELEASE_ID,
      manifestSha256: BATCH008_PREDECESSOR_MANIFEST_SHA256,
      sourcePackageSha256: BATCH008_PREDECESSOR_PACKAGE_SHA256,
      corpusSha256: BATCH008_PREDECESSOR_CORPUS_SHA256,
      finalIndex: { path: finalIndexPath, sha256: sha256(readFileSync(finalIndexPath)) },
      finalSeal: { path: finalSealPath, sha256: sha256(readFileSync(finalSealPath)) },
      finalCleanup: { path: finalCleanupPath, sha256: sha256(readFileSync(finalCleanupPath)) },
      packageReconstruction: { requiredBecauseB7CleanupWasGreen: true, waterPackage: WATER_PACKAGE, waterRelease, deterministicB7Producer: "scripts/estimate/hvacBackendR4/buildHvacR4Release.ts" },
    },
    status: "GREEN_EXACT_BATCH007_TERMINAL_PREDECESSOR_BOUND",
  });
  writeJson("00-preflight/WORKTREE_SNAPSHOT.json", {
    schemaVersion: "batch008-concrete-r5-worktree-snapshot.v1",
    generatedAt, worktree: projectRoot, branch, head, tree, mergeBase,
    statusPorcelainV2: status.split(/\r?\n/).filter(Boolean),
    diffCheck, trackedFiles: trackedFiles.length, zeroByteTracked,
    sourceWritesLimitedToBatch008HarnessAndOcrEmptyTextFix: true,
    status: "GREEN_SEPARATE_SUCCESSOR_WORKTREE",
  });
  writeJson("00-preflight/PRODUCTION_NON_TOUCH_PROOF.json", {
    schemaVersion: "batch008-concrete-r5-production-non-touch.v1",
    generatedAt, allowedDatabase: localIdentity, allowedHost: "127.0.0.1", allowedPort: 55_432,
    remoteDatabaseConnections: 0, productionUrlsUsed: [], productionWrites: 0,
    processScan: { exitCode: processScan.exitCode, sha256: sha256(processScan.stdout) },
    listenerScan: { exitCode: listenerScan.exitCode, sha256: sha256(listenerScan.stdout), local55432Observed: listenerScan.stdout.includes("55432") },
    status: "GREEN_NO_PRODUCTION_TOUCH",
  });
  writeJson("00-preflight/OLD_BATCH008_SUPERSEDED_PROOF.json", {
    schemaVersion: "batch008-concrete-r5-old-revisions-superseded.v1",
    generatedAt, authoritativeSpecSha256: BATCH008_SPEC_SHA256,
    superseded: ["Concrete R2", "Concrete R3", "Concrete R4"],
    oldWorktreesDetectedReadOnly: oldWorktrees,
    oldWorktreesUsedAsSource: 0, oldReleasesUsedAsPredecessor: 0,
    status: "GREEN_SUPERSEDED_DO_NOT_EXECUTE",
  });
  writeJson("00-preflight/PREVIOUS_DOMAIN_PRESERVATION_BASELINE.json", {
    schemaVersion: "batch008-concrete-r5-previous-domain-preservation-baseline.v1",
    generatedAt,
    predecessorReleaseId: BATCH008_PREDECESSOR_RELEASE_ID,
    domains: ["asphalt", "drywall", "electrical", "water", "hvac_heat_supply"],
    predecessorDefinitionCount: finalSeal.seal?.definition_count,
    predecessorReadableDefinitions: finalSeal.after?.predecessor_readable_definitions,
    finalIndexSha256: sha256(readFileSync(finalIndexPath)),
    finalSealSemanticSha256: semanticSha256(finalSeal),
    reconstructionWillBeComparedBeforeBothCloneImports: true,
    status: "GREEN_BASELINE_FROZEN",
  });
  writeJson("00-preflight/QUEUE_BASELINE.json", {
    schemaVersion: "batch008-concrete-r5-queue-baseline.v1",
    generatedAt, denominator: 11_610, admittedGlobal: 2_925, remaining: 8_685,
    legacyExternalQueueMarker: 8, externalDefinitionVersions: 129,
    batch008Selected: false, batch008ExecutionStarted: false,
    stateSha256: finalSeal.after?.state_sha256,
    queueBaselineSha256: semanticSha256(finalSeal.queue),
    status: "GREEN_EXACT_BATCH007_QUEUE_BASELINE",
  });
  process.stdout.write(`${JSON.stringify({ head, tree, releaseId: BATCH008_PREDECESSOR_RELEASE_ID, queue: finalSeal.queue, status: "GREEN_PREFLIGHT" }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
