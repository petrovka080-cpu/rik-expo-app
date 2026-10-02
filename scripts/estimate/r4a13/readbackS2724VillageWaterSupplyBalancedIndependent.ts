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
const CATALOG_ID = "canonical-work:expanded:village_water_supply";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/village-water-supply-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 напорной водопроводной сети села VWS-HDPE-PE100-RC-OD160-110-4200: расчётный расход 650 м³/сут, 3000 м главной трубы HDPE-PE100-SDR17-OD160, 1200 м труб ответвлений HDPE-PE100-SDR17-OD110, 36 камер запорной арматуры, 18 пожарных гидрантов, 150 домовых вводов.";

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
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`,
    [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "60:45:45",
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_GATE");
    const pr = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const fr = await client.query(
      "select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [target.definition_version_id],
    );
    const rr = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const br = await client.query(
      "select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1",
      [target.approved_template_baseline_id],
    );
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
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "village-water-supply-pressure-main-pipe-project-balance-s27-24-v1",
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_LEGACY_FORMULA");
    invariant(!/water_intake|borehole|pumping_station|treatment_plant|reservoir|water_tower|sewer/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const mainPipe = /(\d+(?:[,.]\d+)?)\s*м\s+главн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const branchPipe = /(\d+(?:[,.]\d+)?)\s*м\s+труб\p{L}*\s+ответвлен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      vws_network_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+напорн\p{L}*\s+водопроводн\p{L}*\s+сет\p{L}*\s+сел/iu),
      vws_network_designation: /водопроводн\p{L}*\s+сет\p{L}*\s+сел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      vws_network_type: /напорн\p{L}*\s+водопроводн\p{L}*\s+сет\p{L}*\s+сел/iu.test(PROMPT)
        ? "PRESSURE_VILLAGE_WATER_SUPPLY" : undefined,
      vws_design_flow_m3_day: number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      vws_main_pipe_installed_m: mainPipe?.[1]?.replace(",", "."),
      vws_main_pipe_designation: mainPipe?.[2]?.replace(/[.,;:]+$/u, ""),
      vws_branch_pipe_installed_m: branchPipe?.[1]?.replace(",", "."),
      vws_branch_pipe_designation: branchPipe?.[2]?.replace(/[.,;:]+$/u, ""),
      vws_valve_chamber_piece: number(/(\d+(?:[,.]\d+)?)\s+камер\p{L}*\s+запорн\p{L}*\s+арматур/iu),
      vws_fire_hydrant_piece: number(/(\d+(?:[,.]\d+)?)\s+пожарн\p{L}*\s+гидрант/iu),
      vws_house_service_connection_piece: number(/(\d+(?:[,.]\d+)?)\s+домов\p{L}*\s+ввод/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        vws_network_count: "1", vws_network_designation: "VWS-HDPE-PE100-RC-OD160-110-4200",
        vws_network_type: "PRESSURE_VILLAGE_WATER_SUPPLY", vws_design_flow_m3_day: "650",
        vws_main_pipe_installed_m: "3000", vws_main_pipe_designation: "HDPE-PE100-SDR17-OD160",
        vws_branch_pipe_installed_m: "1200", vws_branch_pipe_designation: "HDPE-PE100-SDR17-OD110",
        vws_valve_chamber_piece: "36", vws_fire_hydrant_piece: "18",
        vws_house_service_connection_piece: "150",
      }), "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.vws_main_pipe_retained_spare_m) === 0
      && Number(confirmedParameters.vws_main_pipe_supplier_bundle_length_m) === 1,
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-village-water-supply-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "vws_network_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      vws_main_pipe_retained_spare_m: 40, vws_main_pipe_supplier_bundle_length_m: 100 });
    const conditional = await compile({
      ...completeInput,
      vws_rock_excavation_mode: "REQUIRED",
      vws_rock_excavation_designation: "HYDRAULIC-BREAKER",
      vws_rock_excavation_volume_m3: 900,
      vws_groundwater_dewatering_mode: "REQUIRED",
      vws_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      vws_groundwater_dewatering_machine_h: 700,
      vws_traffic_management_mode: "REQUIRED",
      vws_traffic_management_designation: "TEMP-TRAFFIC-SCHEME-VWS",
      vws_traffic_management_quantity_set: 14,
      vws_road_reinstatement_mode: "REQUIRED",
      vws_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vws_road_reinstatement_area_m2: 3000,
    });
    invariant(first.rows.length === 12 && first.preliminaryNeeds.length === 33,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_FIRST");
    invariant(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_COMPLETE");
    invariant(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:vws_main_pipe") === "3100"
      && quantity(balanced.rows, "rc09:vws-main-pipe-balance:package-count") === "31"
      && quantity(balanced.rows, "rc09:vws-main-pipe-balance:remainder") === "100"
      && quantity(balanced.rows, "rc09:vws-main-pipe-balance:surplus-beyond-spare") === "60",
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /водозабор|скважин|насосн|очистн|резервуар|башн|внутренн|канализац|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_VILLAGE_WATER_SUPPLY_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.village-water-supply-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_VILLAGE_WATER_SUPPLY_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "45/45 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedM: 3000, retainedSpareM: 40, supplierBundleLengthM: 100 },
        orderedM: quantity(balanced.rows, "rc09:vws_main_pipe"),
        bundleCount: quantity(balanced.rows, "rc09:vws-main-pipe-balance:package-count"),
        remainderM: quantity(balanced.rows, "rc09:vws-main-pipe-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:vws-main-pipe-balance:surplus-beyond-spare"),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id, firstRows: first.rows.length,
      completeRows: complete.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
