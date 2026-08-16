import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { once } from "node:events";
import { createInterface } from "node:readline";

type Json = Record<string, any>;
type FileProof = { file: string; rows: number; bytes: number; sha256: string };

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch007-hvac-r4");
const EVIDENCE = join(RUNTIME, "evidence");
const PREDECESSOR = "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3\\03-r6-a2-release-b";
const EXPECTED_PREDECESSOR = Object.freeze({
  releaseId: "a43dda16-3726-5c88-bf45-22059789035e",
  manifestSha256: "34af4e79bab5767685c48f287dff5bf49556e2f254f09b2304130e0b969035a1",
  sourcePackageSha256: "4a01bd600be8b6eb50a32efa1940ee224981de71acb7579e4b9012d4e5e4020c",
  works: 2042,
  parameters: 319180,
  formulas: 333427,
  resources: 333427,
});
const HVAC = Object.freeze({ definitions: 1012, global: 920, external: 92, parameters: 132173, formulas: 353575, resources: 353575, families: 324, validScenarios: 6553, invalidScenarios: 8163 });
const CORPUS_SHA256 = "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625";
const FIXED_AT = "2026-08-16T08:30:00.000Z";

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function stable(value: any): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

function sha(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function uuidFromHash(hash: string): string {
  const chars = hash.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16]!, 16) % 4]!;
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function sourceFingerprint(): { files: number; sha256: string; entries: Array<{ path: string; bytes: number; sha256: string }> } {
  const paths = git(["ls-files", "--cached", "--others", "--exclude-standard", "--", "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts", "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json"])
    .split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const entries = paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) };
  });
  return { files: entries.length, sha256: sha(stable(entries)), entries };
}

async function appendFile(output: ReturnType<typeof createWriteStream>, digest: ReturnType<typeof createHash>, path: string): Promise<{ rows: number; bytes: number }> {
  let rows = 0;
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    const data = chunk as Buffer;
    digest.update(data);
    bytes += data.length;
    for (const byte of data) if (byte === 10) rows += 1;
    if (!output.write(data)) await once(output, "drain");
  }
  return { rows, bytes };
}

async function concatenate(packageRoot: string, file: string, inputs: string[]): Promise<FileProof> {
  const path = join(packageRoot, file);
  mkdirSync(dirname(path), { recursive: true });
  const output = createWriteStream(path, { flags: "wx" });
  const digest = createHash("sha256");
  let rows = 0;
  let bytes = 0;
  for (const input of inputs) {
    const result = await appendFile(output, digest, input);
    rows += result.rows;
    bytes += result.bytes;
  }
  output.end();
  await once(output, "finish");
  if (statSync(path).size !== bytes) throw new Error(`HVAC_PACKAGE_SIZE_RED:${file}`);
  return { file, rows, bytes, sha256: digest.digest("hex") };
}

async function writeJsonl(packageRoot: string, file: string, rows: Iterable<any> | AsyncIterable<any>): Promise<FileProof> {
  const path = join(packageRoot, file);
  const output = createWriteStream(path, { flags: "wx", encoding: "utf8" });
  const digest = createHash("sha256");
  let count = 0;
  let bytes = 0;
  for await (const row of rows) {
    const line = `${stable(row)}\n`;
    digest.update(line);
    bytes += Buffer.byteLength(line);
    count += 1;
    if (!output.write(line)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  return { file, rows: count, bytes, sha256: digest.digest("hex") };
}

async function readJsonl(path: string): Promise<Json[]> {
  const rows: Json[] = [];
  const input = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of input) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

async function* successorWorks(predecessorPath: string, hvacPath: string): AsyncGenerator<Json> {
  const predecessor = createInterface({ input: createReadStream(predecessorPath, "utf8"), crlfDelay: Infinity });
  for await (const line of predecessor) {
    if (!line.trim()) continue;
    const work = JSON.parse(line) as Json;
    const definitionVersion = Number(work.definitionVersion);
    if (!Number.isInteger(definitionVersion) || definitionVersion < 1) {
      throw new Error(`HVAC_PREDECESSOR_DEFINITION_VERSION_RED:${work.catalogId}:${work.definitionVersion}`);
    }
    yield {
      ...work,
      definitionVersion: definitionVersion + 1,
      sourceMetadata: {
        ...(work.sourceMetadata ?? {}),
        carriedForwardFromRelease: EXPECTED_PREDECESSOR.releaseId,
        carryForwardContract: "SEMANTICALLY_IDENTICAL_CONTENT_NEW_IMMUTABLE_DEFINITION_VERSION",
      },
    };
  }
  const hvac = createInterface({ input: createReadStream(hvacPath, "utf8"), crlfDelay: Infinity });
  for await (const line of hvac) if (line.trim()) yield JSON.parse(line) as Json;
}

function assertContentPreconditions(): { oracleA: Json; oracleB: Json; summary: Json; gap: Json; oracle2x2: Json; mutations: Json; contentGate: Json } {
  const oracleA = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "INDEPENDENT_CONTENT_ORACLE_A_RUN_2.json"), "utf8"));
  const oracleB = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "INDEPENDENT_CONTENT_ORACLE_B_RUN_2.json"), "utf8"));
  const oracle2x2 = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "ORACLE_2X2_EQUALITY.json"), "utf8"));
  const mutations = JSON.parse(readFileSync(join(EVIDENCE, "12-mutations", "A2_CONTROLLED_MUTATION_SUMMARY.json"), "utf8"));
  const contentGate = JSON.parse(readFileSync(join(EVIDENCE, "A2", "A2_16_CONTENT_GREEN_GATE.json"), "utf8"));
  const summary = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "HVAC_CONTENT_SUMMARY.json"), "utf8"));
  const gap = JSON.parse(readFileSync(join(EVIDENCE, "A2", "A2_04_NORMATIVE_GAP_SUMMARY.json"), "utf8"));
  if (oracleA.status !== "GREEN_INDEPENDENT_ORACLE_A_BEFORE_PACKAGE" || oracleB.status !== "GREEN_SECOND_CLEAN_INDEPENDENT_ORACLE_B_BEFORE_PACKAGE"
    || oracleA.identities !== HVAC.definitions || oracleB.identities !== HVAC.definitions
    || oracleA.inputCorpusSetSha256 !== CORPUS_SHA256 || oracleB.corpusSetSha256 !== CORPUS_SHA256
    || oracle2x2.corpusSetSha256 !== CORPUS_SHA256 || oracle2x2.sourceFrozenAcrossRuns !== true
    || oracle2x2.oracleA?.runs !== 2 || oracle2x2.oracleA?.byteEqual !== true || oracle2x2.oracleB?.runs !== 2 || oracle2x2.oracleB?.byteEqual !== true
    || mutations.corpusSetSha256 !== CORPUS_SHA256 || mutations.status !== "GREEN" || mutations.total !== 338 || mutations.killed !== 338 || mutations.survived !== 0 || mutations.invalidMutation !== 0
    || contentGate.corpusSetSha256 !== CORPUS_SHA256 || contentGate.contentGreenA2 !== true || contentGate.packageAllowedByContentGate !== true || contentGate.packageCreated !== false || contentGate.admissionStarted !== false
    || summary.corpusSetSha256 !== CORPUS_SHA256 || gap.N !== 88 || gap.H_TOTAL !== 1012 || gap.unresolved !== 0) {
    throw new Error("HVAC_PACKAGE_CONTENT_ORACLE_PRECONDITION_RED");
  }
  return { oracleA, oracleB, summary, gap, oracle2x2, mutations, contentGate };
}

async function main(): Promise<void> {
  if (git(["status", "--porcelain"])) throw new Error("HVAC_R4_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
  const packageRoot = resolve(argument("package-root", join(RUNTIME, "release-a")));
  if (existsSync(packageRoot)) throw new Error(`HVAC_PACKAGE_TARGET_MUST_NOT_EXIST:${packageRoot}`);
  const predecessorRoot = resolve(argument("predecessor-package", PREDECESSOR));
  const predecessor = JSON.parse(readFileSync(join(predecessorRoot, "manifest.json"), "utf8"));
  for (const [key, expected] of Object.entries(EXPECTED_PREDECESSOR)) {
    const actual = key in predecessor ? predecessor[key] : predecessor.actual?.[key];
    if (actual !== expected) throw new Error(`HVAC_PREDECESSOR_MANIFEST_RED:${key}:${actual}`);
  }
  const { oracleA, oracleB, summary, gap, oracle2x2, mutations, contentGate } = assertContentPreconditions();
  const fingerprint = sourceFingerprint();
  mkdirSync(packageRoot, { recursive: false });

  const corpus = join(EVIDENCE, "05-content", "corpus");
  const files: FileProof[] = [];
  files.push(await writeJsonl(packageRoot, "works.jsonl", successorWorks(
    join(predecessorRoot, "works.jsonl"),
    join(corpus, "HVAC_WORK_DEFINITIONS.jsonl"),
  )));
  files.push(await concatenate(packageRoot, "parameters.jsonl", [join(predecessorRoot, "parameters.jsonl"), join(corpus, "HVAC_PARAMETER_DEFINITIONS.jsonl")]));
  files.push(await concatenate(packageRoot, "formulas.jsonl", [join(predecessorRoot, "formulas.jsonl"), join(corpus, "HVAC_FORMULA_GRAPHS.jsonl")]));
  files.push(await concatenate(packageRoot, "resources.jsonl", [join(predecessorRoot, "resources.jsonl"), join(corpus, "HVAC_RESOURCE_ROWS.jsonl")]));
  files.push(await concatenate(packageRoot, "normative-sources.jsonl", [join(predecessorRoot, "normative-sources.jsonl"), join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl")]));
  files.push(await concatenate(packageRoot, "interfaces.jsonl", [join(EVIDENCE, "02-depth", "HVAC_EXPECTED_INTERFACE_UNIVERSE.jsonl")]));
  files.push(await concatenate(packageRoot, "per-id-proof.jsonl", [join(EVIDENCE, "05-content", "HVAC_PER_ID_CONTENT_PROOF.jsonl")]));
  const officialSnapshots = await readJsonl(join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"));
  files.push(await writeJsonl(packageRoot, "price-sources.jsonl", officialSnapshots.filter((row) => row.sourceId === "kg_price_book22_2015" || row.sourceId === "kg_price_book23_2015").map((row) => ({ sourceId: row.sourceId, documentCode: row.documentCode, titleRu: row.titleRu, officialUrl: row.officialPageUrl, artifactSha256: row.pdfSha256, status: "REFERENCE_RATE_BASE_AND_CURRENT_PRICE_INPUT_REQUIRED" }))));

  const actual = {
    works: EXPECTED_PREDECESSOR.works + HVAC.definitions,
    globalWorks: 2005 + HVAC.global,
    externalReferences: 37 + HVAC.external,
    parameters: EXPECTED_PREDECESSOR.parameters + HVAC.parameters,
    formulas: EXPECTED_PREDECESSOR.formulas + HVAC.formulas,
    resources: EXPECTED_PREDECESSOR.resources + HVAC.resources,
    byDomain: { ...predecessor.actual.byDomain, hvac_heat_supply: { works: HVAC.definitions, resources: HVAC.resources } },
  };
  const expectedRows = new Map<string, number>([["works.jsonl", actual.works], ["parameters.jsonl", actual.parameters], ["formulas.jsonl", actual.formulas], ["resources.jsonl", actual.resources], ["normative-sources.jsonl", 30], ["interfaces.jsonl", HVAC.definitions], ["per-id-proof.jsonl", HVAC.definitions], ["price-sources.jsonl", 2]]);
  for (const file of files) if (file.rows !== expectedRows.get(file.file)) throw new Error(`HVAC_PACKAGE_CARDINALITY_RED:${file.file}:${file.rows}:${expectedRows.get(file.file)}`);

  const globalIds = (await readJsonl(join(corpus, "HVAC_WORK_DEFINITIONS.jsonl"))).filter((row) => row.namespace === "global" && row.denominatorEligible === true).map((row) => row.catalogId).sort();
  if (globalIds.length !== HVAC.global) throw new Error("HVAC_GLOBAL_ID_SET_RED");
  const globalIdSetSha256 = sha(globalIds.join("\n"));
  const contentIdentity = sha(stable({ parent: predecessor.manifestSha256, corpus: CORPUS_SHA256, sourceFingerprint: fingerprint.sha256, files, finalNormativeLedgerSha256: contentGate.finalNormativeLedgerSha256, oracle2x2: { oracleA: oracle2x2.oracleA.resultHashes, oracleB: oracle2x2.oracleB.resultHashes }, mutations: mutations.resultSetSha256 }));
  const releaseId = uuidFromHash(contentIdentity);
  const releaseKey = `batch007-hvac-r4-a2-${contentIdentity.slice(0, 16)}`;
  const sourcePackageSha256 = sha(stable({ schemaVersion: "batch007-hvac-r4-a2-release.v1", releaseId, releaseKey, parentReleaseId: predecessor.releaseId, files, sourceFingerprintSha256: fingerprint.sha256, contentIdentity }));
  const officialSources = officialSnapshots.map((row) => ({
    sourceId: row.sourceId,
    documentCode: row.documentCode,
    titleRu: row.titleRu,
    authority: row.authority,
    officialUrl: row.officialPageUrl,
    artifactSha256: row.pdfSha256,
    effectiveFrom: row.sourceId === "sn_kr_41_04_2022" ? "2022-01-01" : "2015-01-01",
    status: row.routeStatus,
    applicability: row.role,
  }));
  const manifestWithoutHash = {
    schemaVersion: "batch007-hvac-r4-a2-release.v1",
    generatedAt: FIXED_AT,
    releaseId,
    releaseKey,
    definitionSchemaVersion: 5,
    parentRelease: { releaseId: predecessor.releaseId, releaseKey: predecessor.releaseKey, sourceManifestSha256: predecessor.manifestSha256, sourcePackageSha256: predecessor.sourcePackageSha256 },
    actual,
    hvacDelta: { ...HVAC, globalIdSetSha256, corpusSetSha256: CORPUS_SHA256, aliases: 0, paddingRows: 0, inventedEngineeringValues: 0, clientDefinitionOwner: 0 },
    normativeGap: { identities: 129, existingGlobalExact: 19, newExternalNonDemolition: 88, newExternalDemolition: 4, unresolved: 0, H_TOTAL: 1012 },
    programControl: { denominator: 11610, admittedBefore: 2005, remainingBefore: 9605, newlyAdmittedHvac: 920, externalHvacDefinitions: 92, admittedAfter: 2925, remainingAfter: 8685, externalQueueBefore: 8, externalQueueAfter: 8, backendExternalReferencesAfter: 129, queueMutationDuringImport: 0, batch008Started: false },
    sourceGit: { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]), worktreeSourceFingerprintSha256: fingerprint.sha256, worktreeSourceFileCount: fingerprint.files },
    oracle: { oracleARuns: oracle2x2.oracleA.runs, oracleBRuns: oracle2x2.oracleB.runs, oracleAResultSha256: oracleA.oracleResultSha256, oracleBResultSha256: oracleB.resultSha256, oracleAPerIdSha256: oracleA.perIdEvidence.sha256, oracleBPerIdSha256: oracleB.perIdEvidence.sha256, controlledMutationResultSetSha256: mutations.resultSetSha256, status: "GREEN_A_2_OF_2_B_2_OF_2_AND_MUTATIONS_BEFORE_PACKAGE" },
    officialSources,
    files,
    contentIdentity,
    sourcePackageSha256,
    productionDeployed: false,
  };
  const manifest = { ...manifestWithoutHash, manifestSha256: sha(stable(manifestWithoutHash)) };
  writeFileSync(join(packageRoot, "source-fingerprint.json"), `${stable(fingerprint)}\n`, { encoding: "utf8", flag: "wx" });
  writeFileSync(join(packageRoot, "manifest.json"), `${stable(manifest)}\n`, { encoding: "utf8", flag: "wx" });
  const report = { packageRoot: relative(ROOT, packageRoot).replaceAll("\\", "/"), releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256, sourceFingerprintSha256: fingerprint.sha256, actual, hvacDelta: manifest.hvacDelta, files, status: "GREEN_IMMUTABLE_PREPARED_PACKAGE_BYTES" };
  const evidenceName = argument("evidence-name", "PACKAGE_A_BUILD.json");
  writeFileSync(join(EVIDENCE, "07-package", evidenceName), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
