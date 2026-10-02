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
const CATALOG_ID = "canonical-work:expanded:booster_pumping_station";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/booster-pumping-station-automatic-current/independent-acceptance.json",
);
const PROMPT = "Монтаж 1 заводской повысительной насосной установки BPS-SKID-Q90-H45-2D1S в существующем помещении: расчётная подача 90 м³/ч, расчётный напор 45 м, измеренное всасывающее подключение 6 м, напорное подключение 8 м, силовая кабельная трасса 160 м.";
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
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
      "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.runtime_publication_state,
      m.approved_template_baseline_id::text,d.definition_version,d.content_status,d.content_gate_status,
      p.parameter_count,p.formula_count,p.resource_count,p.payload_sha256
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d
      on d.id=m.definition_version_id join public.estimate_content_passport_r3 p
      on p.definition_version_id=d.id where m.release_id=$1 and m.catalog_id=$2`,
    [current.definitionReleaseId, CATALOG_ID])).rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "76:55:55",
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_GATE");
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
      where d.search_release_id=$1 and d.catalog_id=$2`,
    [current.searchReleaseId, CATALOG_ID]);
    const lr = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b join public.estimate_normative_locator l
      on l.id=b.locator_id where b.definition_version_id=$1`,
    [target.definition_version_id]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json; const search = sr.rows[0] as Json; const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator, "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_FORMULA_GRAPH");
    invariant(locator.locator_key === "booster-pumping-station-skid-automatic-s27-25-v1",
      "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/r4_a6_pump_station|golden_rate|normFactor/iu
      .test(String(formula.expression_source))), "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_LEGACY");
    const n = (re: RegExp) => re.exec(PROMPT)?.[1]?.replace(",", ".");
    const pair = (re: RegExp) => re.exec(PROMPT);
    const ordinary = {
      bps_skid_count: n(/(?:монтаж\p{L}*\s+)?(\d+)\s+заводск\p{L}*\s+повысительн\p{L}*\s+насосн\p{L}*\s+установк\p{L}*/iu),
      bps_skid_designation: pair(/заводск\p{L}*\s+повысительн\p{L}*\s+насосн\p{L}*\s+установк\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu)?.[1],
      bps_design_flow_m3_h: n(/расч[её]тн\p{L}*\s+подач\p{L}*\s+(\d+)\s*м[³3]\s*\/\s*ч/iu),
      bps_design_head_m: n(/расч[её]тн\p{L}*\s+напор\p{L}*\s+(\d+)\s*м/iu),
      bps_suction_tie_in_length_m: n(/всасывающ\p{L}*\s+подключени\p{L}*\s+(\d+)\s*м/iu),
      bps_discharge_tie_in_length_m: n(/напорн\p{L}*\s+подключени\p{L}*\s+(\d+)\s*м/iu),
      bps_power_cable_route_length_m: n(/силов\p{L}*\s+кабельн\p{L}*\s+трасс\p{L}*\s+(\d+)\s*м/iu),
    };
    invariant(Object.values(ordinary).every(Boolean) && Object.keys(ordinary).length === 7
      && JSON.stringify(ordinary) === JSON.stringify({
        bps_skid_count: "1",
        bps_skid_designation: "BPS-SKID-Q90-H45-2D1S",
        bps_design_flow_m3_h: "90",
        bps_design_head_m: "45",
        bps_suction_tie_in_length_m: "6",
        bps_discharge_tie_in_length_m: "8",
        bps_power_cable_route_length_m: "160",
      }),
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.bps_cable_retained_spare_m) === 15
      && Number(confirmedParameters.bps_cable_supplier_drum_length_m) === 100,
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_RUNTIME");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({ operation: "compile",
      compilerVersion: "s27-26-booster-pumping-station-independent-db-readback-v1", catalogId: CATALOG_ID,
      primaryMeasureParameterId: "bps_skid_count", parameterDefinitions: parameters,
      formulaDefinitions: formulas, resourceDefinitions: resources, submittedParameters,
      confirmedParameters: confirmed, currencyCode: "KGS", priceItems: [], maximumResourceRows: 55,
      hashJson: async (value) => estimateDeterministicHash(value) });
    const first = await compile(ordinary);
    const changedArrangement = await compile(ordinary, { ...confirmedParameters,
      bps_pump_installed_piece_per_skid: 4, bps_duty_pump_count_per_skid: 3,
      bps_standby_pump_count_per_skid: 1 });
    const changedProcurement = await compile(ordinary, { ...confirmedParameters,
      bps_skid_length_m: 4, bps_skid_width_m: 2, bps_grout_thickness_m: 0.08,
      bps_cable_supplier_drum_length_m: 50, bps_cable_available_stock_m: 40 });
    const conditional = await compile(ordinary, { ...confirmedParameters,
      bps_room_ventilation_upgrade_mode: "REQUIRED",
      bps_room_ventilation_upgrade_designation: "ROOM-VENT-UPGRADE-12ACH",
      bps_room_ventilation_upgrade_quantity_set: 1, bps_floor_strengthening_mode: "REQUIRED",
      bps_floor_strengthening_designation: "CFRP-FLOOR-STRENGTHENING-BPS",
      bps_floor_strengthening_quantity_set: 1, bps_standby_generator_mode: "REQUIRED",
      bps_standby_generator_designation: "DIESEL-GENSET-200KVA-ATS",
      bps_standby_generator_quantity_set: 1 });
    invariant(first.rows.length === 52 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc09:bps_skid_package") === "1"
      && quantity(first.rows, "rc09:bps_pump_units") === "3"
      && quantity(first.rows, "rc09:bps_isolation_valves") === "8"
      && quantity(first.rows, "rc09:bps_nonshrink_grout") === "0.4725"
      && quantity(first.rows, "rc09:bps_power_cable") === "200",
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_FIRST");
    invariant(quantity(changedArrangement.rows, "rc09:bps_pump_units") === "4"
      && quantity(changedArrangement.rows, "rc09:bps_isolation_valves") === "10"
      && quantity(changedArrangement.rows, "rc09:bps_check_valves") === "4",
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_ARRANGEMENT_RECALCULATION");
    invariant(conditional.rows.length === 55 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_CONDITIONAL");
    invariant(Number(quantity(changedProcurement.rows, "rc09:bps-grout-balance:installed-net")) === 0.64
      && Number(quantity(changedProcurement.rows, "rc09:bps_nonshrink_grout")) === 0.672
      && Number(quantity(changedProcurement.rows, "rc09:bps-cable-balance:net-order-need")) === 139.8
      && quantity(changedProcurement.rows, "rc09:bps_power_cable") === "150",
    "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_PROCUREMENT_RECALCULATION");
    invariant(search.definition_version_id === target.definition_version_id && search.selectable === true
      && search.status === "draft", "STOP_S27_26_BOOSTER_PUMPING_STATION_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-26.booster-pumping-station-automatic-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: { catalogId: CATALOG_ID, definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "55/55 GREEN", legacyCoefficientFormulaCount: 0,
        normativeLocator: locator, payloadSha256: target.payload_sha256 },
      ordinaryRoute: { prompt: PROMPT, submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length, derivedQuantityQuestionCount: 0,
        automaticAccessoriesLaborEquipmentLogisticsAndProcurement: true,
        automaticConditionalSelectionPerformed: false },
      firstEstimate: { visibleRowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length },
      arrangementRecalculation: {
        baselinePumps: quantity(first.rows, "rc09:bps_pump_units"),
        changedPumps: quantity(changedArrangement.rows, "rc09:bps_pump_units"),
        changedIsolationValves: quantity(changedArrangement.rows, "rc09:bps_isolation_valves"),
      },
      procurementBalance: {
        baselineOrderedCableM: quantity(first.rows, "rc09:bps_power_cable"),
        changedNetOrderNeedM: quantity(changedProcurement.rows, "rc09:bps-cable-balance:net-order-need"),
        changedOrderedCableM: quantity(changedProcurement.rows, "rc09:bps_power_cable"),
        changedGroutOrderM3: quantity(changedProcurement.rows, "rc09:bps_nonshrink_grout"),
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
      conditionalRows: conditional.rows.length, receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH }, null, 2)}\n`);
  } finally { await client.end(); }
}
void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
