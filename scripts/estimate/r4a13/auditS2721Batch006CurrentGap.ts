import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildWaterBackendDefinitions,
  WATER_OFFICIAL_SOURCES,
} from "../waterBackendR3/waterDomainModel";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch006-current-gap-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const OFFICIAL_CACHE = resolve(".release-runtime/batch006-water-backend-r3/official-source-cache");
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/water-batch006-current-gap-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const HISTORICAL_RELEASE_ID = "972a1030-c3e7-5493-ba93-e42a4c86b058";
const DEFAULT_BATCH = "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const SOURCE_PATHS = [
  "scripts/estimate/waterBackendR3/waterDomainModel.ts",
  "scripts/estimate/waterBackendR3/waterR5ProfessionalModel.ts",
  "scripts/estimate/waterBackendR3/buildWaterBackendRelease.ts",
  "tests/estimateBackend/waterIndependentOracleA1.contract.test.ts",
  "tests/estimateBackend/waterBackendR6A2.contract.test.ts",
  "tests/estimateBackend/waterBackendR5.contract.test.ts",
  "scripts/estimate/r4a13/auditS2721Batch006CurrentGap.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function targetCatalogId(sourceCatalogId: string): string {
  return sourceCatalogId.startsWith("expanded-template:")
    ? sourceCatalogId
    : `canonical-work:base:${sourceCatalogId}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_BATCH006_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_BATCH006_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH006_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH006_MASTER_HASH");

  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH006_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = [...new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-006")
    .flatMap((group) => group.member_catalog_ids))].sort();
  invariant(contentIds.length === 689, `STOP_S2721_BATCH006_CONTENT_DENOMINATOR:${contentIds.length}`);

  const definitions = buildWaterBackendDefinitions();
  const contentSet = new Set(contentIds);
  const contentDefinitions = definitions.filter((definition) => contentSet.has(definition.work.catalogId));
  const externalDefinitions = definitions.filter((definition) => !contentSet.has(definition.work.catalogId));
  invariant(definitions.length === 874 && contentDefinitions.length === 689
    && externalDefinitions.length === 185, "STOP_S2721_BATCH006_SOURCE_BOUNDARY");
  const targetIds = contentDefinitions.map((definition) => targetCatalogId(definition.work.catalogId));

  const sourceShape = contentDefinitions.reduce((shape, definition) => ({
    definitions: shape.definitions + 1,
    parameters: shape.parameters + definition.parameters.length,
    formulas: shape.formulas + definition.formulas.length,
    resources: shape.resources + definition.resources.length,
    documentRows: shape.documentRows + definition.resources.filter((resource) =>
      resource.resourceGraph.componentRole === "DOCUMENT"
      || resource.semanticOwner.startsWith("documentation:")).length,
    testRows: shape.testRows + definition.resources.filter((resource) =>
      resource.resourceGraph.componentRole === "TEST").length,
    nonProcurementRows: shape.nonProcurementRows + definition.resources.filter((resource) =>
      !resource.procurementEligible).length,
  }), {
    definitions: 0,
    parameters: 0,
    formulas: 0,
    resources: 0,
    documentRows: 0,
    testRows: 0,
    nonProcurementRows: 0,
  });

  const artifactAudit = WATER_OFFICIAL_SOURCES.map((source) => {
    const path = resolve(OFFICIAL_CACHE, source.artifactFile);
    const present = existsSync(path);
    const actualSha256 = present ? sha256(readFileSync(path)) : null;
    return {
      sourceId: source.sourceId,
      artifactFile: source.artifactFile,
      expectedSha256: source.artifactSha256,
      present,
      actualSha256,
      exact: actualSha256 === source.artifactSha256,
    };
  });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const manifestRows = (await client.query(`select target.catalog_id,
        manifest.source_batch,definition.definition_version,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id) resources
      from unnest($2::text[]) target(catalog_id)
      left join public.estimate_cumulative_manifest_entry manifest
        on manifest.release_id=$1 and manifest.catalog_id=target.catalog_id
      left join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      order by target.catalog_id`, [current.definitionReleaseId, targetIds])).rows as Json[];
    invariant(manifestRows.length === 689, "STOP_S2721_BATCH006_MANIFEST_DENOMINATOR");
    const missing = manifestRows.filter((row) => row.source_batch == null);
    const generic = manifestRows.filter((row) => row.source_batch === DEFAULT_BATCH);
    const specialized = manifestRows.filter((row) => row.source_batch != null && row.source_batch !== DEFAULT_BATCH);

    const historical = (await client.query(`select count(*)::int definitions,
        sum((select count(*) from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id))::int parameters,
        sum((select count(*) from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id))::int formulas,
        sum((select count(*) from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id))::int resources
      from unnest($2::text[]) target(catalog_id)
      join public.estimate_cumulative_manifest_entry manifest
        on manifest.release_id=$1 and manifest.catalog_id=target.catalog_id
      join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id`, [HISTORICAL_RELEASE_ID, contentIds])).rows[0] as Json;
    const historicalShape = Object.fromEntries(Object.entries(historical)
      .map(([key, value]) => [key, Number(value)])) as Json;
    invariant(Object.entries(sourceShape).every(([key, value]) =>
      !(key in historicalShape) || historicalShape[key] === value),
    `STOP_S2721_BATCH006_HISTORICAL_SOURCE_SHAPE:${JSON.stringify({ sourceShape, historicalShape })}`);

    const exactArtifacts = artifactAudit.filter((artifact) => artifact.exact).length;
    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "RED_S2721_BATCH006_SOURCE_ARTIFACTS_AND_PAYABLE_CONTROL_NOISE_BLOCK_PUBLICATION",
      mutationPerformed: false,
      current: {
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
        owner: current.owner,
        contentTargetCount: contentIds.length,
        presentCount: manifestRows.length - missing.length,
        missingCount: missing.length,
        genericUniformCount: generic.length,
        specializedCount: specialized.length,
        missingCatalogIds: missing.map((row) => row.catalog_id),
        specialized: specialized.map((row) => ({
          catalogId: row.catalog_id,
          sourceBatch: row.source_batch,
          shape: [Number(row.parameters), Number(row.formulas), Number(row.resources)],
        })),
      },
      availableR6A2Alternative: {
        sourceDefinitionCount: definitions.length,
        contentDefinitionCount: contentDefinitions.length,
        outsideCurrentBatchContentCount: externalDefinitions.length,
        shape: sourceShape,
        historicalPreparedReleaseId: HISTORICAL_RELEASE_ID,
        historicalPersistedShape: historicalShape,
        historicalSourceShapeParity: true,
        officialArtifactCount: artifactAudit.length,
        exactOfficialArtifactCount: exactArtifacts,
        artifactAudit,
        acceptableAsCurrentQ5Green: false,
        rejectionReasons: [
          "REQUIRED_OFFICIAL_SOURCE_ARTIFACT_CACHE_IS_NOT_AVAILABLE_FOR_EXACT_SHA_REVERIFICATION",
          "DOCUMENT_CONTROL_AND_HANDOVER_DETAIL_IS_EXPOSED_AS_SEPARATE_ESTIMATE_ROWS",
          "CURRENT_CUMULATIVE_MANIFEST_REMAINS_MOSTLY_UNIFORM_GENERIC_CONTENT",
        ],
      },
      blockers: [
        {
          code: "REQUIRED_OFFICIAL_SOURCE_ARTIFACTS_NOT_EXACT",
          count: artifactAudit.length - exactArtifacts,
          nextAction: "Restore the recorded official artifacts by exact SHA-256; do not substitute labels or unverified downloads.",
        },
        {
          code: "PAYABLE_DOCUMENT_CONTROL_NOISE",
          count: sourceShape.documentRows,
          nextAction: "Collapse included documentation/control/handover detail; retain only separately payable applicable services.",
        },
        {
          code: "CURRENT_MANIFEST_GENERIC_OR_MISSING",
          count: generic.length + missing.length,
          nextAction: "Replace family by family after source artifact and row-scope repair, preserving the three accepted successors.",
        },
      ],
      checks: {
        sourceBuiltFromCurrentWorktree: true,
        historicalSourceShapeParity: true,
        productionAccessed: false,
        deployPerformed: false,
        activationPerformed: false,
      },
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        tree: git("rev-parse", "HEAD^{tree}"),
        inventoryPath: INVENTORY_PATH,
        inventorySha256: sha256(readFileSync(INVENTORY_PATH)),
        sourceHashes: SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
      },
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    };
    receipt.receiptSha256 = sha256(receipt);
    atomicJson(OUTPUT_PATH, receipt);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main();
