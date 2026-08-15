import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a1");
const MANIFEST_PATH = join(RUNTIME, "02-backend-release", "manifest.json");
const OWNER = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION = "22222222-2222-4222-8222-222222222222";
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
if (!EXPECTED_DATABASE || EXPECTED_DATABASE !== "batch006_water_r5_a1_a"
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
  if (!existsSync(path)) throw new Error(`WATER_R5_REQUIRED_EVIDENCE_MISSING:${relativePath}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function exactGreenEvidence(releaseId: string): Array<{ file: string; sha256: string; bytes: number }> {
  const required = [
    "A1_56_DISPOSITION_AND_REPAIR.jsonl",
    "A1_ORACLE_REPAIR_DIFF.jsonl",
    "A1_ORACLE_NEGATIVE_FIXTURES.jsonl",
    "A2_ANTI_TEMPLATE_REPORT.json",
    "A3_FIRST_INDEPENDENT_AUDIT.json",
    "A3_SECOND_CLEAN_AUDIT.json",
    "A3_ORACLE_PAIR_COMPARISON.json",
    "A5_FORMULA_DIMENSION_OWNER_REPORT.json",
    "A6_CONTENT_GREEN_TOKEN.json",
    "A6_PACKAGE_DETERMINISM.json",
    "A7_MIGRATION_REPLAY.json",
    "A7_IMPORT_REPORT.json",
    "A7_SERVER_ADMISSION.json",
    "A7_POST_IMPORT_ORACLE.json",
    "A8_WOW_CASES/INDEX.json",
    "A9_LEGACY_HISTORY_REPORT.json",
    "A10_PDF_VISUAL_QA/INDEX.json",
    "A10_PROCUREMENT_RECONCILIATION.json",
    "A11_SECURITY_RLS.json",
    "A11_CONCURRENCY_DURABILITY_OFFLINE.json",
    "A12_WEB_E2E/WEB_BACKEND_CUTOVER_PROOF.json",
    "A12_WEB_E2E/PRODUCTION_BUNDLE_REACHABILITY_PROOF.json",
    "A12_ANDROID_API34_E2E/NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json",
    "A12_ANDROID_API34_E2E/NATIVE_PRODUCTION_BUNDLE_REACHABILITY_PROOF.json",
    "A13_PERFORMANCE.json",
    "A14_TEST_INVENTORY.json",
    "A14_FULL_JEST.json",
    "A14_MUTATIONS_FINAL.json",
    "A14_NO_TEST_WEAKENING.json",
    "A15_PREVIOUS_DOMAIN_REGRESSION.json",
    "A16_REPLAY_A/REPLAY_SUMMARY.json",
    "A16_REPLAY_B/REPLAY_SUMMARY.json",
    "A16_REPLAY_COMPARISON.json",
    "WATER_R5_CARDINALITY_PRE_FREEZE.json",
    "WATER_R5_ANTI_TEMPLATE_AUDIT.json",
    "WATER_R5_CONTROLLED_MUTATION_REPORT.json",
    "WATER_R5_EXPLICIT_MIGRATION_REHEARSAL.json",
    "WATER_RESOURCE_BRANCH_COVERAGE.json",
    "WATER_MASS_ADMISSION_PROOF.json",
    "WATER_INDEPENDENT_AUDIT_REPORT.json",
    "WATER_R5_WOW_PLATFORM_GATES.json",
    "WATER_R5_SECURITY_CONCURRENCY_LEASE_OFFLINE_PROOF.json",
    "WATER_R5_VERIFICATION_TYPECHECK.json",
    "WATER_R5_VERIFICATION_FOCUSED.json",
    "WATER_R5_VERIFICATION_SECURITY.json",
    "WATER_R5_VERIFICATION_FULL_JEST_1.json",
    "WATER_R5_VERIFICATION_FULL_JEST_2.json",
  ];
  return required.map((file) => {
    const bytes = readFileSync(join(EVIDENCE, file));
    const isJsonl = file.endsWith(".jsonl");
    const value = isJsonl ? null : JSON.parse(bytes.toString("utf8")) as Json;
    if (!isJsonl && value!.status !== "GREEN") throw new Error(`WATER_R5_REQUIRED_EVIDENCE_RED:${file}:${value!.status}`);
    if (!isJsonl && value!.releaseId != null && value!.releaseId !== releaseId) throw new Error(`WATER_R5_REQUIRED_EVIDENCE_RELEASE_STALE:${file}`);
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
  if (manifest.schemaVersion !== "batch006-water-backend-release.r5"
    || manifest.definitionSchemaVersion !== 5
    || manifest.sourceGit.worktreeSourceFingerprintSha256 !== currentFingerprint) {
    throw new Error("WATER_R5_FINAL_SOURCE_OR_MANIFEST_DRIFT");
  }
  const requiredEvidence = exactGreenEvidence(releaseId);
  const massBytes = readFileSync(join(EVIDENCE, "WATER_MASS_ADMISSION_PROOF.json"));
  const auditBytes = readFileSync(join(EVIDENCE, "WATER_INDEPENDENT_AUDIT_REPORT.json"));
  const mass = JSON.parse(massBytes.toString("utf8")) as Json;
  const audit = JSON.parse(auditBytes.toString("utf8")) as Json;
  const wow = readJson("WATER_R5_WOW_PLATFORM_GATES.json");
  const pair = readJson("A3_ORACLE_PAIR_COMPARISON.json");
  const postImport = readJson("A7_POST_IMPORT_ORACLE.json");
  const replay = readJson("A16_REPLAY_COMPARISON.json");
  if (mass.releaseId !== releaseId || mass.status !== "GREEN" || audit.status !== "GREEN"
    || mass.serverCompile.green !== 845 || mass.serverRecalculate.green !== 845
    || mass.resourceBranchCoverage.reached !== manifest.waterDelta.resources
    || mass.unreachableRows !== 0 || mass.doubleCount !== 0 || mass.duplicateRevisions !== 0
    || mass.duplicateRevisionRows !== 0 || wow.r1r2Preservation.unchanged !== true
    || wow.idempotency.conflictingPayloadStatus !== 409
    || pair.semanticHashEqual !== true || pair.status !== "GREEN"
    || postImport.releaseId !== releaseId || postImport.status !== "GREEN"
    || replay.replay !== "2/2" || replay.status !== "GREEN"
    || replay.replayPredecessorDiff !== 0 || replay.replayProposedQueueDiff !== 0) {
    throw new Error("WATER_R5_FINAL_ADMISSION_NOT_EXACT_GREEN");
  }

  const admissionProofSha256 = sha256(massBytes);
  const independentAuditSha256 = sha256(auditBytes);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r5-final-seal-activation" });
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
      || Number(before.transition_count) !== 0) throw new Error(`WATER_R5_PRE_ACTIVATION_STATE_RED:${stable(before)}`);

    const cleanup = (await client.query(
      "select * from public.estimate_cleanup_release_admission_runtime_v3($1,$2,$3)",
      [releaseId, OWNER, ORGANIZATION],
    )).rows[0] as Json;
    if (Number(cleanup.residue) !== 0 || Number(cleanup.deleted_jobs) < Number(mass.scenarios.executed)) {
      throw new Error(`WATER_R5_RUNTIME_CLEANUP_RED:${stable(cleanup)}`);
    }
    const residue = (await client.query(`
      select
        (select count(*)::integer from public.estimate_compile_job where target_release_id=$1) jobs,
        (select count(*)::integer from public.estimate_revision where release_id=$1) revisions
    `, [releaseId])).rows[0] as Json;
    if (Number(residue.jobs) !== 0 || Number(residue.revisions) !== 0) throw new Error(`WATER_R5_RUNTIME_RESIDUE_RED:${stable(residue)}`);
    writeFileSync(join(EVIDENCE, "WATER_R5_ADMISSION_RUNTIME_CLEANUP.json"), `${JSON.stringify({
      schemaVersion: "water-r5-admission-runtime-cleanup.v1", releaseId, exactOwner: OWNER,
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
        (select count(*)::integer from public.estimate_program_event e where e.event_key like 'batch006-water-r5:%') admission_event_count,
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
      throw new Error(`WATER_R5_POST_ACTIVATION_STATE_RED:${stable(after)}`);
    }
    const activationProof = {
      schemaVersion: "water-r5-final-activation-and-queue-rebase.v1",
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
    writeFileSync(join(EVIDENCE, "WATER_R5_FINAL_ACTIVATION_AND_QUEUE_REBASE.json"), `${JSON.stringify(activationProof, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE, "A17_ACTIVATION_LEDGER_PROOF.json"), `${JSON.stringify(activationProof, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE, "A17_QUEUE_REBASE_PROOF.json"), `${JSON.stringify({
      schemaVersion: "water-r5-a1-queue-rebase-proof.v1", releaseId, before, activation, after,
      activationCount: 1, queueSubtractionCount: 1, queueSubtractedIds: 845,
      denominator: 11_610, admitted: 2_005, remaining: 9_605, external: 8,
      admittedRemainingIntersection: 0, admittedRemainingUnion: 11_610,
      previousAdmittedDiff: 0, batch007Selected: false, productionDeployed: false, status: "GREEN",
    }, null, 2)}\n`, "utf8");

    const evidenceIndex = allEvidenceFiles(EVIDENCE)
      .filter((path) => !path.endsWith("WATER_R5_FINAL_EVIDENCE_INDEX.json"))
      .sort().map((path) => {
        const bytes = readFileSync(path);
        return { file: relative(EVIDENCE, path).replace(/\\/g, "/"), bytes: statSync(path).size, sha256: sha256(bytes) };
      });
    writeFileSync(join(EVIDENCE, "WATER_R5_FINAL_EVIDENCE_INDEX.json"), `${JSON.stringify({
      schemaVersion: "water-r5-final-evidence-index.v1", releaseId, files: evidenceIndex.length,
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
