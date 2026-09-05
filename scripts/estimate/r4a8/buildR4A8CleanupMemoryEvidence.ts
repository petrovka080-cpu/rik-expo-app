import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md",
);
const MASTER_SHA256 = "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const A7_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a7-dead-source-memory-security-performance-m2-global-closeout-1",
);
const A8_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1",
);
const A7_RETIREMENT_SUMMARY = resolve(A7_ROOT, "12_dead_source_retirement_summary.json");
const A7_RETIREMENT_SUMMARY_SHA256 = "fdb2694df8f4b004cb43eeffe362ddf2d6cedbc84001929a5b769e14a3b0604b";
const A7_TOMBSTONES = resolve(A7_ROOT, "12a_dead_source_tombstones.jsonl");
const A7_TOMBSTONES_SHA256 = "79aa360eefdd647a963fe4ea2644fdc9eb0c2189c8330dcce01ef84a8d796996";
const A7_MEMORY_AFTER = resolve(A7_ROOT, "14_memory_after.json");
const A7_MEMORY_AFTER_SHA256 = "0499ddeb35f5ccb845e0d03658160535cb22be8e6c5acaa5c2586eee6e43ed99";
const CACHE_FIX_SHA = "ce0bbc64a42a0b19117fdda1fa41be0233cb02b2";
const CURRENT_MEMORY_SOURCE_SHA = "48be1e98be9ada45a6ec0bba8ff1b7c888382265";
const CURRENT_MEMORY_ROOT = resolve(A8_ROOT, `13_memory/current-${CURRENT_MEMORY_SOURCE_SHA}`);
const GROUP50_SUMMARY = resolve(
  A8_ROOT,
  "15_scale/group50-ecc56a429dd7fac4e0079463af4a46e6340db5a1-terminal/TERMINAL_SUMMARY.json",
);
const PLATFORM30_SUMMARY = resolve(
  A8_ROOT,
  "15_scale/platform30-487efe2e713ec386f3bce3e22a19c3648b82699f-terminal/29_platform_71040_terminal.json",
);
const DEAD_SOURCE_OUTPUT = resolve(A8_ROOT, "12_dead_source_summary.json");
const MEMORY_OUTPUT = resolve(A8_ROOT, "13_memory/summary.json");
const RELEVANT_MEMORY_PATHS = [
  "src/lib/estimate/buildProfessionalWorkPassport.ts",
  "src/lib/estimate/aiEstimateParameterSchema.ts",
  "src/lib/estimate/aiEstimateNormativeWorkParameterPassport.ts",
  "src/lib/estimate/getParameterSchemaForTemplate.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
  "scripts/estimate/r4a7/runR4A7MemoryLifecycleSingle.ts",
] as const;
const EXACT_SOURCE_PATHS = [
  "scripts/estimate/r4a8/buildR4A8CleanupMemoryEvidence.ts",
  "scripts/estimate/r4a8/buildR4A8CleanupMemoryEvidence.contract.test.ts",
  ...RELEVANT_MEMORY_PATHS,
] as const;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function loadJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function requireFileHash(path: string, expected: string, label: string): void {
  if (!existsSync(path) || sha256Bytes(readFileSync(path)) !== expected) {
    throw new Error(`STOP_A8_${label}_HASH_MISMATCH`);
  }
}

function requireAncestor(commitSha: string, label: string): void {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commitSha, "HEAD"], { stdio: "ignore" });
  } catch {
    throw new Error(`STOP_A8_${label}_NOT_ANCESTOR`);
  }
}

function changedPaths(fromSha: string, paths: readonly string[]): string[] {
  return git("diff", "--name-only", `${fromSha}..HEAD`, "--", ...paths)
    .split(/\r?\n/u).filter(Boolean);
}

function writeImmutableJson(path: string, value: Json): void {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== content) throw new Error(`STOP_IMMUTABLE_EVIDENCE_CONFLICT:${path}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, path);
}

function exactSourceIdentity(): Json {
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...EXACT_SOURCE_PATHS);
  if (dirty) throw new Error(`STOP_A8_CLEANUP_MEMORY_SOURCE_DRIFT:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    committedAt: git("show", "-s", "--format=%cI", "HEAD"),
    paths: EXACT_SOURCE_PATHS,
  };
}

function finiteStats(values: number[]): Json {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("STOP_A8_MEMORY_METRIC_MISSING");
  }
  const ordered = [...values].sort((left, right) => left - right);
  return {
    count: values.length,
    min: ordered[0],
    max: ordered.at(-1),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: ordered[Math.floor(ordered.length / 2)],
  };
}

function main(): void {
  requireFileHash(MASTER_PATH, MASTER_SHA256, "MASTER");
  requireFileHash(A7_RETIREMENT_SUMMARY, A7_RETIREMENT_SUMMARY_SHA256, "RETIREMENT_SUMMARY");
  requireFileHash(A7_TOMBSTONES, A7_TOMBSTONES_SHA256, "TOMBSTONES");
  requireFileHash(A7_MEMORY_AFTER, A7_MEMORY_AFTER_SHA256, "MEMORY_AFTER");
  const source = exactSourceIdentity();
  requireAncestor(CACHE_FIX_SHA, "CACHE_FIX");
  requireAncestor(CURRENT_MEMORY_SOURCE_SHA, "CURRENT_MEMORY_SOURCE");

  const previousRetirement = loadJson(A7_RETIREMENT_SUMMARY);
  const tombstones = readFileSync(A7_TOMBSTONES, "utf8").trim().split(/\r?\n/u)
    .filter(Boolean).map((line) => JSON.parse(line) as Json);
  const tombstonePaths = tombstones.map((entry) => String(entry.path));
  const existingRetiredSources = tombstonePaths.filter((path) => existsSync(resolve(path)));
  const missingSuccessorOwners = tombstones.filter((entry) => !existsSync(resolve(String(entry.successorOwner))))
    .map((entry) => String(entry.successorOwner));
  const nonAncestorRetirementCommits = [...new Set(tombstones.map((entry) => String(entry.retirementCommitSha)))]
    .filter((commitSha) => {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", commitSha, "HEAD"], { stdio: "ignore" });
        return false;
      } catch {
        return true;
      }
    });
  const trackedRetiredSources = git("ls-files", "--", ...tombstonePaths).split(/\r?\n/u).filter(Boolean);
  const cleanupBlockers = [
    previousRetirement.status === "GREEN_R4_A7_DEAD_SOURCE_RETIREMENT" ? "" : "prior_status",
    Number(previousRetirement.retirement?.authorized) === 33 ? "" : "authorized_denominator",
    Number(previousRetirement.retirement?.completed) === 33 ? "" : "completed_denominator",
    Number(previousRetirement.retirement?.remainingAuthorized) === 0 ? "" : "authorized_remaining",
    Number(previousRetirement.inventory?.unknown) === 0 ? "" : "unknown_classification",
    tombstones.length === 33 && new Set(tombstonePaths).size === 33 ? "" : "tombstone_denominator",
    existingRetiredSources.length === 0 ? "" : "retired_source_restored",
    trackedRetiredSources.length === 0 ? "" : "retired_source_tracked",
    missingSuccessorOwners.length === 0 ? "" : "successor_owner_missing",
    nonAncestorRetirementCommits.length === 0 ? "" : "retirement_commit_not_ancestor",
  ].filter(Boolean);
  const deadSourceReceipt = {
    schemaVersion: "r568-r4-a8-dead-source-preservation.v1",
    status: cleanupBlockers.length === 0
      ? "GREEN_A8_DEAD_SOURCE_33_OF_33_PRESERVED"
      : "RED_A8_DEAD_SOURCE_PRESERVATION",
    capturedAtUtc: new Date().toISOString(),
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    source,
    historicalEvidence: {
      path: A7_RETIREMENT_SUMMARY,
      sha256: A7_RETIREMENT_SUMMARY_SHA256,
      inventoryCandidates: Number(previousRetirement.inventory?.candidates),
      inventoryClassified: Number(previousRetirement.inventory?.classified),
      inventoryUnknown: Number(previousRetirement.inventory?.unknown),
      classificationCounts: previousRetirement.inventory?.classificationCounts,
    },
    retirement: {
      authorized: 33,
      preservedAbsent: 33 - existingRetiredSources.length,
      remainingAuthorized: Number(previousRetirement.retirement?.remainingAuthorized),
      uniqueTombstones: new Set(tombstonePaths).size,
      trackedRetiredSources,
      existingRetiredSources,
      missingSuccessorOwners,
      nonAncestorRetirementCommits,
      tombstonesPath: A7_TOMBSTONES,
      tombstonesSha256: A7_TOMBSTONES_SHA256,
      newDeletionBatchStarted: false,
      reason: "No additional DELETE_CONSUMERS_ZERO_PROVEN authorization remains; migrate/quarantine classes require separate parity proof.",
    },
    blockers: cleanupBlockers,
    globalStatus: "RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
    fakeGreenClaimed: false,
  };

  const previousMemory = loadJson(A7_MEMORY_AFTER);
  const currentRuns = [1, 2, 3].map((ordinal) => loadJson(resolve(
    CURRENT_MEMORY_ROOT,
    `run-${String(ordinal).padStart(2, "0")}.json`,
  )));
  const memoryRelevantDriftFromFix = changedPaths(CACHE_FIX_SHA, RELEVANT_MEMORY_PATHS);
  const memoryRelevantDriftFromCurrentRuns = changedPaths(CURRENT_MEMORY_SOURCE_SHA, RELEVANT_MEMORY_PATHS);
  const currentRunBlockers = currentRuns.flatMap((run, index) => {
    const cache = run.cachesAfterDispose as Json;
    const professional = cache?.professionalWorkPassport as Json;
    const production = professional?.productionExpanded as Json;
    return [
      run.status === "GREEN_R4_A7_MEMORY_LIFECYCLE_SINGLE_RUN" ? "" : `run_${index + 1}_status`,
      run.sourceCommitSha === CURRENT_MEMORY_SOURCE_SHA ? "" : `run_${index + 1}_source_sha`,
      run.evaluation?.passed === true && run.evaluation?.blockers?.length === 0 ? "" : `run_${index + 1}_evaluation`,
      Number(run.methodology?.cycles) === 8 && Number(run.methodology?.sampleSize) === 512
        && Number(run.methodology?.projectionSampleSize) === 16 ? "" : `run_${index + 1}_methodology`,
      Number(professional?.templateIndexEntryCount) === 0 ? "" : `run_${index + 1}_template_index`,
      Number(production?.expandedTemplateCacheSize) === 0 && Number(production?.compiledEstimateCacheSize) === 0
        && Number(cache?.aiEstimateParameterSchema?.size) === 0
        && Number(cache?.normativeWorkParameterPassport?.size) === 0
        && Number(cache?.inlineWorkParameterSchema?.size) === 0 ? "" : `run_${index + 1}_mutable_cache`,
      Object.keys(run.evaluation?.unexpectedHandleGrowth ?? {}).length === 0 ? "" : `run_${index + 1}_handle_growth`,
      Number(run.activeResourceOwnership?.databaseHandles) === 0
        && Number(run.activeResourceOwnership?.httpAgents) === 0
        && Number(run.activeResourceOwnership?.browserContexts) === 0
        && (run.activeResourceOwnership?.workers?.length ?? -1) === 0
        && (run.activeResourceOwnership?.timers?.length ?? -1) === 0 ? "" : `run_${index + 1}_owned_resource`,
    ].filter(Boolean);
  });
  const group50 = loadJson(GROUP50_SUMMARY);
  const platform30 = loadJson(PLATFORM30_SUMMARY);
  const memoryBlockers = [
    previousMemory.status === "GREEN_R4_A7_MEMORY_LIFECYCLE_NO_UNBOUNDED_RETENTION"
      && previousMemory.runs?.length === 3 && previousMemory.blockers?.length === 0 ? "" : "prior_after_evidence",
    currentRuns.length === 3 ? "" : "current_run_denominator",
    ...currentRunBlockers,
    memoryRelevantDriftFromFix.length === 0 ? "" : "memory_owner_or_runner_drift_from_fix",
    memoryRelevantDriftFromCurrentRuns.length === 0 ? "" : "memory_owner_or_runner_drift_from_current_runs",
    group50.status === "GREEN_R4_A6_GROUP50_2368_GROUPS" && Number(group50.passedCases) === 118_400
      ? "" : "group50_streaming",
    platform30.status === "GREEN_R4_A6_PLATFORM_71040" && Number(platform30.platformExecutions) === 71_040
      ? "" : "platform30_streaming",
  ].filter(Boolean);
  const memoryReceipt = {
    schemaVersion: "r568-r4-a8-memory-lifecycle.v1",
    status: memoryBlockers.length === 0
      ? "GREEN_A8_MEMORY_3_OF_3_NO_UNBOUNDED_RETENTION"
      : "RED_A8_MEMORY_LIFECYCLE",
    capturedAtUtc: new Date().toISOString(),
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    source,
    cacheFix: {
      commitSha: CACHE_FIX_SHA,
      owner: "src/lib/estimate/buildProfessionalWorkPassport.ts",
      lifecycleRunner: "scripts/estimate/r4a7/runR4A7MemoryLifecycleSingle.ts",
      relevantDriftFromFix: memoryRelevantDriftFromFix,
      productionFixUsesManualGc: false,
      explicitGcMeasurementOnly: true,
    },
    historicalAfter: {
      path: A7_MEMORY_AFTER,
      sha256: A7_MEMORY_AFTER_SHA256,
      status: previousMemory.status,
      independentRuns: previousMemory.runs.length,
    },
    currentAfter: {
      sourceCommitSha: CURRENT_MEMORY_SOURCE_SHA,
      root: CURRENT_MEMORY_ROOT,
      independentRunsExpected: 3,
      independentRunsCompleted: currentRuns.length,
      methodology: currentRuns[0]?.methodology,
      receiptSha256: currentRuns.map((run, index) => ({
        runId: run.runId,
        path: resolve(CURRENT_MEMORY_ROOT, `run-${String(index + 1).padStart(2, "0")}.json`),
        sha256: sha256Bytes(readFileSync(resolve(CURRENT_MEMORY_ROOT, `run-${String(index + 1).padStart(2, "0")}.json`))),
      })),
      finalRssBytes: finiteStats(currentRuns.map((run) => Number(run.samples.at(-1)?.memory?.rssBytes))),
      finalHeapUsedBytes: finiteStats(currentRuns.map((run) => Number(run.samples.at(-1)?.memory?.heapUsedBytes))),
      cycleRetainedGrowthBytes: finiteStats(currentRuns.map((run) => Number(run.evaluation?.cycleRetainedGrowthBytes))),
      cycleRetainedSlopeBytesPerCycle: finiteStats(currentRuns.map((run) => Number(run.evaluation?.cycleRetainedSlopeBytesPerCycle))),
      idle60ToIdle300GrowthBytes: finiteStats(currentRuns.map((run) => Number(run.evaluation?.idle60ToIdle300GrowthBytes))),
      allCachesDisposed: currentRunBlockers.every((blocker) => !/cache|template_index/u.test(blocker)),
      unexpectedHandleGrowthAcrossRuns: currentRuns.reduce(
        (sum, run) => sum + Object.keys(run.evaluation?.unexpectedHandleGrowth ?? {}).length,
        0,
      ),
      relevantDriftFromRunSource: memoryRelevantDriftFromCurrentRuns,
    },
    coordinatorEvidence: {
      group50: {
        path: GROUP50_SUMMARY,
        sourceCommitSha: group50.source?.commitSha,
        cases: group50.passedCases,
        maxRssBytes: group50.performance?.maxRssBytes ?? group50.maxRssBytes,
      },
      platform30: {
        path: PLATFORM30_SUMMARY,
        sourceCommitSha: platform30.source?.commitSha,
        executions: platform30.platformExecutions,
        maxRssBytes: platform30.performance?.maxRssBytes ?? platform30.maxRssBytes,
      },
      shardByShard: true,
      fullPayloadsRetainedByCoordinator: false,
    },
    unavailableMetrics: {
      nodePss: "N/A: Windows Node process.memoryUsage does not expose PSS.",
      androidNativeAndGraphics: "N/A in this Node gate; measured separately by the API 34 device gate.",
      browserDomAndJs: "N/A in this Node gate; measured separately by the physical Chromium gate.",
    },
    observed375To410Mb: "INVESTIGATION_SIGNAL_NOT_TARGET",
    blockers: memoryBlockers,
    globalStatus: "RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
    fakeGreenClaimed: false,
  };

  writeImmutableJson(DEAD_SOURCE_OUTPUT, deadSourceReceipt);
  writeImmutableJson(MEMORY_OUTPUT, memoryReceipt);
  console.log(JSON.stringify({
    deadSource: { status: deadSourceReceipt.status, blockers: cleanupBlockers },
    memory: { status: memoryReceipt.status, blockers: memoryBlockers },
    outputs: { deadSource: DEAD_SOURCE_OUTPUT, memory: MEMORY_OUTPUT },
  }, null, 2));
  if (cleanupBlockers.length > 0 || memoryBlockers.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/buildR4A8CleanupMemoryEvidence.ts")) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  }
}
