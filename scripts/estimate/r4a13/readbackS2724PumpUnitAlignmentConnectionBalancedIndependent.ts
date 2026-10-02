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
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:base:plumbing_interior_pump_install_standard";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/pump-unit-alignment-connection-balanced-current/independent-acceptance.json",
);
const PROMPT =
  "Смонтировать 2 насосных агрегата, модель PUMP-Q45-H55, на раме, Q=45 м3/ч, H=55 м.";

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

function ledger(rows: readonly Json[]): Json[] {
  return rows.map((row) => ({
    stage: row.section,
    rowId: row.row_id,
    category: row.category,
    titleRu: row.title_ru,
    quantity: row.quantity,
    unitId: row.unit_id,
    procurement: row.included_in_procurement,
    estimate: row.included_in_estimate,
  }));
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
      "STOP_S27_24_PUMP_UNIT_READBACK_RELEASE");

    const target = (await client.query(`select manifest.catalog_id,
        manifest.definition_version_id::text,manifest.source_batch,
        manifest.runtime_publication_state,manifest.approved_template_baseline_id::text,
        definition.definition_version,definition.content_status,definition.content_gate_status,
        passport.parameter_count,passport.formula_count,passport.resource_count,
        passport.payload_sha256,passport.decision
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport
        on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      current.definitionReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_24_PUMP_UNIT_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "32:24:24", "STOP_S27_24_PUMP_UNIT_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_24_PUMP_UNIT_READBACK_GATE");

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

    const parameters = parameterResult.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json | undefined;
    const search = searchResult.rows[0] as Json | undefined;
    const locator = locatorResult.rows[0] as Json | undefined;
    invariant(baseline != null && search != null && locator != null,
      "STOP_S27_24_PUMP_UNIT_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_PUMP_UNIT_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "pump-unit-alignment-connection-project-balance-s27-24-v2",
    "STOP_S27_24_PUMP_UNIT_READBACK_LOCATOR");

    const identity = /(\d+(?:[,.]\d+)?)\s+насосн\p{L}*\s+агрегат\p{L}*,\s*модель\s+([A-Z0-9._/-]+),\s*на\s+рам\p{L}*,\s*Q\s*=\s*(\d+(?:[,.]\d+)?)\s*м3\s*\/\s*ч,\s*H\s*=\s*(\d+(?:[,.]\d+)?)\s*м/iu
      .exec(PROMPT);
    invariant(identity != null, "STOP_S27_24_PUMP_UNIT_READBACK_IDENTITY");
    const ordinaryParameters = {
      pump_count: identity[1].replace(",", "."),
      pump_unit_product_designation: identity[2].replace(/[.,;:]+$/u, ""),
      design_flow_m3_h: identity[3].replace(",", "."),
      design_head_m: identity[4].replace(",", "."),
      pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
    };
    invariant(JSON.stringify(ordinaryParameters) === JSON.stringify({
      pump_count: "2",
      pump_unit_product_designation: "PUMP-Q45-H55",
      design_flow_m3_h: "45",
      design_head_m: "55",
      pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
    }), `STOP_S27_24_PUMP_UNIT_READBACK_ROUTE:${JSON.stringify(ordinaryParameters)}`);

    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(confirmedParameters.pump_count == null
      && Number(confirmedParameters.pump_retained_spare_set) === 0
      && Number(confirmedParameters.pump_supplier_pack_size_set) === 1,
    "STOP_S27_24_PUMP_UNIT_READBACK_RUNTIME_PROFILE");

    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-pump-unit-independent-current-db-readback-v2",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "pump_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 30,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinaryParameters);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      pump_retained_spare_set: 1,
      pump_supplier_pack_size_set: 2,
    });
    const conditional = await compile({
      ...completeInput,
      vibration_isolator_mode: "REQUIRED",
      vibration_isolator_designation: "Виброизоляторы по чертежу насосной рамы",
      vibration_isolator_quantity_set: 2,
      flexible_connector_mode: "REQUIRED",
      flexible_connector_designation: "Гибкие вставки по схеме обвязки",
      flexible_connector_quantity_set: 4,
    });

    invariant(first.rows.length === 9 && first.preliminaryNeeds.length === 15,
      "STOP_S27_24_PUMP_UNIT_READBACK_FIRST");
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 1
      && quantity(first.rows, "rc09:pump_motor_baseframe_45m3h_55m") === "2",
    "STOP_S27_24_PUMP_UNIT_READBACK_FIRST_PROCUREMENT");
    invariant(complete.rows.length === 22 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_PUMP_UNIT_READBACK_COMPLETE");
    invariant(conditional.rows.length === 24 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_PUMP_UNIT_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:pump-balance:installed-net") === "2"
      && quantity(balanced.rows, "rc09:pump-balance:retained-spare") === "1"
      && quantity(balanced.rows, "rc09:pump-balance:total-need") === "3"
      && quantity(balanced.rows, "rc09:pump-balance:package-count") === "2"
      && quantity(balanced.rows, "rc09:pump_motor_baseframe_45m3h_55m") === "4"
      && quantity(balanced.rows, "rc09:pump-balance:remainder") === "2"
      && quantity(balanced.rows, "rc09:pump-balance:surplus-beyond-reserve") === "1",
    "STOP_S27_24_PUMP_UNIT_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 2
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_PUMP_UNIT_READBACK_RESOURCE_COVERAGE");
    invariant(complete.rows.find((row) => row.row_id === "rc09:pump_unit_install_align")
      ?.included_in_estimate === false
      && complete.rows.find((row) => row.row_id === "rc09:pump_vibration_qh_current_test")
        ?.included_in_estimate === false,
    "STOP_S27_24_PUMP_UNIT_READBACK_DOUBLE_COST");
    invariant(complete.rows.every((row) => row.unit_price == null && row.amount == null),
      "STOP_S27_24_PUMP_UNIT_READBACK_UNKNOWN_PRICES");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /коллектор|резервуар|автоматик|полн.*насосн.*станц/iu.test(
        JSON.stringify(search.excluded_boundaries),
      ), "STOP_S27_24_PUMP_UNIT_READBACK_SEARCH_SCOPE");

    const evidence: Json = {
      schemaVersion:
        "rik-expo-app.s27-24.pump-unit-alignment-connection-balanced-independent-db-readback.v2",
      capturedAt: new Date().toISOString(),
      status:
        "GREEN_S27_24_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        formulaGraphExpressionConsistency: "24/24 GREEN",
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
        submittedParameters: ordinaryParameters,
        automaticPumpSelectionOrHydraulicDesignPerformed: false,
        inventedMaterialsLaborEquipmentOrLogistics: false,
        professionalFieldExtractionContract:
          "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
        pumpOrderSet: quantity(first.rows, "rc09:pump_motor_baseframe_45m3h_55m"),
        visibleNeeds: first.preliminaryNeeds,
        resourceLedger: ledger(first.rows),
      },
      completedProjectProfile: {
        visibleRowCount: complete.rows.length,
        procurementRowCount: complete.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: complete.preliminaryNeeds.length,
        resourceLedger: ledger(complete.rows),
      },
      procurementBalance: {
        input: { installedSet: 2, retainedSpareSet: 1, supplierPackSizeSet: 2 },
        installedSet: quantity(balanced.rows, "rc09:pump-balance:installed-net"),
        retainedSpareSet: quantity(balanced.rows, "rc09:pump-balance:retained-spare"),
        totalNeedSet: quantity(balanced.rows, "rc09:pump-balance:total-need"),
        packageCount: quantity(balanced.rows, "rc09:pump-balance:package-count"),
        orderedSet: quantity(balanced.rows, "rc09:pump_motor_baseframe_45m3h_55m"),
        remainderSet: quantity(balanced.rows, "rc09:pump-balance:remainder"),
        surplusBeyondReserveSet:
          quantity(balanced.rows, "rc09:pump-balance:surplus-beyond-reserve"),
      },
      conditionalProfile: {
        visibleRowCount: conditional.rows.length,
        preliminaryNeedCount: conditional.preliminaryNeeds.length,
      },
      scopeBoundary: {
        class: "ATOMIC_PUMP_UNIT_INSTALL_ALIGN_CONNECT_TEST",
        pumpingStationCollectorsIncluded: false,
        waterReservoirIncluded: false,
        stationAutomationIncluded: false,
        completePumpingStationIncluded: false,
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
