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
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fire_resistant_cable_marker": ["marker_quantity_piece"],
  "rc09:halogen_free_cable_clamp": ["clamp_quantity_piece"],
  "rc09:cable_gland_for_5x6": ["gland_quantity_piece"],
  "rc09:copper_lug_6mm2": ["lug_quantity_piece"],
  "rc09:firestop_cable_penetration_compound": ["firestop_quantity_kg"],
  "rc09:power_cable_insulation_continuity_test": ["test_count"],
});

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID =
  "canonical-work:base:electrical_interior_vvg_cable_lay_standard";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/vvgng-ls-minimum-clarification-current/independent-acceptance.json",
);
const PROMPT = "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм², длина трассы 150 м.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

function quantity(rows: readonly Json[], rowId: string): string | undefined {
  return rows.find((row) => row.row_id === rowId)?.quantity;
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
      "STOP_S27_24_VVGNG_READBACK_RELEASE");

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
    invariant(target != null, "STOP_S27_24_VVGNG_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "36:25:25", "STOP_S27_24_VVGNG_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_VVGNG_READBACK_GATE");

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
    const locatorResult = await client.query(`select locator.locator_key,locator.excerpt_sha256
      from public.estimate_work_normative_binding binding
      join public.estimate_normative_locator locator on locator.id=binding.locator_id
      where binding.definition_version_id=$1`, [target.definition_version_id]);

    const parameters = parameterResult.rows as CanonicalEstimateParameterDefinition[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json | undefined;
    const search = searchResult.rows[0] as Json | undefined;
    const locator = locatorResult.rows[0] as Json | undefined;
    invariant(baseline != null && search != null && locator != null,
      "STOP_S27_24_VVGNG_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_VVGNG_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "vvgng-ls-power-cable-krerm-project-balance-s27-24-v4",
      "STOP_S27_24_VVGNG_READBACK_LOCATOR");

    const parsedIntent = parseCanonicalCatalogSearchIntent(PROMPT, null, []);
    invariant(parsedIntent.quantity === 150 && parsedIntent.unit === "м",
      `STOP_S27_24_VVGNG_READBACK_ORDINARY_ROUTE:${JSON.stringify(parsedIntent)}`);
    const ordinaryParameters = {
      length_m: String(parsedIntent.quantity),
      cable_mark: "ВВГнг(А)-LS",
      core_count: "5",
      conductor_area_mm2: "6",
    };
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(confirmedParameters.length_m == null
      && Number(confirmedParameters.cable_expected_loss_ratio) === 0
      && Number(confirmedParameters.cable_retained_reserve_m) === 0
      && Number(confirmedParameters.cable_supplier_cut_increment_m) === 1,
    "STOP_S27_24_VVGNG_READBACK_RUNTIME_PROFILE");

    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-vvgng-minimum-clarification-current-db-readback-v2",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "length_m",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 40,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinaryParameters);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      cable_expected_loss_ratio: 0.05,
      cable_retained_reserve_m: 5,
      cable_supplier_cut_increment_m: 100,
    });

    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 17,
      "STOP_S27_24_VVGNG_READBACK_FIRST_ESTIMATE");
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      const need = first.preliminaryNeeds.find((item) => item.row_id === rowId);
      invariant(JSON.stringify(need?.missing_parameter_ids)
        === JSON.stringify(missingParameterIds),
      `STOP_S27_24_VVGNG_READBACK_MINIMUM_REAL_FACTS:${rowId}`);
    }
    const missingScalarFacts = first.preliminaryNeeds
      .flatMap((need) => need.missing_parameter_ids).length;
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 1,
      "STOP_S27_24_VVGNG_READBACK_FIRST_PROCUREMENT");
    invariant(quantity(first.rows, "rc09:vvgng_a_ls_5x6_cable") === "150",
      "STOP_S27_24_VVGNG_READBACK_FIRST_CABLE_ORDER");
    invariant(complete.rows.length === 22 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_VVGNG_READBACK_COMPLETE");
    invariant(quantity(balanced.rows, "vvgng:balance:installed-net-length") === "150"
      && quantity(balanced.rows, "vvgng:balance:expected-loss") === "7.5"
      && quantity(balanced.rows, "vvgng:balance:retained-reserve") === "5"
      && quantity(balanced.rows, "vvgng:balance:total-need") === "162.5"
      && quantity(balanced.rows, "rc09:vvgng_a_ls_5x6_cable") === "200"
      && quantity(balanced.rows, "vvgng:balance:remainder-after-installation-loss") === "42.5"
      && quantity(balanced.rows, "vvgng:balance:surplus-beyond-reserve") === "37.5",
    "STOP_S27_24_VVGNG_READBACK_BALANCE");
    invariant(complete.rows.some((row) => row.row_id === "vvgng:labor:installation")
      && complete.rows.some((row) => row.row_id === "vvgng:labor:testing")
      && complete.rows.filter((row) => row.row_id.startsWith("vvgng:equipment:")).length === 4
      && complete.rows.filter((row) => row.row_id.startsWith("vvgng:logistics:")).length === 2,
    "STOP_S27_24_VVGNG_READBACK_RESOURCE_COVERAGE");
    invariant(complete.rows.find((row) => row.row_id === "rc09:vvgng_ls_cable_lay")
      ?.included_in_estimate === false
      && complete.rows.find((row) => row.row_id === "rc09:power_cable_insulation_continuity_test")
        ?.included_in_estimate === false,
    "STOP_S27_24_VVGNG_READBACK_DOUBLE_COST");
    invariant(complete.rows.every((row) => row.unit_price == null && row.amount == null),
      "STOP_S27_24_VVGNG_READBACK_UNKNOWN_PRICES");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /щит|систем.*электроснабжен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_VVGNG_READBACK_SEARCH_SCOPE");

    const evidence: Json = {
      schemaVersion:
        "rik-expo-app.s27-24.vvgng-ls-minimum-clarification-independent-db-readback.v2",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_VVGNG_LS_MINIMUM_CLARIFICATIONS_AUDITED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        formulaGraphExpressionConsistency: "25/25 GREEN",
        lifecycle: {
          runtimePublicationState: target.runtime_publication_state,
          contentStatus: target.content_status,
          contentGateStatus: target.content_gate_status,
        },
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        parsedQuantity: parsedIntent.quantity,
        parsedUnit: parsedIntent.unit,
        submittedParameters: ordinaryParameters,
        inventedLossReserveLaborOrEquipment: false,
        professionalFieldExtractionContract:
          "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
        missingScalarFactCount: missingScalarFacts,
        optionalProductDesignationQuestionsRemoved: 6,
        numericRatesInvented: false,
        cableOrderM: quantity(first.rows, "rc09:vvgng_a_ls_5x6_cable"),
        visibleNeeds: first.preliminaryNeeds,
        resourceLedger: first.rows.map((row) => ({
          stage: row.section,
          rowId: row.row_id,
          category: row.category,
          titleRu: row.title_ru,
          quantity: row.quantity,
          unitId: row.unit_id,
          procurement: row.included_in_procurement,
          estimate: row.included_in_estimate,
        })),
      },
      completedProjectProfile: {
        visibleRowCount: complete.rows.length,
        procurementRowCount: complete.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: complete.preliminaryNeeds.length,
        resourceLedger: complete.rows.map((row) => ({
          stage: row.section,
          rowId: row.row_id,
          category: row.category,
          titleRu: row.title_ru,
          quantity: row.quantity,
          unitId: row.unit_id,
          procurement: row.included_in_procurement,
          estimate: row.included_in_estimate,
        })),
      },
      cableBalance: {
        input: {
          installedM: 150,
          expectedLossRatio: 0.05,
          retainedReserveM: 5,
          supplierCutIncrementM: 100,
        },
        installedM: quantity(balanced.rows, "vvgng:balance:installed-net-length"),
        expectedLossM: quantity(balanced.rows, "vvgng:balance:expected-loss"),
        retainedReserveM: quantity(balanced.rows, "vvgng:balance:retained-reserve"),
        totalNeedM: quantity(balanced.rows, "vvgng:balance:total-need"),
        orderedM: quantity(balanced.rows, "rc09:vvgng_a_ls_5x6_cable"),
        remainderAfterInstallationAndLossM:
          quantity(balanced.rows, "vvgng:balance:remainder-after-installation-loss"),
        surplusBeyondReserveM:
          quantity(balanced.rows, "vvgng:balance:surplus-beyond-reserve"),
      },
      scopeBoundary: {
        class: "ATOMIC_VVGNG_LS_CABLE_ROUTE_INSTALLATION",
        switchboardIncluded: false,
        completeBuildingPowerSystemIncluded: false,
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
      firstRows: first.rows.length,
      completeRows: complete.rows.length,
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
