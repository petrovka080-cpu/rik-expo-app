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
const CATALOG_ID = "canonical-work:expanded:pumping_station";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/pumping-station-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 станции повышения давления питьевой воды WPS-RC-Q120-H55-2D1S: расчётная подача 120 л/с, расчётный напор 55 м, всего 3 насосных агрегата, схема 2 рабочих + 1 резервный, внутренние размеры 12 x 8 x 4.5 м, измеренная суммарная длина силовой кабельной трассы 240 м.";

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
      "STOP_S27_26_PUMPING_STATION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "87:68:68",
    "STOP_S27_26_PUMPING_STATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_PUMPING_STATION_READBACK_GATE");
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
    invariant(baseline && search && locator, "STOP_S27_26_PUMPING_STATION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_PUMPING_STATION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key
      === "pumping-station-geometric-automatic-s27-25-v1",
    "STOP_S27_26_PUMPING_STATION_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/100\s*\*|pumpingStationCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_PUMPING_STATION_READBACK_LEGACY_FORMULA");
    invariant(!/sewer|fire|reservoir|water_intake|treatment_plant/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_PUMPING_STATION_READBACK_ADJACENT_SCOPE");

    const number = (pattern: RegExp) => pattern.exec(PROMPT)?.[1]?.replace(",", ".");
    const arrangement = /схем\p{L}*\s+(\d+(?:[,.]\d+)?)\s+рабоч\p{L}*\s*\+\s*(\d+(?:[,.]\d+)?)\s+резервн\p{L}*/iu
      .exec(PROMPT);
    const dimensions = /внутренн\p{L}*\s+размер\p{L}*\s+(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*[xх×]\s*(\d+(?:[,.]\d+)?)\s*м/iu
      .exec(PROMPT);
    const ordinary = {
      wps_station_count: number(
        /(?:строительств\p{L}*\s+)?(\d+(?:[,.]\d+)?)\s+станци\p{L}*\s+повышени\p{L}*\s+давлени\p{L}*\s+питьев\p{L}*\s+вод\p{L}*/iu,
      ),
      wps_station_designation: /станци\p{L}*\s+повышени\p{L}*\s+давлени\p{L}*\s+питьев\p{L}*\s+вод\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)\s*:/iu
        .exec(PROMPT)?.[1],
      wps_design_flow_lps: number(
        /расч[её]тн\p{L}*\s+подач\p{L}*\s+(\d+(?:[,.]\d+)?)\s*л\s*\/\s*с/iu,
      ),
      wps_design_head_m: number(
        /расч[её]тн\p{L}*\s+напор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м(?![м\p{L}\p{N}])/iu,
      ),
      wps_pump_installed_piece: number(
        /всего\s+(\d+(?:[,.]\d+)?)\s+насосн\p{L}*\s+агрегат\p{L}*/iu,
      ),
      wps_duty_pump_count: arrangement?.[1]?.replace(",", "."),
      wps_standby_pump_count: arrangement?.[2]?.replace(",", "."),
      wps_internal_length_m: dimensions?.[1]?.replace(",", "."),
      wps_internal_width_m: dimensions?.[2]?.replace(",", "."),
      wps_internal_height_m: dimensions?.[3]?.replace(",", "."),
      wps_power_cable_route_length_m: number(
        /длин\p{L}*\s+силов\p{L}*\s+кабельн\p{L}*\s+трасс\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu,
      ),
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        wps_station_count: "1",
        wps_station_designation: "WPS-RC-Q120-H55-2D1S",
        wps_design_flow_lps: "120",
        wps_design_head_m: "55",
        wps_pump_installed_piece: "3",
        wps_duty_pump_count: "2",
        wps_standby_pump_count: "1",
        wps_internal_length_m: "12",
        wps_internal_width_m: "8",
        wps_internal_height_m: "4.5",
        wps_power_cable_route_length_m: "240",
      }),
    "STOP_S27_26_PUMPING_STATION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.wps_cable_retained_spare_m) === 20
      && Number(confirmedParameters.wps_cable_supplier_drum_length_m) === 100,
    "STOP_S27_26_PUMPING_STATION_READBACK_RUNTIME_PROFILE");
    const compile = (
      submittedParameters: Json,
      confirmed: Json = confirmedParameters,
    ) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-26-pumping-station-independent-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "wps_station_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters: confirmed,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 68,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const changedGeometry = await compile({
      ...ordinary,
      wps_internal_length_m: "15",
      wps_internal_width_m: "10",
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      wps_cable_supplier_drum_length_m: 50,
      wps_cable_available_stock_m: 40,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      wps_excavation_shoring_mode: "REQUIRED",
      wps_excavation_shoring_designation: "SECANT-PILE-SHORING",
      wps_excavation_shoring_area_m2: 420,
      wps_groundwater_dewatering_mode: "REQUIRED",
      wps_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      wps_groundwater_dewatering_machine_h: 360,
      wps_standby_generator_mode: "REQUIRED",
      wps_standby_generator_designation: "DIESEL-GENSET-400KVA-ATS",
      wps_standby_generator_quantity_set: 1,
    });
    invariant(first.rows.length === 65 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc09:wps_excavation") === "808.704"
      && quantity(first.rows, "rc09:wps_structural_concrete") === "166.1648"
      && quantity(first.rows, "rc09:wps_reinforcement") === "22.797"
      && quantity(first.rows, "rc09:wps_pump_units") === "3"
      && quantity(first.rows, "rc09:wps_power_cable") === "300",
    "STOP_S27_26_PUMPING_STATION_READBACK_FIRST");
    invariant(Number(quantity(changedGeometry.rows, "rc09:wps_excavation"))
        > Number(quantity(first.rows, "rc09:wps_excavation"))
      && Number(quantity(changedGeometry.rows, "rc09:wps_structural_concrete"))
        > Number(quantity(first.rows, "rc09:wps_structural_concrete"))
      && quantity(changedGeometry.rows, "rc09:wps_pump_units") === "3",
    "STOP_S27_26_PUMPING_STATION_READBACK_GEOMETRY_RECALCULATION");
    invariant(conditional.rows.length === 68 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_PUMPING_STATION_READBACK_CONDITIONAL");
    invariant(quantity(first.rows, "rc09:wps-cable-balance:installed-net") === "240"
      && quantity(first.rows, "rc09:wps-cable-balance:total-need") === "267.2"
      && quantity(first.rows, "rc09:wps-cable-balance:drum-count") === "3"
      && quantity(first.rows, "rc09:wps_power_cable") === "300"
      && quantity(changedProcurement.rows, "rc09:wps-cable-balance:net-order-need") === "227.2"
      && quantity(changedProcurement.rows, "rc09:wps-cable-balance:drum-count") === "5"
      && quantity(changedProcurement.rows, "rc09:wps_power_cable") === "250",
    "STOP_S27_26_PUMPING_STATION_READBACK_PROCUREMENT_RECALCULATION");
    invariant(first.rows.some((row) => row.row_id === "rc09:labor:wps-mechanical")
      && first.rows.some((row) => row.row_id === "rc09:equipment:wps-crane")
      && first.rows.some((row) => row.row_id === "rc09:logistics:wps-material-delivery")
      && first.rows.some((row) => row.row_id === "rc09:wps_test_water")
      && first.rows.some((row) => row.row_id === "rc09:wps_asbuilt"),
    "STOP_S27_26_PUMPING_STATION_READBACK_COMPLETION_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /канализац|пожарн|сет|резервуар|водозабор|водоподготов|автомат|цен/iu
        .test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_26_PUMPING_STATION_READBACK_SEARCH");
    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-26.pumping-station-automatic-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_PUMPING_STATION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "68/68 GREEN",
        legacyGenericCoefficientFormulaCount: 0,
        adjacentTemplateResourceCount: 0,
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        derivedQuantityQuestionCount: 0,
        automaticCivilLaborMechanismLogisticsAndProcurement: true,
        automaticConditionalSelectionPerformed: false,
      },
      firstEstimate: {
        visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length,
      },
      automaticGeometryRecalculation: {
        baselineExcavationM3: quantity(first.rows, "rc09:wps_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc09:wps_excavation"),
        baselineConcreteOrderM3: quantity(first.rows, "rc09:wps_structural_concrete"),
        changedConcreteOrderM3: quantity(changedGeometry.rows, "rc09:wps_structural_concrete"),
      },
      procurementBalance: {
        baselineInput: { installedM: 240, retainedSpareM: 20, supplierDrumLengthM: 100 },
        baselineTotalNeedM: quantity(first.rows, "rc09:wps-cable-balance:total-need"),
        baselineOrderedM: quantity(first.rows, "rc09:wps_power_cable"),
        changedInput: { availableStockM: 40, supplierDrumLengthM: 50 },
        changedNetOrderNeedM: quantity(
          changedProcurement.rows,
          "rc09:wps-cable-balance:net-order-need",
        ),
        changedOrderedM: quantity(changedProcurement.rows, "rc09:wps_power_cable"),
        changedDrumCount: quantity(
          changedProcurement.rows,
          "rc09:wps-cable-balance:drum-count",
        ),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length, preliminaryNeedCount: 0 },
      uiAcceptance: {
        web: false,
        android: false,
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
      conditionalRows: conditional.rows.length,
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
