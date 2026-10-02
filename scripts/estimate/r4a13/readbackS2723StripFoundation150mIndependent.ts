import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  canonicalApprovedBaselineParameterIsRuntimeEligible,
  canonicalApprovedBaselineRuntimeParameters,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
  resolveCanonicalEstimateProfileInputsS2723,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723";
import { parseCanonicalCatalogSearchIntent } from
  "../../../src/lib/estimate/backendPlatform/catalogSearchIntent";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { auditStripFoundationScopeCompletenessR1 } from
  "../../../src/lib/estimate/v4/stripFoundationScopeCompletenessR1";

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
  ".release-runtime/r568/s27-23/strip-foundation-150m-current/independent-acceptance.json",
);
const CATALOG_ID = STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723;
const REQUIRED_ROWS = Object.freeze({
  settingOut: "work:foundation:axis-setting-out-control",
  excavation: "excavation_work",
  bedding: "foundation_bedding_work",
  preparation: "preparation_concrete",
  formwork: "formwork_system",
  reinforcement: "reinforcement",
  reinforcementAccessories: "material:reinforcement:spacer-chairs",
  concrete: "main_concrete",
  vibration: "deep_vibrator",
  curing: "curing_work",
  waterproofing: "bituminous_waterproofing",
  backfill: "backfill_work",
  quality: "service:concrete:acceptance-control",
  asBuilt: "document:foundation:as-built-survey-record",
});
const CONDITIONAL_DEFINITION_ROWS = Object.freeze([
  "material:reinforcement:mechanical-couplers",
  "material:concrete:construction-joint-waterstop",
  "material:earthworks:excavation-support",
  "equipment:earthworks:dewatering",
  "work:foundation:site-cleanup",
  "delivery:foundation:construction-waste-haul",
]);

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
      "STOP_S27_23_STRIP_FOUNDATION_READBACK_RELEASE");
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
    invariant(target != null, "STOP_S27_23_STRIP_FOUNDATION_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "120:58:76",
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_GATE");

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
        document.aliases,document.short_scope_ru,document.clarification_fields,
        document.included_boundaries,document.source_provenance,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(baseline != null, "STOP_S27_23_STRIP_FOUNDATION_READBACK_BASELINE");
    invariant(search != null, "STOP_S27_23_STRIP_FOUNDATION_READBACK_SEARCH");

    const prompt = "Нужна полная смета ленточного фундамента 150 м.";
    const searchIntent = parseCanonicalCatalogSearchIntent(prompt, null, []);
    invariant(searchIntent.quantity === 150 && searchIntent.unit === "м",
      "STOP_S27_23_STRIP_FOUNDATION_READBACK_SEARCH_INTENT");
    const axisParameter = parameters.find((parameter) =>
      parameter.parameter_id === "total_axis_length_m");
    invariant(axisParameter?.unit_id === "m"
      && canonicalApprovedBaselineParameterIsRuntimeEligible(
        baseline,
        "total_axis_length_m",
      ) === false,
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_PRIMARY_MEASURE");
    const profileParameterIds = [
      "strip_width_m",
      "strip_height_m",
      "reinforcement_mass_t",
      "mechanical_couplers_applicable",
      "construction_joint_mode",
      "excavation_support_required",
      "excavation_dewatering_required",
    ];
    const profileParameterExposure = Object.fromEntries(profileParameterIds.map((parameterId) => {
      const parameter = parameters.find((candidate) => candidate.parameter_id === parameterId);
      invariant(parameter != null,
        `STOP_S27_23_STRIP_FOUNDATION_READBACK_PROFILE_PARAMETER:${parameterId}`);
      return [parameterId, {
        truthVisibilityRole: parameter.truth_metadata?.visibility_role ?? null,
        truthValueSourceRole: parameter.truth_metadata?.value_source_role ?? null,
        baselineClassification: baseline.input_classification?.[parameterId] ?? null,
        baselineRuntimeEligible:
          canonicalApprovedBaselineParameterIsRuntimeEligible(baseline, parameterId),
      }];
    }));

    const resources = bindCanonicalEstimateResourcePriceKeys(
      resourceRows,
      resourceRows.flatMap((resource) => resource._binding_price_keys.map((priceKey) => ({
        resource_spec_id: String(resource.id),
        price_key: String(priceKey),
      }))),
    );
    const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters(baseline);
    const compile = async (axisLengthM: number) => {
      const submittedParameters = { total_axis_length_m: String(axisLengthM) };
      const profile = resolveCanonicalEstimateProfileInputsS2723({
        catalogId: CATALOG_ID,
        confirmedParameters: runtimeBaseline,
        effectiveUserParameters: submittedParameters,
      });
      invariant(profile.applied,
        "STOP_S27_23_STRIP_FOUNDATION_READBACK_PROFILE_NOT_APPLIED");
      const result = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-23-strip-foundation-independent-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "total_axis_length_m",
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
      return { result, profile, submittedParameters };
    };
    const first = await compile(150);
    const edited = await compile(300);
    invariant(first.result.preliminaryNeeds.length === 0
      && first.result.rows.length === 42
      && first.result.rows.filter((row) => row.included_in_procurement).length === 21,
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_FIRST_COMPOSITION");
    const rowIds = new Set(first.result.rows.map((row) => row.row_id));
    for (const [stage, rowId] of Object.entries(REQUIRED_ROWS)) {
      invariant(rowIds.has(rowId),
        `STOP_S27_23_STRIP_FOUNDATION_READBACK_STAGE:${stage}:${rowId}`);
    }
    const scopeAudit = auditStripFoundationScopeCompletenessR1({
      currentDefinitionRowIds: resourceRows.map((row) => String(row.row_id)),
      typedChildRowIds: [],
    });
    invariant(scopeAudit.status === "GREEN" && scopeAudit.unresolvedCount === 0,
      `STOP_S27_23_STRIP_FOUNDATION_READBACK_SCOPE:${scopeAudit.unresolvedExpectationIds.join(",")}`);
    const expected = {
      mainConcrete: 259.2,
      reinforcement: 28.8,
      bindingWire: 345.6,
      excavation: 540,
      bedding: 36,
      waterproofing: 2_400,
      backfill: 210,
    };
    invariant(quantity(first.result.rows, "main_concrete") === expected.mainConcrete
      && quantity(first.result.rows, "reinforcement") === expected.reinforcement
      && quantity(first.result.rows, "binding_wire") === expected.bindingWire
      && quantity(first.result.rows, "excavation_work") === expected.excavation
      && quantity(first.result.rows, "foundation_bedding_work") === expected.bedding
      && quantity(first.result.rows, "bituminous_waterproofing")
        === expected.waterproofing
      && quantity(first.result.rows, "backfill_work") === expected.backfill,
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_150M_QUANTITIES");
    for (const rowId of [
      "main_concrete",
      "reinforcement",
      "binding_wire",
      "excavation_work",
      "foundation_bedding_work",
      "bituminous_waterproofing",
      "backfill_work",
    ]) {
      invariant(quantity(edited.result.rows, rowId)
        === quantity(first.result.rows, rowId) * 2,
      `STOP_S27_23_STRIP_FOUNDATION_READBACK_EDIT:${rowId}`);
    }
    for (const absentConditionalRowId of [
      "material:reinforcement:mechanical-couplers",
      "material:concrete:construction-joint-waterstop",
      "material:earthworks:excavation-support",
      "equipment:earthworks:dewatering",
    ]) {
      invariant(!rowIds.has(absentConditionalRowId),
        `STOP_S27_23_STRIP_FOUNDATION_READBACK_CONDITIONAL:${absentConditionalRowId}`);
    }
    const definitionRowIds = new Set(resourceRows.map((row) => String(row.row_id)));
    for (const rowId of CONDITIONAL_DEFINITION_ROWS) {
      invariant(definitionRowIds.has(rowId),
        `STOP_S27_23_STRIP_FOUNDATION_READBACK_CONDITIONAL_DEFINITION:${rowId}`);
    }
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /ленточн.*фундамент/u.test(String(search.canonical_name_ru)),
    "STOP_S27_23_STRIP_FOUNDATION_READBACK_SEARCH_BINDING");

    const receipt: Json = {
      schemaVersion:
        "rik-expo-app.s27-23.strip-foundation-150m-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status:
        "GREEN_S27_23_STRIP_FOUNDATION_150M_COMPLETE_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        definitionShape: [120, 58, 76],
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        persistedStageRows: REQUIRED_ROWS,
        conditionalDefinitionRows: CONDITIONAL_DEFINITION_ROWS,
        independentCompletenessExpectationCount: scopeAudit.decisions.length,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt,
        parsedQuantity: searchIntent.quantity,
        parsedUnit: searchIntent.unit,
        primaryMeasureParameterId: "total_axis_length_m",
        submittedParameters: first.submittedParameters,
        routeContract:
          "tests/requestEstimate/consumerNrmcaCip31StripFoundationBaseline.test.ts",
        searchCanonicalNameRu: search.canonical_name_ru,
        searchAliases: search.aliases,
        clarificationFields: search.clarification_fields,
      },
      visiblePreliminaryProfile: {
        profileId: first.profile.profileId,
        stripWidthM: first.profile.confirmedParameters.strip_width_m,
        stripHeightM: first.profile.confirmedParameters.strip_height_m,
        concreteOrderAllowancePercent:
          first.profile.confirmedParameters.concrete_order_allowance_percent,
        reinforcementMassT: first.profile.confirmedParameters.reinforcement_mass_t,
        mechanicalCouplersApplicable:
          first.profile.confirmedParameters.mechanical_couplers_applicable,
        constructionJointMode:
          first.profile.confirmedParameters.construction_joint_mode,
        excavationSupportRequired:
          first.profile.confirmedParameters.excavation_support_required,
        excavationDewateringRequired:
          first.profile.confirmedParameters.excavation_dewatering_required,
        parameterExposure: profileParameterExposure,
      },
      firstEstimate: {
        visibleRowCount: first.result.rows.length,
        procurementRowCount:
          first.result.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.result.preliminaryNeeds.length,
        quantities: expected,
      },
      editRecalculation: {
        totalAxisLengthM: 300,
        checkedRowsDouble: [
          "main_concrete",
          "reinforcement",
          "binding_wire",
          "excavation_work",
          "foundation_bedding_work",
          "bituminous_waterproofing",
          "backfill_work",
        ],
      },
      scopeBoundary: {
        class: "COMPLETE_STRIP_FOUNDATION",
        placementOnlyEvidenceAcceptedAsFullWork: false,
        unresolvedCompletenessExpectations: scopeAudit.unresolvedExpectationIds,
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
