import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_high_load";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/stairs-concrete-vibration-high-load-successor/independent-acceptance.json",
);
const CONDITION_PARAMETER_IDS = [
  "high_load_placement_continuity_plan_reference",
  "high_load_geometry_reinforcement_layout_reference",
  "high_load_equipment_selection_plan_reference",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function parameterIds(ast: unknown): string[] {
  if (!ast || typeof ast !== "object" || Array.isArray(ast)) return [];
  const node = ast as Json;
  const own = typeof node.parameterId === "string" ? [node.parameterId] : [];
  const children = Array.isArray(node.operands) ? node.operands : [];
  return [...new Set([...own, ...children.flatMap(parameterIds)])].sort();
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
        parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_23_HIGH_LOAD_READBACK_RELEASE");
    const target = (await client.query(`select manifest.catalog_id,
        manifest.definition_version_id::text,manifest.source_batch,
        manifest.runtime_publication_state,manifest.approved_template_baseline_id::text,
        definition.definition_version,definition.content_status,definition.content_gate_status,
        passport.parameter_count,passport.formula_count,passport.resource_count,
        passport.payload_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      current.definitionReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_23_HIGH_LOAD_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "26:18:25", "STOP_S27_23_HIGH_LOAD_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN", "STOP_S27_23_HIGH_LOAD_READBACK_GATE");

    const parameters = (await client.query(`select parameter_id
      from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal`, [
      target.definition_version_id,
    ])).rows.map((row) => String(row.parameter_id));
    const formulas = (await client.query(`select formula_id,expression_source
      from public.estimate_formula_graph where definition_version_id=$1`, [
      target.definition_version_id,
    ])).rows as Json[];
    const resources = (await client.query(`select row_id,inclusion_ast,resource_graph,
        procurement_eligible from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id])).rows as Json[];
    const binding = (await client.query(`select locator.locator_key,locator.excerpt_sha256
      from public.estimate_work_normative_binding binding
      join public.estimate_normative_locator locator on locator.id=binding.locator_id
      where binding.definition_version_id=$1`, [target.definition_version_id])).rows[0] as
      Json | undefined;
    const baseline = (await client.query(`select input_values,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`, [
      target.approved_template_baseline_id,
    ])).rows[0] as Json | undefined;
    const search = (await client.query(`select document.definition_version_id::text,
        document.selectable,document.adjudication_class,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;

    for (const parameterId of CONDITION_PARAMETER_IDS) {
      invariant(parameters.includes(parameterId),
        `STOP_S27_23_HIGH_LOAD_READBACK_PARAMETER:${parameterId}`);
      invariant(String(baseline?.input_values?.[parameterId] ?? "").length > 0,
        `STOP_S27_23_HIGH_LOAD_READBACK_BASELINE_INPUT:${parameterId}`);
    }
    const resourceById = new Map(resources.map((row) => [String(row.row_id), row]));
    const dependencyChecks = {
      internalVibration: {
        rowId: "concrete-stairs-vibration-high-load:03:operation:internal-vibration",
        parameters: [
          "high_load_geometry_reinforcement_layout_reference",
          "high_load_placement_continuity_plan_reference",
        ],
      },
      activeVibrator: {
        rowId: "concrete-stairs-vibration-high-load:03:equipment:active-vibrator",
        parameters: [
          "high_load_equipment_selection_plan_reference",
          "high_load_geometry_reinforcement_layout_reference",
        ],
      },
      backupVibrator: {
        rowId: "concrete-stairs-vibration-high-load:03:equipment:backup-vibrator",
        parameters: [
          "high_load_equipment_selection_plan_reference",
          "high_load_placement_continuity_plan_reference",
        ],
      },
      cleaningWater: {
        rowId: "concrete-stairs-vibration-high-load:04:consumable:cleaning-water",
        parameters: ["high_load_equipment_selection_plan_reference"],
      },
      qualityRecord: {
        rowId: "concrete-stairs-vibration-high-load:05:control:quality-record",
        parameters: ["high_load_placement_continuity_plan_reference"],
      },
    };
    for (const [key, check] of Object.entries(dependencyChecks)) {
      const actual = parameterIds(resourceById.get(check.rowId)?.inclusion_ast);
      invariant(JSON.stringify(actual) === JSON.stringify(check.parameters),
        `STOP_S27_23_HIGH_LOAD_READBACK_DEPENDENCY:${key}:${actual.join(",")}`);
    }
    const formulaMap = new Map(formulas.map((row) => [String(row.formula_id),
      String(row.expression_source)]));
    invariant(formulaMap.get("stairs_concrete_vibration_labor_hours_s2723")
      === "consolidated_concrete_volume_m3/labor_productivity_m3_per_man_hour"
      && formulaMap.get("stairs_concrete_vibration_machine_hours_s2723")
      === "consolidated_concrete_volume_m3/machine_productivity_m3_per_machine_hour"
      && formulaMap.get("stairs_concrete_vibration_cleaning_water_s2723")
      === "active_vibrator_count*cleaning_water_m3_per_used_vibrator",
    "STOP_S27_23_HIGH_LOAD_READBACK_FORMULAS");
    invariant(binding?.locator_key === "stairs-concrete-vibration-high-load-s27-23",
      "STOP_S27_23_HIGH_LOAD_READBACK_LOCATOR");
    invariant(search != null, "STOP_S27_23_HIGH_LOAD_READBACK_SEARCH_MISSING");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_23_HIGH_LOAD_READBACK_SEARCH");
    const persistedSearch = search;

    const receipt: Json = {
      schemaVersion: "rik-expo-app.s27-23.stairs-high-load-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_CORE_NOT_UI_ACCEPTED",
      release: {
        id: release.id,
        status: release.status,
        activatedAt: release.activated_at,
        definitionCount: Number(release.definition_count),
        parameterCount: Number(release.parameter_count),
        formulaCount: Number(release.formula_count),
        resourceRowCount: Number(release.resource_row_count),
        sourceManifestSha256: release.source_manifest_sha256,
      },
      target: {
        catalogId: target.catalog_id,
        definitionVersionId: target.definition_version_id,
        definitionVersion: target.definition_version,
        approvedTemplateBaselineId: target.approved_template_baseline_id,
        sourceBatch: target.source_batch,
        definitionShape: [26, 18, 25],
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        conditionParameterIds: CONDITION_PARAMETER_IDS,
        persistedDependencyChecks: dependencyChecks,
        procurementEligibleRows: resources.filter((row) => row.procurement_eligible).length,
        normativeLocator: binding,
        payloadSha256: target.payload_sha256,
      },
      search: {
        id: current.searchReleaseId,
        status: persistedSearch.status,
        selectable: persistedSearch.selectable,
        adjudicationClass: persistedSearch.adjudication_class,
      },
      hiddenHighLoadMultiplier: false,
      scopeClassification: "ATOMIC_OPERATION_NOT_COMPLETE_STAIR_CONSTRUCTION",
      uiAcceptance: {
        web: false,
        android: false,
        editPersistenceHistory: false,
        procurementUi: false,
        pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable",
      },
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      storeActionPerformed: false,
    };
    receipt.receiptSha256 = sha256(receipt);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporaryPath = `${OUTPUT_PATH}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      receiptSha256: receipt.receiptSha256,
      outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
