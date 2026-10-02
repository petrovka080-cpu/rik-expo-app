import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { resolveCanonicalEstimateProfileInputsS2723 } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723";
import { parseCanonicalCatalogSearchIntent } from
  "../../../src/lib/estimate/backendPlatform/catalogSearchIntent";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
type ResourceRow = CanonicalEstimateResourceDefinition & Json & {
  _binding_price_keys: string[];
};

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/asphalt-900x50-current/independent-acceptance.json",
);
const CATALOG_ID = "canonical-work:expanded:asphalt_concrete_pavement";
const GEOMETRY_DEPENDENT_SOURCE_ROWS = Object.freeze([
  "longitudinal_joints",
  "transverse_joints",
  "joint_sealing_material",
  "joint_sealing_application",
  "edge_treatment",
]);
const REQUIRED_FULL_CYCLE_SOURCE_ROWS = Object.freeze([
  "sand_material",
  "crushed_layer_1_material",
  "crushed_layer_2_material",
  "base_emulsion_material",
  "asphalt_layer_1_material",
  "emulsion_interface_1_2",
  "asphalt_layer_2_material",
  "asphalt_layer_1_preliminary_compaction",
  "asphalt_layer_1_main_compaction",
  "asphalt_layer_1_final_compaction",
  "asphalt_layer_2_preliminary_compaction",
  "asphalt_layer_2_main_compaction",
  "asphalt_layer_2_final_compaction",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function sourceRowId(resource: Json): string {
  return String(resource.resource_graph?.sourceRowId ?? "").split(":").at(-1) ?? "";
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
      "STOP_S27_23_ASPHALT_READBACK_RELEASE");

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
    invariant(target != null, "STOP_S27_23_ASPHALT_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "127:148:148",
    "STOP_S27_23_ASPHALT_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_23_ASPHALT_READBACK_GATE");

    const parameters = (await client.query(`select *
      from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = (await client.query(`select *
      from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [target.definition_version_id]))
      .rows as (CanonicalEstimateFormulaDefinition & Json)[];
    const resourceRows = (await client.query(`select resource.*,
        coalesce(binding.price_keys,'{}'::text[]) _binding_price_keys
      from public.estimate_resource_spec resource
      left join lateral (
        select array_agg(distinct route.price_key order by route.price_key) price_keys
        from public.estimate_resource_price_route_binding route
        where route.resource_spec_id=resource.id
      ) binding on true
      where resource.definition_version_id=$1 order by resource.ordinal`, [
      target.definition_version_id,
    ])).rows as ResourceRow[];
    const baseline = (await client.query(`select input_values,input_classification,
        normative_source_ids,validation_scenario_refs,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`, [
      target.approved_template_baseline_id,
    ])).rows[0] as Json | undefined;
    const search = (await client.query(`select document.definition_version_id::text,
        document.selectable,document.adjudication_class,document.canonical_name_ru,
        document.aliases,document.short_scope_ru,document.key_distinguishing_parameters,
        document.clarification_fields,document.included_boundaries,
        document.excluded_boundaries,document.source_provenance,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(baseline != null, "STOP_S27_23_ASPHALT_READBACK_BASELINE");
    invariant(search != null, "STOP_S27_23_ASPHALT_READBACK_SEARCH");

    const prompt = "Устройство асфальтобетонного покрытия 900 м² × 50 мм.";
    const searchIntent = parseCanonicalCatalogSearchIntent(prompt, null, []);
    invariant(searchIntent.quantity === 900 && searchIntent.unit === "м²",
      "STOP_S27_23_ASPHALT_READBACK_SEARCH_INTENT");
    const areaParameter = parameters.find((parameter) => parameter.parameter_id === "area_m2");
    const thicknessParameter = parameters.find((parameter) =>
      parameter.parameter_id === "wearing_layer_thickness_mm");
    invariant(areaParameter?.unit_id === "m2"
      && thicknessParameter?.unit_id === "mm"
      && areaParameter.truth_metadata?.visibility_role === "USER_INPUT"
      && thicknessParameter.truth_metadata?.visibility_role === "USER_INPUT",
    "STOP_S27_23_ASPHALT_READBACK_EXPLICIT_INPUTS");

    const resources = bindCanonicalEstimateResourcePriceKeys(
      resourceRows,
      resourceRows.flatMap((resource) => resource._binding_price_keys.map((priceKey) => ({
        resource_spec_id: String(resource.id),
        price_key: String(priceKey),
      }))),
    );
    const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters(baseline);
    const resourceBySourceRowId = (value: string) =>
      resources.find((resource) => sourceRowId(resource) === value);
    for (const requiredSourceRowId of [
      ...REQUIRED_FULL_CYCLE_SOURCE_ROWS,
      ...GEOMETRY_DEPENDENT_SOURCE_ROWS,
    ]) {
      invariant(resourceBySourceRowId(requiredSourceRowId) != null,
        `STOP_S27_23_ASPHALT_READBACK_DEFINITION_ROW:${requiredSourceRowId}`);
    }

    const compile = async (submittedParameters: Record<string, unknown>) => {
      const profile = resolveCanonicalEstimateProfileInputsS2723({
        catalogId: CATALOG_ID,
        confirmedParameters: runtimeBaseline,
        effectiveUserParameters: submittedParameters,
      });
      invariant(profile.applied, "STOP_S27_23_ASPHALT_READBACK_PROFILE_NOT_APPLIED");
      const result = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-23-asphalt-independent-current-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "area_m2",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: { ...profile.confirmedParameters },
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: resources.length,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
      const bySource = (value: string) => {
        const resource = resourceBySourceRowId(value);
        return {
          resource,
          row: result.rows.find((row) => row.row_id === resource?.row_id) ?? null,
          need: result.preliminaryNeeds.find((need) => need.row_id === resource?.row_id) ?? null,
        };
      };
      return { result, profile, submittedParameters, bySource };
    };

    const first = await compile({ area_m2: 900, wearing_layer_thickness_mm: 50 });
    invariant(first.result.rows.length === 104
      && first.result.preliminaryNeeds.length === 5
      && first.result.rows.filter((row) => row.included_in_procurement).length === 10,
    "STOP_S27_23_ASPHALT_READBACK_FIRST_COMPOSITION");
    invariant(first.bySource("asphalt_layer_1_material").row?.quantity === "129.438"
      && first.bySource("asphalt_layer_2_material").row?.quantity === "107.865",
    "STOP_S27_23_ASPHALT_READBACK_FIRST_MIX_QUANTITIES");
    for (const pendingSourceRowId of GEOMETRY_DEPENDENT_SOURCE_ROWS) {
      const pending = first.bySource(pendingSourceRowId);
      invariant(pending.need != null && pending.row == null
        && pending.need.missing_parameter_ids.length > 0,
      `STOP_S27_23_ASPHALT_READBACK_VISIBLE_PENDING:${pendingSourceRowId}`);
    }
    const missingGeometryParameters = [...new Set(GEOMETRY_DEPENDENT_SOURCE_ROWS.flatMap(
      (pendingSourceRowId) => first.bySource(pendingSourceRowId).need?.missing_parameter_ids ?? [],
    ))].sort();
    for (const expectedMissingParameter of ["length_m", "width_m", "edge_treatment_length_m"]) {
      invariant(missingGeometryParameters.includes(expectedMissingParameter),
        `STOP_S27_23_ASPHALT_READBACK_MISSING_GEOMETRY:${expectedMissingParameter}`);
    }

    const edited = await compile({ area_m2: 900, wearing_layer_thickness_mm: 70 });
    invariant(edited.submittedParameters.wearing_layer_thickness_mm === 70
      && edited.bySource("asphalt_layer_2_material").row?.quantity === "151.011"
      && edited.bySource("asphalt_layer_2_material").row?.included_in_procurement === true
      && edited.bySource("asphalt_layer_2_material").row?.quantity
        !== first.bySource("asphalt_layer_2_material").row?.quantity,
      "STOP_S27_23_ASPHALT_READBACK_THICKNESS_EDIT");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_23_ASPHALT_READBACK_FORMULA_GRAPH_DRIFT");
    const geometry = await compile({
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
      length_m: 1200,
      width_m: 6,
      edge_treatment_length_m: 2400,
    });
    invariant(geometry.result.preliminaryNeeds.length === 0,
      "STOP_S27_23_ASPHALT_READBACK_GEOMETRY_NEEDS");
    invariant(geometry.bySource("longitudinal_joints").row?.quantity === "2400"
      && geometry.bySource("transverse_joints").row?.quantity === "24"
      && geometry.bySource("joint_sealing_material").row?.quantity === "2424"
      && geometry.bySource("joint_sealing_application").row?.quantity === "2424"
      && geometry.bySource("edge_treatment").row?.quantity === "2400",
    "STOP_S27_23_ASPHALT_READBACK_GEOMETRY_QUANTITIES");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /асфальтобетонн.*покрыт/u.test(String(search.canonical_name_ru)),
    "STOP_S27_23_ASPHALT_READBACK_SEARCH_BINDING");

    const pendingRows = Object.fromEntries(GEOMETRY_DEPENDENT_SOURCE_ROWS.map((value) => [
      value,
      {
        titleRu: first.bySource(value).need?.title_ru,
        missingParameterIds: first.bySource(value).need?.missing_parameter_ids,
      },
    ]));
    const receipt: Json = {
      schemaVersion: "rik-expo-app.s27-23.asphalt-900x50-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_23_ASPHALT_900X50_COMPLETE_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        definitionShape: [127, 148, 148],
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        requiredFullCycleSourceRows: REQUIRED_FULL_CYCLE_SOURCE_ROWS,
        geometryDependentSourceRows: GEOMETRY_DEPENDENT_SOURCE_ROWS,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt,
        parsedQuantity: searchIntent.quantity,
        parsedUnit: searchIntent.unit,
        primaryMeasureParameterId: "area_m2",
        submittedParameters: first.submittedParameters,
        routeContract: "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
        searchCanonicalNameRu: search.canonical_name_ru,
        searchAliases: search.aliases,
        clarificationFields: search.clarification_fields,
      },
      firstEstimate: {
        visibleRowCount: first.result.rows.length,
        procurementRowCount:
          first.result.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.result.preliminaryNeeds.length,
        lowerMixT: Number(first.bySource("asphalt_layer_1_material").row?.quantity),
        upperMixT: Number(first.bySource("asphalt_layer_2_material").row?.quantity),
        visibleGeometryDependentNeeds: pendingRows,
        missingGeometryParameters,
      },
      editRecalculation: {
        ordinaryText:
          "Устройство асфальтобетонного покрытия 900 м², верхний слой 70 мм.",
        ordinaryRouteContract:
          "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
        submittedParameterKey: "wearing_layer_thickness_mm",
        wearingLayerThicknessMm: 70,
        initialUpperMixT: Number(first.bySource("asphalt_layer_2_material").row?.quantity),
        upperMixT: Number(edited.bySource("asphalt_layer_2_material").row?.quantity),
        upperMixIncludedInProcurement:
          edited.bySource("asphalt_layer_2_material").row?.included_in_procurement,
        persistedFormulaGraphExpressionConsistency: "148/148 GREEN",
      },
      confirmedGeometry: {
        submittedParameters: geometry.submittedParameters,
        preliminaryNeedCount: geometry.result.preliminaryNeeds.length,
        longitudinalJointsM: Number(geometry.bySource("longitudinal_joints").row?.quantity),
        transverseJointsM: Number(geometry.bySource("transverse_joints").row?.quantity),
        jointSealingMaterialM: Number(geometry.bySource("joint_sealing_material").row?.quantity),
        jointSealingApplicationM:
          Number(geometry.bySource("joint_sealing_application").row?.quantity),
        edgeTreatmentM: Number(geometry.bySource("edge_treatment").row?.quantity),
      },
      scopeBoundary: {
        class: "COMPLETE_ASPHALT_PAVEMENT_CYCLE",
        compactionOnlyAcceptedAsFullWork: false,
        areaUsedToInventJointOrEdgeLength: false,
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
