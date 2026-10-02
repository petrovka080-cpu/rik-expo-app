import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildHvacPassport,
  HVAC_R4_EXTERNAL_INVENTORY,
  HVAC_R4_OFFICIAL_SOURCES,
} from "../hvacBackendR4/hvacR4Model";
import { HVAC_DOMAIN_INVENTORY } from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch007-current-gap-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const EVIDENCE_ROOT = resolve(".release-runtime/batch007-hvac-r4/evidence");
const SNAPSHOT_PATH = resolve(EVIDENCE_ROOT, "03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl");
const PREDECESSOR_PATH = resolve(
  "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/03-r6-a2-release-b",
);
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/hvac-batch007-current-gap-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const HISTORICAL_RELEASE_ID = "77ae5106-c246-5315-a436-91b2ee0f80d3";
const DEFAULT_BATCH = "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const SOURCE_PATHS = [
  "scripts/estimate/hvacBackendR4/hvacR4Model.ts",
  "scripts/estimate/hvacBackendR4/hvacR4NormativeGapA2.ts",
  "scripts/estimate/hvacBackendR4/buildHvacR4Release.ts",
  "scripts/estimate/hvacBackendR4/fetchHvacR4NormativeSources.ts",
  "src/lib/estimate/v4/domains/heatingVentilationComplete/index.ts",
  "src/lib/estimate/v4/domains/heatingVentilationComplete/inventory.ts",
  "scripts/estimate/r4a13/auditS2721Batch007CurrentGap.ts",
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
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
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
    `STOP_S2721_BATCH007_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_BATCH007_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH007_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH007_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH007_POINTER_STATE");

  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = [...new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-007")
    .flatMap((group) => group.member_catalog_ids))].sort();
  invariant(contentIds.length === 864, `STOP_S2721_BATCH007_CONTENT_DENOMINATOR:${contentIds.length}`);
  const contentSet = new Set(contentIds);
  const contentRows = HVAC_DOMAIN_INVENTORY.filter((row) => contentSet.has(row.catalog_id));
  const sourceDefinitionCount = HVAC_DOMAIN_INVENTORY.length + HVAC_R4_EXTERNAL_INVENTORY.length;
  const outsideBatchCount = sourceDefinitionCount - contentRows.length;
  invariant(HVAC_DOMAIN_INVENTORY.length === 920 && HVAC_R4_EXTERNAL_INVENTORY.length === 92
    && sourceDefinitionCount === 1012 && contentRows.length === 864 && outsideBatchCount === 148,
    "STOP_S2721_BATCH007_SOURCE_BOUNDARY");
  const targetIds = contentIds.map(targetCatalogId);

  const sourceShape = contentRows.reduce((shape, row) => {
    const passport = buildHvacPassport(row);
    return {
      definitions: shape.definitions + 1,
      parameters: shape.parameters + passport.parameters.length,
      formulas: shape.formulas + passport.formulas.length,
      resources: shape.resources + passport.resources.length,
      componentQuantityInputs: shape.componentQuantityInputs + passport.parameters
        .filter((parameter) => parameter.parameterId.endsWith("_quantity")).length,
      rateAndFactorInputs: shape.rateAndFactorInputs + passport.parameters
        .filter((parameter) => /_(?:labor_norm|machine_norm|test_interval|mass_kg_per_unit|waste_factor)$/u
          .test(parameter.parameterId)).length,
      documentRows: shape.documentRows + passport.resources
        .filter((resource) => resource.resourceGraph.componentKind === "DOCUMENT").length,
      interfaceRows: shape.interfaceRows + passport.resources
        .filter((resource) => resource.resourceGraph.componentKind === "INTERFACE").length,
      nonProcurementRows: shape.nonProcurementRows + passport.resources
        .filter((resource) => !resource.procurementEligible).length,
    };
  }, {
    definitions: 0,
    parameters: 0,
    formulas: 0,
    resources: 0,
    componentQuantityInputs: 0,
    rateAndFactorInputs: 0,
    documentRows: 0,
    interfaceRows: 0,
    nonProcurementRows: 0,
  });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const manifestRows = (await client.query(`select target.catalog_id,
        manifest.source_batch,
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
    invariant(manifestRows.length === 864, "STOP_S2721_BATCH007_MANIFEST_DENOMINATOR");
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
    const shapeKeys: (keyof typeof sourceShape)[] = [
      "definitions", "parameters", "formulas", "resources",
    ];
    invariant(shapeKeys.every((key) => historicalShape[key] === sourceShape[key]),
    `STOP_S2721_BATCH007_HISTORICAL_SOURCE_SHAPE:${JSON.stringify({ sourceShape, historicalShape })}`);

    const snapshotPresent = existsSync(SNAPSHOT_PATH);
    const predecessorManifestPath = resolve(PREDECESSOR_PATH, "manifest.json");
    const predecessorManifestPresent = existsSync(predecessorManifestPath);
    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "RED_S2721_BATCH007_PREDECESSOR_SNAPSHOTS_AND_MANUAL_ROW_INPUTS_BLOCK_PUBLICATION",
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
      availableR4Alternative: {
        sourceDefinitionCount,
        contentDefinitionCount: contentRows.length,
        outsideCurrentBatchContentCount: outsideBatchCount,
        shape: sourceShape,
        historicalPreparedReleaseId: HISTORICAL_RELEASE_ID,
        historicalPersistedShape: historicalShape,
        historicalSourceShapeParity: true,
        officialSourceCount: HVAC_R4_OFFICIAL_SOURCES.length,
        officialSnapshotPath: SNAPSHOT_PATH,
        officialSnapshotPresent: snapshotPresent,
        predecessorPath: PREDECESSOR_PATH,
        predecessorManifestPresent,
        acceptableAsCurrentQ6Green: false,
        rejectionReasons: [
          "EXACT_WATER_PREDECESSOR_PACKAGE_IS_ABSENT",
          "OFFICIAL_PAGE_AND_PDF_SNAPSHOT_EVIDENCE_IS_ABSENT",
          "COMPONENT_QUANTITIES_AND_RATE_FACTORS_REMAIN_ROW_LEVEL_INPUTS",
          "DOCUMENT_AND_TYPED_INTERFACE_DETAIL_MUST_BE_COLLAPSED_OR_BOUND_TO_ACCEPTED_CHILD_REVISIONS",
        ],
      },
      blockers: [
        {
          code: "EXACT_PREDECESSOR_PACKAGE_MISSING",
          count: predecessorManifestPresent ? 0 : 1,
          nextAction: "Restore and hash-verify the exact recorded BATCH006 predecessor package before package construction.",
        },
        {
          code: "OFFICIAL_SOURCE_SNAPSHOTS_MISSING",
          count: snapshotPresent ? 0 : HVAC_R4_OFFICIAL_SOURCES.length,
          nextAction: "Create controlled official page/PDF snapshots and retain their byte hashes; do not replace them with registry labels.",
        },
        {
          code: "ROW_LEVEL_COMPONENT_AND_RATE_INPUT_BURDEN",
          count: sourceShape.componentQuantityInputs + sourceShape.rateAndFactorInputs,
          nextAction: "Compute quantities and applicable norms from system/route/equipment facts wherever exact source rules exist.",
        },
        {
          code: "PAYABLE_DOCUMENT_AND_INTERFACE_NOISE",
          count: sourceShape.documentRows + sourceShape.interfaceRows,
          nextAction: "Collapse included control detail and bind typed interfaces to immutable accepted child revisions without double counting.",
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
