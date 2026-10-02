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
} from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { parseCanonicalCatalogSearchIntent } from
  "../../../src/lib/estimate/backendPlatform/catalogSearchIntent";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID =
  "canonical-work:base:drywall_ceiling_interior_bulkhead_install_standard";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/drywall-bulkhead-full-cycle-current/independent-acceptance.json",
);
const PROMPT = "Полное устройство потолочного короба из гипсокартона 50 м².";

const REQUIRED_ROW_SUFFIXES = Object.freeze([
  "longitudinal_profile_packages",
  "horizontal_profile_packages",
  "vertical_profile_packages",
  "suspension_hangers",
  "structural_support_anchors",
  "profile_intersection_connectors",
  "profile_screw_packages",
  "board_sheets",
  "board_screw_packages",
  "board_cutting",
  "board_installation",
  "external_corner_profiles",
  "joint_compound_bags",
  "joint_tape_rolls",
  "separation_tape_rolls",
  "joint_filling",
  "primer_cans",
  "abrasive_items",
  "sanding_priming",
  "access_equipment",
  "screwdriver",
  "board_cutting_tool",
  "sanding_dust_extractor",
  "finish_acceptance",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function quantity(rows: readonly Json[], suffix: string): string | undefined {
  return rows.find((row) => row.row_id.endsWith(`:${suffix}`))?.quantity;
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
      "STOP_S27_23_BULKHEAD_READBACK_RELEASE");

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
    invariant(target != null, "STOP_S27_23_BULKHEAD_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "49:55:55", "STOP_S27_23_BULKHEAD_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_23_BULKHEAD_READBACK_GATE");

    const parameterResult = await client.query(`select *
      from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]);
    const formulaResult = await client.query(`select formula_id,output_unit_id,
        expression_source,ast,input_parameter_ids,ast_sha256
      from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`,
    [target.definition_version_id]);
    const resourceResult = await client.query(`select * from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]);
    const baselineResult = await client.query(`select input_values,input_classification,
        normative_source_ids,validation_scenario_refs,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`,
    [target.approved_template_baseline_id]);
    const searchResult = await client.query(`select document.definition_version_id::text,
        document.selectable,document.adjudication_class,document.canonical_name_ru,
        document.aliases,document.short_scope_ru,document.key_distinguishing_parameters,
        document.clarification_fields,document.included_boundaries,
        document.excluded_boundaries,document.source_provenance,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release
        on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ]);
    const parameters = parameterResult.rows as CanonicalEstimateParameterDefinition[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json | undefined;
    const search = searchResult.rows[0] as Json | undefined;
    invariant(baseline != null && search != null, "STOP_S27_23_BULKHEAD_READBACK_JOIN");
    const persistedSearch = search;
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_23_BULKHEAD_READBACK_FORMULA_GRAPH_DRIFT");

    const parsedIntent = parseCanonicalCatalogSearchIntent(PROMPT, null, []);
    invariant(parsedIntent.quantity === 50 && parsedIntent.unit === "м²",
      "STOP_S27_23_BULKHEAD_READBACK_ORDINARY_ROUTE");
    const ordinaryPlan = {
      primaryMeasureParameterId: "area_m2",
      parameters: { area_m2: String(parsedIntent.quantity) },
    };

    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(confirmedParameters.area_m2 == null,
      "STOP_S27_23_BULKHEAD_READBACK_AREA_FIXTURE_LEAK");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-bulkhead-independent-current-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 100,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinaryPlan.parameters);
    const changed = await compile({ area_m2: 60, bulkhead_length_m: 24 });
    const reinforced = await compile({ area_m2: 50, reinforcement_profile_length_m: 6 });
    const rowIds = new Set(first.rows.map((row) => row.row_id));

    invariant(first.rows.length === 53 && first.preliminaryNeeds.length === 0,
      "STOP_S27_23_BULKHEAD_READBACK_FIRST_ESTIMATE");
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 28,
      "STOP_S27_23_BULKHEAD_READBACK_PROCUREMENT");
    for (const suffix of REQUIRED_ROW_SUFFIXES) {
      invariant([...rowIds].some((rowId) => rowId.endsWith(`:${suffix}`)),
        `STOP_S27_23_BULKHEAD_READBACK_REQUIRED_ROW:${suffix}`);
    }
    invariant(quantity(first.rows, "longitudinal_profile_packages") === "28"
      && quantity(first.rows, "horizontal_profile_packages") === "22"
      && quantity(first.rows, "vertical_profile_packages") === "15"
      && quantity(first.rows, "profile_intersection_connectors") === "164"
      && quantity(first.rows, "structural_support_anchors") === "96",
    "STOP_S27_23_BULKHEAD_READBACK_FRAME_QUANTITIES");
    invariant(quantity(first.rows, "board_sheets") === "22"
      && quantity(first.rows, "board_net_m2") === "50"
      && quantity(first.rows, "board_order_m2") === "52.8"
      && quantity(first.rows, "board_remainder_m2") === "2.8"
      && quantity(first.rows, "board_screw_packages") === "2",
    "STOP_S27_23_BULKHEAD_READBACK_CLADDING_QUANTITIES");
    invariant(quantity(first.rows, "external_corner_profiles") === "14"
      && quantity(first.rows, "joint_compound_bags") === "1"
      && quantity(first.rows, "joint_tape_rolls") === "1"
      && quantity(first.rows, "separation_tape_rolls") === "1"
      && quantity(first.rows, "primer_cans") === "1"
      && quantity(first.rows, "abrasive_items") === "2",
    "STOP_S27_23_BULKHEAD_READBACK_FINISH_QUANTITIES");
    invariant(quantity(changed.rows, "longitudinal_profile_packages") === "34"
      && quantity(changed.rows, "board_sheets") === "27"
      && quantity(changed.rows, "external_corner_profiles") === "17"
      && quantity(changed.rows, "joint_compound_bags") === "2"
      && quantity(changed.rows, "joint_tape_rolls") === "2",
    "STOP_S27_23_BULKHEAD_READBACK_EDIT_RECALCULATION");
    invariant(quantity(first.rows, "opening_reinforcement_profile_packages") == null
      && quantity(reinforced.rows, "opening_reinforcement_profile_packages") === "3"
      && quantity(reinforced.rows, "opening_reinforcement_installation") === "6",
    "STOP_S27_23_BULKHEAD_READBACK_CONDITIONAL_REINFORCEMENT");
    invariant(first.rows.filter((row) => row.row_id.endsWith(":material_delivery")).length === 1
      && first.rows.filter((row) => row.row_id.endsWith(":waste_removal")).length === 1,
    "STOP_S27_23_BULKHEAD_READBACK_SHARED_LOGISTICS");
    invariant(first.rows.every((row) => row.unit_price == null && row.amount == null),
      "STOP_S27_23_BULKHEAD_READBACK_UNKNOWN_PRICES");
    invariant(persistedSearch.definition_version_id === target.definition_version_id
      && persistedSearch.selectable === true && persistedSearch.status === "draft"
      && /полн.*короб|короб.*полн/iu.test(
        `${persistedSearch.canonical_name_ru} ${persistedSearch.short_scope_ru}`,
      )
      && /frame-only/iu.test(JSON.stringify(persistedSearch.excluded_boundaries)),
    "STOP_S27_23_BULKHEAD_READBACK_SEARCH_SCOPE");

    const evidence: Json = {
      schemaVersion:
        "rik-expo-app.s27-23.drywall-bulkhead-full-cycle-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status:
        "GREEN_S27_23_DRYWALL_BULKHEAD_FULL_CYCLE_50M2_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        approvedTemplateBaselineId: target.approved_template_baseline_id,
        sourceBatch: target.source_batch,
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "55/55 GREEN",
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        primaryMeasureParameterId: ordinaryPlan.primaryMeasureParameterId,
        submittedParameters: ordinaryPlan.parameters,
        inventedProjectGeometry: false,
        visibleEditableProfileParameterCount: Object.keys(confirmedParameters).length,
        routeContract: "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
        searchCanonicalNameRu: persistedSearch.canonical_name_ru,
        searchAliases: persistedSearch.aliases,
        clarificationFields: persistedSearch.clarification_fields,
      },
      firstEstimate: {
        input: ordinaryPlan.parameters,
        visibleRowCount: first.rows.length,
        procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
        visibleSectionCount: new Set(first.rows.map((row) => row.section)).size,
        headlineQuantities: {
          longitudinalProfilePackages: quantity(first.rows, "longitudinal_profile_packages"),
          horizontalProfilePackages: quantity(first.rows, "horizontal_profile_packages"),
          verticalProfilePackages: quantity(first.rows, "vertical_profile_packages"),
          boardSheets: quantity(first.rows, "board_sheets"),
          boardOrderM2: quantity(first.rows, "board_order_m2"),
          boardRemainderM2: quantity(first.rows, "board_remainder_m2"),
          boardScrewPackages: quantity(first.rows, "board_screw_packages"),
          externalCornerProfiles: quantity(first.rows, "external_corner_profiles"),
          jointCompoundBags: quantity(first.rows, "joint_compound_bags"),
          jointTapeRolls: quantity(first.rows, "joint_tape_rolls"),
          primerCans: quantity(first.rows, "primer_cans"),
          abrasiveItems: quantity(first.rows, "abrasive_items"),
        },
        resourceLedger: first.rows.map((row) => ({
          stage: row.section,
          rowId: row.row_id,
          category: row.category,
          titleRu: row.title_ru,
          quantity: row.quantity,
          unitId: row.unit_id,
          procurement: row.included_in_procurement,
        })),
      },
      editRecalculation: {
        input: { area_m2: 60, bulkhead_length_m: 24 },
        longitudinalProfilePackages: quantity(changed.rows, "longitudinal_profile_packages"),
        boardSheets: quantity(changed.rows, "board_sheets"),
        externalCornerProfiles: quantity(changed.rows, "external_corner_profiles"),
        jointCompoundBags: quantity(changed.rows, "joint_compound_bags"),
      },
      scopeBoundary: {
        class: "FULL_DRYWALL_BULKHEAD_INSTALLATION",
        frameOnlyAcceptedAsFullWork: false,
        decorativePaintIncluded: false,
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
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      visibleRowCount: first.rows.length,
      procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
      receiptSha256: evidence.receiptSha256,
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
