import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { parseCanonicalCatalogSearchIntent } from
  "../../../src/lib/estimate/backendPlatform/catalogSearchIntent";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const VARIANT = process.env.S2723_SLAB_FOUNDATION_VARIANT === "repair"
  ? "repair"
  : "standard";
const CONFIG: Json = VARIANT === "repair" ? {
  catalogId:
    "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair",
  outputPath:
    ".release-runtime/r568/s27-23/slab-foundation-local-repair-full-cycle-current/independent-acceptance.json",
  prompt:
    "Нужна полная смета плитного фундамента 150 м² с локальным ремонтом основания.",
  area: 150,
  status:
    "GREEN_S27_23_SLAB_FOUNDATION_150M2_LOCAL_REPAIR_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
  expected: { readyMix: 32.4, rebarD12: 3_110.4, rebarD16: 777.6, sand: 17.25 },
  editParameters: { repair_area_ratio: 0.08 },
  editExpected: { rowId: "slab-full:12:control:repair-net", quantity: 456 },
  clarificationFields: ["repair_area_ratio", "repair_depth_mm"],
} : {
  catalogId:
    "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
  outputPath:
    ".release-runtime/r568/s27-23/slab-foundation-full-cycle-current/independent-acceptance.json",
  prompt: "Нужна полная смета устройства монолитного плитного фундамента 500 м².",
  area: 500,
  status:
    "GREEN_S27_23_SLAB_FOUNDATION_500M2_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
  expected: { readyMix: 108, rebarD12: 10_368, rebarD16: 2_592, sand: 57.5 },
  editParameters: { slab_thickness_mm: 250 },
  editExpected: { rowId: "slab-full:09:material:ready-mix", quantity: 135 },
  clarificationFields: [],
};
const CATALOG_ID = String(CONFIG.catalogId);
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(String(CONFIG.outputPath));

const REQUIRED_STAGE_ROWS = Object.freeze({
  settingOut: "slab-full:01:material:marking-cord",
  excavation: "slab-full:02:equipment:excavator",
  drainage: "slab-full:03:material:drain-pipe",
  base: "slab-full:04:material:sand",
  blinding: "slab-full:05:material:blinding-concrete",
  waterproofing: "slab-full:06:material:membrane-rolls",
  formwork: "slab-full:07:material:formwork-panels",
  reinforcement: "slab-full:08:material:rebar-d12",
  concrete: "slab-full:09:material:ready-mix",
  curing: "slab-full:10:material:liquid-curing-packages",
  quality: "slab-full:11:consumable:test-sets",
  completion: "slab-full:12:material:repair-mortar-bags",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
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
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_RELEASE");

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
    invariant(target != null, "STOP_S27_23_SLAB_FOUNDATION_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "79:127:109",
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_GATE");

    const parameters = (await client.query(`select *
      from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = (await client.query(`select *
      from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [target.definition_version_id]))
      .rows as (CanonicalEstimateFormulaDefinition & Json)[];
    const resources = (await client.query(`select *
      from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as (CanonicalEstimateResourceDefinition & Json)[];
    const baseline = (await client.query(`select input_values,input_classification,
        normative_source_ids,validation_scenario_refs,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`, [
      target.approved_template_baseline_id,
    ])).rows[0] as Json | undefined;
    const search = (await client.query(`select document.definition_version_id::text,
        document.selectable,document.adjudication_class,document.canonical_name_ru,
        document.aliases,document.short_scope_ru,document.clarification_fields,
        document.included_boundaries,document.source_provenance,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(baseline != null, "STOP_S27_23_SLAB_FOUNDATION_READBACK_BASELINE");
    invariant(search != null, "STOP_S27_23_SLAB_FOUNDATION_READBACK_SEARCH");

    const prompt = String(CONFIG.prompt);
    const searchIntent = parseCanonicalCatalogSearchIntent(prompt, null, []);
    invariant(searchIntent.quantity === Number(CONFIG.area) && searchIntent.unit === "м²",
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_SEARCH_INTENT");
    const areaParameter = parameters.find((parameter) =>
      parameter.parameter_id === "slab_area_m2");
    const areaTruth = areaParameter?.truth_metadata ?? {};
    invariant(areaParameter?.unit_id === "m2"
      && areaTruth.visibility_role === "USER_INPUT"
      && areaTruth.value_source_role === "USER_MEASURED"
      && Array.isArray(areaTruth.formula_consumers)
      && areaTruth.formula_consumers.length > 0,
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_PRIMARY_MEASURE");
    const submittedParameters = { slab_area_m2: String(CONFIG.area) };

    const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(runtimeBaseline.slab_area_m2 == null,
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_FIXTURE_AREA_LEAK");
    const compile = (submittedParameters: Record<string, unknown>) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-23-slab-foundation-independent-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "slab_area_m2",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: runtimeBaseline,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: resources.length,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const firstEstimate = await compile(submittedParameters);
    const editedEstimate = await compile({
      ...submittedParameters,
      ...CONFIG.editParameters,
    });

    invariant(firstEstimate.preliminaryNeeds.length === 0,
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_PRELIMINARY_NEEDS");
    invariant(firstEstimate.rows.length === 106
      && firstEstimate.rows.filter((row) => row.included_in_procurement).length === 46,
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_VISIBLE_COMPOSITION");
    invariant(new Set(firstEstimate.rows.map((row) => row.section)).size === 12,
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_STAGES");
    const rowIds = new Set(resources.map((row) => String(row.row_id)));
    for (const [stage, rowId] of Object.entries(REQUIRED_STAGE_ROWS)) {
      invariant(rowIds.has(rowId),
        `STOP_S27_23_SLAB_FOUNDATION_READBACK_STAGE:${stage}:${rowId}`);
    }
    invariant(quantity(firstEstimate.rows, "slab-full:09:material:ready-mix")
        === Number(CONFIG.expected.readyMix)
      && quantity(firstEstimate.rows, "slab-full:08:material:rebar-d12")
        === Number(CONFIG.expected.rebarD12)
      && quantity(firstEstimate.rows, "slab-full:08:material:rebar-d16")
        === Number(CONFIG.expected.rebarD16)
      && quantity(firstEstimate.rows, "slab-full:04:material:sand")
        === Number(CONFIG.expected.sand),
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_FIRST_QUANTITIES");
    invariant(quantity(editedEstimate.rows, String(CONFIG.editExpected.rowId))
      === Number(CONFIG.editExpected.quantity),
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_EDIT_RECALCULATION");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /плитн.*фундамент/u.test(String(search.canonical_name_ru)),
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_SEARCH_BINDING");
    invariant(Array.isArray(search.clarification_fields)
      && JSON.stringify(search.clarification_fields)
        === JSON.stringify(CONFIG.clarificationFields),
    "STOP_S27_23_SLAB_FOUNDATION_READBACK_REFINEMENT_FIELDS");

    const completenessEntries = target.decision?.independentCompletenessMap?.entries;
    const completenessComponentCount = Array.isArray(completenessEntries)
      ? new Set(completenessEntries.map((entry: Json) => String(entry.operationId))).size
      : 0;
    invariant(Array.isArray(completenessEntries)
      && completenessEntries.length >= 17
      && completenessComponentCount === 17,
      "STOP_S27_23_SLAB_FOUNDATION_READBACK_COMPLETENESS_MAP");

    const receipt: Json = {
      schemaVersion:
        "rik-expo-app.s27-23.slab-foundation-full-cycle-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status:
        CONFIG.status,
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
        definitionVersion: Number(target.definition_version),
        approvedTemplateBaselineId: target.approved_template_baseline_id,
        sourceBatch: target.source_batch,
        definitionShape: [79, 127, 109],
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        persistedStageRows: REQUIRED_STAGE_ROWS,
        independentCompletenessEntryCount: completenessEntries.length,
        independentCompletenessComponentCount: completenessComponentCount,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt,
        parsedQuantity: searchIntent.quantity,
        parsedUnit: searchIntent.unit,
        primaryMeasureParameterId: "slab_area_m2",
        submittedParameters,
        routeContract:
          "tests/estimateNorms/slabFoundationFullCycleS2719.contract.test.ts",
        refinementClarificationFields: search.clarification_fields,
        firstEstimateBlockedByRefinementFields: false,
        searchCanonicalNameRu: search.canonical_name_ru,
        searchAliases: search.aliases,
      },
      firstEstimate: {
        visibleRowCount: firstEstimate.rows.length,
        procurementRowCount:
          firstEstimate.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
        visibleStageCount: new Set(firstEstimate.rows.map((row) => row.section)).size,
        readyMixM3: quantity(firstEstimate.rows, "slab-full:09:material:ready-mix"),
        reinforcementD12Kg:
          quantity(firstEstimate.rows, "slab-full:08:material:rebar-d12"),
        reinforcementD16Kg:
          quantity(firstEstimate.rows, "slab-full:08:material:rebar-d16"),
        sandOrderM3: quantity(firstEstimate.rows, "slab-full:04:material:sand"),
      },
      editRecalculation: {
        submittedParameters: CONFIG.editParameters,
        assertedRowId: CONFIG.editExpected.rowId,
        assertedQuantity:
          quantity(editedEstimate.rows, String(CONFIG.editExpected.rowId)),
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
