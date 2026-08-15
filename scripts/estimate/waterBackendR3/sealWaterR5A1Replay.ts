import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a1");

function argument(name: string): string {
  const value = process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (!value) throw new Error(`WATER_A1_REPLAY_ARGUMENT_REQUIRED:${name}`);
  return value;
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

function read(name: string): Json {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8")) as Json;
}

function copy(name: string, target: string): Json {
  const bytes = readFileSync(join(EVIDENCE, name));
  writeFileSync(join(target, name), bytes);
  return { file: name, bytes: statSync(join(EVIDENCE, name)).size, sha256: sha256(bytes) };
}

function main(): void {
  const label = argument("label").toUpperCase();
  if (!new Set(["A", "B"]).has(label)) throw new Error("WATER_A1_REPLAY_LABEL_RED");
  const target = join(EVIDENCE, `A16_REPLAY_${label}`);
  mkdirSync(target, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(RUNTIME, "02-backend-release", "manifest.json"), "utf8")) as Json;
  const admission = read("A7_SERVER_ADMISSION.json");
  const oracle = read("A7_POST_IMPORT_ORACLE.json");
  const wow = read("WATER_R5_WOW_PLATFORM_GATES.json");
  const parity = readFileSync(join(EVIDENCE, "WATER_SERVER_SCENARIO_PARITY.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    const row = JSON.parse(line) as Json;
    return { catalogId: row.catalog_id, scenarioId: row.scenario_id, operation: row.operation, expectedRows: row.expected_row_count, serverRows: row.server_row_count, expectedOutputHash: row.expected_output_hash, serverOutputHash: row.server_output_hash, duplicateRows: row.duplicate_rows, status: row.status };
  });
  const wowCases = readFileSync(join(EVIDENCE, "WATER_R5_WOW_15_CASES.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    const row = JSON.parse(line) as Json;
    return { catalogId: row.catalog_id, complexity: row.complexity_class, parentRows: row.parent_rows, childRows: row.child_rows, pdfBytes: row.pdf.bytes, procurementRows: row.procurement.rows, status: row.status };
  });
  if (admission.status !== "GREEN" || oracle.status !== "GREEN" || wow.status !== "GREEN"
    || admission.releaseId !== manifest.releaseId || oracle.releaseId !== manifest.releaseId || wow.releaseId !== manifest.releaseId
    || parity.length !== admission.scenarios.executed || parity.some((row) => row.status !== "GREEN") || wowCases.length !== 15) {
    throw new Error("WATER_A1_REPLAY_INPUT_RED");
  }
  const files = [
    "A7_IMPORT_REPORT.json", "A7_SERVER_ADMISSION.json", "A7_POST_IMPORT_ORACLE.json",
    "WATER_MASS_ADMISSION_PROOF.json", "WATER_SERVER_SCENARIO_PARITY.jsonl",
    "WATER_R5_WOW_PLATFORM_GATES.json", "WATER_R5_WOW_15_CASES.jsonl",
    "WATER_R5_SECURITY_CONCURRENCY_LEASE_OFFLINE_PROOF.json",
  ].map((name) => copy(name, target));
  const summary = {
    schemaVersion: "water-r5-a1-replay-seal.v1",
    generatedAt: new Date().toISOString(),
    label,
    database: oracle.database,
    releaseId: manifest.releaseId,
    sourceHead: manifest.sourceGit.head,
    sourceTree: manifest.sourceGit.tree,
    sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256,
    manifestSha256: manifest.manifestSha256,
    sourcePackageSha256: manifest.sourcePackageSha256,
    packageFiles: manifest.files,
    cardinalities: { parameters: manifest.waterDelta.parameters, formulas: manifest.waterDelta.formulas, resources: manifest.waterDelta.resources, scenarios: admission.scenarios.executed },
    normalizedDatabaseDigests: oracle.normalizedDigests,
    oracleSemanticSha256: oracle.oracle.firstSemanticSha256,
    admissionSemanticSha256: sha256(stable(parity)),
    wowSemanticSha256: sha256(stable(wowCases)),
    predecessor: wow.r1r2Preservation,
    proposedQueue: { denominator: 11_610, admittedBefore: 1_160, remainingBefore: 10_450, water: 845, admittedAfter: 2_005, remainingAfter: 9_605, external: 8, admittedSetSha256: manifest.waterDelta.admittedCatalogIdSetSha256 },
    files,
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  writeFileSync(join(target, "REPLAY_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main();
