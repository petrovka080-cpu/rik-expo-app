import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildAllBatch005R4CanonicalBackendDefinitions,
} from "../r5/batch005R4SharedCoreProjection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch005-current-gap-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/electrical-batch005-current-gap-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const HISTORICAL_RELEASE_ID = "cad2a7bf-7faa-44eb-9e89-268dcaf8d4a5";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/domains/electricalComplete/inventory.ts",
  "src/lib/estimate/v4/domains/electricalComplete/domainPackage.ts",
  "src/lib/estimate/v4/domains/electricalComplete/maximumResourceScopeV2.ts",
  "src/lib/estimate/v4/domains/electricalComplete/parameterProfileV2.ts",
  "scripts/estimate/r5/batch005R4SharedCoreProjection.ts",
  "tests/estimateBackend/batch005R4BackendProjection.contract.test.ts",
  "scripts/estimate/r4a13/auditS2721Batch005CurrentGap.ts",
] as const;

const COLLAPSED_CONTROL_ROW = /:row:(?:doc_|[^:]*_doc_|hse_|qa_|handover_|op_mark_verify$|op_replace_record$|op_replace_closeout$|op_test_protocol$)/u;

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

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_BATCH005_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_BATCH005_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
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

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S2721_BATCH005_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S2721_BATCH005_MASTER_HASH");

  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH005_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = [...new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-005")
    .flatMap((group) => group.member_catalog_ids))].sort();
  invariant(contentIds.length === 497, `STOP_S2721_BATCH005_CONTENT_DENOMINATOR:${contentIds.length}`);

  const definitions = buildAllBatch005R4CanonicalBackendDefinitions();
  const contentIdSet = new Set(contentIds);
  const contentDefinitions = definitions.filter((definition) => contentIdSet.has(definition.catalogId));
  const externalDefinitions = definitions.filter((definition) => !contentIdSet.has(definition.catalogId));
  invariant(definitions.length === 605 && contentDefinitions.length === 497
    && externalDefinitions.length === 108, "STOP_S2721_BATCH005_SOURCE_BOUNDARY");

  const targetIds = contentDefinitions.map((definition) => targetCatalogId(definition.catalogId));
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
    invariant(manifestRows.length === 497, "STOP_S2721_BATCH005_MANIFEST_AUDIT_DENOMINATOR");

    const missing = manifestRows.filter((row) => row.source_batch == null);
    const generic = manifestRows.filter((row) =>
      row.source_batch === "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2"
      && Number(row.parameters) === 1 && Number(row.formulas) === 63 && Number(row.resources) === 63);
    const specialized = manifestRows.filter((row) => row.source_batch != null && !generic.includes(row));

    const historical = (await client.query(`select count(*)::int definitions,
        sum((select count(*) from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id))::int parameters,
        sum((select count(*) from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id))::int formulas,
        sum((select count(*) from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id))::int resources,
        min((select count(*) from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id))::int min_resources,
        max((select count(*) from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id))::int max_resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      where manifest.release_id=$1`, [HISTORICAL_RELEASE_ID])).rows[0] as Json;

    const sourceShape = contentDefinitions.reduce((shape, definition) => ({
      definitions: shape.definitions + 1,
      parameters: shape.parameters + definition.passport.parameters.length,
      formulas: shape.formulas + definition.runtimeFormulas.length,
      resources: shape.resources + definition.resources.length,
      collapsedControlRows: shape.collapsedControlRows + definition.resources.filter((resource) =>
        COLLAPSED_CONTROL_ROW.test(resource.rowId)).length,
      rowLevelQuantityParameters: shape.rowLevelQuantityParameters + definition.runtimeFormulas
        .filter((formula) => formula.inputParameterIds.length === 1
          && formula.inputParameterIds[0]?.startsWith("quantity_")).length,
    }), {
      definitions: 0,
      parameters: 0,
      formulas: 0,
      resources: 0,
      collapsedControlRows: 0,
      rowLevelQuantityParameters: 0,
    });
    invariant(sourceShape.definitions === Number(historical.definitions)
      && sourceShape.formulas === Number(historical.formulas)
      && sourceShape.resources === Number(historical.resources),
    `STOP_S2721_BATCH005_HISTORICAL_GRAPH_DENOMINATOR:${JSON.stringify({ sourceShape, historical })}`);
    const historicalParameterDrift = sourceShape.parameters - Number(historical.parameters);
    invariant(historicalParameterDrift !== 0,
      "STOP_S2721_BATCH005_EXPECTED_CURRENT_PARAMETER_DRIFT_MISSING");

    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "RED_S2721_BATCH005_CURRENT_CONTENT_NOT_ACCEPTABLE_FOR_CUMULATIVE_PUBLICATION",
      mutationPerformed: false,
      current: {
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
        owner: current.owner,
        contentTargetCount: 497,
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
        sourceDefinitionCount: definitions.length,
        contentDefinitionCount: contentDefinitions.length,
        externalReferenceCount: externalDefinitions.length,
        workGroupCount: new Set(definitions.map((definition) => definition.group)).size,
        shape: sourceShape,
        historicalPreparedReleaseId: HISTORICAL_RELEASE_ID,
        historicalPersistedShape: Object.fromEntries(Object.entries(historical)
          .map(([key, value]) => [key, Number(value)])),
        historicalParameterDrift,
        acceptableAsCurrentQ4Green: false,
        rejectionReasons: [
          "HISTORICAL_PREPARED_RELEASE_IS_NOT_SOURCE_CURRENT",
          "ROW_LEVEL_QUANTITY_INPUTS_REPLACE_AUTOMATIC_FIRST_ESTIMATE",
          "PAYABLE_DOCUMENT_HSE_QA_HANDOVER_ROWS_MUST_BE_COLLAPSED_OR_SEPARATELY_JUSTIFIED",
          "EVIDENCE_URI_LABELS_DO_NOT_REPLACE_AVAILABLE_EXACT_NUMERIC_NORM_SOURCE_ARTIFACTS",
        ],
      },
      blockers: [
        {
          code: "CURRENT_MANIFEST_CONTENT_IDS_MISSING",
          count: missing.length,
          nextAction: "Restore only after a source-current subject projection and search membership are validated.",
        },
        {
          code: "CURRENT_MANIFEST_GENERIC_UNIFORM_PROFILE",
          count: generic.length,
          nextAction: "Replace by electrical family/operation profiles, not by the old uniform 63-row graph.",
        },
        {
          code: "R4_ALTERNATIVE_ROW_LEVEL_QUANTITY_INPUT_BURDEN",
          count: sourceShape.rowLevelQuantityParameters,
          nextAction: "Bind available route/node/device facts and exact source norms to computed formulas; keep only genuine project inputs.",
        },
        {
          code: "R4_ALTERNATIVE_PAYABLE_CONTROL_NOISE",
          count: sourceShape.collapsedControlRows,
          nextAction: "Collapse included control/document/HSE/acceptance detail and retain only separately payable applicable services.",
        },
      ],
      checks: {
        batch005Contract: "GREEN_4_OF_4",
        focusedEslint: "GREEN_ZERO_WARNINGS_AFTER_ARRAY_STYLE_FIX",
        historicalGraphDenominatorParity: true,
        historicalSourceParity: false,
        historicalParameterDrift,
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
        sourceHashes: SOURCE_PATHS.map((path) => ({
          path,
          sha256: sha256(readFileSync(resolve(path))),
        })),
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
