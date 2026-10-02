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
const CATALOG_ID = "canonical-work:expanded:chlorination_station";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-26/chlorination-station-automatic-current/independent-acceptance.json",
);
const PROMPT = "Строительство 1 станции хлорирования CHL-NAOCL-1000-1IP производительностью 1000 м3/сут, технология гипохлорит натрия, расчётная доза 2 мг/л, раствор концентрацией 12.5%, дозирующий пакет DS-NAOCL-2X15LPH-PVC, 1 точка ввода.";

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
      "STOP_S27_26_CHLORINATION_STATION_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "106:80:80",
    "STOP_S27_26_CHLORINATION_STATION_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY"
      && target.content_gate_status === "GREEN",
    "STOP_S27_26_CHLORINATION_STATION_READBACK_GATE");
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
      "STOP_S27_26_CHLORINATION_STATION_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_26_CHLORINATION_STATION_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "chlorination-station-hypochlorite-automatic-s27-26-v1",
      "STOP_S27_26_CHLORINATION_STATION_READBACK_LOCATOR");
    invariant(formulas.every((formula) =>
      !/waterTreatmentPlantCalculator|golden_rate|normFactor/iu
        .test(String(formula.expression_source))),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_LEGACY_FORMULA");
    invariant(!/filtration|coagulat|flocculat|sediment|contact_tank|distribution_pipeline|gas_chlorine/iu
      .test(JSON.stringify(resources.map((row) => row.row_id))),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_ADJACENT_SCOPE");
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
      && profileParameters.length === 92
      && profileParameters.every((parameter) =>
        parameter.truth_metadata?.preliminary_compilation_allowed === true
        && (parameter.truth_metadata?.guide as Json | undefined)?.guide_validation_policy
          === "ADVISORY_REASON_REQUIRED"),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_PRIMARY_FACT_COLLECTION_POLICY");

    const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
    const ordinary = {
      chl_station_count: /строительств\p{L}*\s+(\d+)\s+станц\p{L}*\s+хлорирован/iu
        .exec(PROMPT)?.[1],
      chl_station_designation: new RegExp(
        `хлорирован\\p{L}*\\s+${identifier}\\s+производительн`, "iu",
      ).exec(PROMPT)?.[1],
      chl_design_flow_m3_day: /производительн\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м3\s*\/\s*сут/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      chl_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(PROMPT)
        ? "SODIUM_HYPOCHLORITE" : undefined,
      chl_design_dose_mg_l: /доз\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      chl_solution_concentration_percent: /концентрац\p{L}*\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(PROMPT)?.[1]?.replace(",", "."),
      chl_dosing_package_designation: new RegExp(
        `дозирующ\\p{L}*\\s+пакет\\p{L}*\\s+${identifier}\\s*,`, "iu",
      ).exec(PROMPT)?.[1],
      chl_injection_point_count: /(\d+)\s+точк\p{L}*\s+ввод/iu.exec(PROMPT)?.[1],
    };
    invariant(Object.values(ordinary).every(Boolean)
      && JSON.stringify(ordinary) === JSON.stringify({
        chl_station_count: "1",
        chl_station_designation: "CHL-NAOCL-1000-1IP",
        chl_design_flow_m3_day: "1000",
        chl_disinfectant_technology: "SODIUM_HYPOCHLORITE",
        chl_design_dose_mg_l: "2",
        chl_solution_concentration_percent: "12.5",
        chl_dosing_package_designation: "DS-NAOCL-2X15LPH-PVC",
        chl_injection_point_count: "1",
      }),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_ROUTE");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.chl_storage_days) === 15
      && Number(confirmedParameters.chl_reagent_supplier_package_kg) === 30,
    "STOP_S27_26_CHLORINATION_STATION_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json, confirmed: Json = confirmedParameters) =>
      compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s27-26-chlorination-station-independent-db-readback-v1",
        catalogId: CATALOG_ID,
        primaryMeasureParameterId: "chl_station_count",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters,
        confirmedParameters: confirmed,
        currencyCode: "KGS",
        priceItems: [],
        maximumResourceRows: 80,
        hashJson: async (value) => estimateDeterministicHash(value),
      });
    const first = await compile(ordinary);
    const changedDemand = await compile({
      ...ordinary,
      chl_design_flow_m3_day: "4000",
      chl_design_dose_mg_l: "4",
      chl_solution_concentration_percent: "10",
    });
    const changedGeometry = await compile(ordinary, {
      ...confirmedParameters,
      chl_building_length_m: 8,
      chl_building_width_m: 5,
    });
    const changedProcurement = await compile(ordinary, {
      ...confirmedParameters,
      chl_reagent_available_stock_kg: 50,
      chl_reagent_supplier_package_kg: 100,
    });
    const conditional = await compile(ordinary, {
      ...confirmedParameters,
      chl_excavation_shoring_mode: "REQUIRED",
      chl_excavation_shoring_designation: "SHEET-PILE-CHEMICAL-ROOM",
      chl_excavation_shoring_area_m2: 80,
      chl_groundwater_dewatering_mode: "REQUIRED",
      chl_groundwater_dewatering_designation: "WELLPOINT-40M3H",
      chl_groundwater_dewatering_machine_h: 40,
      chl_standby_power_mode: "REQUIRED",
      chl_standby_power_designation: "DIESEL-GENSET-40KVA-AMF",
      chl_standby_power_kva: 40,
    });
    invariant(first.rows.length === 77 && first.preliminaryNeeds.length === 0
      && quantity(first.rows, "rc11:chl_design_flow") === "1000"
      && quantity(first.rows, "rc11:chl_active_chlorine_demand") === "2"
      && quantity(first.rows, "rc11:chl_solution_daily_mass") === "16"
      && quantity(first.rows, "rc11:chl_storage_volume") === "0.2"
      && quantity(first.rows, "rc11:chl_storage_tanks") === "1"
      && quantity(first.rows, "rc11:chl_excavation") === "21"
      && quantity(first.rows, "rc11:chl_structural_concrete") === "6.18"
      && quantity(first.rows, "rc11:chl_reagent_order") === "300",
    "STOP_S27_26_CHLORINATION_STATION_READBACK_FIRST");
    invariant(Number(quantity(changedDemand.rows, "rc11:chl_active_chlorine_demand"))
        > Number(quantity(first.rows, "rc11:chl_active_chlorine_demand"))
      && Number(quantity(changedDemand.rows, "rc11:chl_storage_volume"))
        > Number(quantity(first.rows, "rc11:chl_storage_volume"))
      && Number(quantity(changedDemand.rows, "rc11:chl_storage_tanks"))
        > Number(quantity(first.rows, "rc11:chl_storage_tanks")),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_DEMAND");
    invariant(Number(quantity(changedGeometry.rows, "rc11:chl_excavation"))
        > Number(quantity(first.rows, "rc11:chl_excavation"))
      && Number(quantity(changedGeometry.rows, "rc11:chl_structural_concrete"))
        > Number(quantity(first.rows, "rc11:chl_structural_concrete"))
      && Number(quantity(changedGeometry.rows, "rc11:chl_reinforcement"))
        > Number(quantity(first.rows, "rc11:chl_reinforcement")),
    "STOP_S27_26_CHLORINATION_STATION_READBACK_GEOMETRY");
    invariant(quantity(changedProcurement.rows, "rc11:chl-reagent-balance:initial-fill") === "240"
      && quantity(changedProcurement.rows, "rc11:chl-reagent-balance:total-need") === "288"
      && quantity(changedProcurement.rows, "rc11:chl-reagent-balance:net-order-need") === "238"
      && quantity(changedProcurement.rows, "rc11:chl-reagent-balance:package-count") === "3"
      && quantity(changedProcurement.rows, "rc11:chl_reagent_order") === "300"
      && quantity(changedProcurement.rows, "rc11:chl-reagent-balance:remainder") === "110"
      && quantity(changedProcurement.rows, "rc11:chl-reagent-balance:surplus-beyond-spare") === "62",
    "STOP_S27_26_CHLORINATION_STATION_READBACK_PROCUREMENT");
    invariant(conditional.rows.length === 80 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_26_CHLORINATION_STATION_READBACK_CONDITIONAL");
    const requiredRows = [
      "rc11:chl_structural_concrete", "rc11:chl_reinforcement",
      "rc11:chl_structural_steel", "rc11:chl_storage_tanks",
      "rc11:chl_dosing_pumps", "rc11:chl_process_pipe",
      "rc11:chl_exhaust_fans", "rc11:chl_gas_detectors", "rc11:chl_eyewash",
      "rc11:chl_residual_analyzers", "rc11:chl_control_panels",
      "rc11:chl_power_cable", "rc11:labor:chl-civil", "rc11:labor:chl-process",
      "rc11:equipment:chl-excavator", "rc11:equipment:chl-crane",
      "rc11:chl_asbuilt", "rc11:logistics:chl-reagent",
    ];
    invariant(requiredRows.every((rowId) => resources.some((row) => row.row_id === rowId)),
      "STOP_S27_26_CHLORINATION_STATION_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft",
    "STOP_S27_26_CHLORINATION_STATION_READBACK_SEARCH");

    const receipt = {
      schemaVersion: "rik-expo-app.s27-26.chlorination-station-independent-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_26_CHLORINATION_STATION_AUTOMATIC_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: {
        ...release,
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
      },
      target,
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        primaryFactCount: Object.keys(ordinary).length,
        mandatoryBeforeCompile: ordinaryParameters.length,
        visibleProfileNotOrdinaryQuestions: profileParameters.length,
      },
      persisted: {
        parameterCount: parameters.length,
        formulaCount: formulas.length,
        resourceCount: resources.length,
        locator,
        search,
      },
      automaticDemand: {
        baselineActiveChlorineKgDay: quantity(first.rows, "rc11:chl_active_chlorine_demand"),
        changedActiveChlorineKgDay: quantity(changedDemand.rows, "rc11:chl_active_chlorine_demand"),
        baselineStorageM3: quantity(first.rows, "rc11:chl_storage_volume"),
        changedStorageM3: quantity(changedDemand.rows, "rc11:chl_storage_volume"),
        baselineTankCount: quantity(first.rows, "rc11:chl_storage_tanks"),
        changedTankCount: quantity(changedDemand.rows, "rc11:chl_storage_tanks"),
      },
      automaticGeometry: {
        baselineExcavationM3: quantity(first.rows, "rc11:chl_excavation"),
        changedExcavationM3: quantity(changedGeometry.rows, "rc11:chl_excavation"),
        baselineConcreteOrderM3: quantity(first.rows, "rc11:chl_structural_concrete"),
        changedConcreteOrderM3: quantity(changedGeometry.rows, "rc11:chl_structural_concrete"),
      },
      procurement: {
        initialFillKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:initial-fill"),
        retainedSpareKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:retained-spare"),
        availableStockKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:available-stock"),
        netOrderNeedKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:net-order-need"),
        packageCount: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:package-count"),
        orderedKg: quantity(changedProcurement.rows, "rc11:chl_reagent_order"),
        remainderKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:remainder"),
        surplusKg: quantity(changedProcurement.rows, "rc11:chl-reagent-balance:surplus-beyond-spare"),
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
