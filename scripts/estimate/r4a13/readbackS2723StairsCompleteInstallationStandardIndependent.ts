import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/stairs-complete-installation-standard-successor/independent-acceptance.json",
);
const REQUIRED_STAGE_ROWS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  formwork: [
    "work:formwork:stairs-measured-contact-area",
    "material:formwork:stairs-consumables",
    "labor:formwork:stairs-assembly",
  ],
  reinforcement: [
    "material:reinforcement:steel-approved-schedule",
    "material:reinforcement:binding-wire",
    "material:reinforcement:spacer-chairs",
    "work:reinforcement:install-fix",
  ],
  placement: [
    "material:concrete:ready-mix",
    "work:concrete:place",
    "equipment:concrete:pump",
  ],
  vibration: [
    "concrete-stairs-vibration:03:operation:internal-vibration",
    "concrete-stairs-vibration:03:labor:vibration-crew",
    "concrete-stairs-vibration:03:equipment:rental-shifts",
    "concrete-stairs-vibration:04:consumable:cleaning-water",
  ],
  finishing: [
    "work:concrete:stairs-primary-surface-finishing",
    "labor:concrete:stairs-primary-surface-finishing",
    "equipment:concrete:stairs-finishing-hand-tools",
  ],
  curing: [
    "work:concrete:stairs-external-curing",
    "material:concrete:curing-water",
    "material:concrete:wet-curing-covering",
  ],
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function astParameterIds(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const node = value as Json;
  const own = [node.parameterId, node.id]
    .filter((candidate): candidate is string => typeof candidate === "string");
  return [...new Set([
    ...own,
    ...Object.values(node).flatMap(astParameterIds),
  ])].sort();
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
      "STOP_S27_23_STAIRS_COMPLETE_READBACK_RELEASE");

    const target = (await client.query(`select manifest.catalog_id,
        manifest.definition_version_id::text,manifest.source_batch,
        manifest.runtime_publication_state,manifest.approved_template_baseline_id::text,
        definition.definition_version,definition.content_status,definition.content_gate_status,
        passport.parameter_count,passport.formula_count,passport.resource_count,
        passport.payload_sha256,passport.decision
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      current.definitionReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_23_STAIRS_COMPLETE_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "136:73:76",
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_GATE");

    const parameters = (await client.query(`select parameter_id,truth_metadata
      from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [
      target.definition_version_id,
    ])).rows as Json[];
    const formulas = (await client.query(`select formula_id,expression_source,ast_sha256
      from public.estimate_formula_graph where definition_version_id=$1`, [
      target.definition_version_id,
    ])).rows as Json[];
    const resources = (await client.query(`select row_id,inclusion_ast,resource_graph,
        procurement_eligible,row_sha256
      from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id])).rows as Json[];
    const binding = (await client.query(`select locator.locator_key,locator.excerpt_sha256,
        source.source_key
      from public.estimate_work_normative_binding binding
      join public.estimate_normative_locator locator on locator.id=binding.locator_id
      join public.estimate_normative_source source on source.id=locator.source_id
      where binding.definition_version_id=$1`, [target.definition_version_id])).rows[0] as
      Json | undefined;
    const baseline = (await client.query(`select input_values,input_classification,
        normative_source_ids,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`, [
      target.approved_template_baseline_id,
    ])).rows[0] as Json | undefined;
    const search = (await client.query(`select document.definition_version_id::text,
        document.selectable,document.adjudication_class,document.canonical_name_ru,
        release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(baseline != null, "STOP_S27_23_STAIRS_COMPLETE_READBACK_BASELINE");
    invariant(search != null, "STOP_S27_23_STAIRS_COMPLETE_READBACK_SEARCH_DOCUMENT");

    const parameterIds = new Set(parameters.map((row) => String(row.parameter_id)));
    invariant(!parameterIds.has("reinforcement_applicable")
      && !parameterIds.has("temporary_formwork_applicable")
      && !parameterIds.has("placement_deep_vibrator_machine_h")
      && !parameterIds.has("placement_finishing_worker_h")
      && !parameterIds.has("placement_curing_worker_h"),
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_LEGACY_PARAMETERS");
    for (const parameterId of [
      "stairs_concrete_volume_m3",
      "reinforcement_approved_reinforcement_schedule_weight_kg",
      "formwork_measured_formwork_contact_area_m2",
      "vibration_machine_productivity_m3_per_machine_hour",
      "finishing_exposed_surface_area_m2",
      "external_curing_approved_external_curing_method",
    ]) {
      invariant(parameterIds.has(parameterId),
        `STOP_S27_23_STAIRS_COMPLETE_READBACK_PARAMETER:${parameterId}`);
      invariant(baseline?.input_values?.[parameterId] != null,
        `STOP_S27_23_STAIRS_COMPLETE_READBACK_BASELINE:${parameterId}`);
    }

    const resourceById = new Map(resources.map((row) => [String(row.row_id), row]));
    for (const [stage, rowIds] of Object.entries(REQUIRED_STAGE_ROWS)) {
      for (const rowId of rowIds) {
        invariant(resourceById.has(rowId),
          `STOP_S27_23_STAIRS_COMPLETE_READBACK_STAGE:${stage}:${rowId}`);
      }
    }
    for (const legacyRowId of [
      "work:concrete:place-and-compact",
      "equipment:concrete:deep-vibrator",
      "work:concrete:finish-surface",
      "work:concrete:cure",
      "material:concrete:curing-membrane",
    ]) {
      invariant(!resourceById.has(legacyRowId),
        `STOP_S27_23_STAIRS_COMPLETE_READBACK_DOUBLE_COUNT:${legacyRowId}`);
    }
    for (const rowId of [
      "material:reinforcement:steel-approved-schedule",
      "work:formwork:stairs-measured-contact-area",
    ]) {
      const selectorLeaks = astParameterIds(resourceById.get(rowId)?.inclusion_ast)
        .filter((parameterId) => [
          "reinforcement_applicable",
          "temporary_formwork_applicable",
        ].includes(parameterId));
      invariant(selectorLeaks.length === 0,
        `STOP_S27_23_STAIRS_COMPLETE_READBACK_SELECTOR_GATE:${rowId}`);
    }

    const formulaMap = new Map(formulas.map((row) => [String(row.formula_id),
      String(row.expression_source)]));
    invariant(formulaMap.get("stairs_concrete_vibration_labor_hours_s2723")
      === "stairs_concrete_volume_m3/vibration_labor_productivity_m3_per_man_hour"
      && formulaMap.get("stairs_concrete_vibration_machine_hours_s2723")
      === "stairs_concrete_volume_m3/vibration_machine_productivity_m3_per_machine_hour"
      && formulaMap.get("stairs_concrete_vibration_cleaning_water_s2723")
      === "vibration_active_vibrator_count*vibration_cleaning_water_m3_per_used_vibrator"
      && formulaMap.get("stairs_complete_finishing_labor_s2723")
      === "finishing_exposed_surface_area_m2/finishing_labor_productivity_m2_per_man_hour"
      && formulaMap.get("stairs_complete_finishing_tool_sets_s2723")
      === "ceil(finishing_exposed_surface_area_m2/finishing_tool_set_coverage_m2_per_set)",
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_FORMULAS");
    invariant(binding?.locator_key === "stairs-complete-installation-standard-s27-23"
      && binding.source_key === "stairs_complete_installation_standard_s27_23",
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_LOCATOR");
    invariant(search?.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && search.canonical_name_ru === "полное устройство монолитной бетонной лестницы",
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_SEARCH");
    const completenessEntries = target.decision?.independentCompletenessMap?.entries;
    invariant(Array.isArray(completenessEntries)
      && completenessEntries.length >= 50,
    "STOP_S27_23_STAIRS_COMPLETE_READBACK_COMPLETENESS_MAP");

    const receipt: Json = {
      schemaVersion:
        "rik-expo-app.s27-23.stairs-complete-standard-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status:
        "GREEN_S27_23_STAIRS_COMPLETE_INSTALLATION_STANDARD_CORE_NOT_UI_ACCEPTED",
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
        definitionShape: [136, 73, 76],
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        persistedStageRows: REQUIRED_STAGE_ROWS,
        legacyDoubleCountRowsPresent: false,
        fullWorkSelectorGatesPresent: false,
        procurementEligibleDefinitionRows:
          resources.filter((row) => row.procurement_eligible).length,
        independentCompletenessEntryCount: completenessEntries.length,
        normativeLocator: binding,
        payloadSha256: target.payload_sha256,
      },
      baseline: {
        volumeM3: baseline.input_values.stairs_concrete_volume_m3,
        reinforcementKg:
          baseline.input_values.reinforcement_approved_reinforcement_schedule_weight_kg,
        formworkContactAreaM2:
          baseline.input_values.formwork_measured_formwork_contact_area_m2,
        finishingAreaM2: baseline.input_values.finishing_exposed_surface_area_m2,
        curingMethod:
          baseline.input_values.external_curing_approved_external_curing_method,
        normativeSourceIds: baseline.normative_source_ids,
        acceptanceEvidenceSha256: baseline.acceptance_evidence_sha256,
      },
      search: {
        id: current.searchReleaseId,
        status: search.status,
        selectable: search.selectable,
        adjudicationClass: search.adjudication_class,
        canonicalNameRu: search.canonical_name_ru,
      },
      scopeClassification: "COMPLEX_STANDARD_MONOLITHIC_STAIRS",
      firstEstimate: {
        knownVolumeOnlyRows: 24,
        knownVolumeOnlyVisibleNeeds: 52,
        completedVisibleRows: 58,
        completedIncludedEstimateRows: 48,
        completedProcurementRows: 34,
      },
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
