import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  PUMPING_STATION_ACCEPTANCE_INPUT,
  PUMPING_STATION_CATALOG_ID,
  PUMPING_STATION_FORMULAS,
  PUMPING_STATION_NORM_ID,
  PUMPING_STATION_PARAMETERS,
  PUMPING_STATION_RESOURCES,
  PUMPING_STATION_RUNTIME_CLASSIFICATION,
  PUMPING_STATION_RUNTIME_INPUT,
  PUMPING_STATION_RUNTIME_SOURCE_IDS,
  PUMPING_STATION_SHORT_INPUT,
  PUMPING_STATION_SOURCE_ID,
  PUMPING_STATION_SOURCE_METADATA,
  compilePumpingStationR1,
} from "../../../src/lib/estimate/v4/pumpingStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compilePumpingStationR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wps_station_count", "wps_station_designation", "wps_station_type", "wps_duty",
  "wps_design_flow_lps", "wps_design_head_m", "wps_pump_installed_piece",
  "wps_pump_designation", "wps_duty_pump_count", "wps_standby_pump_count",
  "wps_motor_power_kw", "wps_suction_manifold_installed_m",
  "wps_suction_manifold_designation", "wps_discharge_manifold_installed_m",
  "wps_discharge_manifold_designation", "wps_power_cable_installed_m",
  "wps_power_cable_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
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

async function verifyCore(): Promise<Json> {
  const first = await compilePumpingStationR1({ ...PUMPING_STATION_SHORT_INPUT });
  const complete = await compilePumpingStationR1({ ...PUMPING_STATION_ACCEPTANCE_INPUT });
  const balanced = await compilePumpingStationR1({
    ...PUMPING_STATION_ACCEPTANCE_INPUT,
    wps_power_cable_retained_spare_m: 20,
    wps_power_cable_supplier_drum_length_m: 100,
  });
  const conditional = await compilePumpingStationR1({
    ...PUMPING_STATION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 13 && first.preliminaryNeeds.length === 32
    && quantity(first, "rc09:wps_acceptance") === "1"
    && quantity(first, "rc09:wps_design_flow") === "120"
    && quantity(first, "rc09:wps_design_head") === "55"
    && quantity(first, "rc09:wps_pump_units") === "3"
    && quantity(first, "rc09:wps_suction_manifold") === "18"
    && quantity(first, "rc09:wps_discharge_manifold") === "22"
    && quantity(first, "rc09:wps_power_cable") === "240")) {
    throw new Error("STOP_S27_24_PUMPING_STATION_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wps_isolation_valves") === "8"
    && quantity(complete, "rc09:wps_structural_concrete") === "96"
    && quantity(complete, "rc09:labor:wps-mechanical") === "480"
    && quantity(complete, "rc09:equipment:wps-crane") === "72"
    && quantity(complete, "rc09:logistics:wps-material-delivery") === "20")) {
    throw new Error("STOP_S27_24_PUMPING_STATION_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wps-cable-balance:installed-net") === "240"
    && quantity(balanced, "rc09:wps-cable-balance:retained-spare") === "20"
    && quantity(balanced, "rc09:wps-cable-balance:total-need") === "260"
    && quantity(balanced, "rc09:wps-cable-balance:drum-count") === "3"
    && quantity(balanced, "rc09:wps_power_cable") === "300"
    && quantity(balanced, "rc09:wps-cable-balance:remainder") === "60"
    && quantity(balanced, "rc09:wps-cable-balance:surplus-beyond-spare") === "40")) {
    throw new Error("STOP_S27_24_PUMPING_STATION_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_PUMPING_STATION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wps_acceptance", "rc09:wps_design_flow", "rc09:wps_design_head",
    "rc09:wps_hydraulic_functional_tests", "rc09:wps_electrical_tests",
    "rc09:wps_disinfection_asbuilt",
  ]) {
    const graph = PUMPING_STATION_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_PUMPING_STATION_DOUBLE_COST:${rowId}`);
    }
  }
  if (/100\s*\*|length_m\s*\*|pumpingStationCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(PUMPING_STATION_FORMULAS))) {
    throw new Error("STOP_S27_24_PUMPING_STATION_LEGACY_COEFFICIENT");
  }
  if (/sewer|fire|reservoir|water_intake|treatment_plant/iu
    .test(JSON.stringify(PUMPING_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_PUMPING_STATION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_PUMPING_STATION_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: PUMPING_STATION_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:wps-cable-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:wps-cable-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:wps-cable-balance:total-need"),
      drumCount: quantity(balanced, "rc09:wps-cable-balance:drum-count"),
      orderedM: quantity(balanced, "rc09:wps_power_cable"),
      remainderM: quantity(balanced, "rc09:wps-cable-balance:remainder"),
      surplusM: quantity(balanced, "rc09:wps-cable-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.pumping-station-balanced-successor.v1",
  stopCode: "S27_24_PUMPING_STATION_BALANCED",
  applicationName: "s27-24-pumping-station-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "7d7f386d-751a-5f32-bb0b-6cf211e7a2ac",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "be975eb2-a314-5fe2-ab54-f81f5824faad",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/pumping-station-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pumping-station-potable-water-power-cable-balanced-s27-24.json",
    "src/lib/estimate/v4/pumpingStationR1.ts",
    "tests/estimateNorms/pumpingStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724PumpingStationBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724PumpingStationBalancedIndependent.ts",
  ],
  catalogId: PUMPING_STATION_CATALOG_ID,
  sourceId: PUMPING_STATION_SOURCE_ID,
  normId: PUMPING_STATION_NORM_ID,
  sourceMetadata: PUMPING_STATION_SOURCE_METADATA,
  parameterDefinitions: PUMPING_STATION_PARAMETERS,
  formulaDefinitions: PUMPING_STATION_FORMULAS,
  resourceDefinitions: PUMPING_STATION_RESOURCES,
  shortInput: PUMPING_STATION_SHORT_INPUT,
  acceptanceInput: PUMPING_STATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: PUMPING_STATION_RUNTIME_INPUT,
  runtimeProfileClassification: PUMPING_STATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: PUMPING_STATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 62,
  validationScenario: "Q5_PUMPING_STATION_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство станции повышения давления питьевой воды",
    workKey: "pumping_station",
    physicalResultRu: "Станция WPS-RC-Q120-H55-2D1S смонтирована, испытана, продезинфицирована и принята",
    includedScopeRu: [
      "три насосных агрегата по схеме два рабочих плюс один резервный",
      "всасывающий и напорный коллекторы, арматура, КИП, НКУ, ЧРП, ПЛК и диспетчеризация",
      "строительные материалы, комплектующие, расходники, труд, механизмы, испытания и логистика",
      "крепление, водопонижение и резервный генератор только по условным ветвям",
    ],
    excludedScopeRu: [
      "канализационная и пожарная насосные станции, внешняя сеть, резервуар, водозабор и водоподготовка",
      "автоматические объёмы по расходу, напору, мощности или количеству насосов",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_BOOSTER_PUMPING_STATION",
    stationAssembly: "WPS_RC_Q120_H55_2D1S_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wps_station_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visiblePowerCableProcurementBalance: true,
    directProjectCivilMechanicalElectricalControlsLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryWorksAndGeneratorFailClosed: true,
    hydraulicDutyDerivedQuantitiesForbidden: true,
    sewerFireAndAdjacentFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wps_acceptance",
    applicability: {
      technology_class: "RC_DRY_WELL_POTABLE_WATER_BOOSTER_STATION",
      operation_class: "POTABLE_WATER_BOOSTER_PUMPING_STATION_CONSTRUCTION",
      station_assembly: "WPS_RC_Q120_H55_2D1S_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_STATION_SCOPE_PLUS_VISIBLE_CABLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: PUMPING_STATION_SOURCE_ID,
      norm_id: PUMPING_STATION_NORM_ID,
      exact_locator: PUMPING_STATION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_STATION_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_CABLE_DRUM",
    },
  },
  locator: {
    key: "pumping-station-potable-water-power-cable-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: PUMPING_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(PUMPING_STATION_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(PUMPING_STATION_RUNTIME_INPUT),
      directProjectInputs: PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(PUMPING_STATION_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "standby_generator"]
            .some((branch) => id.startsWith(`wps_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство станции повышения давления питьевой воды",
    aliases: [
      "насосная станция повышения давления водоснабжения",
      "станция подкачки питьевой воды два рабочих один резервный",
      "potable water booster pumping station",
    ],
    shortScopeRu: "Одна WPS-RC-Q120-H55-2D1S: 120 л/с при 55 м, три насоса 2+1, всасывающий и напорный коллекторы, силовой кабель; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(PUMPING_STATION_SHORT_INPUT, id)),
    includedBoundaries: [
      "насосы, внутренние коллекторы, арматура, КИП, электрическая часть и автоматика",
      "строительные материалы, расходники, труд, механизмы, испытания, документация и логистика",
      "условные крепление, водопонижение и резервный генератор только по проекту",
    ],
    excludedBoundaries: [
      "канализационная и пожарная насосные станции, наружная сеть, резервуар, водозабор и водоподготовка",
      "автоматические объёмы по расходу, напору, мощности или количеству насосов",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "станция повышения давления питьевая вода насосы 2+1 коллектор ЧРП ПЛК кабель",
    sourceProvenance: {
      exactExpandedPumpingStationOwner: true,
      knownPotableWaterHydraulicDutyPumpsManifoldsAndCableIdentity: true,
      visibleIndependentPowerCableProcurementBalance: true,
      exactProjectCivilMechanicalElectricalControlsLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /sewer|канализац/iu,
    /fire|пожарн/iu,
    /reservoir|резервуар/iu,
    /water.intake|водозабор/iu,
    /treatment.plant|водоочистн|водоподготов/iu,
  ],
  owner: "S27_24_PUMPING_STATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_PUMPING_STATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
