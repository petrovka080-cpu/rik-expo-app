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
const CATALOG_ID = "canonical-work:expanded:village_sewer_network";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/village-sewer-network-balanced-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 самотечной канализационной сети села VSN-HDPE-SN8-OD200-160-3200: расчётный расход 450 м³/сут, 2400 м главной трубы HDPE-CORRUGATED-SN8-OD200, 800 м труб домовых подключений HDPE-CORRUGATED-SN8-OD160, 64 смотровых колодца, 120 домовых подключений.";

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
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "57:43:43",
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_GATE");
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
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "village-sewer-network-gravity-main-pipe-project-balance-s27-24-v1",
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_LEGACY_FORMULA");
    invariant(!/pressure_sewer|pumping_station|wtp_|stf_|stormwater/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const mainPipe = /(\d+(?:[,.]\d+)?)\s*м\s+главн\p{L}*\s+труб\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const lateralPipe = /(\d+(?:[,.]\d+)?)\s*м\s+труб\p{L}*\s+домов\p{L}*\s+подключен\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT);
    const ordinary = {
      vsn_network_count: number(/(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+самотечн\p{L}*\s+канализационн\p{L}*\s+сет/iu),
      vsn_network_designation: /сет\p{L}*\s+сел\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu.exec(PROMPT)?.[1],
      vsn_network_type: /самотечн\p{L}*\s+канализационн\p{L}*\s+сет\p{L}*\s+сел/iu.test(PROMPT)
        ? "GRAVITY_VILLAGE_SEWER" : undefined,
      vsn_design_flow_m3_day: number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м[³3]\s*\/\s*сут/iu),
      vsn_main_pipe_installed_m: mainPipe?.[1]?.replace(",", "."),
      vsn_main_pipe_designation: mainPipe?.[2]?.replace(/[.,;:]+$/u, ""),
      vsn_lateral_pipe_installed_m: lateralPipe?.[1]?.replace(",", "."),
      vsn_lateral_pipe_designation: lateralPipe?.[2]?.replace(/[.,;:]+$/u, ""),
      vsn_inspection_manhole_piece: number(/(\d+(?:[,.]\d+)?)\s+смотров\p{L}*\s+колодц/iu),
      vsn_house_connection_piece: number(/(\d+(?:[,.]\d+)?)\s+домов\p{L}*\s+подключен/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        vsn_network_count: "1", vsn_network_designation: "VSN-HDPE-SN8-OD200-160-3200",
        vsn_network_type: "GRAVITY_VILLAGE_SEWER", vsn_design_flow_m3_day: "450",
        vsn_main_pipe_installed_m: "2400",
        vsn_main_pipe_designation: "HDPE-CORRUGATED-SN8-OD200",
        vsn_lateral_pipe_installed_m: "800",
        vsn_lateral_pipe_designation: "HDPE-CORRUGATED-SN8-OD160",
        vsn_inspection_manhole_piece: "64", vsn_house_connection_piece: "120",
      }), "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.vsn_main_pipe_retained_spare_m) === 0
      && Number(confirmedParameters.vsn_main_pipe_supplier_bundle_length_m) === 1,
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-village-sewer-network-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "vsn_network_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas,
      resourceDefinitions: resources, submittedParameters, confirmedParameters,
      currencyCode: "KGS", priceItems: [], maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      vsn_main_pipe_retained_spare_m: 30, vsn_main_pipe_supplier_bundle_length_m: 60 });
    const conditional = await compile({
      ...completeInput,
      vsn_rock_excavation_mode: "REQUIRED",
      vsn_rock_excavation_designation: "HYDRAULIC-BREAKER",
      vsn_rock_excavation_volume_m3: 800,
      vsn_groundwater_dewatering_mode: "REQUIRED",
      vsn_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      vsn_groundwater_dewatering_machine_h: 600,
      vsn_traffic_management_mode: "REQUIRED",
      vsn_traffic_management_designation: "TEMP-TRAFFIC-SCHEME-VSN",
      vsn_traffic_management_quantity_set: 12,
      vsn_road_reinstatement_mode: "REQUIRED",
      vsn_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vsn_road_reinstatement_area_m2: 2400,
    });
    invariant(first.rows.length === 11 && first.preliminaryNeeds.length === 32,
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_FIRST");
    invariant(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_COMPLETE");
    invariant(conditional.rows.length === 43 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:vsn_main_pipe") === "2460"
      && quantity(balanced.rows, "rc09:vsn-main-pipe-balance:package-count") === "41"
      && quantity(balanced.rows, "rc09:vsn-main-pipe-balance:remainder") === "60"
      && quantity(balanced.rows, "rc09:vsn-main-pipe-balance:surplus-beyond-spare") === "30",
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /напорн|КНС|очистн|септик|ливнев|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_VILLAGE_SEWER_NETWORK_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.village-sewer-network-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_VILLAGE_SEWER_NETWORK_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "43/43 GREEN",
        legacyGenericCoefficientFormulaCount: 0, adjacentTemplateResourceCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedM: 2400, retainedSpareM: 30, supplierBundleLengthM: 60 },
        orderedM: quantity(balanced.rows, "rc09:vsn_main_pipe"),
        bundleCount: quantity(balanced.rows, "rc09:vsn-main-pipe-balance:package-count"),
        remainderM: quantity(balanced.rows, "rc09:vsn-main-pipe-balance:remainder"),
        surplusM: quantity(balanced.rows, "rc09:vsn-main-pipe-balance:surplus-beyond-spare"),
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
