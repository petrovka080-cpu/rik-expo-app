import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  auditR4A6IdentityRows,
  R4_A6_EXPECTED_IDENTITIES,
  R4_A6_EXPECTED_VISIBLE_CANONICAL,
  type R4A6IdentityRow,
} from "./identityDag11610Contract";

const MASTER_PATH = resolve(process.env.R4_A10_MASTER_PATH ??
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md");
const MASTER_SHA256 = process.env.R4_A10_MASTER_SHA256
  ?? "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const CURRENT_RELEASE = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
const RELEASE_ID = String(CURRENT_RELEASE.definitionReleaseId);
const SEARCH_RELEASE_ID = String(CURRENT_RELEASE.searchReleaseId);
const EXPECTED_RETAINED_NON_SEARCH_DEFINITIONS = 9;
const IDENTITY_PATH = resolve(
  ".release-runtime/r568/rc09-identity-v1/current-identity-manifest-11610.jsonl",
);
const ROOT = resolve(process.env.R4_A10_SCALE_ROOT
  ?? ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1/15_scale");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EXACT_SOURCE_PATHS = [
  "scripts/estimate/r4a6/auditR4A6IdentityDag11610.ts",
  "scripts/estimate/r4a6/identityDag11610Contract.ts",
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
] as const;

type Json = Record<string, any>;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256(value: unknown): string {
  return sha256Bytes(canonicalEstimateStableJson(value));
}

function exactSourceIdentity(): Json {
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...EXACT_SOURCE_PATHS);
  if (dirty) throw new Error(`STOP_IDENTITY_SOURCE_DRIFT:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    paths: EXACT_SOURCE_PATHS,
  };
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function writeImmutableJson(path: string, value: Json): void {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== content) {
      throw new Error(`STOP_IMMUTABLE_EVIDENCE_CONFLICT:${path}`);
    }
    return;
  }
  atomicWrite(path, content);
}

function sortedDifference(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

async function main(): Promise<void> {
  const source = exactSourceIdentity();
  if (!existsSync(MASTER_PATH) || sha256Bytes(readFileSync(MASTER_PATH)) !== MASTER_SHA256) {
    throw new Error("STOP_MASTER_TZ_HASH_MISMATCH");
  }
  if (!existsSync(IDENTITY_PATH)) throw new Error("STOP_IDENTITY_MANIFEST_MISSING");
  const identityBytes = readFileSync(IDENTITY_PATH);
  const identityRows = identityBytes.toString("utf8").trim().split(/\r?\n/u)
    .filter(Boolean).map((line) => JSON.parse(line) as R4A6IdentityRow);
  const identityAudit = auditR4A6IdentityRows(identityRows);
  const visibleCanonicalWorkIds = new Set(identityRows
    .filter((row) => row.disposition === "VISIBLE_CANONICAL")
    .map((row) => row.canonical_work_id));

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const releaseRows = (await client.query(
      `select release.id::text release_id,release.status release_status,release.release_key,
        search.id::text search_release_id,search.status search_status,search.snapshot_sha256
      from public.estimate_definition_release release
      cross join public.estimate_search_index_release search
      where release.id=$1 and search.id=$2`,
      [RELEASE_ID, SEARCH_RELEASE_ID],
    )).rows as Json[];
    const manifestRows = (await client.query(
      `select manifest.catalog_id,manifest.definition_version_id::text,manifest.entry_sha256,
        manifest.baseline_ready,manifest.scenario_ready,manifest.publication_state,
        manifest.runtime_publication_state,manifest.source_batch
      from public.estimate_cumulative_manifest_entry manifest
      where manifest.release_id=$1 order by manifest.catalog_id`,
      [RELEASE_ID],
    )).rows as Json[];
    const searchRows = (await client.query(
      `select document.catalog_id,document.definition_version_id::text,document.adjudication_class,
        document.selectable,document.document_sha256
      from public.estimate_search_document document
      where document.search_release_id=$1 order by document.catalog_id`,
      [SEARCH_RELEASE_ID],
    )).rows as Json[];
    const manifestDefinitionByCatalog = new Map(manifestRows
      .map((row) => [String(row.catalog_id), String(row.definition_version_id)] as const));
    const selectedDefinitions = searchRows
      .filter((row) => row.selectable === true && row.adjudication_class === "EFFECTIVE_WORK")
      .filter((row) => manifestDefinitionByCatalog.get(String(row.catalog_id)) === String(row.definition_version_id))
      .map((row) => ({
        catalog_id: String(row.catalog_id),
        definition_version_id: String(row.definition_version_id),
      }));
    const selectedDefinitionIds = selectedDefinitions.map((row) => row.definition_version_id);
    const parameterCountRows = (await client.query(
      `select parameter.definition_version_id::text,count(*)::int parameter_count
      from public.estimate_parameter_definition parameter
      where parameter.definition_version_id=any($1::uuid[])
      group by parameter.definition_version_id`,
      [selectedDefinitionIds],
    )).rows as Json[];
    const formulaCountRows = (await client.query(
      `select formula.definition_version_id::text,count(*)::int formula_count,
        count(*) filter(where formula.ast_sha256 !~ '^[a-f0-9]{64}$')::int invalid_formula_hashes
      from public.estimate_formula_graph formula
      where formula.definition_version_id=any($1::uuid[])
      group by formula.definition_version_id`,
      [selectedDefinitionIds],
    )).rows as Json[];
    const resourceCountRows = (await client.query(
      `select resource.definition_version_id::text,count(*)::int resource_count,
        count(*) filter(where resource.row_sha256 !~ '^[a-f0-9]{64}$')::int invalid_resource_hashes,
        count(*) filter(where nullif(btrim(resource.unit_id),'') is null)::int missing_units
      from public.estimate_resource_spec resource
      where resource.definition_version_id=any($1::uuid[])
      group by resource.definition_version_id`,
      [selectedDefinitionIds],
    )).rows as Json[];
    const parameterCounts = new Map(parameterCountRows
      .map((row) => [String(row.definition_version_id), Number(row.parameter_count)] as const));
    const formulaCounts = new Map(formulaCountRows
      .map((row) => [String(row.definition_version_id), row] as const));
    const resourceCounts = new Map(resourceCountRows
      .map((row) => [String(row.definition_version_id), row] as const));
    const definitionStats = selectedDefinitions.map((row) => {
      const formula = formulaCounts.get(row.definition_version_id);
      const resource = resourceCounts.get(row.definition_version_id);
      return {
        ...row,
        parameter_count: parameterCounts.get(row.definition_version_id) ?? 0,
        formula_count: Number(formula?.formula_count ?? 0),
        resource_count: Number(resource?.resource_count ?? 0),
        invalid_formula_hashes: Number(formula?.invalid_formula_hashes ?? 0),
        invalid_resource_hashes: Number(resource?.invalid_resource_hashes ?? 0),
        missing_units: Number(resource?.missing_units ?? 0),
      };
    });
    const dagDefects = (await client.query(
      `with missing_formula_inputs as(
          select count(*)::int count
          from public.estimate_formula_graph formula
          cross join lateral unnest(formula.input_parameter_ids) input_parameter_id
          left join public.estimate_parameter_definition parameter
            on parameter.definition_version_id=formula.definition_version_id
            and parameter.parameter_id=input_parameter_id
          where formula.definition_version_id=any($1::uuid[]) and parameter.parameter_id is null
        ), orphan_resources as(
          select count(*)::int count
          from public.estimate_resource_spec resource
          left join public.estimate_formula_graph formula
            on formula.definition_version_id=resource.definition_version_id
            and formula.formula_id=resource.formula_id
          where resource.definition_version_id=any($1::uuid[]) and formula.formula_id is null
        ), duplicate_resource_rows as(
          select count(*)::int count from(
            select resource.definition_version_id,resource.row_id
            from public.estimate_resource_spec resource
            where resource.definition_version_id=any($1::uuid[])
            group by resource.definition_version_id,resource.row_id having count(*)>1
          ) duplicate
        )
        select (select count from missing_formula_inputs) missing_formula_inputs,
          (select count from orphan_resources) orphan_resources,
          (select count from duplicate_resource_rows) duplicate_resource_rows`,
      [selectedDefinitionIds],
    )).rows[0] as Json;

    const failures = [...identityAudit.failures];
    const manifestByCatalog = new Map(manifestRows.map((row) => [String(row.catalog_id), row]));
    const searchByCatalog = new Map(searchRows.map((row) => [String(row.catalog_id), row]));
    const manifestCatalogIds = new Set(manifestByCatalog.keys());
    const searchCatalogIds = new Set(searchByCatalog.keys());
    const selectableRows = searchRows.filter((row) => row.selectable === true
      && row.adjudication_class === "EFFECTIVE_WORK");
    const selectableIds = new Set(selectableRows.map((row) => String(row.catalog_id)));
    const manifestWithoutSearch = sortedDifference(manifestCatalogIds, searchCatalogIds);
    const searchWithoutManifest = sortedDifference(searchCatalogIds, manifestCatalogIds);
    const identityWithoutSelectable = sortedDifference(visibleCanonicalWorkIds, selectableIds);
    const selectableWithoutIdentity = sortedDifference(selectableIds, visibleCanonicalWorkIds);
    const definitionMismatches = searchRows.filter((row) => {
      const manifest = manifestByCatalog.get(String(row.catalog_id));
      return !manifest || String(manifest.definition_version_id) !== String(row.definition_version_id);
    });
    const notReady = manifestRows.filter((row) => row.baseline_ready !== true || row.scenario_ready !== true);
    const retainedNonSearchDefinitions = manifestWithoutSearch
      .map((catalogId) => manifestByCatalog.get(catalogId)!)
      .filter(Boolean);
    const retainedNonSearchIdentityCollisions = retainedNonSearchDefinitions
      .filter((row) => visibleCanonicalWorkIds.has(String(row.catalog_id)));
    const zeroParameters = definitionStats.filter((row) => Number(row.parameter_count) === 0);
    const zeroFormulas = definitionStats.filter((row) => Number(row.formula_count) === 0);
    const zeroResources = definitionStats.filter((row) => Number(row.resource_count) === 0);
    const invalidFormulaHashes = definitionStats.reduce((sum, row) => sum + Number(row.invalid_formula_hashes), 0);
    const invalidResourceHashes = definitionStats.reduce((sum, row) => sum + Number(row.invalid_resource_hashes), 0);
    const missingUnits = definitionStats.reduce((sum, row) => sum + Number(row.missing_units), 0);
    const resolvedAgainstDatabase = [...identityAudit.resolvedCanonicalWorkIds.values()]
      .filter((catalogId) => selectableIds.has(catalogId)).length;
    const definitionIntegrityGreen = definitionStats.length
      - new Set([...zeroParameters, ...zeroFormulas, ...zeroResources].map((row) => row.catalog_id)).size;

    if (releaseRows.length !== 1) failures.push("STOP_IDENTITY_RELEASE_NOT_FOUND");
    // The cumulative definition release deliberately contains the 10,322 public
    // canonical owners plus nine retained non-search definitions documented by
    // the master denominator (10,331 definitions total). Published parity means
    // every search row resolves to the same release definition; it does not make
    // those nine legacy owners public identities.
    if (searchWithoutManifest.length > 0
      || manifestWithoutSearch.length !== EXPECTED_RETAINED_NON_SEARCH_DEFINITIONS
      || retainedNonSearchIdentityCollisions.length > 0) {
      failures.push("STOP_IDENTITY_RELEASE_SEARCH_MEMBERSHIP_DRIFT");
    }
    if (definitionMismatches.length) failures.push("STOP_IDENTITY_RELEASE_SEARCH_DEFINITION_DRIFT");
    if (notReady.length) failures.push("STOP_IDENTITY_RELEASE_NOT_READY");
    if (selectableRows.length !== R4_A6_EXPECTED_VISIBLE_CANONICAL
      || identityWithoutSelectable.length || selectableWithoutIdentity.length) {
      failures.push("STOP_IDENTITY_VISIBLE_SEARCH_PARITY");
    }
    if (definitionStats.length !== R4_A6_EXPECTED_VISIBLE_CANONICAL
      || zeroParameters.length || zeroFormulas.length || zeroResources.length) {
      failures.push("STOP_IDENTITY_DAG_DEFINITION_INCOMPLETE");
    }
    if (Number(dagDefects.missing_formula_inputs) > 0) failures.push("STOP_IDENTITY_DAG_MISSING_PARAMETER");
    if (Number(dagDefects.orphan_resources) > 0) failures.push("STOP_IDENTITY_DAG_ORPHAN_RESOURCE");
    if (Number(dagDefects.duplicate_resource_rows) > 0) failures.push("STOP_IDENTITY_DAG_DUPLICATE_RESOURCE");
    if (invalidFormulaHashes || invalidResourceHashes || missingUnits) failures.push("STOP_IDENTITY_DAG_INVALID_ROW");
    if (resolvedAgainstDatabase !== R4_A6_EXPECTED_IDENTITIES) failures.push("STOP_IDENTITY_DAG_COVERAGE_INCOMPLETE");

    const uniqueFailures = [...new Set(failures)];
    const body = {
      schemaVersion: "r568-r4-a6-identity-dag-11610.v1",
      capturedAt: new Date().toISOString(),
      gate: uniqueFailures.length === 0 ? "GREEN_R4_A6_IDENTITY_DAG_11610" : "RED_R4_A6_IDENTITY_DAG_11610",
      globalStatus: "RED_NOT_PRODUCTION_READY",
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
      source,
      database: {
        releaseId: RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        release: releaseRows[0] ?? null,
        manifestEntries: manifestRows.length,
        searchDocuments: searchRows.length,
        selectableEffectiveDocuments: selectableRows.length,
        manifestHashChainSha256: sha256(manifestRows.map((row) => row.entry_sha256)),
        searchHashChainSha256: sha256(searchRows.map((row) => row.document_sha256)),
      },
      identity: {
        path: IDENTITY_PATH,
        fileSha256: sha256Bytes(identityBytes),
        recordHashChainSha256: sha256(identityRows.map((row) => row.record_sha256)),
        identities: identityAudit.identities,
        uniqueSourceIdentities: identityAudit.uniqueSourceIdentities,
        uniqueCatalogIdentities: identityAudit.uniqueCatalogIdentities,
        visibleCanonical: identityAudit.visibleCanonical,
        aliasesRedirects: identityAudit.aliasesRedirects,
        uniqueCanonicalWorkIds: identityAudit.uniqueCanonicalWorkIds,
        uniqueRecordHashes: identityAudit.uniqueRecordHashes,
        invalidRecordHashes: identityAudit.invalidRecordHashes,
        missingRedirectTargets: identityAudit.missingRedirectTargets,
        redirectTargetMismatches: identityAudit.redirectTargetMismatches,
        canonicalTargetMismatches: identityAudit.canonicalTargetMismatches,
        redirectCycles: identityAudit.redirectCycles,
      },
      releaseSearchParity: {
        manifestWithoutSearch: manifestWithoutSearch.length,
        expectedRetainedNonSearchDefinitions: EXPECTED_RETAINED_NON_SEARCH_DEFINITIONS,
        retainedNonSearchDefinitions: retainedNonSearchDefinitions.length,
        retainedNonSearchIdentityCollisions: retainedNonSearchIdentityCollisions.length,
        retainedNonSearchCatalogIdsSha256: sha256(manifestWithoutSearch),
        searchWithoutManifest: searchWithoutManifest.length,
        definitionMismatches: definitionMismatches.length,
        identityWithoutSelectable: identityWithoutSelectable.length,
        selectableWithoutIdentity: selectableWithoutIdentity.length,
        notReady: notReady.length,
      },
      formulaDag: {
        visibleDefinitionTargets: definitionStats.length,
        definitionIntegrityGreen,
        identitiesResolvedToGreenDag: resolvedAgainstDatabase,
        formulaDagCoverage: `${resolvedAgainstDatabase}/${R4_A6_EXPECTED_IDENTITIES}`,
        parameters: definitionStats.reduce((sum, row) => sum + Number(row.parameter_count), 0),
        formulas: definitionStats.reduce((sum, row) => sum + Number(row.formula_count), 0),
        resources: definitionStats.reduce((sum, row) => sum + Number(row.resource_count), 0),
        zeroParameterDefinitions: zeroParameters.length,
        zeroFormulaDefinitions: zeroFormulas.length,
        zeroResourceDefinitions: zeroResources.length,
        missingFormulaInputs: Number(dagDefects.missing_formula_inputs),
        orphanResources: Number(dagDefects.orphan_resources),
        duplicateResourceRows: Number(dagDefects.duplicate_resource_rows),
        invalidFormulaHashes,
        invalidResourceHashes,
        missingUnits,
      },
      blockers: uniqueFailures,
    };
    const terminal = { ...body, terminalSummarySha256: sha256(body) };
    const evidencePath = resolve(ROOT, `26_identity_11610_${source.commitSha}.json`);
    writeImmutableJson(evidencePath, terminal);
    process.stdout.write(`${JSON.stringify({
      gate: terminal.gate,
      globalStatus: terminal.globalStatus,
      sourceCommitSha: source.commitSha,
      evidencePath,
      evidenceSha256: sha256Bytes(readFileSync(evidencePath)),
      identity: terminal.identity,
      releaseSearchParity: terminal.releaseSearchParity,
      formulaDag: terminal.formulaDag,
      blockers: terminal.blockers,
    }, null, 2)}\n`);
    if (uniqueFailures.length > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
