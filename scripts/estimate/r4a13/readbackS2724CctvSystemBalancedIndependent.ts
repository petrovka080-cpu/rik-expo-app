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
const CATALOG_ID = "canonical-work:expanded:CCTV_system";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/cctv-system-balanced-current/independent-acceptance.json",
);
const PROMPT =
  "Монтаж 1 системы CCTV: 16 PoE IP-камер модели CAM-IP-4MP-IR 4 Мп с ИК, 1 NVR модели NVR-32CH, архив 30 суток.";

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
      "STOP_S27_24_CCTV_READBACK_RELEASE");
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
    invariant(target != null, "STOP_S27_24_CCTV_READBACK_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "48:33:33", "STOP_S27_24_CCTV_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN", "STOP_S27_24_CCTV_READBACK_GATE");

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
    invariant(baseline && search && locator, "STOP_S27_24_CCTV_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_CCTV_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "cctv-system-project-balance-s27-24-v1",
      "STOP_S27_24_CCTV_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/area_m2|\b432\b|electricalNetworkCalculator/iu.test(String(formula.expression_source))),
    "STOP_S27_24_CCTV_READBACK_LEGACY_AREA_FORMULA");

    const systemCount = /(\d+(?:[,.]\d+)?)\s+систем\p{L}*\s+CCTV\b/iu.exec(PROMPT)?.[1];
    const cameraCount = /(\d+(?:[,.]\d+)?)\s+(?:PoE\s+)?IP[-\s]?камер\p{L}*/iu
      .exec(PROMPT)?.[1];
    const camera = /(?:IP[-\s]?камер\p{L}*|камер\p{L}*)\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT)?.[1];
    const cameraType = /(?:PoE\s+IP|IP[-\s]?камер)[^.;]{0,100}\b4\s*(?:Мп|MP)\b[^.;]{0,100}(?:с\s+)?(?:ИК|IR)\b/iu
      .test(PROMPT) ? "IP_POE_4MP_IR" : undefined;
    const nvr = /(\d+(?:[,.]\d+)?)\s+NVR\b\s+(?:модел\p{L}*\s*)?([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const retention = /архив\p{L}*\s+(\d+(?:[,.]\d+)?)\s+сут\p{L}*/iu
      .exec(PROMPT)?.[1];
    invariant(systemCount && cameraCount && camera && cameraType && nvr && retention,
      "STOP_S27_24_CCTV_READBACK_IDENTITY");
    const ordinaryParameters = {
      cctv_system_count: systemCount.replace(",", "."),
      cctv_camera_count: cameraCount.replace(",", "."),
      cctv_camera_designation: camera.replace(/[.,;:]+$/u, ""),
      cctv_camera_type: cameraType,
      cctv_nvr_count: nvr[1].replace(",", "."),
      cctv_nvr_designation: nvr[2].replace(/[.,;:]+$/u, ""),
      cctv_archive_retention_days: retention.replace(",", "."),
    };
    invariant(JSON.stringify(ordinaryParameters) === JSON.stringify({
      cctv_system_count: "1", cctv_camera_count: "16",
      cctv_camera_designation: "CAM-IP-4MP-IR",
      cctv_camera_type: "IP_POE_4MP_IR", cctv_nvr_count: "1",
      cctv_nvr_designation: "NVR-32CH", cctv_archive_retention_days: "30",
    }), `STOP_S27_24_CCTV_READBACK_ROUTE:${JSON.stringify(ordinaryParameters)}`);

    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(confirmedParameters.cctv_system_count == null
      && Number(confirmedParameters.cctv_camera_retained_spare_piece) === 0
      && Number(confirmedParameters.cctv_camera_supplier_pack_size_piece) === 1,
    "STOP_S27_24_CCTV_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-cctv-independent-current-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "cctv_system_count",
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
      cctv_camera_retained_spare_piece: 2,
      cctv_camera_supplier_pack_size_piece: 10,
    });
    const conditional = await compile({
      ...completeInput,
      video_analytics_mode: "REQUIRED",
      video_analytics_license_designation: "Лицензия аналитики по проекту",
      video_analytics_license_quantity_piece: 16,
      external_integration_mode: "REQUIRED",
      external_integration_gateway_designation: "Шлюз интеграции по архитектуре",
      external_integration_gateway_quantity_piece: 1,
    });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 22,
      "STOP_S27_24_CCTV_READBACK_FIRST");
    invariant(first.rows.filter((row) => row.included_in_procurement).length === 2,
      "STOP_S27_24_CCTV_READBACK_FIRST_PROCUREMENT");
    invariant(complete.rows.length === 31 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_CCTV_READBACK_COMPLETE");
    invariant(conditional.rows.length === 33 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_CCTV_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:cctv-camera-balance:installed-net") === "16"
      && quantity(balanced.rows, "rc09:cctv-camera-balance:retained-spare") === "2"
      && quantity(balanced.rows, "rc09:cctv-camera-balance:total-need") === "18"
      && quantity(balanced.rows, "rc09:cctv-camera-balance:package-count") === "2"
      && quantity(balanced.rows, "rc09:cctv_ip_camera") === "20"
      && quantity(balanced.rows, "rc09:cctv-camera-balance:remainder") === "4"
      && quantity(balanced.rows, "rc09:cctv-camera-balance:surplus-beyond-spare") === "2",
    "STOP_S27_24_CCTV_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 3
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 2
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_CCTV_READBACK_RESOURCE_COVERAGE");
    for (const rowId of [
      "rc09:cctv_system_install_commission", "rc09:cctv_camera_test",
      "rc09:cctv_camera_register", "rc09:cctv_test_report",
    ]) invariant(complete.rows.find((row) => row.row_id === rowId)
      ?.included_in_estimate === false, `STOP_S27_24_CCTV_READBACK_DOUBLE_COST:${rowId}`);
    invariant(complete.rows.every((row) => row.unit_price == null && row.amount == null),
      "STOP_S27_24_CCTV_READBACK_UNKNOWN_PRICES");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /СКУД|пожарн|общая LAN|серверн|общая UPS|площад|432/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_CCTV_READBACK_SEARCH_SCOPE");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.cctv-system-balanced-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_CCTV_SYSTEM_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
        formulaGraphExpressionConsistency: "33/33 GREEN",
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
        automaticCameraNvrArchiveCableOrIntegrationSelectionPerformed: false,
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
        input: { installedPiece: 16, retainedSparePiece: 2, packageSizePiece: 10 },
        orderedPiece: quantity(balanced.rows, "rc09:cctv_ip_camera"),
        packageCount: quantity(balanced.rows, "rc09:cctv-camera-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:cctv-camera-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:cctv-camera-balance:surplus-beyond-spare"),
      },
      conditionalProfile: {
        visibleRowCount: conditional.rows.length,
        preliminaryNeedCount: conditional.preliminaryNeeds.length,
      },
      scopeBoundary: {
        class: "CCTV_EXPLICIT_CAMERA_LAYOUT_NVR_ARCHIVE_AND_NETWORK",
        accessControlIncluded: false,
        fireAlarmIncluded: false,
        generalLanIncluded: false,
        serverInfrastructureIncluded: false,
        generalUpsIncluded: false,
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
