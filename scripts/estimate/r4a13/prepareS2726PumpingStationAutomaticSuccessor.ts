import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  PUMPING_STATION_ACCEPTANCE_INPUT,
  PUMPING_STATION_CATALOG_ID,
  PUMPING_STATION_FORMULAS,
  PUMPING_STATION_KNOWN_SCOPE_PARAMETERS,
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
const close = (actual: string | null, expected: number, tolerance = 0.000_001) =>
  actual != null && Math.abs(Number(actual) - expected) <= tolerance;
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
  const changedGeometry = await compilePumpingStationR1({
    ...PUMPING_STATION_SHORT_INPUT,
    wps_internal_length_m: 15,
    wps_internal_width_m: 10,
  });
  const changedProcurement = await compilePumpingStationR1({
    ...PUMPING_STATION_SHORT_INPUT,
    wps_cable_supplier_drum_length_m: 50,
    wps_cable_available_stock_m: 40,
  });
  const conditional = await compilePumpingStationR1({
    ...PUMPING_STATION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 65 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc09:wps_excavation") === "808.704"
    && quantity(first, "rc09:wps_structural_concrete") === "166.1648"
    && quantity(first, "rc09:wps_reinforcement") === "22.797"
    && quantity(first, "rc09:wps_pump_units") === "3"
    && quantity(first, "rc09:wps_suction_manifold") === "18"
    && close(quantity(first, "rc09:wps_discharge_manifold"), 22)
    && quantity(first, "rc09:wps_isolation_valves") === "8"
    && quantity(first, "rc09:wps_power_cable") === "300")) {
    throw new Error("STOP_S27_26_PUMPING_STATION_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(Number(quantity(changedGeometry, "rc09:wps_excavation"))
      > Number(quantity(first, "rc09:wps_excavation"))
    && Number(quantity(changedGeometry, "rc09:wps_structural_concrete"))
      > Number(quantity(first, "rc09:wps_structural_concrete"))
    && Number(quantity(changedGeometry, "rc09:wps_reinforcement"))
      > Number(quantity(first, "rc09:wps_reinforcement"))
    && quantity(changedGeometry, "rc09:wps_pump_units") === "3")) {
    throw new Error("STOP_S27_26_PUMPING_STATION_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(first, "rc09:wps-cable-balance:installed-net") === "240"
    && quantity(first, "rc09:wps-cable-balance:total-need") === "267.2"
    && quantity(first, "rc09:wps-cable-balance:drum-count") === "3"
    && quantity(first, "rc09:wps_power_cable") === "300"
    && quantity(changedProcurement, "rc09:wps-cable-balance:net-order-need") === "227.2"
    && quantity(changedProcurement, "rc09:wps-cable-balance:drum-count") === "5"
    && quantity(changedProcurement, "rc09:wps_power_cable") === "250")) {
    throw new Error("STOP_S27_26_PUMPING_STATION_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 68 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_26_PUMPING_STATION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wps_blinding", "rc09:wps_structural_concrete", "rc09:wps_reinforcement",
    "rc09:wps_formwork", "rc09:wps_waterproofing", "rc09:wps_imported_backfill",
    "rc09:wps_pump_units", "rc09:wps_suction_manifold", "rc09:wps_discharge_manifold",
    "rc09:wps_isolation_valves", "rc09:wps_flanged_joint_sets",
    "rc09:wps_cable_terminations", "rc09:wps_curing_compound",
    "rc09:wps_test_water", "rc09:wps_disinfection_reagent",
    "rc09:labor:wps-earthworks", "rc09:labor:wps-mechanical",
    "rc09:equipment:wps-excavator", "rc09:equipment:wps-crane",
    "rc09:logistics:wps-material-delivery", "rc09:wps_asbuilt",
  ]) {
    if (!PUMPING_STATION_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_PUMPING_STATION_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/100\s*\*|pumpingStationCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(PUMPING_STATION_FORMULAS))) {
    throw new Error("STOP_S27_26_PUMPING_STATION_LEGACY_COEFFICIENT");
  }
  if (/sewer|fire|reservoir|water_intake|treatment_plant/iu
    .test(JSON.stringify(PUMPING_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_PUMPING_STATION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, changedGeometry, changedProcurement, conditional });
  return {
    status: "GREEN_S27_26_PUMPING_STATION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(PUMPING_STATION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(PUMPING_STATION_RUNTIME_INPUT).length,
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: PUMPING_STATION_SHORT_INPUT,
    },
    automaticGeometry: {
      baselineExcavationM3: quantity(first, "rc09:wps_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc09:wps_excavation"),
      baselineConcreteOrderM3: quantity(first, "rc09:wps_structural_concrete"),
      changedConcreteOrderM3: quantity(changedGeometry, "rc09:wps_structural_concrete"),
    },
    procurement: {
      installedM: quantity(first, "rc09:wps-cable-balance:installed-net"),
      totalNeedM: quantity(first, "rc09:wps-cable-balance:total-need"),
      defaultOrderedM: quantity(first, "rc09:wps_power_cable"),
      changedNetOrderNeedM: quantity(changedProcurement, "rc09:wps-cable-balance:net-order-need"),
      changedDrumCount: quantity(changedProcurement, "rc09:wps-cable-balance:drum-count"),
      changedOrderedM: quantity(changedProcurement, "rc09:wps_power_cable"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.pumping-station-automatic-successor.v1",
  stopCode: "S27_26_PUMPING_STATION_AUTOMATIC",
  applicationName: "s27-26-pumping-station-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "1542f49c-edbe-5689-87f8-18fc9cb40069",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "98d63433-1e00-58c2-a136-b65c44d03c0c",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/pumping-station-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pumping-station-geometric-automatic-s27-25.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/pumpingStationR1.ts",
    "tests/estimateNorms/pumpingStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726PumpingStationAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726PumpingStationAutomaticIndependent.ts",
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
  expectedParentShape: [69, 45, 45],
  benchmarkOrdinal: 62,
  validationScenario: "Q5_PUMPING_STATION_AUTOMATIC_S27_26",
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
    knownScopeParameters: [...PUMPING_STATION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(PUMPING_STATION_SHORT_INPUT).length,
    automaticGeometryLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visiblePowerCableProcurementBalance: true,
    directProjectCivilMechanicalElectricalControlsLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryWorksAndGeneratorFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    sewerFireAndAdjacentFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wps_acceptance",
    applicability: {
      technology_class: "RC_DRY_WELL_POTABLE_WATER_BOOSTER_STATION",
      operation_class: "POTABLE_WATER_BOOSTER_PUMPING_STATION_CONSTRUCTION",
      station_assembly: "WPS_RC_Q120_H55_2D1S_EXPLICIT_PROJECT",
      scope_mode: "ELEVEN_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: PUMPING_STATION_SOURCE_ID,
      norm_id: PUMPING_STATION_NORM_ID,
      exact_locator: PUMPING_STATION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_GEOMETRY_AND_PUMP_ARRANGEMENT_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "pumping-station-geometric-automatic-s27-25-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: PUMPING_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(PUMPING_STATION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(PUMPING_STATION_RUNTIME_INPUT),
      automaticFormulaIds: PUMPING_STATION_FORMULAS.map((formula) => formula.formula_id),
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
    keyDistinguishingParameters: [...PUMPING_STATION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
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
      elevenPrimaryFactIngress: true,
      automaticGeometryAssembliesLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /sewer|канализац/iu,
    /fire|пожарн/iu,
    /reservoir|резервуар/iu,
    /water.intake|водозабор/iu,
    /treatment.plant|водоочистн|водоподготов/iu,
  ],
  owner: "S27_26_PUMPING_STATION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_PUMPING_STATION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
