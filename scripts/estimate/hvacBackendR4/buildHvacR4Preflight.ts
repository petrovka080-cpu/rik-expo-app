import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import {
  HVAC_COMPLETE_RECORD_COUNT,
  HVAC_DOMAIN_INVENTORY,
  HVAC_REVIEWED_EXCLUSIONS,
} from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  BATCH007_PREDECESSOR_COMMIT,
  BATCH007_PREDECESSOR_TREE,
  BATCH007_SPEC_SHA256,
  BATCH007_WATER_MANIFEST_SHA256,
  BATCH007_WATER_PACKAGE_SHA256,
  BATCH007_WATER_RELEASE_ID,
  assertExact,
  command,
  ensureEvidenceLayout,
  evidenceRoot,
  git,
  projectRoot,
  quarantinePartialEvidence,
  runtimeRoot,
  semanticSha256,
  sha256,
  writeJson,
} from "./support";

const EXPECTED_BRANCH = "codex/batch007-hvac-heat-supply-r4";
const EXPECTED_WORKTREE = "C:\\dev\\rik-expo-app-batch007-hvac-heat-supply-r4";
const EXPECTED_DATABASE = "batch006_water_r6_a2_a";
const DATABASE_URL = process.env.BATCH007_PREDECESSOR_DATABASE_URL ??
  `postgresql://postgres:postgres@127.0.0.1:55432/${EXPECTED_DATABASE}`;
const SPEC_PATH = process.env.BATCH007_SPEC_PATH ??
  "C:\\Users\\User\\Downloads\\BATCH007_HVAC_HEAT_SUPPLY_BACKEND_NATIVE_REAL_EXPANDED_ESTIMATES_EXACT_GREEN_R4.md";
const WATER_RUNTIME = process.env.BATCH006_RUNTIME_ROOT ??
  "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3";

type ScalarRow = Record<string, string | number | boolean | null>;

function normalizePath(value: string): string {
  return resolve(value).replaceAll("/", "\\").toLocaleLowerCase("en-US");
}

async function tableDigest(client: Client, table: string): Promise<{ table: string; rows: number; sha256OfSortedRowSha256: string }> {
  assertExact(/^[a-z_]+$/.test(table), `UNSAFE_TABLE_NAME:${table}`);
  const result = await client.query<{ rows: string; digest: string }>(`
    with row_hashes as (
      select encode(extensions.digest(to_jsonb(t)::text, 'sha256'::text), 'hex') as row_hash
      from public.${table} t
    )
    select count(*)::text as rows,
           encode(extensions.digest(coalesce(string_agg(row_hash, '' order by row_hash), ''), 'sha256'::text), 'hex') as digest
    from row_hashes
  `);
  return {
    table,
    rows: Number(result.rows[0]?.rows ?? -1),
    sha256OfSortedRowSha256: result.rows[0]?.digest ?? "",
  };
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const quarantinedPartials = quarantinePartialEvidence();
  const timestamp = new Date().toISOString();
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const mergeBase = git("merge-base", BATCH007_PREDECESSOR_COMMIT, "HEAD");
  const statusPorcelainV2 = git("status", "--porcelain=v2", "--untracked-files=all");
  const diffStat = git("diff", "--stat");
  const diff = git("diff", "--full-index", "--binary");
  const untrackedFiles = git("ls-files", "--others", "--exclude-standard")
    .split(/\r?\n/).filter(Boolean);
  const allowedPreflightHarness = [
    "scripts/estimate/hvacBackendR4/buildHvacR4Preflight.ts",
    "scripts/estimate/hvacBackendR4/support.ts",
  ];
  const diffCheck = command("git", ["diff", "--check"]);
  const fsck = command("git", ["fsck", "--full", "--strict"], { timeout: 120_000 });
  const trackedFiles = git("-c", "core.quotepath=false", "ls-files", "-z")
    .split("\0").filter(Boolean);
  const zeroByteTrackedFiles = trackedFiles.filter((relative) => {
    const path = join(projectRoot, relative);
    return statSync(path).size === 0;
  });
  const conflictMarkers = command("git", ["grep", "-n", "-I", "-E", "^(<<<<<<<|=======|>>>>>>>)"]);
  const specBytes = readFileSync(SPEC_PATH);
  const specText = specBytes.toString("utf8");
  const specNewlineCount = (specText.match(/\n/g) ?? []).length;
  const waterResumePath = join(WATER_RUNTIME, "RESUME_STATE.json");
  const waterEvidencePath = join(WATER_RUNTIME, "evidence-a2", "A2_14_FINAL_EVIDENCE_INDEX.json");
  const waterActivationPath = join(WATER_RUNTIME, "evidence-a2", "A2_14_FINAL_ACTIVATION_AND_QUEUE_REBASE.json");
  const waterReplayPath = join(WATER_RUNTIME, "evidence-a2", "A2_13_REPLAY_COMPARISON.json");
  const waterResume = JSON.parse(readFileSync(waterResumePath, "utf8")) as ScalarRow;
  const waterActivation = JSON.parse(readFileSync(waterActivationPath, "utf8")) as Record<string, unknown>;
  const waterReplay = JSON.parse(readFileSync(waterReplayPath, "utf8")) as Record<string, unknown>;

  assertExact(normalizePath(projectRoot) === normalizePath(EXPECTED_WORKTREE), "BATCH007_WRONG_WORKTREE");
  assertExact(branch === EXPECTED_BRANCH, "BATCH007_WRONG_BRANCH");
  assertExact(head === BATCH007_PREDECESSOR_COMMIT, "BATCH007_PREDECESSOR_HEAD_MISMATCH");
  assertExact(tree === BATCH007_PREDECESSOR_TREE, "BATCH007_PREDECESSOR_TREE_MISMATCH");
  assertExact(mergeBase === BATCH007_PREDECESSOR_COMMIT, "BATCH007_PREDECESSOR_ANCESTRY_MISMATCH");
  assertExact(
    untrackedFiles.length === allowedPreflightHarness.length &&
      allowedPreflightHarness.every((path) => untrackedFiles.includes(path)),
    "BATCH007_UNEXPECTED_PRE_CONTENT_WORKTREE_STATE",
  );
  assertExact(diffStat === "" && diff === "", "BATCH007_PRE_CONTENT_TRACKED_DIFF_PRESENT");
  assertExact(diffCheck.exitCode === 0 && diffCheck.stdout === "" && diffCheck.stderr === "", "BATCH007_DIFF_CHECK_RED");
  assertExact(fsck.exitCode === 0, `BATCH007_GIT_FSCK_RED:${fsck.stderr}`);
  assertExact(conflictMarkers.exitCode === 1 && conflictMarkers.stdout === "", "BATCH007_CONFLICT_MARKER_FOUND");
  assertExact(sha256(specBytes) === BATCH007_SPEC_SHA256, "BATCH007_SPEC_SHA_MISMATCH");
  assertExact(specBytes.length === 102_743 && specNewlineCount === 3_542, "BATCH007_SPEC_CARDINALITY_MISMATCH");
  assertExact(waterResume.phase === "FINAL_EXACT_GREEN_ACTIVATED_CLEAN", "BATCH006_NOT_TERMINAL_GREEN");
  assertExact(waterResume.release_id === BATCH007_WATER_RELEASE_ID, "BATCH006_RELEASE_BINDING_MISMATCH");
  assertExact(waterResume.replay === "2/2" && waterResume.runtime_residue === 0, "BATCH006_REPLAY_OR_RESIDUE_RED");
  assertExact(waterResume.production_deployed === false && waterResume.batch007_started === false, "BATCH006_STOP_BOUNDARY_RED");

  const parsedUrl = new URL(DATABASE_URL);
  assertExact(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "55432", "BATCH007_NON_LOCAL_DATABASE_BLOCKED");
  assertExact(decodeURIComponent(parsedUrl.pathname.slice(1)) === EXPECTED_DATABASE, "BATCH007_WRONG_PREDECESSOR_DATABASE");
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch007-hvac-r4-preflight" });
  await client.connect();
  try {
    const identity = (await client.query<ScalarRow>(`
      select current_database() as database, inet_server_addr()::text as host,
             inet_server_port() as port, current_user as role,
             pg_is_in_recovery() as in_recovery,
             current_setting('data_directory') as data_directory
    `)).rows[0]!;
    const control = (await client.query<ScalarRow>(`
      select denominator_total, admitted_global_count, queue_remaining, external_reference_count,
             batch006_started, water_domain_complete, water_domain_remaining,
             batch007_selected, batch007_execution_started, program_state_version, state_sha256
      from public.estimate_program_control_state where singleton = true
    `)).rows[0]!;
    const releases = (await client.query<ScalarRow>(`
      select id::text, release_key, status, source_commit, source_tree,
             source_manifest_sha256, source_package_sha256, definition_count,
             parameter_count, formula_count, resource_row_count,
             parent_release_id::text, created_at::text, activated_at::text
      from public.estimate_definition_release order by created_at, id
    `)).rows;
    const active = releases.filter((release) => release.status === "active");
    const jobs = (await client.query<ScalarRow>(`
      select coalesce(target_release_id::text, 'NULL') as release_id, status,
             count(*)::int as jobs, count(distinct idempotency_key)::int as idempotency_keys,
             count(*) filter (where status = 'running' and lease_expires_at < now())::int as expired_running,
             count(*) filter (where status = 'running' and lease_expires_at >= now())::int as live_running
      from public.estimate_compile_job group by target_release_id, status order by target_release_id, status
    `)).rows;
    const revisions = (await client.query<ScalarRow>(`
      select release_id::text, count(*)::int as rows, count(distinct id)::int as distinct_ids,
             count(*) filter (where parent_revision_id is not null)::int as children
      from public.estimate_revision group by release_id order by release_id
    `)).rows;
    const duplicateIdempotency = (await client.query<ScalarRow>(`
      select count(*)::int as duplicate_groups from (
        select idempotency_key from public.estimate_compile_job
        group by idempotency_key having count(*) > 1
      ) duplicate_keys
    `)).rows[0]!;
    const preservationTables = [
      "estimate_definition_release",
      "estimate_definition_version",
      "estimate_parameter_definition",
      "estimate_formula_graph",
      "estimate_resource_spec",
      "estimate_normative_source",
      "estimate_normative_locator",
      "estimate_work_normative_binding",
      "estimate_professional_passport",
      "estimate_price_route",
      "estimate_price_snapshot",
      "estimate_price_snapshot_item",
      "estimate_resource_price_route_binding",
      "estimate_revision",
      "estimate_revision_row",
      "estimate_revision_artifact",
      "estimate_program_event",
      "estimate_program_control_transition",
      "estimate_definition_release_activation",
      "estimate_domain_release_admission_seal",
    ] as const;
    assertExact(
      identity.database === EXPECTED_DATABASE &&
        String(identity.host).replace(/\/32$/, "") === "127.0.0.1" &&
        identity.port === 55432,
      "BATCH007_DATABASE_IDENTITY_RED",
    );
    assertExact(identity.in_recovery === false, "BATCH007_DATABASE_STILL_IN_RECOVERY");
    assertExact(active.length === 1 && active[0]?.id === BATCH007_WATER_RELEASE_ID, "BATCH007_ACTIVE_PREDECESSOR_RELEASE_RED");
    assertExact(active[0]?.source_manifest_sha256 === BATCH007_WATER_MANIFEST_SHA256, "BATCH007_WATER_MANIFEST_RED");
    assertExact(active[0]?.source_package_sha256 === BATCH007_WATER_PACKAGE_SHA256, "BATCH007_WATER_PACKAGE_RED");
    assertExact(control.denominator_total === 11_610 && control.admitted_global_count === 2_005 && control.queue_remaining === 9_605 && control.external_reference_count === 8, "BATCH007_QUEUE_BASELINE_RED");
    assertExact(control.batch006_started === true && control.water_domain_complete === true && control.water_domain_remaining === 0, "BATCH007_WATER_CONTROL_STATE_RED");
    assertExact(control.batch007_selected === false && control.batch007_execution_started === false, "BATCH007_ALREADY_STARTED");
    assertExact(jobs.every((job) => job.expired_running === 0 && job.live_running === 0), "BATCH007_PREDECESSOR_RUNNING_JOB_RED");
    assertExact(duplicateIdempotency.duplicate_groups === 0, "BATCH007_PREDECESSOR_DUPLICATE_IDEMPOTENCY_RED");
    const preservation = [];
    for (const table of preservationTables) preservation.push(await tableDigest(client, table));

    const global = buildGlobalCatalogInventoryV1();
    const hvacIds = new Set(HVAC_DOMAIN_INVENTORY.map((row) => row.catalog_id));
    assertExact(global.catalog_total === 11_610 && global.rows.length === 11_610, "BATCH007_GLOBAL_LEDGER_SOURCE_RED");
    assertExact(HVAC_COMPLETE_RECORD_COUNT === 920 && hvacIds.size === 920, "BATCH007_HVAC_BASELINE_DENOMINATOR_RED");

    const processSnapshot = command("powershell.exe", ["-NoProfile", "-Command",
      "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'batch007|hvac-r4|55432|postgres' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 4"],
    );
    const listenerSnapshot = command("powershell.exe", ["-NoProfile", "-Command",
      "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 55432,58707,58708,58709 } | Select-Object LocalAddress,LocalPort,OwningProcess,State | ConvertTo-Json -Depth 4"],
    );

    const predecessorBinding = {
      schemaVersion: "batch007-hvac-r4-predecessor-binding.v1",
      generatedAt: timestamp,
      specification: { path: SPEC_PATH, bytes: specBytes.length, newlineCount: specNewlineCount, sha256: sha256(specBytes), eofRead: true },
      worktree: { path: projectRoot, branch, head, tree, mergeBase },
      waterSeal: {
        releaseId: BATCH007_WATER_RELEASE_ID,
        packageSha256: BATCH007_WATER_PACKAGE_SHA256,
        manifestSha256: BATCH007_WATER_MANIFEST_SHA256,
        resumePath: waterResumePath,
        resumeSha256: sha256(readFileSync(waterResumePath)),
        finalEvidenceIndexPath: waterEvidencePath,
        finalEvidenceIndexSha256: sha256(readFileSync(waterEvidencePath)),
        activationPath: waterActivationPath,
        activationSha256: sha256(readFileSync(waterActivationPath)),
        replayPath: waterReplayPath,
        replaySha256: sha256(readFileSync(waterReplayPath)),
        phase: waterResume.phase,
        replay: waterResume.replay,
        residue: waterResume.runtime_residue,
        productionDeployed: waterResume.production_deployed,
        batch007Started: waterResume.batch007_started,
      },
      database: { identity, activeRelease: active[0], control },
      status: "GREEN_PREDECESSOR_BOUND",
    };
    writeJson("00-preflight/PREDECESSOR_BINDING.json", predecessorBinding);
    writeJson("00-preflight/WORKTREE_SNAPSHOT.json", {
      schemaVersion: "batch007-hvac-r4-worktree-snapshot.v1",
      generatedAt: timestamp,
      timezone: "Asia/Bishkek",
      worktreePath: projectRoot,
      branch,
      head,
      tree,
      mergeBase,
      statusPorcelainV2: statusPorcelainV2.split(/\r?\n/).filter(Boolean),
      diffStat: diffStat.split(/\r?\n/).filter(Boolean),
      diffBytes: Buffer.byteLength(diff),
      diffSha256: sha256(diff),
      untrackedFiles,
      diffCheck: { exitCode: diffCheck.exitCode, stdout: diffCheck.stdout, stderr: diffCheck.stderr },
      gitFsck: { exitCode: fsck.exitCode, stdout: fsck.stdout, stderr: fsck.stderr },
      trackedFiles: trackedFiles.length,
      zeroByteTrackedFiles,
      conflictMarkerMatches: [],
      quarantinedPartials,
      allowedPreflightHarness,
      status: "GREEN_EXACT_PREDECESSOR_WITH_PRECONTENT_PREFLIGHT_HARNESS_ONLY",
    });
    writeJson("00-preflight/PRODUCTION_NON_TOUCH_PROOF.json", {
      schemaVersion: "batch007-hvac-r4-production-non-touch.v1",
      generatedAt: timestamp,
      allowedDatabase: identity,
      allowedHost: "127.0.0.1",
      allowedPort: 55432,
      allowedDatabaseName: EXPECTED_DATABASE,
      remoteDatabaseConnections: 0,
      productionUrlsUsed: [],
      productionWrites: 0,
      productionDeploy: false,
      push: false,
      pullRequest: false,
      merge: false,
      ota: false,
      status: "GREEN_LOCAL_DISPOSABLE_ONLY",
    });
    writeJson("00-preflight/OLD_BATCH007_SUPERSEDED_PROOF.json", {
      schemaVersion: "batch007-hvac-r4-old-batch-superseded.v1",
      generatedAt: timestamp,
      r1: "SUPERSEDED_DO_NOT_EXECUTE",
      r2: "SUPERSEDED_DO_NOT_EXECUTE",
      r3: "SUPERSEDED_DO_NOT_EXECUTE",
      oldWorktreeReused: false,
      oldReleaseReused: false,
      baselineDiagnosticPath: join(runtimeRoot, "stale-r3-diagnostic"),
      baselineDiagnosticStatus: "QUARANTINED_DEPTH_BASELINE_NOT_PACKAGE_NOT_ADMISSION_NOT_GREEN",
      baselineIdentities: 920,
      baselineResourceRows: 27_744,
      status: "GREEN_R4_ONLY",
    });
    writeJson("00-preflight/OLD_RELEASE_PRESERVATION_BASELINE.json", {
      schemaVersion: "batch007-hvac-r4-old-release-preservation-baseline.v1",
      generatedAt: timestamp,
      database: identity,
      releases,
      revisions,
      tableDigests: preservation,
      semanticSha256: semanticSha256(preservation),
      status: "FROZEN_BEFORE_BATCH007_CONTENT_WRITES",
    });
    writeJson("00-preflight/QUEUE_BASELINE.json", {
      schemaVersion: "batch007-hvac-r4-queue-baseline.v1",
      generatedAt: timestamp,
      control,
      jobs,
      duplicateIdempotencyGroups: duplicateIdempotency.duplicate_groups,
      expected: { denominator: 11_610, admitted: 2_005, remaining: 9_605, external: 8 },
      queueEventsForBatch007: 0,
      status: "GREEN_UNCHANGED_BEFORE_BATCH007",
    });
    writeJson("00-preflight/RUNTIME_INVENTORY.json", {
      schemaVersion: "batch007-hvac-r4-runtime-inventory.v1",
      generatedAt: timestamp,
      postgres: identity,
      databases: (await client.query<ScalarRow>("select datname as name from pg_database where datallowconn order by datname")).rows,
      preparedReleases: releases.filter((release) => release.status === "prepared"),
      activeRelease: active[0],
      jobs,
      revisions,
      processes: processSnapshot.stdout.trim() ? JSON.parse(processSnapshot.stdout) : [],
      listeners: listenerSnapshot.stdout.trim() ? JSON.parse(listenerSnapshot.stdout) : [],
      taskOwnedProcesses: [],
      taskOwnedPorts: [],
      status: "INVENTORIED_NO_BATCH007_RUNTIME",
    });

    const resume = {
      schemaVersion: "batch007-hvac-r4-resume-state.v1",
      generatedAt: timestamp,
      phase: "W0_PREFLIGHT_GREEN",
      sourceHead: head,
      sourceTree: tree,
      predecessorReleaseId: BATCH007_WATER_RELEASE_ID,
      predecessorQueue: { denominator: 11_610, admitted: 2_005, remaining: 9_605, external: 8 },
      discoveredBaseline: { global: global.catalog_total, hvacIdentities: hvacIds.size, reviewedExclusions: HVAC_REVIEWED_EXCLUSIONS.length },
      nextExactAction: "W1_GLOBAL_11610_CLASSIFICATION_AND_H_FINAL_F_FINAL_FREEZE",
      productionDeployed: false,
      batch008Started: false,
      activationCount: 0,
      queueRebaseCount: 0,
      status: "GREEN_W0",
    };
    writeJson("RESUME_STATE.json", resume);
    execFileSync("node", ["-e", "process.stdout.write('')"]);
    process.stdout.write(`${JSON.stringify({
      status: "GREEN_W0",
      worktree: projectRoot,
      branch,
      head,
      tree,
      specification: { bytes: specBytes.length, newlineCount: specNewlineCount, sha256: sha256(specBytes) },
      predecessorReleaseId: BATCH007_WATER_RELEASE_ID,
      queue: { denominator: 11_610, admitted: 2_005, remaining: 9_605, external: 8 },
      hvacBaseline: hvacIds.size,
      familyMinimum: 146,
      evidenceRoot,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
