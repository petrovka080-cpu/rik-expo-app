import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(
  ROOT,
  ".release-runtime",
  "master11610-backend-canonical-r2",
  "evidence",
);
const SPEC_PATH =
  "C:\\Users\\User\\Downloads\\MASTER_11610_BACKEND_CANONICAL_ESTIMATE_PLATFORM_CURRENT_WORKTREE_FUNCTIONAL_PARITY_NATIVE_CUTOVER_CLEANUP_AND_EXACT_GREEN_CLOSEOUT_R2.md";
const EXPECTED_SPEC_SHA256 =
  "2ea0d676735a5eda8a3f5ba1b8e18efd6007cf2221bd56dd3cc9da09a3db9958";
const BATCH005_HEAD = "20d56e91bf3591945e55435f6f4b9021f8b838d0";

function sha256Bytes(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function gitRaw(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trimEnd();
}

function commandLines(command: string): string[] {
  const value = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(join(EVIDENCE_ROOT, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function disposition(path: string): { owner: string; role: string; disposition: string } {
  if (path === "metro.config.js") {
    return { owner: "build-runtime", role: "temporary-infrastructure", disposition: "REVIEW_REMOVE" };
  }
  if (path.startsWith("supabase/migrations/") || path.startsWith("supabase/rollback/")) {
    return { owner: "canonical-backend-schema", role: "production", disposition: "KEEP" };
  }
  if (path.startsWith("supabase/functions/canonical-estimate-worker/")) {
    return { owner: "canonical-backend-worker", role: "production", disposition: "KEEP" };
  }
  if (path.startsWith("supabase/functions/canonical-estimate/")) {
    return { owner: "canonical-backend-api", role: "production", disposition: "KEEP" };
  }
  if (path.startsWith("scripts/e2e/") || path.endsWith(".test.ts") || path.endsWith(".test.tsx")) {
    return { owner: "backend-r2-verification", role: "test-evidence", disposition: "KEEP" };
  }
  if (path.startsWith("scripts/estimate/backendMigration/")) {
    return { owner: "canonical-backend-migration", role: "migration-evidence", disposition: "KEEP" };
  }
  if (path.startsWith("src/lib/estimate/backendPlatform/")) {
    return { owner: "canonical-estimate-client", role: "production", disposition: "KEEP" };
  }
  return { owner: "estimate-frontend-integration", role: "production", disposition: "KEEP" };
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const capturedAt = new Date().toISOString();
  const specBytes = readFileSync(SPEC_PATH);
  const specSha256 = sha256Bytes(specBytes);
  if (specSha256 !== EXPECTED_SPEC_SHA256) {
    throw new Error(`R2 specification hash mismatch: ${specSha256}`);
  }

  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const mergeBase = git(["merge-base", "HEAD", BATCH005_HEAD]);
  if (head !== BATCH005_HEAD || mergeBase !== BATCH005_HEAD) {
    throw new Error(`unexpected continuation point: HEAD=${head}, mergeBase=${mergeBase}`);
  }

  const porcelain = gitRaw(["status", "--porcelain=v1", "--untracked-files=all"]);
  const changedPaths = porcelain
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, "").replace(/\\/g, "/"));

  const client = new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "55432"),
    database: process.env.PGDATABASE ?? "master11610_r1",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
  });
  await client.connect();
  const release = await client.query(`
    select id, release_key, status, source_commit, source_tree,
           source_manifest_sha256, definition_count, resource_row_count
      from public.estimate_definition_release
     where status = 'active'
  `);
  const counts = await client.query(`
    select
      (select count(*)::integer from public.estimate_definition_version) definitions,
      (select count(*)::integer from public.estimate_parameter_definition) parameters,
      (select count(*)::integer from public.estimate_formula_graph) formulas,
      (select count(*)::integer from public.estimate_resource_spec) resources,
      (select count(*)::integer from public.estimate_revision) revisions,
      (select count(*)::integer from public.estimate_revision_row) revision_rows,
      (select count(*)::integer from public.estimate_compile_job) jobs,
      (select count(*)::integer from public.estimate_revision_artifact) artifacts,
      (select count(*)::integer from public.estimate_legacy_revision_import) legacy_imports
  `);
  const program = await client.query(`
    select denominator_total, admitted_global_count, queue_remaining,
           external_reference_count, batch006_started
      from public.estimate_program_control_state
  `);
  await client.end();

  const corpusManifestPath = join(
    ROOT,
    ".release-runtime",
    "master11610-backend-canonical-r1",
    "02-canonical-export",
    "manifest.json",
  );
  const corpusManifestBytes = readFileSync(corpusManifestPath);
  const postgresReportPath = join(
    ROOT,
    ".release-runtime",
    "master11610-backend-canonical-r1",
    "04-postgresql",
    "POSTGRESQL_INTEGRATION_REPORT.json",
  );
  const postgresReportBytes = readFileSync(postgresReportPath);

  const checkpoint = {
    schemaVersion: "master11610-backend-r2-checkpoint-binding.v1",
    capturedAt,
    status: "RED_IN_PROGRESS",
    specification: {
      path: SPEC_PATH,
      file: basename(SPEC_PATH),
      bytes: statSync(SPEC_PATH).size,
      lines: readFileSync(SPEC_PATH, "utf8").split(/\r?\n/).length - 1,
      sha256: specSha256,
    },
    git: {
      root: ROOT,
      branch: git(["branch", "--show-current"]),
      head,
      tree,
      batch005Head: BATCH005_HEAD,
      mergeBase,
      batch005IsAncestor: true,
      changedPathCount: changedPaths.length,
      changedPaths,
    },
    database: {
      engine: "PostgreSQL 17",
      address: "127.0.0.1:55432/master11610_r1",
      release: release.rows[0],
      counts: counts.rows[0],
      programControl: program.rows[0],
    },
    boundPriorEvidence: {
      corpusManifest: {
        path: relative(ROOT, corpusManifestPath).replace(/\\/g, "/"),
        bytes: corpusManifestBytes.length,
        sha256: sha256Bytes(corpusManifestBytes),
        declaredManifestSha256: JSON.parse(corpusManifestBytes.toString("utf8")).manifestSha256,
      },
      postgresIntegrationReport: {
        path: relative(ROOT, postgresReportPath).replace(/\\/g, "/"),
        bytes: postgresReportBytes.length,
        sha256: sha256Bytes(postgresReportBytes),
        status: JSON.parse(postgresReportBytes.toString("utf8")).status,
      },
    },
    liveProcesses: {
      listeners: commandLines(
        "$ports=55432,8765,8170; Get-NetTCPConnection -State Listen -ErrorAction Stop | " +
          "Where-Object { $ports -contains $_.LocalPort } | Sort-Object LocalPort | " +
          "ForEach-Object { \"$($_.LocalAddress):$($_.LocalPort):$($_.OwningProcess)\" }",
      ),
      android: {
        serial: "emulator-5554",
        apiLevel: commandLines("adb -s emulator-5554 shell getprop ro.build.version.sdk")[0],
        package: "com.azisbek_dzhantaev.rikexpoapp",
        nativeMainActivityGate: "NOT_YET_PROVEN",
        priorChromeEvidenceClassification: "SUPPLEMENTAL_WEB_ONLY",
      },
    },
    prohibitions: {
      productionDeployed: false,
      productionUserDataMigrated: false,
      batch006Started: false,
    },
  };
  writeJson("CURRENT_BACKEND_R1_CHECKPOINT_BINDING.json", checkpoint);

  const ownerLedger = changedPaths.map((path) => {
    const absolute = join(ROOT, path);
    const currentBytes = readFileSync(absolute);
    let baselineSha256: string | null = null;
    try {
      baselineSha256 = sha256Bytes(execFileSync("git", ["show", `${BATCH005_HEAD}:${path}`], { cwd: ROOT }));
    } catch {
      baselineSha256 = null;
    }
    return {
      schemaVersion: "master11610-backend-r2-file-owner-ledger.v1",
      capturedAt,
      path,
      bytes: currentBytes.length,
      currentSha256: sha256Bytes(currentBytes),
      baselineSha256,
      change: baselineSha256 === null ? "ADDED" : "MODIFIED",
      ...disposition(path),
    };
  });
  writeFileSync(
    join(EVIDENCE_ROOT, "CURRENT_R1_DIFF_AND_OWNER_LEDGER.jsonl"),
    `${ownerLedger.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    join(EVIDENCE_ROOT, "JOURNAL.jsonl"),
    `${JSON.stringify({
      at: capturedAt,
      gate: "C0",
      status: "GREEN",
      event: "R2_CHECKPOINT_BOUND",
      head,
      tree,
      activeReleaseId: release.rows[0]?.id,
      nextGate: "C1_C5_SERVER_1168",
    })}\n`,
    "utf8",
  );

  process.stdout.write(
    `${JSON.stringify({ evidenceRoot: EVIDENCE_ROOT, checkpoint: "GREEN", changedPathCount: changedPaths.length })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
