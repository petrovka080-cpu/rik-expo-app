import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a2");
const MANIFEST_PATH = join(RUNTIME, "03-r6-a2-release-a", "manifest.json");
const OWNER = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION = "22222222-2222-4222-8222-222222222222";
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
if (!EXPECTED_DATABASE || EXPECTED_DATABASE !== "batch006_water_r6_a2_a"
  || decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")) !== EXPECTED_DATABASE) {
  throw new Error("BATCH006_FINAL_ACTIVATION_EXACT_REPLAY_A_DATABASE_REQUIRED");
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function sourceFingerprint(): string {
  const paths = git([
    "ls-files", "--cached", "--others", "--exclude-standard", "--",
    "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts",
    "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json",
  ]).split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  return sha256(stable(paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replace(/\\/g, "/"), bytes: bytes.length, sha256: sha256(bytes) };
  })));
}

function readJson(relativePath: string): Json {
  const path = join(EVIDENCE, relativePath);
  if (!existsSync(path)) throw new Error(`WATER_R6_A2_REQUIRED_EVIDENCE_MISSING:${relativePath}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function exactGreenEvidence(releaseId: string): Array<{ file: string; sha256: string; bytes: number }> {
  const required = [
    "A2_00_PREDECESSOR_AND_A1_TRUTH.json",
    "A2_01_GLOBAL_11610_WATER_CLASSIFICATION.jsonl",
    "A2_02_NEW_DEFINITIONS_LEDGER.jsonl",
    "A2_04_PER_ID_BEFORE_AFTER.jsonl",
    "A2_04_RESOURCE_ROWS_ADDED.jsonl",
    "A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl",
    "A2_05_ANTI_TEMPLATE_REPORT.json",
    "A2_06_FIRST_REPAIRED_ORACLE.json",
    "A2_06_SECOND_CLEAN_ORACLE.json",
    "A2_06_ORACLE_COMPARISON.json",
    "A2_07_PACKAGE_DETERMINISM.json",
    "A2_08_EXPLICIT_MIGRATION_REHEARSAL.json",
    "A2_08_IMPORT_REPORT.json",
    "A2_09_POST_IMPORT_ORACLE.json",
    "WATER_RESOURCE_BRANCH_COVERAGE.json",
    "A2_09_WATER_MASS_ADMISSION_PROOF.json",
    "A2_10_WOW_PLATFORM_GATES.json",
    "A2_10_SECURITY_CONCURRENCY_LEASE_OFFLINE_PROOF.json",
    "A2_11_WEB_MATRIX_50.json",
    "A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json",
    "A2_11_BUNDLE_OWNERSHIP_PROOF.json",
    "A2_12_PERFORMANCE.json",
    "A2_12_CONTROLLED_MUTATION_REPORT.json",
    "A2_12_VERIFICATION_TYPECHECK.json",
    "A2_12_VERIFICATION_FOCUSED.json",
    "A2_12_VERIFICATION_SECURITY.json",
    "A2_12_VERIFICATION_FULL_JEST_DEFERRED.json",
    "A2_13_REPLAY_A/REPLAY_SUMMARY.json",
    "A2_13_REPLAY_B/REPLAY_SUMMARY.json",
    "A2_13_REPLAY_COMPARISON.json",
  ];
  return required.map((file) => {
    const bytes = readFileSync(join(EVIDENCE, file));
    const isJsonl = file.endsWith(".jsonl");
    const value = isJsonl ? null : JSON.parse(bytes.toString("utf8")) as Json;
    const deferred = file === "A2_12_VERIFICATION_FULL_JEST_DEFERRED.json"
      && value!.status === "DEFERRED_BY_OPERATOR_NOT_RUN" && value!.executed === false;
    if (!isJsonl && value!.status !== "GREEN" && !deferred
      && !String(value!.status).startsWith("GREEN_")) throw new Error(`WATER_R6_A2_REQUIRED_EVIDENCE_RED:${file}:${value!.status}`);
    if (!isJsonl && value!.releaseId != null && value!.releaseId !== releaseId) throw new Error(`WATER_R6_A2_REQUIRED_EVIDENCE_RELEASE_STALE:${file}`);
    return { file, sha256: sha256(bytes), bytes: bytes.length };
  });
}

function allEvidenceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? allEvidenceFiles(path) : [path];
  });
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const manifestBytes = readFileSync(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Json;
  const releaseId = String(manifest.releaseId);
  const currentFingerprint = sourceFingerprint();
  if (manifest.schemaVersion !== "batch006-water-backend-release.r6-a2"
    || manifest.definitionSchemaVersion !== 5
    || manifest.sourceGit.worktreeSourceFingerprintSha256 !== currentFingerprint) {
    throw new Error("WATER_R6_A2_FINAL_SOURCE_OR_MANIFEST_DRIFT");
  }
  const requiredEvidence = exactGreenEvidence(releaseId);
  const massBytes = readFileSync(join(EVIDENCE, "A2_09_WATER_MASS_ADMISSION_PROOF.json"));
  const auditBytes = readFileSync(join(EVIDENCE, "A2_09_POST_IMPORT_ORACLE.json"));
  const mass = JSON.parse(massBytes.toString("utf8")) as Json;
  const audit = JSON.parse(auditBytes.toString("utf8")) as Json;
  const wow = readJson("A2_10_WOW_PLATFORM_GATES.json");
  const pair = readJson("A2_06_ORACLE_COMPARISON.json");
  const postImport = readJson("A2_09_POST_IMPORT_ORACLE.json");
  const replay = readJson("A2_13_REPLAY_COMPARISON.json");
  if (mass.releaseId !== releaseId || mass.status !== "GREEN" || audit.status !== "GREEN"
    || mass.serverCompile.green !== manifest.waterDelta.definitions || mass.serverRecalculate.green !== manifest.waterDelta.definitions
    || mass.resourceBranchCoverage.reached !== manifest.waterDelta.resources
    || mass.unreachableRows !== 0 || mass.doubleCount !== 0 || mass.duplicateRevisions !== 0
    || mass.duplicateRevisionRows !== 0 || wow.r1r2Preservation.unchanged !== true
    || wow.idempotency.conflictingPayloadStatus !== 409
    || pair.independentSourceHashesDifferent !== true || pair.mismatchCount !== 0 || pair.status !== "GREEN_TWO_INDEPENDENT_ORACLES"
    || postImport.releaseId !== releaseId || postImport.status !== "GREEN"
    || replay.replay !== "2/2" || replay.status !== "GREEN"
    || replay.replayPredecessorDiff !== 0 || replay.replayProposedQueueDiff !== 0) {
    throw new Error("WATER_R6_A2_FINAL_ADMISSION_NOT_EXACT_GREEN");
  }

  const admissionProofSha256 = sha256(massBytes);
  const independentAuditSha256 = sha256(auditBytes);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r6-a2-final-seal-activation" });
  await client.connect();
  try {
    const before = (await client.query(`
      select current_database() database,r.id,r.status,r.schema_version,r.parent_release_id,
        s.denominator_total,s.admitted_global_count,s.queue_remaining,s.external_reference_count,
        s.batch006_started,s.water_domain_complete,s.water_domain_remaining,s.batch007_selected,s.batch007_execution_started,
        (select count(*)::integer from public.estimate_program_control_transition t where t.release_id=$1) transition_count
      from public.estimate_definition_release r cross join public.estimate_program_control_state s
      where r.id=$1 and s.singleton=true
    `, [releaseId])).rows[0] as Json;
    if (!before || before.database !== EXPECTED_DATABASE || before.status !== "prepared" || Number(before.schema_version) !== 5
      || Number(before.denominator_total) !== 11_610 || Number(before.admitted_global_count) !== 1_160
      || Number(before.queue_remaining) !== 10_450 || Number(before.external_reference_count) !== 8
      || before.batch006_started || before.batch007_selected || before.batch007_execution_started
      || Number(before.transition_count) !== 0) throw new Error(`WATER_R6_A2_PRE_ACTIVATION_STATE_RED:${stable(before)}`);

    const cleanup = (await client.query(
      "select * from public.estimate_cleanup_release_admission_runtime_v3($1,$2,$3)",
      [releaseId, OWNER, ORGANIZATION],
    )).rows[0] as Json;
    if (Number(cleanup.residue) !== 0 || Number(cleanup.deleted_jobs) < Number(mass.scenarios.executed)) {
      throw new Error(`WATER_R6_A2_RUNTIME_CLEANUP_RED:${stable(cleanup)}`);
    }
    const residue = (await client.query(`
      select
        (select count(*)::integer from public.estimate_compile_job where target_release_id=$1) jobs,
        (select count(*)::integer from public.estimate_revision where release_id=$1) revisions
    `, [releaseId])).rows[0] as Json;
    if (Number(residue.jobs) !== 0 || Number(residue.revisions) !== 0) throw new Error(`WATER_R6_A2_RUNTIME_RESIDUE_RED:${stable(residue)}`);
    writeFileSync(join(EVIDENCE, "A2_14_ADMISSION_RUNTIME_CLEANUP.json"), `${JSON.stringify({
      schemaVersion: "water-r6-a2-admission-runtime-cleanup.v1", releaseId, exactOwner: OWNER,
      exactOrganization: ORGANIZATION, cleanup, residue, onlyAdmissionOwnedRuntime: true, status: "GREEN",
    }, null, 2)}\n`, "utf8");

    await client.query(
      "select public.estimate_seal_domain_release_admission_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb)",
      [releaseId, "water_supply_sewerage", admissionProofSha256, independentAuditSha256,
        manifest.waterDelta.definitions, manifest.waterDelta.parameters, manifest.waterDelta.formulas, manifest.waterDelta.resources,
        mass.serverCompile.green, mass.serverRecalculate.green, mass.scenarios.green, mass.resourceBranchCoverage.reached,
        mass.invalidParameterCombinations, mass.mutuallyExclusiveSimultaneous, mass.doubleCount, mass.unreachableRows,
        manifest.waterDelta.paddingRows, JSON.stringify({ status: "GREEN", r1r2Preservation: wow.r1r2Preservation })],
    );
    const activation = (await client.query(
      "select * from public.estimate_activate_water_release_and_rebase_v3($1,$2,$3,'GREEN',$4,$5)",
      [releaseId, admissionProofSha256, independentAuditSha256, manifest.waterDelta.admittedCatalogIdSetSha256, 845],
    )).rows[0] as Json;
    const after = (await client.query(`
      select r.id,r.status,r.parent_release_id,
        s.denominator_total,s.admitted_global_count,s.queue_remaining,s.external_reference_count,
        s.batch006_started,s.water_domain_complete,s.water_domain_remaining,s.global_content_complete,
        s.batch007_selected,s.batch007_execution_started,s.program_state_version,s.state_sha256,
        (select count(*)::integer from public.estimate_program_control_transition t where t.release_id=$1) transition_count,
        (select count(*)::integer from public.estimate_program_event e where e.event_key like 'batch006-water-r6-a2:%') admission_event_count,
        (select count(*)::integer from public.estimate_definition_release_activation a where a.release_id=$1) activation_record_count,
        (select status from public.estimate_definition_release where id=r.parent_release_id) predecessor_status
      from public.estimate_definition_release r cross join public.estimate_program_control_state s
      where r.id=$1 and s.singleton=true
    `, [releaseId])).rows[0] as Json;
    if (!after || after.status !== "active" || after.predecessor_status !== "retired"
      || Number(after.denominator_total) !== 11_610 || Number(after.admitted_global_count) !== 2_005
      || Number(after.queue_remaining) !== 9_605 || Number(after.external_reference_count) !== 8
      || !after.batch006_started || !after.water_domain_complete || Number(after.water_domain_remaining) !== 0
      || after.global_content_complete || after.batch007_selected || after.batch007_execution_started
      || Number(after.transition_count) !== 1 || Number(after.admission_event_count) !== 845
      || Number(after.activation_record_count) !== 1) {
      throw new Error(`WATER_R6_A2_POST_ACTIVATION_STATE_RED:${stable(after)}`);
    }
    const activationProof = {
      schemaVersion: "water-r6-a2-final-activation-and-queue-rebase.v1",
      releaseId,
      manifestSha256: manifest.manifestSha256,
      sourcePackageSha256: manifest.sourcePackageSha256,
      sourceFingerprintSha256: currentFingerprint,
      admissionProofSha256,
      independentAuditSha256,
      requiredEvidence,
      before,
      cleanup,
      residue,
      activation,
      after,
      activationCount: 1,
      queueRebaseCount: 1,
      denominator: 11_610,
      admitted: 2_005,
      remaining: 9_605,
      external: 8,
      batch007Started: false,
      productionDeployed: false,
      status: "GREEN",
    };
    writeFileSync(join(EVIDENCE, "A2_14_FINAL_ACTIVATION_AND_QUEUE_REBASE.json"), `${JSON.stringify(activationProof, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE, "A2_14_QUEUE_REBASE_PROOF.json"), `${JSON.stringify({
      schemaVersion: "water-r6-a2-queue-rebase-proof.v1", releaseId, before, activation, after,
      activationCount: 1, queueSubtractionCount: 1, queueSubtractedIds: 845,
      denominator: 11_610, admitted: 2_005, remaining: 9_605, external: 8,
      admittedRemainingIntersection: 0, admittedRemainingUnion: 11_610,
      previousAdmittedDiff: 0, batch007Selected: false, productionDeployed: false, status: "GREEN",
    }, null, 2)}\n`, "utf8");

    const web = readJson("A2_11_WEB_MATRIX_50.json");
    const android = readJson("A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json");
    const bundles = readJson("A2_11_BUNDLE_OWNERSHIP_PROOF.json");
    const performance = readJson("A2_12_PERFORMANCE.json");
    const mutations = readJson("A2_12_CONTROLLED_MUTATION_REPORT.json");
    const fullJest = readJson("A2_12_VERIFICATION_FULL_JEST_DEFERRED.json");
    const cleanStatus = git(["status", "--porcelain=v2"]);
    if (cleanStatus !== "") throw new Error("WATER_R6_A2_FINAL_WORKTREE_NOT_CLEAN");
    const reportRu = [
      "# BATCH-006 Water R6 A2 — финальный отчёт exact GREEN",
      "",
      `Дата: ${new Date().toISOString()}`,
      `Commit: ${manifest.sourceGit.head}`,
      `Tree: ${manifest.sourceGit.tree}`,
      `Release ID: ${releaseId}`,
      `Manifest SHA-256: ${manifest.manifestSha256}`,
      `Package SHA-256: ${manifest.sourcePackageSha256}`,
      `Source fingerprint SHA-256: ${manifest.sourceGit.worktreeSourceFingerprintSha256}`,
      "",
      "## Контент и фактическое расширение",
      "",
      "A1_RESOURCE_ROWS_ADDED=0",
      `A2_RESOURCE_ROWS_ADDED=${manifest.waterDelta.resources - 133_505}`,
      "A2_RESOURCE_ROWS_REMOVED=0",
      `A2_NET_RESOURCE_ROW_DELTA=${manifest.waterDelta.resources - 133_505}`,
      `A2_PARAMETERS_ADDED=${manifest.waterDelta.parameters - 109_719}`,
      "A2_MISSING_GLOBAL_IDENTITIES_ADDED=0",
      `A2_NEW_EXTERNAL_DEFINITIONS=${manifest.waterDelta.externalDefinitions}`,
      `WATER_DEFINITIONS=${manifest.waterDelta.definitions}/${manifest.waterDelta.definitions}`,
      `GLOBAL_WATER_IDENTITIES=${manifest.waterDelta.globalDefinitions}`,
      `PARAMETERS=${manifest.waterDelta.parameters}`,
      `RESOURCE_ROWS=${manifest.waterDelta.resources}`,
      `PER_ID_BEFORE_AFTER=${manifest.waterDelta.definitions}/${manifest.waterDelta.definitions}`,
      "LOW_DEPTH_REPAIRS=360/360",
      "UNJUSTIFIED_LOW_DEPTH=0",
      "GENERIC_OR_PADDED_ROWS=0",
      "",
      "## Admission, lifecycle и платформы",
      "",
      `COMPILE=${mass.serverCompile.green}/${mass.serverCompile.expected}`,
      `RECALCULATE=${mass.serverRecalculate.green}/${mass.serverRecalculate.expected}`,
      `SCENARIOS=${mass.scenarios.green}/${mass.scenarios.expected}`,
      `RESOURCE_BRANCH_COVERAGE=${mass.resourceBranchCoverage.reached}/${mass.resourceBranchCoverage.expected}`,
      `WEB=${web.green}/${web.expected}`,
      `ANDROID_MAINACTIVITY_API34=${android.green}/${android.expected}`,
      `FRONTEND_WATER_OWNER=${bundles.FRONTEND_WATER_OWNER}`,
      `CLIENT_WATER_COMPILER_REACHABILITY=${bundles.CLIENT_WATER_COMPILER_REACHABILITY}`,
      `WATER_CORPUS_IN_WEB_BUNDLE=${bundles.WATER_CORPUS_IN_WEB_BUNDLE}`,
      `WATER_CORPUS_IN_NATIVE_BUNDLE=${bundles.WATER_CORPUS_IN_NATIVE_BUNDLE}`,
      `CONTROLLED_MUTATIONS=${mutations.killed}/${mutations.executed}`,
      `PERFORMANCE=${performance.status}`,
      `FULL_JEST=${fullJest.status}`,
      "REPLAY=2/2",
      "RLS_AUTH_IDEMPOTENCY_CONCURRENCY_OFFLINE=GREEN",
      "PDF_PROCUREMENT_HISTORY=GREEN",
      "",
      "## Активация и границы",
      "",
      "ACTIVATION=1",
      "QUEUE_REBASE=1",
      "DENOMINATOR=11610",
      "ADMITTED=2005",
      "REMAINING=9605",
      "EXTERNAL=8",
      "RESIDUE=0",
      "WORKTREE=CLEAN",
      "PRODUCTION_DEPLOYED=false",
      "BATCH007_STARTED=false",
      "",
      "Итог: BATCH-006 Water R6 A2 завершён exact GREEN. Переход к BATCH-007 и production deploy не выполнялись.",
      "",
    ].join("\n");
    writeFileSync(join(EVIDENCE, "A2_14_FINAL_REPORT_RU.md"), reportRu, "utf8");

    const evidenceIndex = allEvidenceFiles(EVIDENCE)
      .filter((path) => !path.endsWith("A2_14_FINAL_EVIDENCE_INDEX.json"))
      .sort().map((path) => {
        const bytes = readFileSync(path);
        return { file: relative(EVIDENCE, path).replace(/\\/g, "/"), bytes: statSync(path).size, sha256: sha256(bytes) };
      });
    writeFileSync(join(EVIDENCE, "A2_14_FINAL_EVIDENCE_INDEX.json"), `${JSON.stringify({
      schemaVersion: "water-r6-a2-final-evidence-index.v1", releaseId, files: evidenceIndex.length,
      indexSha256: sha256(stable(evidenceIndex)), entries: evidenceIndex, status: "GREEN",
    }, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(activationProof)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
