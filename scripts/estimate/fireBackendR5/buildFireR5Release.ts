import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { dirname, join, relative, resolve } from "node:path";

type Json = Record<string, any>;
type FileProof = { file: string; rows: number; bytes: number; sha256: string };

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch009-fire-r5");
const EVIDENCE = join(RUNTIME, "evidence");
const EXPECTED_PREDECESSOR = Object.freeze({
  releaseId: "da29dc2b-1384-5487-b8da-6ee93f4e514e",
  manifestSha256: "c516100ce17cfe1db61e2fc98215b66634a73147fd18966a6233dfa9edcd1a8a",
  sourcePackageSha256: "d84289d80cd0c5b69a2f8291a64983eb032d8416fe7513d966de1227e6e5529a",
  works: 4_272, globalWorks: 3_755, externalReferences: 517, parameters: 840_667, formulas: 1_157_018, resources: 1_157_018,
});
const FIRE = Object.freeze({ definitions: 231, global: 88, external: 143, demolition: 4, nonDemolition: 139, parameters: 55_056, formulas: 86_176, resources: 86_176, scenarios: 6_423, families: 150, O: 2_246, mutations: 2_321 });
const CORPUS_SHA256 = "610a9c633d8f100eef9fb328786bc44cfe936cce26a55f577796bffeb3d17fd3";
const FIXED_AT = "2026-08-17T00:00:00.000Z";

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
  if (statSync(path).size !== bytes) throw new Error(`FIRE_PACKAGE_SIZE_RED:${file}`);
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

async function* successorWorks(predecessorPath: string, firePath: string): AsyncGenerator<Json> {
  const predecessor = createInterface({ input: createReadStream(predecessorPath, "utf8"), crlfDelay: Infinity });
  for await (const line of predecessor) {
    if (!line.trim()) continue;
    const work = JSON.parse(line) as Json;
    const definitionVersion = Number(work.definitionVersion);
    if (!Number.isInteger(definitionVersion) || definitionVersion < 1) throw new Error(`FIRE_PREDECESSOR_VERSION_RED:${work.catalogId}`);
    yield { ...work, definitionVersion: definitionVersion + 1, sourceMetadata: { ...(work.sourceMetadata ?? {}), carriedForwardFromRelease: EXPECTED_PREDECESSOR.releaseId, carryForwardContract: "SEMANTICALLY_IDENTICAL_CONTENT_NEW_IMMUTABLE_DEFINITION_VERSION" } };
  }
  const fire = createInterface({ input: createReadStream(firePath, "utf8"), crlfDelay: Infinity });
  for await (const line of fire) if (line.trim()) yield JSON.parse(line) as Json;
}

function preconditions(): { summary: Json; oracleA: Json; oracleB: Json; mutations: Json; discovery: Json } {
  const summary = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "CONTENT_SUMMARY.json"), "utf8"));
  const oracleA = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "CONTENT_ORACLE_A.json"), "utf8"));
  const oracleB = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "CONTENT_ORACLE_B.json"), "utf8"));
  const mutations = JSON.parse(readFileSync(join(EVIDENCE, "12-mutations", "MUTATION_SUMMARY.json"), "utf8"));
  const discovery = JSON.parse(readFileSync(join(EVIDENCE, "01-discovery", "DISCOVERY_SUMMARY.json"), "utf8"));
  if (summary.status !== "CONTENT_GREEN_A1" || summary.corpusSha256 !== CORPUS_SHA256 || summary.H_final !== FIRE.definitions || summary.formulaResourceRows !== FIRE.resources
    || oracleA.status !== "GREEN_ORACLE_A" || oracleB.status !== "GREEN_ORACLE_B" || oracleA.works !== FIRE.definitions || oracleB.works !== FIRE.definitions
    || oracleA.resources !== FIRE.resources || oracleB.resources !== FIRE.resources || mutations.status !== "GREEN_MUTATIONS_2321_OF_2321_KILLED" || mutations.killed !== FIRE.mutations
    || discovery.arithmetic.G_final !== FIRE.global || discovery.arithmetic.D_final !== FIRE.demolition || discovery.arithmetic.N_final !== FIRE.nonDemolition || discovery.O_final !== FIRE.O || discovery.familyUniverse !== FIRE.families) throw new Error("FIRE_PACKAGE_CONTENT_PRECONDITION_RED");
  return { summary, oracleA, oracleB, mutations, discovery };
}

async function main(): Promise<void> {
  if (git(["status", "--porcelain"])) throw new Error("FIRE_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
  const packageRoot = resolve(argument("package-root", join(RUNTIME, "release-a")));
  if (existsSync(packageRoot)) throw new Error(`FIRE_PACKAGE_TARGET_EXISTS:${packageRoot}`);
  const predecessorRoot = resolve(argument("predecessor-package", join(RUNTIME, "predecessor-batch008")));
  const predecessor = JSON.parse(readFileSync(join(predecessorRoot, "manifest.json"), "utf8")) as Json;
  if (predecessor.releaseId !== EXPECTED_PREDECESSOR.releaseId || predecessor.manifestSha256 !== EXPECTED_PREDECESSOR.manifestSha256 || predecessor.sourcePackageSha256 !== EXPECTED_PREDECESSOR.sourcePackageSha256
    || predecessor.actual.works !== EXPECTED_PREDECESSOR.works || predecessor.actual.parameters !== EXPECTED_PREDECESSOR.parameters || predecessor.actual.formulas !== EXPECTED_PREDECESSOR.formulas || predecessor.actual.resources !== EXPECTED_PREDECESSOR.resources) throw new Error("FIRE_PREDECESSOR_PACKAGE_RED");
  const { summary, oracleA, oracleB, mutations, discovery } = preconditions();
  const fingerprint = sourceFingerprint();
  mkdirSync(packageRoot, { recursive: false });
  const corpus = join(EVIDENCE, "05-content", "corpus");
  const files: FileProof[] = [];
  files.push(await writeJsonl(packageRoot, "works.jsonl", successorWorks(join(predecessorRoot, "works.jsonl"), join(corpus, "FIRE_WORK_DEFINITIONS.jsonl"))));
  files.push(await concatenate(packageRoot, "parameters.jsonl", [join(predecessorRoot, "parameters.jsonl"), join(corpus, "FIRE_PARAMETER_DEFINITIONS.jsonl")]));
  files.push(await concatenate(packageRoot, "formulas.jsonl", [join(predecessorRoot, "formulas.jsonl"), join(corpus, "FIRE_FORMULA_GRAPHS.jsonl")]));
  files.push(await concatenate(packageRoot, "resources.jsonl", [join(predecessorRoot, "resources.jsonl"), join(corpus, "FIRE_RESOURCE_ROWS.jsonl")]));
  files.push(await concatenate(packageRoot, "normative-sources.jsonl", [join(predecessorRoot, "normative-sources.jsonl"), join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl")]));
  files.push(await concatenate(packageRoot, "interfaces.jsonl", [join(EVIDENCE, "02-depth", "EXPECTED_INTERFACE_UNIVERSE.jsonl")]));
  files.push(await concatenate(packageRoot, "per-id-proof.jsonl", [join(EVIDENCE, "02-depth", "FIRE_COMPLEXITY_CLASSIFICATION.jsonl")]));
  files.push(await concatenate(packageRoot, "scenarios.jsonl", [join(corpus, "FIRE_SCENARIOS.jsonl")]));
  const snapshots = readFileSync(join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const priceSources = snapshots.filter((row) => ["RATES", "PRICE"].includes(row.role));
  files.push(await writeJsonl(packageRoot, "price-sources.jsonl", priceSources.map((row) => ({ sourceId: row.sourceId, documentCode: row.documentCode, titleRu: row.titleRu, officialUrl: row.officialPageUrl, artifactSha256: row.pdfSha256 ?? row.pageSha256, status: "OFFICIAL_BASE_PRICE_REFERENCE_CURRENT_INDEX_AND_PRICE_DATE_INPUT_REQUIRED" }))));
  const actual = {
    works: EXPECTED_PREDECESSOR.works + FIRE.definitions,
    globalWorks: EXPECTED_PREDECESSOR.globalWorks + FIRE.global,
    externalReferences: EXPECTED_PREDECESSOR.externalReferences + FIRE.external,
    parameters: EXPECTED_PREDECESSOR.parameters + FIRE.parameters,
    formulas: EXPECTED_PREDECESSOR.formulas + FIRE.formulas,
    resources: EXPECTED_PREDECESSOR.resources + FIRE.resources,
    byDomain: { ...predecessor.actual.byDomain, fire_life_safety: { works: FIRE.definitions, resources: FIRE.resources } },
  };
  const predecessorFiles = new Map<string, number>((predecessor.files as FileProof[]).map((row) => [row.file, row.rows]));
  const expectedRows = new Map<string, number>([["works.jsonl", actual.works], ["parameters.jsonl", actual.parameters], ["formulas.jsonl", actual.formulas], ["resources.jsonl", actual.resources], ["normative-sources.jsonl", Number(predecessorFiles.get("normative-sources.jsonl")) + snapshots.length], ["interfaces.jsonl", FIRE.definitions], ["per-id-proof.jsonl", FIRE.definitions], ["scenarios.jsonl", FIRE.scenarios], ["price-sources.jsonl", priceSources.length]]);
  for (const file of files) if (file.rows !== expectedRows.get(file.file)) throw new Error(`FIRE_PACKAGE_CARDINALITY_RED:${file.file}:${file.rows}:${expectedRows.get(file.file)}`);
  const identities = readFileSync(join(EVIDENCE, "01-discovery", "FIRE_IDENTITY_SET.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const globalIds = identities.filter((row) => row.namespace === "global" && row.denominator_eligible).map((row) => row.catalog_id).sort();
  const globalIdSetSha256 = sha(globalIds.join("\n"));
  const contentIdentity = semantic({ parent: predecessor.manifestSha256, corpus: CORPUS_SHA256, sourceFingerprint: fingerprint.sha256, files, discovery: discovery.discoverySha256, oracleA: oracleA.oracleDigest, oracleB: oracleB.oracleDigest, mutations: mutations.mutationSetSha256 });
  const releaseId = uuidFromHash(contentIdentity);
  const releaseKey = `batch009-fire-r5-${contentIdentity.slice(0, 16)}`;
  const sourcePackageSha256 = semantic({ schemaVersion: "batch009-fire-r5-release.v1", releaseId, releaseKey, parentReleaseId: predecessor.releaseId, files, sourceFingerprintSha256: fingerprint.sha256, contentIdentity });
  const officialSources = snapshots.map((row) => ({ sourceId: row.sourceId, documentCode: row.documentCode, titleRu: row.titleRu, authority: "Министерство строительства Кыргызской Республики", officialUrl: row.officialPageUrl, artifactSha256: row.pdfSha256, effectiveFrom: row.sourceId.includes("2025") ? "2025-01-01" : row.sourceId.includes("2024") ? "2024-01-01" : "2015-01-01", status: row.status, applicability: row.role }));
  const withoutHash = {
    schemaVersion: "batch009-fire-r5-release.v1",
    generatedAt: FIXED_AT,
    releaseId,
    releaseKey,
    definitionSchemaVersion: 5,
    parentRelease: { releaseId: predecessor.releaseId, releaseKey: predecessor.releaseKey, sourceManifestSha256: predecessor.manifestSha256, sourcePackageSha256: predecessor.sourcePackageSha256 },
    actual,
    fireDelta: { ...FIRE, globalIdSetSha256, corpusSha256: CORPUS_SHA256, aliases: 0, paddingRows: 0, inventedEngineeringValues: 0, inventedPrices: 0, clientDefinitionOwner: 0 },
    normativeDiscovery: { O_final: FIRE.O, officialItems: discovery.officialNormativeUniverse, obligationFloor: discovery.obligationFloor, families: FIRE.families, newExternalDemolition: FIRE.demolition, newExternalNonDemolition: FIRE.nonDemolition, unresolved: 0 },
    programControl: { denominator: 11_610, admittedBefore: 3_755, remainingBefore: 7_855, newlyAdmittedFire: 88, externalFireDefinitions: 143, admittedAfter: 3_843, remainingAfter: 7_767, legacyExternalQueueBefore: 8, legacyExternalQueueAfter: 8, backendExternalReferencesAfter: 660, queueMutationDuringImport: 0, batch010Started: false },
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
  const report = { packageRoot: relative(ROOT, packageRoot).replaceAll("\\", "/"), releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256, sourceFingerprintSha256: fingerprint.sha256, actual, fireDelta: manifest.fireDelta, files, status: "GREEN_IMMUTABLE_PREPARED_PACKAGE_BYTES" };
  writeFileSync(join(EVIDENCE, "07-package", argument("evidence-name", "PACKAGE_A_BUILD.json")), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
