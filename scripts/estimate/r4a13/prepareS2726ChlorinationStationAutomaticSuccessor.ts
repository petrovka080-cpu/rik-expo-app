import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CHLORINATION_STATION_ACCEPTANCE_INPUT,
  CHLORINATION_STATION_CATALOG_ID,
  CHLORINATION_STATION_FORMULAS,
  CHLORINATION_STATION_KNOWN_SCOPE_PARAMETERS,
  CHLORINATION_STATION_NORM_ID,
  CHLORINATION_STATION_PARAMETERS,
  CHLORINATION_STATION_RESOURCES,
  CHLORINATION_STATION_RUNTIME_CLASSIFICATION,
  CHLORINATION_STATION_RUNTIME_INPUT,
  CHLORINATION_STATION_RUNTIME_SOURCE_IDS,
  CHLORINATION_STATION_SHORT_INPUT,
  CHLORINATION_STATION_SOURCE_ID,
  CHLORINATION_STATION_SOURCE_METADATA,
  compileChlorinationStationR1,
} from "../../../src/lib/estimate/v4/chlorinationStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileChlorinationStationR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
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

async function verifyCore(): Promise<Json> {
  const first = await compileChlorinationStationR1({
    ...CHLORINATION_STATION_SHORT_INPUT,
  });
  const changedDemand = await compileChlorinationStationR1({
    ...CHLORINATION_STATION_SHORT_INPUT,
    chl_design_flow_m3_day: 4000,
    chl_design_dose_mg_l: 4,
    chl_solution_concentration_percent: 10,
  });
  const changedGeometry = await compileChlorinationStationR1({
    ...CHLORINATION_STATION_SHORT_INPUT,
    chl_building_length_m: 8,
    chl_building_width_m: 5,
  });
  const changedProcurement = await compileChlorinationStationR1({
    ...CHLORINATION_STATION_SHORT_INPUT,
    chl_reagent_available_stock_kg: 50,
    chl_reagent_supplier_package_kg: 100,
  });
  const conditional = await compileChlorinationStationR1({
    ...CHLORINATION_STATION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 77 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc11:chl_design_flow") === "1000"
    && quantity(first, "rc11:chl_active_chlorine_demand") === "2"
    && quantity(first, "rc11:chl_solution_daily_mass") === "16"
    && quantity(first, "rc11:chl_storage_volume") === "0.2"
    && quantity(first, "rc11:chl_storage_tanks") === "1"
    && quantity(first, "rc11:chl_excavation") === "21"
    && quantity(first, "rc11:chl_structural_concrete") === "6.18"
    && quantity(first, "rc11:chl_reinforcement") === "0.72"
    && quantity(first, "rc11:chl_dosing_pumps") === "2"
    && quantity(first, "rc11:chl_reagent_order") === "300")) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(Number(quantity(changedDemand, "rc11:chl_active_chlorine_demand"))
      > Number(quantity(first, "rc11:chl_active_chlorine_demand"))
    && Number(quantity(changedDemand, "rc11:chl_solution_daily_mass"))
      > Number(quantity(first, "rc11:chl_solution_daily_mass"))
    && Number(quantity(changedDemand, "rc11:chl_storage_volume"))
      > Number(quantity(first, "rc11:chl_storage_volume"))
    && Number(quantity(changedDemand, "rc11:chl_storage_tanks"))
      > Number(quantity(first, "rc11:chl_storage_tanks")))) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_DEMAND_RECALCULATION");
  }
  if (!(Number(quantity(changedGeometry, "rc11:chl_excavation"))
      > Number(quantity(first, "rc11:chl_excavation"))
    && Number(quantity(changedGeometry, "rc11:chl_structural_concrete"))
      > Number(quantity(first, "rc11:chl_structural_concrete"))
    && Number(quantity(changedGeometry, "rc11:chl_reinforcement"))
      > Number(quantity(first, "rc11:chl_reinforcement")))) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc11:chl-reagent-balance:initial-fill") === "240"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:retained-spare") === "48"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:available-stock") === "50"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:total-need") === "288"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:net-order-need") === "238"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:package-count") === "3"
    && quantity(changedProcurement, "rc11:chl_reagent_order") === "300"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:remainder") === "110"
    && quantity(changedProcurement, "rc11:chl-reagent-balance:surplus-beyond-spare") === "62")) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 80 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc11:chl_blinding", "rc11:chl_structural_concrete",
    "rc11:chl_reinforcement", "rc11:chl_formwork", "rc11:chl_floor_coating",
    "rc11:chl_structural_steel", "rc11:chl_wall_panels", "rc11:chl_roof_panels",
    "rc11:chl_storage_tanks", "rc11:chl_dosing_pumps", "rc11:chl_transfer_pumps",
    "rc11:chl_injection_quills", "rc11:chl_process_pipe", "rc11:chl_process_valves",
    "rc11:chl_exhaust_fans", "rc11:chl_gas_detectors", "rc11:chl_eyewash",
    "rc11:chl_spill_kits", "rc11:chl_level_instruments",
    "rc11:chl_residual_analyzers", "rc11:chl_control_panels",
    "rc11:chl_power_cable", "rc11:chl_control_cable", "rc11:chl_flushing_water",
    "rc11:labor:chl-civil", "rc11:labor:chl-process", "rc11:labor:chl-electrical",
    "rc11:equipment:chl-excavator", "rc11:equipment:chl-crane",
    "rc11:chl_asbuilt", "rc11:chl_process_commissioning",
    "rc11:logistics:chl-concrete", "rc11:logistics:chl-reagent",
  ]) {
    if (!CHLORINATION_STATION_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_CHLORINATION_STATION_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/waterTreatmentPlantCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(CHLORINATION_STATION_FORMULAS))) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_LEGACY_COEFFICIENT");
  }
  if (/filtration|coagulat|flocculat|sediment|contact_tank|distribution_pipeline|gas_chlorine/iu
    .test(JSON.stringify(CHLORINATION_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_CHLORINATION_STATION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({
    first, changedDemand, changedGeometry, changedProcurement, conditional,
  });
  return {
    status: "GREEN_S27_26_CHLORINATION_STATION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(CHLORINATION_STATION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(CHLORINATION_STATION_RUNTIME_INPUT).length,
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: CHLORINATION_STATION_SHORT_INPUT,
    },
    automaticDemand: {
      baselineActiveChlorineKgDay: quantity(first, "rc11:chl_active_chlorine_demand"),
      changedActiveChlorineKgDay: quantity(changedDemand, "rc11:chl_active_chlorine_demand"),
      baselineStorageM3: quantity(first, "rc11:chl_storage_volume"),
      changedStorageM3: quantity(changedDemand, "rc11:chl_storage_volume"),
      baselineTankCount: quantity(first, "rc11:chl_storage_tanks"),
      changedTankCount: quantity(changedDemand, "rc11:chl_storage_tanks"),
    },
    automaticGeometry: {
      baselineExcavationM3: quantity(first, "rc11:chl_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc11:chl_excavation"),
      baselineConcreteOrderM3: quantity(first, "rc11:chl_structural_concrete"),
      changedConcreteOrderM3: quantity(changedGeometry, "rc11:chl_structural_concrete"),
    },
    procurement: {
      initialFillKg: quantity(changedProcurement, "rc11:chl-reagent-balance:initial-fill"),
      retainedSpareKg: quantity(changedProcurement, "rc11:chl-reagent-balance:retained-spare"),
      availableStockKg: quantity(changedProcurement, "rc11:chl-reagent-balance:available-stock"),
      netOrderNeedKg: quantity(changedProcurement, "rc11:chl-reagent-balance:net-order-need"),
      packageCount: quantity(changedProcurement, "rc11:chl-reagent-balance:package-count"),
      orderedKg: quantity(changedProcurement, "rc11:chl_reagent_order"),
      surplusKg: quantity(changedProcurement, "rc11:chl-reagent-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.chlorination-station-automatic-successor.v1",
  stopCode: "S27_26_CHLORINATION_STATION_AUTOMATIC",
  applicationName: "s27-26-chlorination-station-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b990a0b3-cf60-5262-8a8a-35ea30ee9081",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "10d737e8-2b8c-5ff8-8d98-7c75f84612fb",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/chlorination-station-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/chlorination-station-hypochlorite-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/chlorinationStationR1.ts",
    "tests/estimateNorms/chlorinationStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.test.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726ChlorinationStationAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726ChlorinationStationAutomaticIndependent.ts",
  ],
  catalogId: CHLORINATION_STATION_CATALOG_ID,
  sourceId: CHLORINATION_STATION_SOURCE_ID,
  normId: CHLORINATION_STATION_NORM_ID,
  sourceMetadata: CHLORINATION_STATION_SOURCE_METADATA,
  parameterDefinitions: CHLORINATION_STATION_PARAMETERS,
  formulaDefinitions: CHLORINATION_STATION_FORMULAS,
  resourceDefinitions: CHLORINATION_STATION_RESOURCES,
  shortInput: CHLORINATION_STATION_SHORT_INPUT,
  acceptanceInput: CHLORINATION_STATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: CHLORINATION_STATION_RUNTIME_INPUT,
  runtimeProfileClassification: CHLORINATION_STATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: CHLORINATION_STATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [4, 45, 45],
  benchmarkOrdinal: 68,
  validationScenario: "Q5_CHLORINATION_STATION_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Строительство станции дозирования гипохлорита натрия",
    workKey: "chlorination_station",
    physicalResultRu: "Станция CHL-NAOCL-1000-1IP с химстойким зданием, хранением реагента, рабочим и резервным дозированием, узлом ввода, вентиляцией, безопасностью, КИП и электрикой построена, испытана и введена в режим",
    includedScopeRu: [
      "котлован, железобетонная плита и аварийный поддон, химстойкое покрытие и здание",
      "ёмкости раствора, насосы перекачки, рабочие и резервные дозирующие насосы, узлы ввода и трубопроводы",
      "вентиляция, газовый контроль, аварийный душ, локализация пролива и средства защиты",
      "КИП, электрика, автоматизация, расходники, труд, механизмы, испытания, обучение и логистика",
      "крепление, водопонижение и резервное питание только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "газовый хлор, электролиз, другие реагенты и автоматический выбор технологии по расходу",
      "водоподготовка до обеззараживания, контактный резервуар и наружные сети",
      "неподтверждённые производительность оборудования, материалы и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_SODIUM_HYPOCHLORITE_DOSING_STATION",
    stationAssembly: "CHL_NAOCL_1000_1IP_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "chl_station_count",
    knownScopeParameters: [...CHLORINATION_STATION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(CHLORINATION_STATION_SHORT_INPUT).length,
    automaticDemandCivilProcessSafetyElectricalLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visibleReagentProcurementBalance: true,
    explicitTechnologyDoseConcentrationAndSelectedDosingPackageRequired: true,
    conditionalTemporaryWorksAndStandbyPowerFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    adjacentTreatmentContactTankAndExternalNetworksExcluded: true,
  },
  binding: {
    rowId: "rc11:chl_acceptance",
    applicability: {
      technology_class: "SODIUM_HYPOCHLORITE_DOSING",
      operation_class: "CHLORINATION_STATION_CONSTRUCTION_AND_COMMISSIONING",
      station_assembly: "CHL_NAOCL_1000_1IP_EXPLICIT_PROJECT",
      scope_mode: "EIGHT_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: CHLORINATION_STATION_SOURCE_ID,
      norm_id: CHLORINATION_STATION_NORM_ID,
      exact_locator: CHLORINATION_STATION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_FLOW_DOSE_CONCENTRATION_AND_SELECTED_PACKAGE_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "chlorination-station-hypochlorite-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: CHLORINATION_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: CHLORINATION_STATION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(CHLORINATION_STATION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(CHLORINATION_STATION_RUNTIME_INPUT),
      automaticFormulaIds: CHLORINATION_STATION_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство станции дозирования гипохлорита натрия",
    aliases: [
      "станция хлорирования питьевой воды гипохлоритом натрия",
      "реагентное хозяйство гипохлорита натрия",
      "sodium hypochlorite dosing station",
    ],
    shortScopeRu: "Одна станция 1000 м3/сут для готового раствора гипохлорита натрия 12,5%, доза 2 мг/л, один ввод, хранение, дозирование, безопасность, КИП и электрика; количества рассчитываются автоматически.",
    keyDistinguishingParameters: [...CHLORINATION_STATION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "железобетонная плита, аварийный поддон, химстойкое здание и покрытие",
      "хранение раствора, перекачка, рабочее и резервное дозирование, трубопровод и узел ввода",
      "вентиляция, безопасность, КИП, электрика и автоматизация",
      "расходники, труд, механизмы, испытания, документация, обучение и логистика",
    ],
    excludedBoundaries: [
      "газовый хлор, электролиз, иные реагенты, контактный резервуар и внешние сети",
      "неподтверждённые проектом материалы, производительность оборудования и цены",
    ],
    extraSearchTermsRu: "станция хлорирования гипохлорит натрия дозирование реагента обеззараживание питьевой воды КИП",
    sourceProvenance: {
      exactExpandedChlorinationStationOwner: true,
      eightPrimaryFactIngress: true,
      automaticDemandGeometryAssembliesSafetyLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /filtration|фильтровальн/iu,
    /coagulat|flocculat|sediment|коагуляц|флокуляц|отстаив/iu,
    /contact[_. -]?tank|контактн\p{L}*\s+резервуар/iu,
    /distribution.pipeline|распределительн.*трубопровод/iu,
    /gas[_. -]?chlorine|газов\p{L}*\s+хлор/iu,
  ],
  owner: "S27_26_CHLORINATION_STATION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_CHLORINATION_STATION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
