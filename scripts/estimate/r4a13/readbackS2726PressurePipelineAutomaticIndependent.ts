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
const CATALOG_ID = "canonical-work:expanded:pressure_pipeline";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/pressure-pipeline-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1000 м напорного трубопровода PE100-RC-SDR17-OD160-PN10, наружный диаметр 160 мм, средняя глубина траншеи 1,6 м, 2 проектных узла подключения, 2 самостоятельных строительных участка, стыковая сварка открытым способом.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,
      definition_count,parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_26_PRESSURE_PIPELINE_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "50:53:53",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_GATE");
    const [pr, fr, rr, br, sr, lr] = await Promise.all([
      client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id]),
      client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id]),
      client.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id]),
      client.query(`select d.definition_version_id::text,d.selectable,d.excluded_boundaries,r.status
        from public.estimate_search_document d join public.estimate_search_index_release r
        on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`,
      [current.searchReleaseId, CATALOG_ID]),
      client.query(`select l.locator_key,l.excerpt_sha256
        from public.estimate_work_normative_binding b join public.estimate_normative_locator l
        on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]),
    ]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_26_PRESSURE_PIPELINE_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_PRESSURE_PIPELINE_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "pressure-pipeline-hdpe-open-trench-automatic-s27-26-v1",
      "STOP_S27_26_PRESSURE_PIPELINE_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/villageWaterSupplyCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_LEGACY_FORMULA");
    invariant(!/valve|hydrant|chamber|manhole|pressure.test|hydro.test|disinfection/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_ADJACENT_SCOPE");
    const ordinaryParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role === "USER_INPUT");
    const profileParameters = parameters.filter((parameter) =>
      parameter.truth_metadata?.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    invariant(ordinaryParameters.length === 7
      && ordinaryParameters.every((parameter) =>
        parameter.required === true
        && parameter.truth_metadata?.preliminary_compilation_allowed === false
        && (parameter.truth_metadata?.guide as Json | undefined)
          ?.guide_validation_policy === "MANDATORY_BLOCK")
      && profileParameters.length === 38
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)?.guide_validation_policy
          === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_PRIMARY_FACT_POLICY");

    const ordinary = {
      ppl_route_length_m: /(\d+(?:[,.]\d+)?)\s*м\s+напорн/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      ppl_pipe_designation: /\b(PE\d{2,3}(?:-RC)?-SDR\d+(?:[.,]\d+)?-OD\d+(?:-PN\d+)?)\b/iu.exec(PROMPT)?.[1],
      ppl_pipe_outside_diameter_mm: /наружн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      ppl_average_trench_depth_m: /средн\p{L}*\s+глубин\p{L}*\s+транше\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT)?.[1]?.replace(",", "."),
      ppl_connection_node_count: /(\d+)\s+проектн\p{L}*\s+узл\p{L}*\s+подключ/iu.exec(PROMPT)?.[1],
      ppl_construction_section_count: /(\d+)\s+самостоятельн\p{L}*\s+строительн\p{L}*\s+участ/iu.exec(PROMPT)?.[1],
      ppl_installation_technology: /стыков\p{L}*\s+сварк/iu.test(PROMPT)
        ? "HDPE_BUTT_FUSION_OPEN_TRENCH" : undefined,
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        ppl_route_length_m: "1000",
        ppl_pipe_designation: "PE100-RC-SDR17-OD160-PN10",
        ppl_pipe_outside_diameter_mm: "160",
        ppl_average_trench_depth_m: "1.6",
        ppl_connection_node_count: "2",
        ppl_construction_section_count: "2",
        ppl_installation_technology: "HDPE_BUTT_FUSION_OPEN_TRENCH",
      }),
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.ppl_side_clearance_m) === 0.25
      && Number(confirmedParameters.ppl_pipe_supplier_segment_length_m) === 12,
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-pressure-pipeline-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "ppl_route_length_m",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 53,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      ppl_route_length_m: "2000",
      ppl_pipe_outside_diameter_mm: "225",
      ppl_average_trench_depth_m: "2",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      ppl_pipe_available_stock_m: 100,
      ppl_pipe_retained_spare_m: 24,
      ppl_pipe_supplier_segment_length_m: 12,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      ppl_shoring_mode: "REQUIRED",
      ppl_shoring_designation: "TRENCH-BOX-STEEL-H2M",
      ppl_shored_length_m: 120,
      ppl_dewatering_mode: "REQUIRED",
      ppl_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
      ppl_dewatering_duration_h: 40,
      ppl_dewatering_flow_m3_h: 12,
    });
    invariant(first.rows.length === 48 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc13:ppl_trench_width") === "0.66"
      && quantity(first.rows, "rc13:ppl_excavation") === "1056"
      && quantity(first.rows, "rc13:ppl_bedding_installed") === "66"
      && quantity(first.rows, "rc13:ppl_surround_installed") === "283.493807027"
      && quantity(first.rows, "rc13:ppl_pipe_order") === "1032"
      && quantity(first.rows, "rc13:ppl_fusion_joints") === "82",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_FIRST");
    invariant(quantity(changedGeometry.rows, "rc13:ppl_excavation") === "2900"
      && quantity(changedGeometry.rows, "rc13:ppl_bedding_installed") === "145"
      && quantity(changedGeometry.rows, "rc13:ppl_surround_installed") === "681.728435996"
      && quantity(changedGeometry.rows, "rc13:ppl_pipe_order") === "2052"
      && quantity(changedGeometry.rows, "rc13:ppl_fusion_joints") === "165",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc13:ppl_pipe_total_need") === "1044"
      && quantity(changedProcurement.rows, "rc13:ppl_pipe_net_need") === "944"
      && quantity(changedProcurement.rows, "rc13:ppl_pipe_segment_count") === "79"
      && quantity(changedProcurement.rows, "rc13:ppl_pipe_order") === "948"
      && quantity(changedProcurement.rows, "rc13:ppl_pipe_remainder") === "28"
      && quantity(changedProcurement.rows, "rc13:ppl_pipe_surplus") === "4",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_PROCUREMENT");
    invariant(conditional.rows.length === 53 && conditional.preliminaryNeeds.length === 0
      && quantity(conditional.rows, "rc13:ppl_shoring") === "384"
      && quantity(conditional.rows, "rc13:ppl_dewatering_volume") === "480",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_CONDITIONAL");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_26_PRESSURE_PIPELINE_READBACK_SEARCH");

    const receipt = {
      schemaVersion: "rik-expo-app.s27-26.pressure-pipeline-independent-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_PRESSURE_PIPELINE_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { ...release, definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId },
      target,
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length },
      persisted: { parameterCount: parameters.length, formulaCount: formulas.length,
        resourceCount: resources.length, locator, search },
      automaticGeometry: {
        baselineExcavationM3: quantity(first.rows, "rc13:ppl_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc13:ppl_excavation"),
        baselineBeddingM3: quantity(first.rows, "rc13:ppl_bedding_installed"),
        changedBeddingM3: quantity(changedGeometry.rows, "rc13:ppl_bedding_installed"),
        baselineJointCount: quantity(first.rows, "rc13:ppl_fusion_joints"),
        changedJointCount: quantity(changedGeometry.rows, "rc13:ppl_fusion_joints"),
      },
      procurement: {
        installedM: quantity(changedProcurement.rows, "rc13:ppl_pipe_installed"),
        expectedLossM: quantity(changedProcurement.rows, "rc13:ppl_pipe_loss"),
        retainedSpareM: quantity(changedProcurement.rows, "rc13:ppl_pipe_retained_spare"),
        availableStockM: quantity(changedProcurement.rows, "rc13:ppl_pipe_stock"),
        netOrderNeedM: quantity(changedProcurement.rows, "rc13:ppl_pipe_net_need"),
        segmentCount: quantity(changedProcurement.rows, "rc13:ppl_pipe_segment_count"),
        orderedM: quantity(changedProcurement.rows, "rc13:ppl_pipe_order"),
        remainderM: quantity(changedProcurement.rows, "rc13:ppl_pipe_remainder"),
        surplusM: quantity(changedProcurement.rows, "rc13:ppl_pipe_surplus"),
      },
      rows: { first: first.rows.length, conditional: conditional.rows.length },
      boundaries: {
        ordinaryRouteCoreAccepted: true,
        uiAccepted: false,
        reason: "ordinary staging consumer session and prepared-release selection in Web/Android were not exercised by this DB readback",
        activationPerformed: false,
        productionAccessed: false,
      },
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const tempPath = `${OUTPUT_PATH}.tmp`;
    const receiptSha256 = sha256(receipt);
    writeFileSync(tempPath, `${JSON.stringify({ ...receipt, receiptSha256 }, null, 2)}\n`, "utf8");
    renameSync(tempPath, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      releaseId: current.definitionReleaseId,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length,
      conditionalRows: conditional.rows.length,
      receiptSha256,
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
