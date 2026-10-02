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
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:distribution_pipeline";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/distribution-pipeline-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 распределительной магистрали питьевой воды DPM-HDPE-PE100-RC-SDR17-OD225-PN10 длиной 1800 м из трубы HDPE PE100-RC SDR17 OD225 PN10.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], id: string) =>
  rows.find((row) => row.row_id === id)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,
      m.approved_template_baseline_id::text,d.definition_version,d.content_status,d.content_gate_status,
      p.parameter_count,p.formula_count,p.resource_count,p.payload_sha256
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d
      on d.id=m.definition_version_id join public.estimate_content_passport_r3 p
      on p.definition_version_id=d.id where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "63:45:45",
    "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_GATE");
    const [parameterResult, formulaResult, resourceResult, baselineResult, searchResult, locatorResult] =
      await Promise.all([
        client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
        client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
        client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
        client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
        client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
          from public.estimate_search_document d join public.estimate_search_index_release r
          on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`,
        [current.searchReleaseId, CATALOG_ID]),
        client.query(`select l.locator_key,l.excerpt_sha256 from public.estimate_work_normative_binding b
          join public.estimate_normative_locator l on l.id=b.locator_id where b.definition_version_id=$1`,
        [target.definition_version_id]),
      ]);
    const parameters = parameterResult.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = formulaResult.rows as CanonicalEstimateFormulaDefinition[];
    const resources = resourceResult.rows as CanonicalEstimateResourceDefinition[];
    const baseline = baselineResult.rows[0] as Json;
    const search = searchResult.rows[0] as Json;
    const locator = locatorResult.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_FORMULA_GRAPH");
    invariant(locator.locator_key === "distribution-pipeline-potable-main-pipe-procurement-balance-s27-24-v1",
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|golden_rate|normFactor/iu
      .test(String(formula.expression_source))), "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_LEGACY");

    const main = /строительств\p{L}*\s+(\d+)\s+распределительн\p{L}*\s+магистрал\p{L}*\s+питьев\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu.exec(PROMPT);
    const route = /длин\p{L}*\s+(\d+(?:[.,]\d+)?)\s*м/iu.exec(PROMPT);
    const pipe = /труб\p{L}*\s+(HDPE)\s+(PE\d+(?:-RC)?)\s+(SDR\d+)\s+OD\s*(\d+(?:[.,]\d+)?)\s+(PN\d+)/iu.exec(PROMPT);
    const ordinary = {
      dpm_main_count: main?.[1],
      dpm_pipe_designation: main?.[2],
      dpm_route_length_m: route?.[1]?.replace(",", "."),
      dpm_pipe_material: pipe?.[1],
      dpm_pipe_grade: pipe?.[2],
      dpm_sdr_class: pipe?.[3],
      dpm_pipe_outside_diameter_mm: pipe?.[4]?.replace(",", "."),
      dpm_pressure_class: pipe?.[5],
    };
    invariant(Object.values(ordinary).every(Boolean) && Object.keys(ordinary).length === 8,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.dpm_pipe_retained_spare_m) === 0
      && Number(confirmedParameters.dpm_pipe_supplier_segment_length_m) === 1,
    "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_RUNTIME");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-distribution-pipeline-independent-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "dpm_main_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      dpm_pipe_retained_spare_m: 24,
      dpm_pipe_supplier_segment_length_m: 12,
    });
    const conditional = await compile({
      ...completeInput,
      dpm_crossing_casing_mode: "REQUIRED",
      dpm_crossing_casing_designation: "STEEL-CASING-DN400-PN16",
      dpm_crossing_casing_length_m: 72,
      dpm_dewatering_mode: "REQUIRED",
      dpm_dewatering_designation: "WELLPOINT-DPM-SET",
      dpm_dewatering_machine_h: 420,
      dpm_road_restoration_mode: "REQUIRED",
      dpm_road_restoration_designation: "ROAD-REINSTATEMENT-DPM",
      dpm_road_restoration_area_m2: 2160,
    });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 37,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_FIRST");
    invariant(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:dpm-pipe-balance:total-need") === "1824"
      && quantity(balanced.rows, "rc09:dpm_pipe") === "1824"
      && quantity(balanced.rows, "rc09:dpm-pipe-balance:remainder") === "24"
      && quantity(balanced.rows, "rc09:dpm-pipe-balance:surplus-beyond-spare") === "0",
    "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_BALANCE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft", "STOP_S27_24_DISTRIBUTION_PIPELINE_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.distribution-pipeline-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_DISTRIBUTION_PIPELINE_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "45/45 GREEN",
        legacyCoefficientFormulaCount: 0,
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        automaticTrenchAppurtenanceLaborEquipmentLogisticsOrConditionalSelectionPerformed: false,
      },
      firstEstimate: { visibleRowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedM: 1800, retainedSpareM: 24, supplierSegmentLengthM: 12 },
        totalNeedM: quantity(balanced.rows, "rc09:dpm-pipe-balance:total-need"),
        segmentCount: quantity(balanced.rows, "rc09:dpm-pipe-balance:segment-count"),
        orderedM: quantity(balanced.rows, "rc09:dpm_pipe"),
        remainderM: quantity(balanced.rows, "rc09:dpm-pipe-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:dpm-pipe-balance:surplus-beyond-spare"),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
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
