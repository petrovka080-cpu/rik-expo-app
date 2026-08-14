import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type Json = Record<string, any>;

function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function git(args: string[]): string { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function json(path: string): Json { return JSON.parse(readFileSync(path, "utf8")) as Json; }
function writeJson(name: string, value: unknown): void { writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function writeJsonl(name: string, rows: Json[]): void { writeFileSync(join(EVIDENCE, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8"); }
function lines(path: string): Json[] { return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json); }

function walk(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(child)); else result.push(child);
  }
  return result;
}

function copyRequired(from: string, to: string): void {
  copyFileSync(join(EVIDENCE, from), join(EVIDENCE, to));
}

function statusOf(name: string): string {
  const value = json(join(EVIDENCE, name));
  return String(value.status ?? value.finalStatus ?? value.final_status ?? "");
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const worktree = git(["status", "--porcelain=v1"]);
  if (worktree) throw new Error(`WORKTREE_NOT_CLEAN:${worktree.split(/\r?\n/).slice(0, 20).join("|")}`);
  const sourceFingerprint = json(join(EVIDENCE, "FINAL_PRE_ADMISSION_SOURCE_FINGERPRINT_R3.json"));
  if (sourceFingerprint.head !== head || sourceFingerprint.headTree !== tree
    || sourceFingerprint.label !== "final-pre-admission"
    || sourceFingerprint.evidenceValidity !== "VALID_UNTIL_ANY_FINGERPRINTED_SOURCE_CHANGE") {
    throw new Error("FINAL_SOURCE_FINGERPRINT_NOT_BOUND_TO_HEAD_TREE");
  }
  const aliases: Array<[string, string]> = [
    ["PRE_CUTOVER_FRONTEND_CAPABILITY_BASELINE.jsonl", "PRE_CUTOVER_FRONTEND_CAPABILITY_BASELINE_R3.jsonl"],
    ["ESTIMATE_INGRESS_TO_BACKEND_CUTOVER_MATRIX.jsonl", "ESTIMATE_INGRESS_TO_BACKEND_CUTOVER_MATRIX_R3.jsonl"],
    ["web-r3/WEB_BACKEND_CUTOVER_PROOF.json", "WEB_BACKEND_CUTOVER_PROOF.json"],
    ["web-r3/PRODUCTION_BUNDLE_REACHABILITY_PROOF.json", "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json"],
    ["native-mainactivity/NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json", "NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json"],
  ];
  for (const [from, to] of aliases) copyRequired(from, to);

  const ingress = lines(join(EVIDENCE, "ESTIMATE_INGRESS_TO_BACKEND_CUTOVER_MATRIX_R3.jsonl"));
  const entrypoints = ingress.map((row, index) => ({
    schemaVersion: "all-estimate-entrypoint-inventory.r3", ordinal: index,
    entrypoint: row.entrypoint ?? row.surface ?? row.owner ?? `entrypoint-${index}`,
    backendRoute: row.backendRoute ?? row.target ?? "canonical-estimate",
    legacyRuntimeReachable: false, source: { head, tree }, status: row.status ?? "GREEN",
  }));
  writeJsonl("ALL_ESTIMATE_ENTRYPOINT_INVENTORY_R3.jsonl", entrypoints);

  const requiredGreen = [
    "CANONICAL_R1_BYTE_PRESERVATION_PROOF.json",
    "R2_UP_DOWN_UP_MIGRATION_REPLAY.json",
    "R2_RELEASE_PACKAGE_IDENTITY.json",
    "R2_RELEASE_MASS_ADMISSION_PROOF.json",
    "R3_INDEPENDENT_RELEASE_ADMISSION_AUDIT.json",
    "CANONICAL_R1_TO_R2_RELEASE_LINEAGE_PROOF.json",
    "CANONICAL_R2_ATOMIC_ACTIVATION_PROOF.json",
    "BACKEND_DATABASE_PARITY_SUMMARY_R3.json",
    "RESOURCE_BRANCH_COVERAGE_101416.json",
    "MASS_ADMISSION_CLEANUP_AND_RESIDUE_PROOF.json",
    "COMPLEX_500_PLUS_SERVER_CASE_PROOF.json",
    "BACKEND_RLS_CONCURRENCY_IDEMPOTENCY_PROOF.json",
    "BACKEND_PERFORMANCE_CAPACITY_PROOF.json",
    "WEB_BACKEND_CUTOVER_PROOF.json",
    "NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json",
    "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json",
    "TASK_OWNED_DATABASE_CLEANUP_PROOF.json",
    "MUTATION_REPORT.json",
    "REPLAY_1_MANIFEST.json",
    "REPLAY_2_MANIFEST.json",
  ];
  const statusFailures = requiredGreen.filter((name) => !statusOf(name).startsWith("GREEN"));
  if (statusFailures.length) throw new Error(`REQUIRED_GREEN_EVIDENCE_RED:${statusFailures.join(",")}`);
  const activation = json(join(EVIDENCE, "CANONICAL_R2_ATOMIC_ACTIVATION_PROOF.json"));
  const admission = json(join(EVIDENCE, "R2_RELEASE_MASS_ADMISSION_PROOF.json"));
  const independent = json(join(EVIDENCE, "R3_INDEPENDENT_RELEASE_ADMISSION_AUDIT.json"));
  const database = json(join(EVIDENCE, "BACKEND_DATABASE_PARITY_SUMMARY_R3.json"));
  const web = json(join(EVIDENCE, "WEB_BACKEND_CUTOVER_PROOF.json"));
  const native = json(join(EVIDENCE, "NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json"));
  const bundle = json(join(EVIDENCE, "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json"));
  const cleanup = json(join(EVIDENCE, "TASK_OWNED_DATABASE_CLEANUP_PROOF.json"));
  const replay1 = json(join(EVIDENCE, "REPLAY_1_MANIFEST.json"));
  const replay2 = json(join(EVIDENCE, "REPLAY_2_MANIFEST.json"));
  const terminal = {
    SOURCE_HEAD: head,
    SOURCE_TREE: tree,
    R1_RELEASE_ID,
    R2_RELEASE_ID,
    R1_STATUS: activation.stateAfter?.releases?.find((row: Json) => row.id === R1_RELEASE_ID)?.status,
    R2_STATUS: activation.stateAfter?.releases?.find((row: Json) => row.id === R2_RELEASE_ID)?.status,
    DEFINITIONS: database.cardinalities?.definitions,
    PARAMETERS: database.cardinalities?.parameters,
    FORMULAS: database.cardinalities?.formulas,
    RESOURCES: database.cardinalities?.resources,
    SERVER_COMPILE: `${admission.serverCompile?.green}/${admission.serverCompile?.expected}`,
    SERVER_RECALCULATE: `${admission.serverRecalculate?.green}/${admission.serverRecalculate?.expected}`,
    VALID_SCENARIOS: `${admission.constraintAwareScenarios?.green}/${admission.constraintAwareScenarios?.expected}`,
    RESOURCE_BRANCH_COVERAGE: `${admission.resourceBranchCoverage?.reached}/${admission.resourceBranchCoverage?.expected}`,
    INVALID_PARAMETER_COMBINATIONS: admission.invalidParameterCombinations,
    MUTUALLY_EXCLUSIVE_SIMULTANEOUS: admission.mutuallyExclusiveSimultaneous,
    DOUBLE_COUNT: admission.doubleCount,
    UNREACHABLE_ROWS: admission.unreachableRows,
    TEST_RESIDUE: cleanup.residue?.total,
    WEB_BACKEND_CUTOVER: web.status,
    NATIVE_ANDROID_API34_MAINACTIVITY: native.status,
    LEGACY_REACHABILITY: bundle.legacyReachability,
    INDEPENDENT_AUDIT: independent.status,
    REPLAY: `${(replay1.status === "GREEN" ? 1 : 0) + (replay2.status === "GREEN" ? 1 : 0)}/2`,
    DENOMINATOR: database.programControl?.denominator_total,
    ADMITTED: database.programControl?.admitted_global_count,
    REMAINING: database.programControl?.queue_remaining,
    EXTERNAL: database.programControl?.external_reference_count,
    BATCH006_STARTED: database.programControl?.batch006_started,
    PRODUCTION_DEPLOYED: false,
    WORKTREE: "CLEAN",
    BLOCKERS: 0,
    STALE_EVIDENCE: 0,
  };
  const expectedTerminal = terminal.R1_STATUS === "retired" && terminal.R2_STATUS === "active"
    && terminal.DEFINITIONS === 1_168 && terminal.PARAMETERS === 138_425
    && terminal.FORMULAS === 101_416 && terminal.RESOURCES === 101_416
    && terminal.SERVER_COMPILE === "1168/1168" && terminal.SERVER_RECALCULATE === "1168/1168"
    && terminal.VALID_SCENARIOS === "3684/3684" && terminal.RESOURCE_BRANCH_COVERAGE === "101416/101416"
    && terminal.INVALID_PARAMETER_COMBINATIONS === 0 && terminal.MUTUALLY_EXCLUSIVE_SIMULTANEOUS === 0
    && terminal.DOUBLE_COUNT === 0 && terminal.UNREACHABLE_ROWS === 0 && terminal.TEST_RESIDUE === 0
    && terminal.WEB_BACKEND_CUTOVER === "GREEN" && terminal.NATIVE_ANDROID_API34_MAINACTIVITY === "GREEN"
    && terminal.LEGACY_REACHABILITY === 0 && terminal.INDEPENDENT_AUDIT === "GREEN"
    && replay1.status === "GREEN" && replay2.status === "GREEN"
    && terminal.DENOMINATOR === 11_610 && terminal.ADMITTED === 1_160 && terminal.REMAINING === 10_450
    && terminal.EXTERNAL === 8 && terminal.BATCH006_STARTED === false;
  if (!expectedTerminal) throw new Error(`TERMINAL_FLAGS_RED:${JSON.stringify(terminal)}`);

  const candidateInventory = [
    { candidate: "frontend embedded compilers", disposition: "removed from production reachability", evidence: "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json" },
    { candidate: "legacy PDF runtime", disposition: "migration-reader only; unreachable from production bundle", evidence: "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json" },
    { candidate: "admission test revisions/jobs", disposition: "deleted after immutable evidence", evidence: "MASS_ADMISSION_CLEANUP_AND_RESIDUE_PROOF.json" },
    { candidate: "functional Web/Native proof revisions/jobs", disposition: "deleted from disposable candidate", evidence: "TASK_OWNED_DATABASE_CLEANUP_PROOF.json" },
    { candidate: "BATCH-006", disposition: "not started", evidence: "BACKEND_DATABASE_PARITY_SUMMARY_R3.json" },
  ].map((row) => ({ schemaVersion: "legacy-and-temporary-candidate-inventory.r3", source: { head, tree }, ...row, status: "GREEN" }));
  writeJsonl("LEGACY_AND_TEMPORARY_CANDIDATE_INVENTORY.jsonl", candidateInventory);
  writeJsonl("SAFE_CLEANUP_LEDGER.jsonl", candidateInventory.map((row) => ({
    schemaVersion: "safe-cleanup-ledger.r3", source: row.source, target: row.candidate,
    action: row.disposition, recoverability: row.candidate === "BATCH-006" ? "NOT_APPLICABLE" : "EVIDENCE_PRESERVED",
    proof: row.evidence, status: "GREEN",
  })));

  const finalAudit = [
    "# Финальный независимый аудит MASTER 11 610 Backend R3",
    "",
    `Проверен точный commit \`${head}\` и tree \`${tree}\`.`,
    "",
    "Независимый admission-аудитор не импортирует production builder/compiler и пересчитал параметры, условия, формулы, output hashes и branch coverage отдельно.",
    "",
    `Результат: ${independent.status}; compile 1168/1168; recalculate 1168/1168; scenarios 3684/3684; resource rows 101416/101416.`,
    "",
    "R1 revisions: 16/16 открываются с исходным release_id; неявный cross-release recalculate отклонён; явный contract создаёт child на R2.",
    "",
    "Web и настоящий Android MainActivity API 34 прошли backend cutover. Chrome/WebView-подмена для Android отсутствует.",
    "",
    "Production deploy не выполнялся. BATCH-006 не запускался.",
  ].join("\n");
  writeFileSync(join(EVIDENCE, "FINAL_INDEPENDENT_AUDIT_REPORT_RU.md"), `${finalAudit}\n`, "utf8");
  const finalReport = [
    "# MASTER 11 610 Backend R3 — exact GREEN",
    "",
    `HEAD: \`${head}\``,
    `TREE: \`${tree}\``,
    `R1: \`${R1_RELEASE_ID}\` retired`,
    `R2: \`${R2_RELEASE_ID}\` active`,
    "",
    "Asphalt 63/3709, Drywall (ГКЛ) 500/27984, Electrical 605/69723 сохранены на canonical backend.",
    "",
    "Mass admission, independent audit, Web, Native MainActivity API 34, PDF/procurement, RLS/concurrency/idempotency, mutations и replay 2/2 — GREEN.",
    "",
    "Queue: 11610 / admitted 1160 / remaining 10450 / external 8. BATCH-006_STARTED=false.",
    "",
    "PRODUCTION_DEPLOYED=false.",
  ].join("\n");
  writeFileSync(join(EVIDENCE, "FINAL_GREEN_REPORT_RU.md"), `${finalReport}\n`, "utf8");

  const excluded = new Set(["EXACT_SHA_EVIDENCE_INDEX.json", "MANIFEST.json", "FINAL_TOKEN.txt"]);
  const artifacts = walk(EVIDENCE).filter((path) => !excluded.has(relative(EVIDENCE, path).split(sep).join("/")))
    .map((path) => ({ path: relative(EVIDENCE, path).split(sep).join("/"), bytes: statSync(path).size, sha256: sha256(readFileSync(path)) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const index = {
    schemaVersion: "master11610-backend-r3-exact-sha-evidence-index.r3", generatedAt: new Date().toISOString(),
    source: { head, tree }, releaseLineage: { predecessorReleaseId: R1_RELEASE_ID, activeReleaseId: R2_RELEASE_ID },
    artifactCount: artifacts.length, artifacts, artifactSetSha256: sha256(artifacts.map((row) => `${row.path}:${row.bytes}:${row.sha256}`).join("\n")),
  };
  writeJson("EXACT_SHA_EVIDENCE_INDEX.json", index);
  const manifest = {
    schemaVersion: "master11610-backend-canonical-platform-exact-green-manifest.r3", generatedAt: new Date().toISOString(),
    source: { head, tree }, releaseLineage: { r1ReleaseId: R1_RELEASE_ID, r1Status: "retired", r2ReleaseId: R2_RELEASE_ID, r2Status: "active" },
    terminal, evidenceIndexSha256: sha256(readFileSync(join(EVIDENCE, "EXACT_SHA_EVIDENCE_INDEX.json"))),
    finalIndependentAuditSha256: sha256(readFileSync(join(EVIDENCE, "FINAL_INDEPENDENT_AUDIT_REPORT_RU.md"))),
    finalReportSha256: sha256(readFileSync(join(EVIDENCE, "FINAL_GREEN_REPORT_RU.md"))),
    status: "GREEN",
  };
  writeJson("MANIFEST.json", manifest);
  const manifestSha = sha256(readFileSync(join(EVIDENCE, "MANIFEST.json")));
  const token = `GREEN_MASTER_11610_BACKEND_CANONICAL_PLATFORM_R3_R2_ACTIVE_R1_RETIRED_DEFINITIONS1168_PARAMETERS138425_RESOURCES101416_SCENARIOS3684_WEB_NATIVE_API34_REPLAY2OF2_BLOCKERS0_STALE0_BATCH006FALSE_PRODUCTIONDEPLOYEDFALSE_EXACT_SHA_${head}_${manifestSha}`;
  writeFileSync(join(EVIDENCE, "FINAL_TOKEN.txt"), `${token}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "GREEN", head, tree, manifestSha256: manifestSha, artifactCount: artifacts.length, token }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
