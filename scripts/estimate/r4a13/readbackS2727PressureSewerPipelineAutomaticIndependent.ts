import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore, type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition, type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:pressure_sewer_pipeline";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-27/pressure-sewer-pipeline-automatic-current/independent-acceptance.json");
const PROMPT = "Строительство 800 м напорной канализации PE100-RC-SDR17-OD110-PN10, средняя глубина траншеи 1,8 м, фасонных частей 24, запорной арматуры 6, воздушных клапанов 4, промывных узлов 3.";
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "61:47:47", "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_GATE");
    const pr = await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]);
    const fr = await client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]);
    const rr = await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]);
    const br = await client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]);
    const sr = await client.query(`select d.definition_version_id::text,d.selectable,
      d.excluded_boundaries,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID]);
    const lr = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b join public.estimate_normative_locator l
      on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "pressure-sewer-pipeline-automatic-s27-27-v2",
      "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/"psp_(?:trench_excavation_volume_m3|survey_labor_h|excavator_machine_h|delivery_trip_count)"/iu
      .test(JSON.stringify(formula))),
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_FINAL_QUANTITY_INPUT");
    const ordinaryParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role === "USER_INPUT");
    const profileParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    invariant(ordinaryParameters.length === 8
      && ordinaryParameters.every((parameter) =>
        parameter.required === true
        && parameter.truth_metadata?.preliminary_compilation_allowed === false
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "MANDATORY_BLOCK")
      && profileParameters.length === 46
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_PRIMARY_FACT_POLICY");
    const ordinary = {
      psp_route_length_m: /(\d+(?:[,.]\d+)?)\s*м\s+напорн/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      psp_pipe_designation: /\b(PE\d{2,3}(?:-RC)?-SDR\d+(?:[.,]\d+)?-OD\d+(?:-PN\d+)?)\b/iu.exec(PROMPT)?.[1],
      psp_pipe_outside_diameter_mm: /\bOD(\d+(?:[,.]\d+)?)/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      psp_average_trench_depth_m: /средн\p{L}*\s+глубин\p{L}*\s+транше\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      psp_fitting_quantity_piece: /фасонн\p{L}*\s+част\p{L}*\s+(\d+)/iu.exec(PROMPT)?.[1],
      psp_isolation_valve_quantity_piece: /запорн\p{L}*\s+арматур\p{L}*\s+(\d+)/iu.exec(PROMPT)?.[1],
      psp_air_valve_quantity_piece: /воздушн\p{L}*\s+клапан\p{L}*\s+(\d+)/iu.exec(PROMPT)?.[1],
      psp_washout_quantity_piece: /промывн\p{L}*\s+узл\p{L}*\s+(\d+)/iu.exec(PROMPT)?.[1],
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        psp_route_length_m: "800",
        psp_pipe_designation: "PE100-RC-SDR17-OD110-PN10",
        psp_pipe_outside_diameter_mm: "110",
        psp_average_trench_depth_m: "1.8",
        psp_fitting_quantity_piece: "24",
        psp_isolation_valve_quantity_piece: "6",
        psp_air_valve_quantity_piece: "4",
        psp_washout_quantity_piece: "3",
      }),
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.psp_side_clearance_m) === 0.25
      && Number(confirmedParameters.psp_pipe_retained_spare_m) === 12
      && Number(confirmedParameters.psp_pipe_supplier_segment_length_m) === 12
      && Number(confirmedParameters.psp_survey_labor_h_per_m) === 0.04,
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-27-pressure-sewer-pipeline-independent-db-readback-v2",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "psp_route_length_m",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters: confirmed,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 47,
      hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary);
    const changedGeometry = await compile({ ...ordinary,
      psp_route_length_m: "100", psp_pipe_outside_diameter_mm: "160",
      psp_average_trench_depth_m: "2" });
    const changedProcurement = await compile(ordinary, { ...confirmedParameters,
      psp_pipe_available_stock_m: 100,
      psp_pipe_retained_spare_m: 24, psp_pipe_supplier_segment_length_m: 12 });
    const conditional = await compile(ordinary, { ...confirmedParameters,
      psp_crossing_casing_mode: "REQUIRED",
      psp_crossing_casing_designation: "Стальной футляр по узлу пересечения",
      psp_crossing_casing_length_m: 36,
      psp_dewatering_mode: "REQUIRED", psp_dewatering_designation: "Иглофильтровая установка по ППР",
      psp_dewatering_duration_h: 40, psp_dewatering_flow_m3_h: 12,
      psp_road_restoration_mode: "REQUIRED",
      psp_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      psp_road_restoration_area_m2: 96 });
    invariant(first.rows.length === 43 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc09:psp_pipeline_install_acceptance") === "800"
      && quantity(first.rows, "rc09:psp_trench_excavation") === "878.4"
      && quantity(first.rows, "rc09:psp_joint") === "66"
      && quantity(first.rows, "rc09:psp_chamber") === "13",
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_FIRST");
    invariant(quantity(changedGeometry.rows, "rc09:psp_pipeline_install_acceptance") === "100"
      && quantity(changedGeometry.rows, "rc09:psp_joint") === "8"
      && quantity(changedGeometry.rows, "rc09:psp_warning_tape") === "105",
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc09:psp_pipe") === "744"
      && quantity(changedProcurement.rows, "rc09:psp-pipe-balance:segment-count") === "62"
      && quantity(changedProcurement.rows, "rc09:psp-pipe-balance:remainder") === "28"
      && quantity(changedProcurement.rows, "rc09:psp-pipe-balance:surplus-beyond-spare") === "4",
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_BALANCE");
    invariant(conditional.rows.length === 47 && conditional.preliminaryNeeds.length === 0
      && quantity(conditional.rows, "rc09:psp_crossing_casing") === "36"
      && quantity(conditional.rows, "rc09:psp_dewatering_volume") === "480"
      && quantity(conditional.rows, "rc09:psp_road_restoration") === "96",
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_CONDITIONAL");
    invariant(first.rows.filter((row) => row.row_id.includes(":labor:")).length === 4
      && first.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && first.rows.filter((row) => row.row_id.includes(":logistics:")).length === 3,
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /КНС|самотечн|внутридомов|гидравлическ|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_27_PRESSURE_SEWER_PIPELINE_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-27.pressure-sewer-pipeline-independent-db-readback.v2",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_27_PRESSURE_SEWER_PIPELINE_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "47/47 GREEN", finalQuantityInputFormulaCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      automaticGeometry: { changedRouteM: quantity(changedGeometry.rows, "rc09:psp_pipeline_install_acceptance"),
        changedJointCount: quantity(changedGeometry.rows, "rc09:psp_joint") },
      procurementBalance: { input: { installedM: 800, retainedSpareM: 24, supplierSegmentM: 12 },
        orderedM: quantity(changedProcurement.rows, "rc09:psp_pipe"),
        segmentCount: quantity(changedProcurement.rows, "rc09:psp-pipe-balance:segment-count"),
        remainderM: quantity(changedProcurement.rows, "rc09:psp-pipe-balance:remainder"),
        surplusM: quantity(changedProcurement.rows, "rc09:psp-pipe-balance:surplus-beyond-spare") },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true }); const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"); renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id, firstRows: first.rows.length,
      conditionalRows: conditional.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
