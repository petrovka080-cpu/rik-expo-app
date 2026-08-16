import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { dirname, join, relative, resolve } from "node:path";

type Json = Record<string, any>;
type FileProof = { file: string; rows: number; bytes: number; sha256: string };

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch008-concrete-r5");
const EVIDENCE = join(RUNTIME, "evidence");
const EXPECTED_PREDECESSOR = Object.freeze({
  releaseId: "ed35b18b-8fc6-5c7f-b1c8-aeeb07b6ef33",
  manifestSha256: "7697879885c84adcfb7caf0643fa813fade430bcc808d94ad9c943d803e508d6",
  sourcePackageSha256: "61ee23f4e50f28ce6c91782def9eebbb063e2748501e3d2747e8e27687d8b8ed",
  works: 3_054, globalWorks: 2_925, externalReferences: 129, parameters: 451_353, formulas: 687_002, resources: 687_002,
});
const CONCRETE = Object.freeze({ definitions: 1_218, global: 830, external: 388, demolition: 22, nonDemolition: 366, parameters: 389_314, formulas: 470_016, resources: 470_016, scenarios: 27_213, families: 406, F: 1_707, mutations: 1_767 });
const CORPUS_SHA256 = "52e12ca58ddf4e2817c26b8c837d7f911d6cecd3a8b1ac54a04b359b9973ccc8";
const FIXED_AT = "2026-08-16T18:30:00.000Z";

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

function sha(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function semantic(value: unknown): string { return sha(stable(value)); }

function uuidFromHash(hash: string): string {
  const chars = hash.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16]!, 16) % 4]!;
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function git(args: string[]): string { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim(); }

function sourceFingerprint(): { head: string; tree: string; files: number; sha256: string; entries: Array<{ path: string; bytes: number; sha256: string }> } {
  const paths = git(["ls-files"]).split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const entries = paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) };
  });
  return { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]), files: entries.length, sha256: semantic(entries), entries };
}

async function append(output: ReturnType<typeof createWriteStream>, digest: ReturnType<typeof createHash>, path: string): Promise<{ rows: number; bytes: number }> {
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
    const result = await append(output, digest, input);
    rows += result.rows;
    bytes += result.bytes;
  }
  output.end();
  await once(output, "finish");
  if (statSync(path).size !== bytes) throw new Error(`CONCRETE_PACKAGE_SIZE_RED:${file}`);
  return { file, rows, bytes, sha256: digest.digest("hex") };
}

async function writeJsonl(packageRoot: string, file: string, rows: Iterable<Json> | AsyncIterable<Json>): Promise<FileProof> {
  const path = join(packageRoot, file);
  const output = createWriteStream(path, { flags: "wx", encoding: "utf8" });
  const digest = createHash("sha256");
  let count = 0;
  let bytes = 0;
  for await (const row of rows) {
    const line = `${stable(row)}\n`;
    digest.update(line);
    count += 1;
    bytes += Buffer.byteLength(line);
    if (!output.write(line)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  return { file, rows: count, bytes, sha256: digest.digest("hex") };
}

async function* successorWorks(predecessorPath: string, concretePath: string): AsyncGenerator<Json> {
  const predecessor = createInterface({ input: createReadStream(predecessorPath, "utf8"), crlfDelay: Infinity });
  for await (const line of predecessor) {
    if (!line.trim()) continue;
    const work = JSON.parse(line) as Json;
    const definitionVersion = Number(work.definitionVersion);
    if (!Number.isInteger(definitionVersion) || definitionVersion < 1) throw new Error(`CONCRETE_PREDECESSOR_VERSION_RED:${work.catalogId}`);
    yield { ...work, definitionVersion: definitionVersion + 1, sourceMetadata: { ...(work.sourceMetadata ?? {}), carriedForwardFromRelease: EXPECTED_PREDECESSOR.releaseId, carryForwardContract: "SEMANTICALLY_IDENTICAL_CONTENT_NEW_IMMUTABLE_DEFINITION_VERSION" } };
  }
  const concrete = createInterface({ input: createReadStream(concretePath, "utf8"), crlfDelay: Infinity });
  for await (const line of concrete) if (line.trim()) yield JSON.parse(line) as Json;
}

function preconditions(): { summary: Json; oracleA: Json; oracleB: Json; mutations: Json; discovery: Json } {
  const summary = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "CONTENT_SUMMARY.json"), "utf8"));
  const oracleA = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "CONTENT_ORACLE_A.json"), "utf8"));
  const oracleB = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "CONTENT_ORACLE_B.json"), "utf8"));
  const mutations = JSON.parse(readFileSync(join(EVIDENCE, "12-mutations", "MUTATION_SUMMARY.json"), "utf8"));
  const discovery = JSON.parse(readFileSync(join(EVIDENCE, "01-discovery", "DISCOVERY_SUMMARY.json"), "utf8"));
  if (summary.status !== "CONTENT_GREEN_A1" || summary.corpusSha256 !== CORPUS_SHA256 || summary.H_final !== CONCRETE.definitions || summary.formulaResourceRows !== CONCRETE.resources
    || oracleA.status !== "GREEN_ORACLE_A" || oracleB.status !== "GREEN_ORACLE_B" || oracleA.works !== CONCRETE.definitions || oracleB.works !== CONCRETE.definitions
    || oracleA.resources !== CONCRETE.resources || oracleB.resources !== CONCRETE.resources || mutations.status !== "GREEN_MUTATIONS_1767_OF_1767_KILLED" || mutations.killed !== CONCRETE.mutations
    || discovery.arithmetic.G_final !== CONCRETE.global || discovery.arithmetic.D_final !== CONCRETE.demolition || discovery.arithmetic.N_final !== CONCRETE.nonDemolition || discovery.officialNormativeUniverse !== CONCRETE.F) throw new Error("CONCRETE_PACKAGE_CONTENT_PRECONDITION_RED");
  return { summary, oracleA, oracleB, mutations, discovery };
}

async function main(): Promise<void> {
  if (git(["status", "--porcelain"])) throw new Error("CONCRETE_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
  const packageRoot = resolve(argument("package-root", join(RUNTIME, "release-a")));
  if (existsSync(packageRoot)) throw new Error(`CONCRETE_PACKAGE_TARGET_EXISTS:${packageRoot}`);
  const predecessorRoot = resolve(argument("predecessor-package", join(RUNTIME, "predecessor-batch007")));
  const predecessor = JSON.parse(readFileSync(join(predecessorRoot, "manifest.json"), "utf8")) as Json;
  if (predecessor.releaseId !== EXPECTED_PREDECESSOR.releaseId || predecessor.manifestSha256 !== EXPECTED_PREDECESSOR.manifestSha256 || predecessor.sourcePackageSha256 !== EXPECTED_PREDECESSOR.sourcePackageSha256
    || predecessor.actual.works !== EXPECTED_PREDECESSOR.works || predecessor.actual.parameters !== EXPECTED_PREDECESSOR.parameters || predecessor.actual.formulas !== EXPECTED_PREDECESSOR.formulas || predecessor.actual.resources !== EXPECTED_PREDECESSOR.resources) throw new Error("CONCRETE_PREDECESSOR_PACKAGE_RED");
  const { summary, oracleA, oracleB, mutations, discovery } = preconditions();
  const fingerprint = sourceFingerprint();
  mkdirSync(packageRoot, { recursive: false });
  const corpus = join(EVIDENCE, "05-content", "corpus");
  const files: FileProof[] = [];
  files.push(await writeJsonl(packageRoot, "works.jsonl", successorWorks(join(predecessorRoot, "works.jsonl"), join(corpus, "CONCRETE_WORK_DEFINITIONS.jsonl"))));
  files.push(await concatenate(packageRoot, "parameters.jsonl", [join(predecessorRoot, "parameters.jsonl"), join(corpus, "CONCRETE_PARAMETER_DEFINITIONS.jsonl")]));
  files.push(await concatenate(packageRoot, "formulas.jsonl", [join(predecessorRoot, "formulas.jsonl"), join(corpus, "CONCRETE_FORMULA_GRAPHS.jsonl")]));
  files.push(await concatenate(packageRoot, "resources.jsonl", [join(predecessorRoot, "resources.jsonl"), join(corpus, "CONCRETE_RESOURCE_ROWS.jsonl")]));
  files.push(await concatenate(packageRoot, "normative-sources.jsonl", [join(predecessorRoot, "normative-sources.jsonl"), join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl")]));
  files.push(await concatenate(packageRoot, "interfaces.jsonl", [join(EVIDENCE, "02-depth", "EXPECTED_INTERFACE_UNIVERSE.jsonl")]));
  files.push(await concatenate(packageRoot, "per-id-proof.jsonl", [join(EVIDENCE, "02-depth", "CONCRETE_COMPLEXITY_CLASSIFICATION.jsonl")]));
  files.push(await concatenate(packageRoot, "scenarios.jsonl", [join(corpus, "CONCRETE_SCENARIOS.jsonl")]));
  const snapshots = readFileSync(join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  files.push(await writeJsonl(packageRoot, "price-sources.jsonl", snapshots.filter((row) => row.sourceId === "price_book_05_2015").map((row) => ({ sourceId: row.sourceId, documentCode: row.documentCode, titleRu: row.titleRu, officialUrl: row.officialPageUrl, artifactSha256: row.pdfSha256, status: "OFFICIAL_BASE_PRICE_REFERENCE_CURRENT_INDEX_AND_PRICE_DATE_INPUT_REQUIRED" }))));
  const actual = {
    works: EXPECTED_PREDECESSOR.works + CONCRETE.definitions,
    globalWorks: EXPECTED_PREDECESSOR.globalWorks + CONCRETE.global,
    externalReferences: EXPECTED_PREDECESSOR.externalReferences + CONCRETE.external,
    parameters: EXPECTED_PREDECESSOR.parameters + CONCRETE.parameters,
    formulas: EXPECTED_PREDECESSOR.formulas + CONCRETE.formulas,
    resources: EXPECTED_PREDECESSOR.resources + CONCRETE.resources,
    byDomain: { ...predecessor.actual.byDomain, concrete: { works: CONCRETE.definitions, resources: CONCRETE.resources } },
  };
  const expectedRows = new Map<string, number>([["works.jsonl", actual.works], ["parameters.jsonl", actual.parameters], ["formulas.jsonl", actual.formulas], ["resources.jsonl", actual.resources], ["normative-sources.jsonl", 49], ["interfaces.jsonl", CONCRETE.definitions], ["per-id-proof.jsonl", CONCRETE.definitions], ["scenarios.jsonl", CONCRETE.scenarios], ["price-sources.jsonl", 1]]);
  for (const file of files) if (file.rows !== expectedRows.get(file.file)) throw new Error(`CONCRETE_PACKAGE_CARDINALITY_RED:${file.file}:${file.rows}:${expectedRows.get(file.file)}`);
  const identities = readFileSync(join(EVIDENCE, "01-discovery", "CONCRETE_IDENTITY_SET.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const globalIds = identities.filter((row) => row.namespace === "global" && row.denominator_eligible).map((row) => row.catalog_id).sort();
  const globalIdSetSha256 = sha(globalIds.join("\n"));
  const contentIdentity = semantic({ parent: predecessor.manifestSha256, corpus: CORPUS_SHA256, sourceFingerprint: fingerprint.sha256, files, discovery: discovery.discoverySha256, oracleA: oracleA.oracleDigest, oracleB: oracleB.oracleDigest, mutations: mutations.mutationSetSha256 });
  const releaseId = uuidFromHash(contentIdentity);
  const releaseKey = `batch008-concrete-r5-${contentIdentity.slice(0, 16)}`;
  const sourcePackageSha256 = semantic({ schemaVersion: "batch008-concrete-r5-release.v1", releaseId, releaseKey, parentReleaseId: predecessor.releaseId, files, sourceFingerprintSha256: fingerprint.sha256, contentIdentity });
  const officialSources = snapshots.map((row) => ({ sourceId: row.sourceId, documentCode: row.documentCode, titleRu: row.titleRu, authority: "Министерство строительства Кыргызской Республики", officialUrl: row.officialPageUrl, artifactSha256: row.pdfSha256, effectiveFrom: row.sourceId.includes("2025") ? "2025-01-01" : row.sourceId.includes("2024") ? "2024-01-01" : "2015-01-01", status: row.status, applicability: row.role }));
  const withoutHash = {
    schemaVersion: "batch008-concrete-r5-release.v1",
    generatedAt: FIXED_AT,
    releaseId,
    releaseKey,
    definitionSchemaVersion: 5,
    parentRelease: { releaseId: predecessor.releaseId, releaseKey: predecessor.releaseKey, sourceManifestSha256: predecessor.manifestSha256, sourcePackageSha256: predecessor.sourcePackageSha256 },
    actual,
    concreteDelta: { ...CONCRETE, globalIdSetSha256, corpusSha256: CORPUS_SHA256, aliases: 0, paddingRows: 0, inventedEngineeringValues: 0, inventedPrices: 0, clientDefinitionOwner: 0 },
    normativeDiscovery: { F_final: CONCRETE.F, floorObligations: discovery.familyFloorObligations, newExternalDemolition: CONCRETE.demolition, newExternalNonDemolition: CONCRETE.nonDemolition, unresolved: 0 },
    programControl: { denominator: 11_610, admittedBefore: 2_925, remainingBefore: 8_685, newlyAdmittedConcrete: 830, externalConcreteDefinitions: 388, admittedAfter: 3_755, remainingAfter: 7_855, legacyExternalQueueBefore: 8, legacyExternalQueueAfter: 8, backendExternalReferencesAfter: 517, queueMutationDuringImport: 0, batch009Started: false },
    sourceGit: { head: fingerprint.head, tree: fingerprint.tree, worktreeSourceFingerprintSha256: fingerprint.sha256, worktreeSourceFileCount: fingerprint.files },
    oracle: { oracleAResultSha256: oracleA.oracleDigest, oracleBResultSha256: oracleB.oracleDigest, controlledMutationResultSetSha256: mutations.mutationSetSha256, status: "GREEN_A_B_AND_MUTATIONS_BEFORE_PACKAGE" },
    officialSources,
    files,
    contentIdentity,
    sourcePackageSha256,
    productionDeployed: false,
    fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
  };
  const manifest = { ...withoutHash, manifestSha256: semantic(withoutHash) };
  writeFileSync(join(packageRoot, "source-fingerprint.json"), `${stable(fingerprint)}\n`, { encoding: "utf8", flag: "wx" });
  writeFileSync(join(packageRoot, "manifest.json"), `${stable(manifest)}\n`, { encoding: "utf8", flag: "wx" });
  const report = { packageRoot: relative(ROOT, packageRoot).replaceAll("\\", "/"), releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256, sourceFingerprintSha256: fingerprint.sha256, actual, concreteDelta: manifest.concreteDelta, files, status: "GREEN_IMMUTABLE_PREPARED_PACKAGE_BYTES" };
  writeFileSync(join(EVIDENCE, "07-package", argument("evidence-name", "PACKAGE_A_BUILD.json")), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
