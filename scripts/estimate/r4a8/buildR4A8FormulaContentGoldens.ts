import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md",
);
const MASTER_SHA256 = "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const FORMULA_CONTRACT_PATH = resolve("data/estimate-benchmarks/r568-r4-a6-formula-remediation-contract.json");
const PROFESSIONAL_CONTRACT_PATH = resolve("data/estimate-benchmarks/r568-r4-a6-professional-boq-contract.json");
const HISTORIC_GOLDEN_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a3-real-estimate-30-goldens-1",
);
const HISTORIC_GOLDEN_SUMMARY_PATH = resolve(HISTORIC_GOLDEN_ROOT, "SUMMARY.json");
const HISTORIC_GOLDEN_SUMMARY_SHA256 = "95f30b3bfa3b3c9d04891264c4db173748e0cbc5d72ddfaed1947a4db56f8147";
const HISTORIC_GOLDEN_MANIFEST_SHA256 = "01c3282fbfc416e26f2815ac7858f9fc6c14cb2642f544427326647d1366fc02";
const A8_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1",
);
const GROUP50_PATH = resolve(
  A8_ROOT,
  "15_scale/group50-5f12064eb9f70a6f1f473c4aa2ed06f06a50e974-terminal/TERMINAL_SUMMARY.json",
);
const IDENTITY_PATH = resolve(
  A8_ROOT,
  "15_scale/26_identity_11610_5f12064eb9f70a6f1f473c4aa2ed06f06a50e974.json",
);
const PLATFORM30_PATH = resolve(
  A8_ROOT,
  "15_scale/platform30-5f12064eb9f70a6f1f473c4aa2ed06f06a50e974-terminal/29_platform_71040_terminal.json",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EXACT_SOURCE_PATHS = [
  "scripts/estimate/r4a8/buildR4A8FormulaContentGoldens.ts",
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  "data/estimate-benchmarks/r568-r4-a6-formula-remediation-contract.json",
  "data/estimate-benchmarks/r568-r4-a6-professional-boq-contract.json",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
] as const;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256(value: unknown): string {
  return sha256Bytes(canonicalEstimateStableJson(value));
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function exactSourceIdentity(): Json {
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...EXACT_SOURCE_PATHS);
  if (dirty) throw new Error(`STOP_A8_FORMULA_GOLDEN_SOURCE_DRIFT:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    committedAt: git("show", "-s", "--format=%cI", "HEAD"),
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
    if (readFileSync(path, "utf8") !== content) throw new Error(`STOP_IMMUTABLE_EVIDENCE_CONFLICT:${path}`);
    return;
  }
  atomicWrite(path, content);
}

function everyCounterZero(value: Json): boolean {
  return Object.values(value).every((counter) => Number(counter) === 0);
}

function assertNoRelevantSourceDrift(terminal: Json, label: string): Json {
  const sourceSha = String(terminal.source?.commitSha ?? "");
  const paths = terminal.source?.paths as string[] | undefined;
  if (!/^[0-9a-f]{40}$/u.test(sourceSha) || !Array.isArray(paths) || paths.length === 0) {
    throw new Error(`STOP_A8_${label}_LINEAGE_MISSING`);
  }
  const changedPaths = git("diff", "--name-only", `${sourceSha}..HEAD`, "--", ...paths)
    .split(/\r?\n/u).filter(Boolean);
  return { sourceCommitSha: sourceSha, exactSourcePaths: paths.length, changedPaths };
}

function auditHistoricGoldens(): { audit: Json; templateIds: string[] } {
  if (!existsSync(HISTORIC_GOLDEN_SUMMARY_PATH)) throw new Error("STOP_A8_HISTORIC_GOLDENS_MISSING");
  const summaryBytes = readFileSync(HISTORIC_GOLDEN_SUMMARY_PATH);
  const summary = JSON.parse(summaryBytes.toString("utf8")) as Json;
  const failures: string[] = [];
  if (sha256Bytes(summaryBytes) !== HISTORIC_GOLDEN_SUMMARY_SHA256) failures.push("summary_sha256");
  if (summary.status !== "GREEN_R4_A3_30_REAL_ESTIMATE_GOLDENS_229_ROWS_137_MATERIALS_420_ARTIFACTS") {
    failures.push("summary_status");
  }
  if (Number(summary.denominator) !== 30 || Number(summary.completed) !== 30
    || Number(summary.totalRows) !== 229 || Number(summary.totalMaterials) !== 137
    || Number(summary.evidenceFileCount) !== 420 || summary.evidenceManifestSha256 !== HISTORIC_GOLDEN_MANIFEST_SHA256) {
    failures.push("protected_denominator");
  }
  const files = summary.files as Json[];
  const fileFailures: Json[] = [];
  for (const entry of files) {
    const path = resolve(HISTORIC_GOLDEN_ROOT, String(entry.path));
    if (!existsSync(path)) {
      fileFailures.push({ path: entry.path, reason: "missing" });
      continue;
    }
    const bytes = readFileSync(path);
    if (bytes.length !== Number(entry.bytes) || sha256Bytes(bytes) !== String(entry.sha256)) {
      fileFailures.push({ path: entry.path, reason: "bytes_or_sha256" });
    }
  }
  if (files.length !== 420 || fileFailures.length > 0) failures.push("artifact_integrity");

  const cases = summary.cases as Json[];
  const fixtureFailures: Json[] = [];
  const templateIds: string[] = [];
  for (const item of cases) {
    const fixtureId = String(item.fixtureId);
    const fixture = loadJson<Json>(resolve(HISTORIC_GOLDEN_ROOT, fixtureId, "fixture.json"));
    const input = loadJson<Json>(resolve(HISTORIC_GOLDEN_ROOT, fixtureId, "input.json"));
    const mandatory = fixture.expectedMandatoryResourceIds as string[];
    const forbidden = new Set(fixture.forbiddenResourceIds as string[]);
    const formulaOwners = fixture.expectedFormulaOwners as Json;
    const overlap = mandatory.filter((rowId) => forbidden.has(rowId));
    const missingFormulaOwners = mandatory.filter((rowId) => !Array.isArray(formulaOwners[rowId])
      || formulaOwners[rowId].length === 0);
    if (fixture.fixtureId !== fixtureId || item.status !== "GREEN"
      || input.selectedTemplateId !== item.templateId || mandatory.length === 0
      || overlap.length > 0 || missingFormulaOwners.length > 0) {
      fixtureFailures.push({ fixtureId, overlap, missingFormulaOwners });
    }
    templateIds.push(String(item.templateId));
  }
  if (cases.length !== 30 || new Set(templateIds).size !== 30 || fixtureFailures.length > 0) {
    failures.push("all_30_scope_regression");
  }
  return {
    templateIds,
    audit: {
      status: failures.length === 0 ? "GREEN_A8_PROTECTED_GOLDENS_30_OF_30" : "RED_A8_PROTECTED_GOLDENS",
      summaryPath: HISTORIC_GOLDEN_SUMMARY_PATH,
      summarySha256: sha256Bytes(summaryBytes),
      fixturesExpected: 30,
      fixturesValidated: cases.length - fixtureFailures.length,
      protectedRows: Number(summary.totalRows),
      protectedMaterials: Number(summary.totalMaterials),
      artifactsExpected: 420,
      artifactsValidated: files.length - fileFailures.length,
      evidenceManifestSha256: summary.evidenceManifestSha256,
      expectedRegenerated: false,
      fixtureFailures,
      fileFailures,
      failures,
    },
  };
}

async function main(): Promise<void> {
  if (sha256Bytes(readFileSync(MASTER_PATH)) !== MASTER_SHA256) throw new Error("STOP_MASTER_TZ_HASH_MISMATCH");
  const source = exactSourceIdentity();
  const outputPath = resolve(A8_ROOT, `11_formula_content_goldens_${source.commitSha}.json`);
  const currentRelease = loadJson<Json>(CURRENT_RELEASE_PATH);
  const formulaContract = loadJson<Json>(FORMULA_CONTRACT_PATH);
  const professionalContract = loadJson<Json>(PROFESSIONAL_CONTRACT_PATH);
  const historic = auditHistoricGoldens();
  const group50 = loadJson<Json>(GROUP50_PATH);
  const identity = loadJson<Json>(IDENTITY_PATH);
  const platform30 = loadJson<Json>(PLATFORM30_PATH);
  const group50Lineage = assertNoRelevantSourceDrift(group50, "GROUP50");
  const identityLineage = assertNoRelevantSourceDrift(identity, "IDENTITY");
  const platform30Lineage = assertNoRelevantSourceDrift(platform30, "PLATFORM30");
  const scaleFailures = [
    group50.status === "GREEN_R4_A6_GROUP50_2368_GROUPS" && Number(group50.passedCases) === 118_400
      && everyCounterZero(group50.counters) && group50Lineage.changedPaths.length === 0 ? "" : "group50",
    identity.gate === "GREEN_R4_A6_IDENTITY_DAG_11610" && Number(identity.identity?.identities) === 11_610
      && identity.blockers?.length === 0 && identityLineage.changedPaths.length === 0 ? "" : "identity",
    platform30.status === "GREEN_R4_A6_PLATFORM_71040" && Number(platform30.platformExecutions) === 71_040
      && everyCounterZero(platform30.counters) && platform30Lineage.changedPaths.length === 0 ? "" : "platform30",
  ].filter(Boolean);

  const releaseId = String(currentRelease.definitionReleaseId);
  const searchReleaseId = String(currentRelease.searchReleaseId);
  const referenceReleaseId = String(professionalContract.predecessorDefinitionReleaseId);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4-a8-formula-content-goldens" });
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout='300s'");
    const goldenMappings = (await client.query(
      `select definition.source_metadata->>'templateId' template_id,
        manifest.catalog_id,manifest.definition_version_id::text,
        manifest.baseline_ready,manifest.scenario_ready,
        document.group_id,document.selectable,document.adjudication_class
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      left join public.estimate_search_document document
        on document.search_release_id=$2 and document.catalog_id=manifest.catalog_id
        and document.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1 and definition.source_metadata->>'templateId'=any($3::text[])
      order by template_id,manifest.catalog_id`,
      [releaseId, searchReleaseId, historic.templateIds],
    )).rows as Json[];
    const mappingCounts = new Map<string, number>();
    for (const row of goldenMappings) {
      const templateId = String(row.template_id);
      mappingCounts.set(templateId, (mappingCounts.get(templateId) ?? 0) + 1);
    }
    const goldenMappingFailures = historic.templateIds.filter((templateId) => mappingCounts.get(templateId) !== 1);
    const goldenMappingNotReady = goldenMappings.filter((row) => row.baseline_ready !== true
      || row.scenario_ready !== true || row.selectable !== true || row.adjudication_class !== "EFFECTIVE_WORK");

    const scopeRows = (await client.query(
      `select manifest.catalog_id,manifest.definition_version_id::text,
        manifest.approved_template_baseline_id::text
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and definition.source_metadata->>'immutableFormulaSuccessor'='true'
      order by manifest.catalog_id`,
      [releaseId],
    )).rows as Json[];
    const referenceScopeRows = (await client.query(
      `select manifest.catalog_id,manifest.definition_version_id::text
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and definition.source_metadata->>'immutableFormulaSuccessor'='true'
      order by manifest.catalog_id`,
      [referenceReleaseId],
    )).rows as Json[];
    const currentIds = scopeRows.map((row) => String(row.definition_version_id));
    const referenceIds = referenceScopeRows.map((row) => String(row.definition_version_id));
    const currentCatalogByDefinition = new Map(scopeRows
      .map((row) => [String(row.definition_version_id), String(row.catalog_id)] as const));
    const referenceCatalogByDefinition = new Map(referenceScopeRows
      .map((row) => [String(row.definition_version_id), String(row.catalog_id)] as const));
    const loadFormulaRows = async (definitionIds: string[]): Promise<Json[]> => (await client.query(
      `select definition_version_id::text,formula_id,expression_source,ast,input_parameter_ids,ast_sha256
      from public.estimate_formula_graph where definition_version_id=any($1::uuid[])
      order by definition_version_id,formula_id`,
      [definitionIds],
    )).rows as Json[];
    const currentFormulaRows = await loadFormulaRows(currentIds);
    const referenceFormulaRows = await loadFormulaRows(referenceIds);
    const semanticFormulas = (rows: Json[], catalogs: Map<string, string>): Json[] => rows.map((row) => ({
      catalogId: catalogs.get(String(row.definition_version_id)),
      formulaId: row.formula_id,
      expressionSource: row.expression_source,
      ast: row.ast,
      inputParameterIds: row.input_parameter_ids,
      astSha256: row.ast_sha256,
    })).sort((left, right) => `${left.catalogId}:${left.formulaId}`.localeCompare(`${right.catalogId}:${right.formulaId}`));
    const currentSemanticFormulas = semanticFormulas(currentFormulaRows, currentCatalogByDefinition);
    const referenceSemanticFormulas = semanticFormulas(referenceFormulaRows, referenceCatalogByDefinition);
    const currentFormulaKeys = new Set(currentSemanticFormulas.map((row) => `${row.catalogId}:${row.formulaId}`));
    const referenceFormulaKeys = new Set(referenceSemanticFormulas.map((row) => `${row.catalogId}:${row.formulaId}`));
    const currentOnly = [...currentFormulaKeys].filter((key) => !referenceFormulaKeys.has(key));
    const referenceOnly = [...referenceFormulaKeys].filter((key) => !currentFormulaKeys.has(key));
    const semanticMismatch = sha256(currentSemanticFormulas) === sha256(referenceSemanticFormulas) ? 0 : 1;
    const invalidAstHashes = currentFormulaRows.filter((row) => sha256(row.ast) !== String(row.ast_sha256));
    const dynamicFormulas = currentFormulaRows.filter((row) => (row.input_parameter_ids?.length ?? 0) > 0).length;
    const fixedFormulas = currentFormulaRows.length - dynamicFormulas;
    const parameterRows = (await client.query(
      `select definition_version_id::text,parameter_id from public.estimate_parameter_definition
      where definition_version_id=any($1::uuid[])`,
      [currentIds],
    )).rows as Json[];
    const parameterKeys = new Set(parameterRows
      .map((row) => `${row.definition_version_id}:${row.parameter_id}`));
    const missingInputs = currentFormulaRows.flatMap((row) => (row.input_parameter_ids as string[])
      .filter((parameterId) => !parameterKeys.has(`${row.definition_version_id}:${parameterId}`))
      .map((parameterId) => `${row.definition_version_id}:${row.formula_id}:${parameterId}`));
    const resourceStats = (await client.query(
      `select count(distinct resource.id)::int resources,
        count(distinct resource.id) filter(where formula.formula_id is null)::int orphan_resources,
        count(binding.route_id)::int price_bindings
      from public.estimate_resource_spec resource
      left join public.estimate_formula_graph formula
        on formula.definition_version_id=resource.definition_version_id and formula.formula_id=resource.formula_id
      left join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource.id
      where resource.definition_version_id=any($1::uuid[])`,
      [currentIds],
    )).rows[0] as Json;
    await client.query("rollback");

    const formulaFailures = [
      scopeRows.length === Number(formulaContract.denominator.definitions) ? "" : "definition_denominator",
      referenceScopeRows.length === Number(formulaContract.denominator.definitions) ? "" : "reference_definition_denominator",
      currentFormulaRows.length === Number(formulaContract.denominator.formulas) ? "" : "formula_denominator",
      dynamicFormulas === Number(formulaContract.denominator.dynamicFormulas) ? "" : "dynamic_denominator",
      fixedFormulas === Number(formulaContract.denominator.explicitFixedFormulas) ? "" : "fixed_denominator",
      currentOnly.length === 0 && referenceOnly.length === 0 && semanticMismatch === 0 ? "" : "reference_parity",
      invalidAstHashes.length === 0 ? "" : "ast_hash",
      missingInputs.length === 0 ? "" : "formula_dependency",
      Number(resourceStats.resources) === currentFormulaRows.length && Number(resourceStats.orphan_resources) === 0
        ? "" : "resource_formula_parity",
      Number(resourceStats.price_bindings) === currentFormulaRows.length ? "" : "price_route_parity",
    ].filter(Boolean);
    const blockers = [
      ...historic.audit.failures.map((failure: string) => `goldens:${failure}`),
      ...goldenMappingFailures.map((failure) => `golden_mapping:${failure}`),
      ...goldenMappingNotReady.map((row) => `golden_not_ready:${row.template_id}`),
      ...formulaFailures.map((failure) => `formula:${failure}`),
      ...scaleFailures.map((failure) => `scale:${failure}`),
    ];
    const body = {
      schemaVersion: "r568-r4-a8-formula-content-goldens.v1",
      capturedAt: source.committedAt,
      status: blockers.length === 0
        ? "GREEN_A8_FORMULA_CONTENT_GOLDENS_30_86_3998"
        : "RED_A8_FORMULA_CONTENT_GOLDENS",
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
      source,
      release: { definitionReleaseId: releaseId, searchReleaseId },
      protectedGoldens: {
        ...historic.audit,
        currentCanonicalMappings: goldenMappings.length,
        uniqueCurrentCanonicalMappings: mappingCounts.size,
        mappingFailures: goldenMappingFailures,
        notReadyMappings: goldenMappingNotReady.length,
        mappingHashSha256: sha256(goldenMappings),
      },
      formulaProtection: {
        status: formulaFailures.length === 0 ? "GREEN_A8_FORMULAS_86_OF_86_3998_OF_3998" : "RED_A8_FORMULAS",
        definitions: scopeRows.length,
        referenceDefinitions: referenceScopeRows.length,
        formulas: currentFormulaRows.length,
        dynamicFormulas,
        explicitFixedFormulas: fixedFormulas,
        resources: Number(resourceStats.resources),
        priceRouteBindings: Number(resourceStats.price_bindings),
        missingFormulaInputs: missingInputs.length,
        orphanResources: Number(resourceStats.orphan_resources),
        invalidAstHashes: invalidAstHashes.length,
        referenceReleaseId,
        currentOnly: currentOnly.length,
        referenceOnly: referenceOnly.length,
        semanticMismatch,
        currentSemanticHashSha256: sha256(currentSemanticFormulas),
        referenceSemanticHashSha256: sha256(referenceSemanticFormulas),
        referenceParity: `${currentFormulaRows.length - currentOnly.length - semanticMismatch}/${currentFormulaRows.length}`,
        remediationRepeated: false,
        activationPerformed: false,
      },
      professionalCompleteness: {
        group50: { path: GROUP50_PATH, status: group50.status, cases: group50.passedCases, lineage: group50Lineage },
        identityDag: { path: IDENTITY_PATH, status: identity.gate, identities: identity.identity?.identities, lineage: identityLineage },
        platform30: { path: PLATFORM30_PATH, status: platform30.status, executions: platform30.platformExecutions, lineage: platform30Lineage },
        scaleFailures,
      },
      blockers,
      productionAccessed: false,
      deployPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
      fakeGreenClaimed: false,
    };
    const receipt = { ...body, receiptSha256: sha256(body) };
    writeImmutableJson(outputPath, receipt);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      outputPath,
      receiptFileSha256: sha256Bytes(readFileSync(outputPath)),
      protectedGoldens: receipt.protectedGoldens,
      formulaProtection: receipt.formulaProtection,
      blockers,
    }, null, 2)}\n`);
    if (blockers.length > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
