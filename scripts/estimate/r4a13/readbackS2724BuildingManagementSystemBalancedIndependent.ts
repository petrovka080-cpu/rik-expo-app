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
const CATALOG_ID = "canonical-work:expanded:BMS_system";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/building-management-system-balanced-current/independent-acceptance.json",
);
const PROMPT =
  "Монтаж 1 системы BMS: 2 контроллера модели DDC-24IO, 120 физических точек, 1 АРМ оператора модели WS-BMS-01, протокол BACnet/IP.";

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
      "STOP_S27_24_BMS_READBACK_RELEASE");
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
      current.definitionReleaseId, CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_24_BMS_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "46:32:32", "STOP_S27_24_BMS_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN", "STOP_S27_24_BMS_READBACK_GATE");

    const parameterResult = await client.query(`select * from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]);
    const formulaResult = await client.query(`select formula_id,output_unit_id,expression_source,
        ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [target.definition_version_id]);
    const resourceResult = await client.query(`select * from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]);
    const baselineResult = await client.query(`select input_values,input_classification,
        normative_source_ids,validation_scenario_refs,acceptance_evidence_sha256
      from public.estimate_approved_template_baseline where id=$1`,
    [target.approved_template_baseline_id]);
    const searchResult = await client.query(`select document.definition_version_id::text,
        document.selectable,document.canonical_name_ru,document.excluded_boundaries,
        document.source_provenance,release.status
      from public.estimate_search_document document
      join public.estimate_search_index_release release on release.id=document.search_release_id
      where document.search_release_id=$1 and document.catalog_id=$2`, [
      current.searchReleaseId, CATALOG_ID,
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
    invariant(baseline && search && locator, "STOP_S27_24_BMS_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_BMS_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "building-management-system-project-balance-s27-24-v1",
      "STOP_S27_24_BMS_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/area_m2|\b432\b|electricalNetworkCalculator/iu.test(String(formula.expression_source))),
    "STOP_S27_24_BMS_READBACK_LEGACY_AREA_FORMULA");

    const systemCount = /(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+BMS\b/iu.exec(PROMPT)?.[1];
    const controller = /(\d+(?:[,.]\d+)?)\s+контроллер\p{L}*\s+модел\p{L}*\s*([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const pointCount = /(\d+(?:[,.]\d+)?)\s+физическ\p{L}*\s+точ\p{L}*/iu.exec(PROMPT)?.[1];
    const workstation = /(\d+(?:[,.]\d+)?)\s+АРМ\s+оператор\p{L}*\s+модел\p{L}*\s*([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const protocol = /протокол\p{L}*\s+(BACnet\s*\/\s*IP)/iu.exec(PROMPT)?.[1];
    invariant(systemCount && controller && pointCount && workstation && protocol,
      "STOP_S27_24_BMS_READBACK_IDENTITY");
    const ordinaryParameters = {
      bms_system_count: systemCount.replace(",", "."),
      bms_controller_count: controller[1].replace(",", "."),
      bms_controller_designation: controller[2],
      bms_physical_point_count: pointCount.replace(",", "."),
      bms_operator_workstation_count: workstation[1].replace(",", "."),
      bms_operator_workstation_designation: workstation[2],
      bms_integration_protocol: protocol.replace(/\s*\/\s*/gu, "/"),
    };
    invariant(JSON.stringify(ordinaryParameters) === JSON.stringify({
      bms_system_count: "1", bms_controller_count: "2",
      bms_controller_designation: "DDC-24IO", bms_physical_point_count: "120",
      bms_operator_workstation_count: "1",
      bms_operator_workstation_designation: "WS-BMS-01",
      bms_integration_protocol: "BACnet/IP",
    }), `STOP_S27_24_BMS_READBACK_ROUTE:${JSON.stringify(ordinaryParameters)}`);

    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(confirmedParameters.bms_system_count == null
      && Number(confirmedParameters.bms_controller_retained_spare_piece) === 0
      && Number(confirmedParameters.bms_controller_supplier_pack_size_piece) === 1,
    "STOP_S27_24_BMS_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-bms-independent-current-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "bms_system_count",
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
      bms_controller_retained_spare_piece: 1,
      bms_controller_supplier_pack_size_piece: 4,
    });
    const conditional = await compile({
      ...completeInput,
      integration_gateway_mode: "REQUIRED",
      integration_gateway_designation: "Шлюз BACnet/Modbus по архитектуре",
      integration_gateway_quantity_piece: 1,
      field_devices_mode: "REQUIRED",
      field_sensor_designation: "Датчик температуры по спецификации",
      field_sensor_quantity_piece: 40,
      field_actuator_designation: "Электропривод клапана по спецификации",
      field_actuator_quantity_piece: 12,
    });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 21,
      "STOP_S27_24_BMS_READBACK_FIRST");
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 2,
      "STOP_S27_24_BMS_READBACK_FIRST_PROCUREMENT");
    invariant(complete.rows.length === 29 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_BMS_READBACK_COMPLETE");
    invariant(conditional.rows.length === 32 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_BMS_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:bms-controller-balance:installed-net") === "2"
      && quantity(balanced.rows, "rc09:bms-controller-balance:retained-spare") === "1"
      && quantity(balanced.rows, "rc09:bms-controller-balance:total-need") === "3"
      && quantity(balanced.rows, "rc09:bms-controller-balance:package-count") === "1"
      && quantity(balanced.rows, "rc09:bms_ddc_controller") === "4"
      && quantity(balanced.rows, "rc09:bms-controller-balance:remainder") === "2"
      && quantity(balanced.rows, "rc09:bms-controller-balance:surplus-beyond-spare") === "1",
    "STOP_S27_24_BMS_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 2
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_BMS_READBACK_RESOURCE_COVERAGE");
    for (const rowId of [
      "rc09:bms_system_install_commission", "rc09:bms_point_test",
      "rc09:bms_asbuilt_point_register", "rc09:bms_test_report",
    ]) invariant(complete.rows.find((row) => row.row_id === rowId)
      ?.included_in_estimate === false, `STOP_S27_24_BMS_READBACK_DOUBLE_COST:${rowId}`);
    invariant(complete.rows.every((row) => row.unit_price == null && row.amount == null),
      "STOP_S27_24_BMS_READBACK_UNKNOWN_PRICES");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /HVAC|силов|пожарн|СКУД|площади|432/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_BMS_READBACK_SEARCH_SCOPE");

    const evidence: Json = {
      schemaVersion:
        "rik-expo-app.s27-24.building-management-system-balanced-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status:
        "GREEN_S27_24_BUILDING_MANAGEMENT_SYSTEM_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: {
        id: release.id, status: release.status, activatedAt: release.activated_at,
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
        formulaGraphExpressionConsistency: "32/32 GREEN",
        legacyAreaAndStatic432FormulaCount: 0,
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
        automaticControllerPointCableOrGatewaySelectionPerformed: false,
        inventedMaterialsLaborEquipmentOrLogistics: false,
        professionalFieldExtractionContract:
          "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
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
        input: { installedPiece: 2, retainedSparePiece: 1, packageSizePiece: 4 },
        orderedPiece: quantity(balanced.rows, "rc09:bms_ddc_controller"),
        packageCount: quantity(balanced.rows, "rc09:bms-controller-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:bms-controller-balance:remainder"),
        surplusPiece:
          quantity(balanced.rows, "rc09:bms-controller-balance:surplus-beyond-spare"),
      },
      conditionalProfile: {
        visibleRowCount: conditional.rows.length,
        preliminaryNeedCount: conditional.preliminaryNeeds.length,
      },
      scopeBoundary: {
        class: "BUILDING_MANAGEMENT_SYSTEM_EXPLICIT_ARCHITECTURE_AND_POINT_LIST",
        hvacEquipmentIncluded: false,
        electricalDistributionIncluded: false,
        fireAlarmEquipmentIncluded: false,
        accessControlEquipmentIncluded: false,
      },
      uiAcceptance: {
        web: false, android: false, editPersistenceHistory: false,
        procurementUi: false, pdf: false,
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
