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
const CATALOG_ID = "canonical-work:expanded:sewer_pumping_station";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(".release-runtime/r568/s27-24/sewer-pumping-station-balanced-current/independent-acceptance.json");
const PROMPT = "Монтаж 1 комплектной канализационной насосной станции: подземная стеклопластиковая мокрая камера диаметром 2400 мм и глубиной 6500 мм, расчётный расход 45 л/с, напор 18 м, 3 погружных насоса FLYGT-N-3153-22KW (2 рабочих + 1 резервный), мощность двигателя 22 кВт, марка SPS-GRP-D2400-H6500-Q45-H18-2D1S.";
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL }); await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "66:42:42", "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_GATE");
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
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json; const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "sewer-pumping-station-project-balance-s27-24-v1",
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/station_count\s*\*|design_(?:flow|head)\w*\s*\*|wet_well_(?:diameter|depth)\w*\s*\*|golden_rate|normFactor/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu
      .test(JSON.stringify(resources)), "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_NETWORK_TEMPLATE_SCOPE");
    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const token = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(/[.,;:]+$/u, "");
    const pumps = /(\d+(?:[,.]\d+)?)\s+погружн\p{L}*\s+насос\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*\(/iu.exec(PROMPT);
    const ordinary = {
      sps_station_count: number(/(?:монтаж\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+комплектн\p{L}*\s+канализационн\p{L}*\s+насосн\p{L}*\s+станц/iu),
      sps_station_type: /подземн\p{L}*\s+стеклопластиков\p{L}*\s+мокр\p{L}*\s+камер/iu.test(PROMPT)
        ? "PREFABRICATED_GRP_WET_WELL" : undefined,
      sps_station_designation: token(/марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu),
      sps_wet_well_material: /стеклопластиков/iu.test(PROMPT) ? "GRP" : undefined,
      sps_wet_well_diameter_mm: number(/мокр\p{L}*\s+камер\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
      sps_wet_well_depth_mm: number(/глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu),
      sps_design_flow_lps: number(/расч[её]тн\p{L}*\s+расход\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\/с/iu),
      sps_design_head_m: number(/напор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![\p{L}\p{N}])/iu),
      sps_pump_unit_installed_piece: pumps?.[1]?.replace(",", "."),
      sps_pump_designation: pumps?.[2]?.replace(/[.,;:]+$/u, ""),
      sps_duty_pump_count: number(/(\d+)\s+рабоч\p{L}*\s*\+/iu),
      sps_standby_pump_count: number(/\+\s*(\d+)\s+резервн/iu),
      sps_motor_power_kw: number(/мощност\p{L}*\s+двигател\p{L}*\s+(\d+(?:[,.]\d+)?)\s*кВт/iu),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({ sps_station_count: "1",
        sps_station_type: "PREFABRICATED_GRP_WET_WELL",
        sps_station_designation: "SPS-GRP-D2400-H6500-Q45-H18-2D1S",
        sps_wet_well_material: "GRP", sps_wet_well_diameter_mm: "2400",
        sps_wet_well_depth_mm: "6500", sps_design_flow_lps: "45", sps_design_head_m: "18",
        sps_pump_unit_installed_piece: "3", sps_pump_designation: "FLYGT-N-3153-22KW",
        sps_duty_pump_count: "2", sps_standby_pump_count: "1", sps_motor_power_kw: "22" }),
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.sps_pump_retained_spare_piece) === 0
      && Number(confirmedParameters.sps_pump_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-24-sewer-pumping-station-independent-db-readback-v1",
      catalogId: CATALOG_ID, primaryMeasureParameterId: "sps_station_count",
      parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters, confirmedParameters, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 45, hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary); const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({ ...completeInput,
      sps_pump_retained_spare_piece: 1, sps_pump_supplier_package_quantity_piece: 2 });
    const conditional = await compile({ ...completeInput,
      sps_bypass_pumping_mode: "REQUIRED", sps_bypass_pumping_designation: "BYPASS-PUMP-Q60-H20",
      sps_bypass_pumping_machine_h: 72,
      sps_dewatering_mode: "REQUIRED", sps_dewatering_designation: "WELLPOINT-DW-100",
      sps_dewatering_machine_h: 96,
      sps_odor_control_mode: "REQUIRED", sps_odor_control_designation: "CARBON-FILTER-500",
      sps_odor_control_set_count: 1 });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 34,
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_FIRST");
    invariant(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_COMPLETE");
    invariant(conditional.rows.length === 42 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:sps_pump_units") === "4"
      && quantity(balanced.rows, "rc09:sps-pump-balance:package-count") === "2"
      && quantity(balanced.rows, "rc09:sps-pump-balance:remainder") === "1"
      && quantity(balanced.rows, "rc09:sps-pump-balance:surplus-beyond-spare") === "0",
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 5
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft" && /сет|колод|электроснаб|здани|очист|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_SEWER_PUMPING_STATION_READBACK_SEARCH");
    const evidence: Json = { schemaVersion: "rik-expo-app.s27-24.sewer-pumping-station-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_SEWER_PUMPING_STATION_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "42/42 GREEN", legacyGenericCoefficientFormulaCount: 0,
        networkTemplateResourceCount: 0, normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        automaticMaterialCivilLaborMechanismLogisticsOrConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length, preliminaryNeedCount: 0 },
      procurementBalance: { input: { installedPiece: 3, retainedSparePiece: 1,
        supplierPackageQuantityPiece: 2 }, orderedPiece: quantity(balanced.rows, "rc09:sps_pump_units"),
        packageCount: quantity(balanced.rows, "rc09:sps-pump-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:sps-pump-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:sps-pump-balance:surplus-beyond-spare") },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false, activationPerformed: false, deployPerformed: false,
      otaPerformed: false, storeActionPerformed: false };
    evidence.receiptSha256 = sha256(evidence); mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"); renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, releaseId: release.id,
      definitionVersionId: target.definition_version_id, firstRows: first.rows.length,
      completeRows: complete.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
