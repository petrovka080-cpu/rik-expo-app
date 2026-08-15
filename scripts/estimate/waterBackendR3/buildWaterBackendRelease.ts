import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { once } from "node:events";

import {
  WATER_BACKEND_CONTENT_VERSION,
  WATER_BACKEND_DOMAIN,
  WATER_BACKEND_GLOBAL_CATALOG_IDS,
  WATER_BACKEND_A2_EXTERNAL_IDS,
  WATER_BACKEND_EXPECTED_CATALOG_IDS,
  WATER_OFFICIAL_SOURCES,
  buildWaterBackendDefinitions,
  type JsonRecord,
} from "./waterDomainModel";

const ROOT = resolve(__dirname, "../../..");
const DEFAULT_PREDECESSOR_ROOT = resolve(ROOT, "../rik-expo-app-master11610-backend-r1");
const RUNTIME_ROOT = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE_ROOT = join(RUNTIME_ROOT, "evidence-a2");
const PACKAGE_ROOT = resolve(argument("package-root", join(RUNTIME_ROOT, "03-r6-a2-release-a")));
const OFFICIAL_CACHE = join(RUNTIME_ROOT, "official-source-cache");

type FileProof = { file: string; rows: number; bytes: number; sha256: string };

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function uuidFromSha256(hash: string): string {
  const hex = hash.slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const normalized = hex.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function trackedSourceFingerprint(): { files: number; sha256: string; entries: Array<{ path: string; bytes: number; sha256: string }> } {
  const paths = git([
    "ls-files", "--cached", "--others", "--exclude-standard", "--",
    "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts",
    "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json",
  ]).split(/\r?\n/).filter((path) => Boolean(path) && existsSync(resolve(ROOT, path))).sort();
  const entries = paths.map((path) => {
    const bytes = readFileSync(resolve(ROOT, path));
    return { path: path.replace(/\\/g, "/"), bytes: bytes.byteLength, sha256: sha256(bytes) };
  });
  return { files: entries.length, sha256: sha256(stableJson(entries)), entries };
}

async function writeLines(path: string, rows: AsyncIterable<unknown> | Iterable<unknown>): Promise<FileProof> {
  mkdirSync(dirname(path), { recursive: true });
  const output = createWriteStream(path, { encoding: "utf8" });
  const digest = createHash("sha256");
  let count = 0;
  let bytes = 0;
  for await (const row of rows) {
    const line = `${stableJson(row)}\n`;
    digest.update(line);
    bytes += Buffer.byteLength(line);
    count += 1;
    if (!output.write(line)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  return { file: relative(PACKAGE_ROOT, path).replace(/\\/g, "/"), rows: count, bytes, sha256: digest.digest("hex") };
}

async function *jsonLines(path: string): AsyncGenerator<JsonRecord> {
  const input = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const raw of input) {
    if (raw.trim()) yield JSON.parse(raw) as JsonRecord;
  }
}

async function *cumulativeWorks(predecessorPath: string, waterWorks: readonly JsonRecord[]): AsyncGenerator<JsonRecord> {
  for await (const work of jsonLines(predecessorPath)) {
    yield {
      ...work,
      definitionVersion: 3,
      sourceMetadata: {
        ...(work.sourceMetadata as JsonRecord),
        carriedForwardFromRelease: "master11610-backend-canonical-r2-parameter-semantics",
        carryForwardContract: "BYTE_EQUIVALENT_FORMULA_RESOURCE_CONTENT_R3_SUCCESSOR",
      },
    };
  }
  yield *waterWorks;
}

async function *cumulativeRows(predecessorPath: string, waterRows: readonly JsonRecord[]): AsyncGenerator<JsonRecord> {
  yield *jsonLines(predecessorPath);
  yield *waterRows;
}

function writeEvidenceJson(name: string, value: unknown): void {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  writeFileSync(join(EVIDENCE_ROOT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeEvidenceJsonl(name: string, values: readonly unknown[]): void {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  writeFileSync(join(EVIDENCE_ROOT, name), `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  if (git(["status", "--porcelain"])) throw new Error("WATER_R6_A2_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
  const predecessorRoot = resolve(argument("predecessor-root", DEFAULT_PREDECESSOR_ROOT));
  const predecessorPackage = resolve(argument(
    "predecessor-package",
    join(predecessorRoot, ".release-runtime", "master11610-backend-canonical-r2", "02-canonical-export"),
  ));
  const predecessorManifestBytes = readFileSync(join(predecessorPackage, "manifest.json"));
  const predecessorManifest = JSON.parse(predecessorManifestBytes.toString("utf8"));
  if (
    predecessorManifest.manifestSha256 !== "2435181634611f050dcef966fa277ab31f02c632d8e6ac2bf0345994600f722e" ||
    predecessorManifest.releaseId !== "c90141a2-fdd6-4e78-b01c-bad792c8df18" ||
    predecessorManifest.actual.works !== 1_168 || predecessorManifest.actual.resources !== 101_416
  ) throw new Error("BATCH006_PREDECESSOR_PACKAGE_IDENTITY_RED");

  for (const source of WATER_OFFICIAL_SOURCES) {
    const path = join(OFFICIAL_CACHE, source.artifactFile);
    if (!statSync(path).isFile() || sha256(readFileSync(path)) !== source.artifactSha256) {
      throw new Error(`WATER_OFFICIAL_SOURCE_ARTIFACT_RED:${source.sourceId}:${path}`);
    }
  }

  process.stderr.write("[batch006-release] build-water-definitions\n");
  const definitions = buildWaterBackendDefinitions();
  const waterWorks = definitions.map((definition) => definition.work as JsonRecord);
  const waterParameters = definitions.flatMap((definition) => definition.parameters) as JsonRecord[];
  const waterFormulas = definitions.flatMap((definition) => definition.formulas) as JsonRecord[];
  const waterResources = definitions.flatMap((definition) => definition.resources) as JsonRecord[];
  const waterCounts = {
    definitions: definitions.length,
    globalDefinitions: definitions.filter((definition) => definition.work.namespace === "global").length,
    externalDefinitions: definitions.filter((definition) => definition.work.namespace === "external").length,
    parameters: waterParameters.length,
    formulas: waterFormulas.length,
    resources: waterResources.length,
    minimumRowsPerDefinition: Math.min(...definitions.map((definition) => definition.resources.length)),
    maximumRowsPerDefinition: Math.max(...definitions.map((definition) => definition.resources.length)),
  };
  if (
    waterCounts.definitions !== WATER_BACKEND_EXPECTED_CATALOG_IDS ||
    waterCounts.globalDefinitions !== WATER_BACKEND_GLOBAL_CATALOG_IDS ||
    waterCounts.externalDefinitions !== WATER_BACKEND_A2_EXTERNAL_IDS ||
    waterCounts.formulas !== waterCounts.resources || waterCounts.minimumRowsPerDefinition < 10
  ) throw new Error(`WATER_CONTENT_CARDINALITY_RED:${JSON.stringify(waterCounts)}`);

  mkdirSync(PACKAGE_ROOT, { recursive: true });
  process.stderr.write("[batch006-release] stream-cumulative-package\n");
  const files: FileProof[] = [];
  files.push(await writeLines(
    join(PACKAGE_ROOT, "works.jsonl"),
    cumulativeWorks(join(predecessorPackage, "works.jsonl"), waterWorks),
  ));
  files.push(await writeLines(
    join(PACKAGE_ROOT, "parameters.jsonl"),
    cumulativeRows(join(predecessorPackage, "parameters.jsonl"), waterParameters),
  ));
  files.push(await writeLines(
    join(PACKAGE_ROOT, "formulas.jsonl"),
    cumulativeRows(join(predecessorPackage, "formulas.jsonl"), waterFormulas),
  ));
  files.push(await writeLines(
    join(PACKAGE_ROOT, "resources.jsonl"),
    cumulativeRows(join(predecessorPackage, "resources.jsonl"), waterResources),
  ));
  files.push(await writeLines(join(PACKAGE_ROOT, "normative-sources.jsonl"), WATER_OFFICIAL_SOURCES));

  const actual = {
    works: 1_168 + waterCounts.definitions,
    globalWorks: 1_160 + waterCounts.globalDefinitions,
    externalReferences: 8 + waterCounts.externalDefinitions,
    parameters: 138_425 + waterCounts.parameters,
    formulas: 101_416 + waterCounts.formulas,
    resources: 101_416 + waterCounts.resources,
    byDomain: {
      asphalt: { works: 63, resources: 3_709 },
      drywall: { works: 500, resources: 27_984 },
      electrical: { works: 605, resources: 69_723 },
      [WATER_BACKEND_DOMAIN]: { works: waterCounts.definitions, resources: waterCounts.resources },
    },
  };
  const fileByName = new Map(files.map((file) => [file.file, file]));
  if (
    fileByName.get("works.jsonl")?.rows !== actual.works ||
    fileByName.get("parameters.jsonl")?.rows !== actual.parameters ||
    fileByName.get("formulas.jsonl")?.rows !== actual.formulas ||
    fileByName.get("resources.jsonl")?.rows !== actual.resources
  ) throw new Error(`CUMULATIVE_PACKAGE_ROW_COUNT_RED:${JSON.stringify({ files, actual })}`);

  const membershipPath = join(EVIDENCE_ROOT, "A2_01_GLOBAL_11610_WATER_CLASSIFICATION.jsonl");
  const membershipSha256 = sha256(readFileSync(membershipPath));
  const admittedCatalogIdSetSha256 = sha256(definitions
    .filter((definition) => definition.work.namespace === "global")
    .map((definition) => definition.work.catalogId).sort().join("\n"));
  const sourceFingerprint = trackedSourceFingerprint();
  const contentIdentity = sha256(stableJson({
    predecessorManifestSha256: predecessorManifest.manifestSha256,
    waterContentVersion: WATER_BACKEND_CONTENT_VERSION,
    membershipSha256,
    files: files.map(({ file, rows, bytes, sha256: fileSha256 }) => ({ file, rows, bytes, sha256: fileSha256 })),
    officialSources: WATER_OFFICIAL_SOURCES.map((source) => ({ sourceId: source.sourceId, artifactSha256: source.artifactSha256 })),
    sourceFingerprintSha256: sourceFingerprint.sha256,
  }));
  const releaseId = uuidFromSha256(contentIdentity);
  const releaseKey = `batch006-water-r6-a2-${contentIdentity.slice(0, 16)}`;
  const sourcePackageSha256 = sha256(stableJson({
    schemaVersion: "batch006-water-backend-release.r6-a2",
    releaseId,
    releaseKey,
    parentReleaseId: predecessorManifest.releaseId,
    files,
    sourceFingerprintSha256: sourceFingerprint.sha256,
    contentIdentity,
  }));
  const manifestWithoutHash = {
    schemaVersion: "batch006-water-backend-release.r6-a2",
    contentVersion: WATER_BACKEND_CONTENT_VERSION,
    releaseId,
    releaseKey,
    definitionSchemaVersion: 5,
    parentRelease: {
      releaseId: predecessorManifest.releaseId,
      releaseKey: predecessorManifest.releaseKey,
      sourceManifestSha256: predecessorManifest.manifestSha256,
      sourcePackageSha256: predecessorManifest.sourcePackageSha256,
    },
    actual,
    waterDelta: {
      ...waterCounts,
      admittedCatalogIdSetSha256,
      membershipEvidenceSha256: membershipSha256,
      aliases: 0,
      paddingRows: 0,
      frontendDefinitionOwner: 0,
    },
    programControl: {
      denominator: 11_610,
      admittedBefore: 1_160,
      remainingBefore: 10_450,
      newlyAdmittedWater: waterCounts.globalDefinitions,
      newlyAddedExternalWater: waterCounts.externalDefinitions,
      admittedAfter: 1_160 + waterCounts.globalDefinitions,
      remainingAfter: 10_450 - waterCounts.globalDefinitions,
      externalBefore: 8,
      externalAfter: 8 + waterCounts.externalDefinitions,
      queueMutationDuringImport: 0,
      batch007Started: false,
    },
    sourceGit: {
      head: git(["rev-parse", "HEAD"]),
      tree: git(["rev-parse", "HEAD^{tree}"]),
      worktreeSourceFingerprintSha256: sourceFingerprint.sha256,
      worktreeSourceFileCount: sourceFingerprint.files,
    },
    officialSources: WATER_OFFICIAL_SOURCES,
    files,
    contentIdentity,
    sourcePackageSha256,
    generatedAt: "2026-08-15T00:00:00.000Z",
    productionDeployed: false,
    batch007Started: false,
  };
  const manifest = { ...manifestWithoutHash, manifestSha256: sha256(stableJson(manifestWithoutHash)) };
  writeFileSync(join(PACKAGE_ROOT, "manifest.json"), `${stableJson(manifest)}\n`, "utf8");
  writeFileSync(join(PACKAGE_ROOT, "source-fingerprint.json"), `${stableJson(sourceFingerprint)}\n`, "utf8");

  const passportIndex = definitions.map((definition) => ({
    catalog_id: definition.work.catalogId,
    passport_id: definition.work.passport.passportId,
    passport_version: definition.work.passport.passportVersion,
    technology_kind: (definition.work.passport.technology as JsonRecord).kind,
    parameter_count: definition.parameters.length,
    resource_count: definition.resources.length,
    complexity_class: (definition.work.passport.professionalObligations as JsonRecord).complexityClass,
    estimate_maturity: (definition.work.passport.professionalObligations as JsonRecord).estimateMaturity,
    physical_component_count: (definition.work.passport.professionalObligations as JsonRecord).physicalComponentCount,
    passport_sha256: sha256(stableJson(definition.work.passport)),
    backend_owner: true,
  }));
  const parameterIndex = waterParameters.map((parameter) => ({ ...parameter, schema_sha256: sha256(stableJson(parameter)) }));
  const rowLedger = waterResources.map((resource) => ({
    catalog_id: resource.catalogId,
    row_id: resource.rowId,
    ordinal: resource.ordinal,
    title_ru: resource.titleRu,
    category: resource.category,
    unit_id: resource.unitId,
    formula_id: resource.formulaId,
    inclusion_ast: resource.inclusionAst,
    semantic_owner: resource.semanticOwner,
    cost_owner_id: resource.costOwnerId,
    row_source_sha256: sha256(stableJson(resource)),
  }));
  const formulaById = new Map(waterFormulas.map((formula) => [String(formula.formulaId), formula]));
  const trace = waterResources.map((resource) => ({
    catalog_id: resource.catalogId,
    row_id: resource.rowId,
    formula: formulaById.get(String(resource.formulaId)),
    normative_trace: (resource.sourceMetadata as JsonRecord).normativeTrace,
    price_route: (resource.sourceMetadata as JsonRecord).priceRoute,
    semantic_owner: resource.semanticOwner,
    parent_child_double_count_guard: (resource.resourceGraph as JsonRecord).parentChildDoubleCountGuard,
    padding_row: false,
    trace_sha256: sha256(stableJson({ resource, formula: formulaById.get(String(resource.formulaId)) })),
  }));
  writeEvidenceJson("A2_07_WATER_BACKEND_DEFINITION_RELEASE_MANIFEST.json", manifest);
  writeEvidenceJson("A2_04_OFFICIAL_SOURCE_REVERIFICATION.json", {
    schemaVersion: "water-official-source-registry.r6-a2",
    verifiedAt: "2026-08-15",
    verificationMethod: "OFFICIAL_MINSTROY_PAGE_AND_BYTE_PRESERVED_LOCAL_ARTIFACT_SHA256",
    sources: WATER_OFFICIAL_SOURCES,
    sourceCount: WATER_OFFICIAL_SOURCES.length,
    allArtifactsSha256Verified: true,
    status: "GREEN",
  });
  await writeLines(join(EVIDENCE_ROOT, "A2_07_WATER_BACKEND_PROFESSIONAL_PASSPORT_INDEX.jsonl"), passportIndex);
  await writeLines(join(EVIDENCE_ROOT, "A2_07_WATER_BACKEND_PARAMETER_SCHEMA_INDEX.jsonl"), parameterIndex);
  await writeLines(join(EVIDENCE_ROOT, "A2_07_WATER_BACKEND_BOQ_ROW_LEDGER.jsonl"), rowLedger);
  await writeLines(join(EVIDENCE_ROOT, "A2_07_WATER_ROW_FORMULA_NORM_PRICE_TRACE.jsonl"), trace);
  writeEvidenceJson("A2_07_SOURCE_FINGERPRINT.json", sourceFingerprint);

  process.stdout.write(`${JSON.stringify({
    status: "GREEN_R6_A2_IMMUTABLE_PACKAGE_BUILT",
    releaseId,
    releaseKey,
    manifestSha256: manifest.manifestSha256,
    sourcePackageSha256,
    waterCounts,
    cumulative: actual,
    files,
    productionDeployed: false,
    queueMutated: false,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
