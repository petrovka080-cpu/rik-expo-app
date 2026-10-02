import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { CONCRETE_R5_OFFICIAL_SOURCES } from "../concreteBackendR5/concreteR5Sources";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch008-current-gap-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const EVIDENCE_ROOT = resolve(".release-runtime/batch008-concrete-r5/evidence");
const SNAPSHOT_PATH = resolve(EVIDENCE_ROOT, "03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl");
const NORMATIVE_UNIVERSE_PATH = resolve(EVIDENCE_ROOT, "01-discovery/OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl");
const PREDECESSOR_MANIFEST_PATH = resolve(
  ".release-runtime/batch008-concrete-r5/predecessor-batch007/manifest.json",
);
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/concrete-batch008-current-gap-v1/acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const HISTORICAL_RELEASE_ID = "f939d30c-621d-5c65-ba08-d93723689406";
const DEFAULT_BATCH = "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const SOURCE_PATHS = [
  "scripts/estimate/concreteBackendR5/concreteR5Model.ts",
  "scripts/estimate/concreteBackendR5/concreteR5Sources.ts",
  "scripts/estimate/concreteBackendR5/buildConcreteR5Release.ts",
  "scripts/estimate/concreteBackendR5/fetchConcreteR5NormativeSources.ts",
  "scripts/estimate/r4a13/auditS2721Batch008CurrentGap.ts",
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
    `STOP_S2721_BATCH008_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_BATCH008_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH008_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH008_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH008_POINTER_STATE");

  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = [...new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-008")
    .flatMap((group) => group.member_catalog_ids))].sort();
  invariant(contentIds.length === 768, `STOP_S2721_BATCH008_CONTENT_DENOMINATOR:${contentIds.length}`);
  const targetIds = contentIds.map(targetCatalogId);

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
    invariant(manifestRows.length === 768, "STOP_S2721_BATCH008_MANIFEST_DENOMINATOR");
    const missing = manifestRows.filter((row) => row.source_batch == null);
    const generic = manifestRows.filter((row) => row.source_batch === DEFAULT_BATCH);
    const specialized = manifestRows.filter((row) => row.source_batch != null && row.source_batch !== DEFAULT_BATCH);
    const specializedByBatch = [...specialized.reduce((groups, row) => {
      const key = String(row.source_batch);
      const currentGroup = groups.get(key) ?? { sourceBatch: key, definitions: 0, parameters: 0, formulas: 0, resources: 0 };
      currentGroup.definitions += 1;
      currentGroup.parameters += Number(row.parameters);
      currentGroup.formulas += Number(row.formulas);
      currentGroup.resources += Number(row.resources);
      groups.set(key, currentGroup);
      return groups;
    }, new Map<string, { sourceBatch: string; definitions: number; parameters: number; formulas: number; resources: number }>()).values()]
      .sort((left, right) => right.definitions - left.definitions || left.sourceBatch.localeCompare(right.sourceBatch));

    const historical = (await client.query(`select
        count(*)::int definitions,
        (select count(*) from public.estimate_parameter_definition parameter
          join public.estimate_definition_version version on version.id=parameter.definition_version_id
          where version.release_id=$1)::int parameters,
        (select count(*) from public.estimate_formula_graph formula
          join public.estimate_definition_version version on version.id=formula.definition_version_id
          where version.release_id=$1)::int formulas,
        (select count(*) from public.estimate_resource_spec resource
          join public.estimate_definition_version version on version.id=resource.definition_version_id
          where version.release_id=$1)::int resources
      from public.estimate_definition_version where release_id=$1`, [HISTORICAL_RELEASE_ID])).rows[0] as Json;
    const inputShape = (await client.query(`select
        count(*) filter(where parameter.parameter_id like '%_quantity')::int component_quantity_inputs,
        count(*) filter(where parameter.parameter_id ~ '_(labor_norm|machine_norm|test_interval|mass_kg_per_unit|waste_factor)$')::int rate_factor_inputs,
        count(*) filter(where parameter.parameter_id like '%document_lot')::int document_inputs
      from public.estimate_parameter_definition parameter
      join public.estimate_definition_version version on version.id=parameter.definition_version_id
      where version.release_id=$1`, [HISTORICAL_RELEASE_ID])).rows[0] as Json;
    const resourceShape = (await client.query(`select
        count(*) filter(where resource.section='Документация')::int document_rows,
        count(*) filter(where resource.section='Контроль качества')::int quality_control_rows,
        count(*) filter(where not resource.procurement_eligible)::int non_procurement_rows,
        count(*) filter(where binding.resource_spec_id is null)::int missing_normalized_norm_bindings,
        count(*) filter(where resource.source_metadata#>>'{normative,officialPdfSha256}' is not null
          and resource.source_metadata#>>'{normative,exactLocator}' is not null)::int embedded_exact_trace_rows,
        count(distinct resource.source_metadata#>>'{normative,officialPdfSha256}')
          filter(where resource.source_metadata#>>'{normative,officialPdfSha256}' is not null)::int embedded_official_pdf_hashes
      from public.estimate_resource_spec resource
      join public.estimate_definition_version version on version.id=resource.definition_version_id
      left join public.estimate_work_normative_binding binding
        on binding.resource_spec_id=resource.id and binding.definition_version_id=version.id
      where version.release_id=$1`, [HISTORICAL_RELEASE_ID])).rows[0] as Json;
    const historicalShape = Object.fromEntries(Object.entries(historical)
      .map(([key, value]) => [key, Number(value)]));
    const manualInputShape = Object.fromEntries(Object.entries(inputShape)
      .map(([key, value]) => [key, Number(value)]));
    const controlShape = Object.fromEntries(Object.entries(resourceShape)
      .map(([key, value]) => [key, Number(value)]));
    invariant(historicalShape.definitions === 768 && historicalShape.parameters === 224876
      && historicalShape.formulas === 273710 && historicalShape.resources === 273714,
    `STOP_S2721_BATCH008_HISTORICAL_SHAPE:${JSON.stringify(historicalShape)}`);

    const snapshotPresent = existsSync(SNAPSHOT_PATH);
    const normativeUniversePresent = existsSync(NORMATIVE_UNIVERSE_PATH);
    const predecessorManifestPresent = existsSync(PREDECESSOR_MANIFEST_PATH);
    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "RED_S2721_BATCH008_REMAINING_GENERIC_MISSING_AND_FROZEN_SOURCE_EVIDENCE_BLOCK_PUBLICATION",
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
        specializedSourceBatchCount: specializedByBatch.length,
        missingCatalogIds: missing.map((row) => row.catalog_id),
        specializedByBatch,
      },
      availableR5Alternative: {
        historicalPreparedReleaseId: HISTORICAL_RELEASE_ID,
        historicalPersistedShape: historicalShape,
        manualInputShape,
        controlShape,
        officialSourceCount: CONCRETE_R5_OFFICIAL_SOURCES.length,
        officialSnapshotPath: SNAPSHOT_PATH,
        officialSnapshotPresent: snapshotPresent,
        normativeUniversePath: NORMATIVE_UNIVERSE_PATH,
        normativeUniversePresent,
        predecessorManifestPath: PREDECESSOR_MANIFEST_PATH,
        predecessorManifestPresent,
        sourceCurrentParityVerified: false,
        acceptableAsCurrentQ7Green: false,
        rejectionReasons: [
          "SOURCE_MODEL_CANNOT_BE_REBUILT_WITHOUT_FROZEN_DISCOVERY_AND_NORMATIVE_EVIDENCE",
          "EXACT_HVAC_PREDECESSOR_PACKAGE_IS_ABSENT",
          "OFFICIAL_PAGE_AND_PDF_SNAPSHOT_EVIDENCE_IS_ABSENT",
          "COMPONENT_QUANTITIES_AND_RATE_FACTORS_REMAIN_ROW_LEVEL_INPUTS",
          "DOCUMENT_AND_QUALITY_CONTROL_DETAIL_REMAINS_SEPARATELY_PAYABLE_NOISE",
          "CURRENT_CUMULATIVE_RELEASE_ALREADY_HAS_449_NEWER_SPECIALIZED_TARGETS_THAT_MUST_NOT_BE_OVERWRITTEN",
        ],
      },
      blockers: [
        {
          code: "CURRENT_MANIFEST_GENERIC_OR_MISSING",
          count: generic.length + missing.length,
          nextAction: "Repair only the remaining 301 default and 18 missing targets; preserve all 449 accepted successors.",
        },
        {
          code: "FROZEN_SOURCE_EVIDENCE_AND_PREDECESSOR_MISSING",
          count: Number(!snapshotPresent) + Number(!normativeUniversePresent) + Number(!predecessorManifestPresent),
          nextAction: "Restore exact predecessor, snapshots and extracted normative universe before source-current rebuild/parity claims.",
        },
        {
          code: "ROW_LEVEL_COMPONENT_AND_RATE_INPUT_BURDEN",
          count: manualInputShape.component_quantity_inputs + manualInputShape.rate_factor_inputs,
          nextAction: "Compute quantities/rates from geometry, reinforcement, pour and equipment facts wherever exact rules exist.",
        },
        {
          code: "PAYABLE_DOCUMENT_AND_QUALITY_CONTROL_NOISE",
          count: controlShape.document_rows + controlShape.quality_control_rows,
          nextAction: "Collapse included control/document detail and keep only separately payable applicable services.",
        },
      ],
      checks: {
        historicalCandidateInspectedReadOnly: true,
        sourceCurrentParityVerified: false,
        acceptedSpecializedTargetsPreserved: specialized.length,
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
