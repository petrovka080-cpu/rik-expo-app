import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FILTRATION_STATION_ACCEPTANCE_INPUT,
  FILTRATION_STATION_CATALOG_ID,
  FILTRATION_STATION_FORMULAS,
  FILTRATION_STATION_KNOWN_SCOPE_PARAMETERS,
  FILTRATION_STATION_NORM_ID,
  FILTRATION_STATION_PARAMETERS,
  FILTRATION_STATION_RESOURCES,
  FILTRATION_STATION_RUNTIME_CLASSIFICATION,
  FILTRATION_STATION_RUNTIME_INPUT,
  FILTRATION_STATION_RUNTIME_SOURCE_IDS,
  FILTRATION_STATION_SHORT_INPUT,
  FILTRATION_STATION_SOURCE_ID,
  FILTRATION_STATION_SOURCE_METADATA,
  compileFiltrationStationR1,
} from "../../../src/lib/estimate/v4/filtrationStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileFiltrationStationR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  flt_excavation_shoring_mode: "REQUIRED",
  flt_excavation_shoring_designation: "SHEET-PILE-FILTER-HALL",
  flt_excavation_shoring_area_m2: 420,
  flt_groundwater_dewatering_mode: "REQUIRED",
  flt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
  flt_groundwater_dewatering_machine_h: 180,
  flt_standby_power_mode: "REQUIRED",
  flt_standby_power_designation: "DIESEL-GENSET-800KVA-AMF",
  flt_standby_power_kva: 800,
});

async function verifyCore(): Promise<Json> {
  const first = await compileFiltrationStationR1({
    ...FILTRATION_STATION_SHORT_INPUT,
  });
  const changedGeometry = await compileFiltrationStationR1({
    ...FILTRATION_STATION_SHORT_INPUT,
    flt_filter_internal_length_m: 10,
    flt_filter_internal_width_m: 6,
  });
  const changedProcurement = await compileFiltrationStationR1({
    ...FILTRATION_STATION_SHORT_INPUT,
    flt_filter_media_available_stock_t: 20,
    flt_filter_media_supplier_package_t: 25,
  });
  const conditional = await compileFiltrationStationR1({
    ...FILTRATION_STATION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 73 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc10:flt_design_capacity") === "5000"
    && quantity(first, "rc10:flt_hydraulic_loading") === "1.302083333"
    && quantity(first, "rc10:flt_excavation") === "569.296"
    && quantity(first, "rc10:flt_structural_concrete") === "197.0802"
    && quantity(first, "rc10:flt_reinforcement") === "26.7876"
    && quantity(first, "rc10:flt_filter_media") === "174"
    && quantity(first, "rc10:flt_underdrain_blocks") === "640"
    && quantity(first, "rc10:flt_process_valves") === "20")) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(Number(quantity(changedGeometry, "rc10:flt_excavation"))
      > Number(quantity(first, "rc10:flt_excavation"))
    && Number(quantity(changedGeometry, "rc10:flt_structural_concrete"))
      > Number(quantity(first, "rc10:flt_structural_concrete"))
    && Number(quantity(changedGeometry, "rc10:flt_filter_media"))
      > Number(quantity(first, "rc10:flt_filter_media"))
    && Number(quantity(changedGeometry, "rc10:flt_underdrain_blocks"))
      > Number(quantity(first, "rc10:flt_underdrain_blocks"))
    && Number(quantity(changedGeometry, "rc10:flt_hydraulic_loading"))
      < Number(quantity(first, "rc10:flt_hydraulic_loading")))) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc10:flt-media-balance:installed") === "171.392"
    && quantity(changedProcurement, "rc10:flt-media-balance:retained-spare") === "2"
    && quantity(changedProcurement, "rc10:flt-media-balance:available-stock") === "20"
    && quantity(changedProcurement, "rc10:flt-media-balance:total-need") === "173.392"
    && quantity(changedProcurement, "rc10:flt-media-balance:net-order-need") === "153.392"
    && quantity(changedProcurement, "rc10:flt-media-balance:package-count") === "7"
    && quantity(changedProcurement, "rc10:flt_filter_media") === "175"
    && quantity(changedProcurement, "rc10:flt-media-balance:remainder") === "23.608"
    && quantity(changedProcurement, "rc10:flt-media-balance:surplus-beyond-spare") === "21.608")) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 76 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc10:flt_blinding", "rc10:flt_structural_concrete", "rc10:flt_reinforcement",
    "rc10:flt_formwork", "rc10:flt_internal_lining", "rc10:flt_structural_steel",
    "rc10:flt_wall_panels", "rc10:flt_roof_panels", "rc10:flt_filter_media",
    "rc10:flt_support_gravel", "rc10:flt_underdrain_blocks",
    "rc10:flt_underdrain_nozzles", "rc10:flt_wash_troughs",
    "rc10:flt_inlet_pipe", "rc10:flt_outlet_pipe", "rc10:flt_backwash_pipe",
    "rc10:flt_air_pipe", "rc10:flt_drain_pipe", "rc10:flt_process_valves",
    "rc10:flt_pipe_supports", "rc10:flt_backwash_pumps",
    "rc10:flt_backwash_blowers", "rc10:flt_flowmeters",
    "rc10:flt_turbidity_meters", "rc10:flt_mcc", "rc10:flt_plc",
    "rc10:flt_power_cable", "rc10:flt_control_cable", "rc10:flt_test_water",
    "rc10:flt_disinfection_reagent", "rc10:labor:flt-civil",
    "rc10:labor:flt-process", "rc10:labor:flt-electrical",
    "rc10:equipment:flt-excavator", "rc10:equipment:flt-crane",
    "rc10:flt_asbuilt", "rc10:flt_process_commissioning",
    "rc10:logistics:flt-concrete", "rc10:logistics:flt-media",
  ]) {
    if (!FILTRATION_STATION_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_FILTRATION_STATION_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/waterTreatmentPlantCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(FILTRATION_STATION_FORMULAS))) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_LEGACY_COEFFICIENT");
  }
  if (/water_intake|coagulat|flocculat|sediment|disinfect_block|clean_water_reservoir|distribution_pipeline/iu
    .test(JSON.stringify(FILTRATION_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_FILTRATION_STATION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({
    first, changedGeometry, changedProcurement, conditional,
  });
  return {
    status: "GREEN_S27_26_FILTRATION_STATION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(FILTRATION_STATION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(FILTRATION_STATION_RUNTIME_INPUT).length,
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: FILTRATION_STATION_SHORT_INPUT,
    },
    automaticGeometry: {
      baselineExcavationM3: quantity(first, "rc10:flt_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc10:flt_excavation"),
      baselineConcreteOrderM3: quantity(first, "rc10:flt_structural_concrete"),
      changedConcreteOrderM3: quantity(changedGeometry, "rc10:flt_structural_concrete"),
      baselineMediaOrderT: quantity(first, "rc10:flt_filter_media"),
      changedMediaOrderT: quantity(changedGeometry, "rc10:flt_filter_media"),
      baselineHydraulicLoadingMHour: quantity(first, "rc10:flt_hydraulic_loading"),
      changedHydraulicLoadingMHour: quantity(changedGeometry, "rc10:flt_hydraulic_loading"),
    },
    procurement: {
      installedT: quantity(changedProcurement, "rc10:flt-media-balance:installed"),
      retainedSpareT: quantity(changedProcurement, "rc10:flt-media-balance:retained-spare"),
      availableStockT: quantity(changedProcurement, "rc10:flt-media-balance:available-stock"),
      netOrderNeedT: quantity(changedProcurement, "rc10:flt-media-balance:net-order-need"),
      packageCount: quantity(changedProcurement, "rc10:flt-media-balance:package-count"),
      orderedT: quantity(changedProcurement, "rc10:flt_filter_media"),
      surplusT: quantity(changedProcurement, "rc10:flt-media-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.filtration-station-automatic-successor.v1",
  stopCode: "S27_26_FILTRATION_STATION_AUTOMATIC",
  applicationName: "s27-26-filtration-station-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "0fa843d1-c720-530c-8bee-9d0c2a3a0bf4",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "ef4fd021-43b5-5327-b4ca-b8e65b371c0a",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/filtration-station-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/filtration-station-geometric-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/filtrationStationR1.ts",
    "tests/estimateNorms/filtrationStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726FiltrationStationAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726FiltrationStationAutomaticIndependent.ts",
  ],
  catalogId: FILTRATION_STATION_CATALOG_ID,
  sourceId: FILTRATION_STATION_SOURCE_ID,
  normId: FILTRATION_STATION_NORM_ID,
  sourceMetadata: FILTRATION_STATION_SOURCE_METADATA,
  parameterDefinitions: FILTRATION_STATION_PARAMETERS,
  formulaDefinitions: FILTRATION_STATION_FORMULAS,
  resourceDefinitions: FILTRATION_STATION_RESOURCES,
  shortInput: FILTRATION_STATION_SHORT_INPUT,
  acceptanceInput: FILTRATION_STATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: FILTRATION_STATION_RUNTIME_INPUT,
  runtimeProfileClassification: FILTRATION_STATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: FILTRATION_STATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [4, 45, 45],
  benchmarkOrdinal: 67,
  validationScenario: "Q5_FILTRATION_STATION_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Строительство фильтровальной станции питьевой воды",
    workKey: "filtration_station",
    physicalResultRu: "Фильтровальная станция FS-RGF-5000-4C с четырьмя ячейками, зданием, загрузкой, дренажом, промывкой, КИП и электрикой построена, испытана и введена в режим",
    includedScopeRu: [
      "котлован, железобетонный фильтровальный блок, защитные покрытия и технологическое здание",
      "фильтрующая загрузка, поддерживающий гравий, дренаж, форсунки и промывные желоба",
      "внутренние трубопроводы, арматура, промывочные насосы, воздуходувки, КИП, электрика и автоматизация",
      "расходники, труд, механизмы, испытания, исполнительная документация и логистика",
      "крепление, водопонижение и резервное питание только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "водозабор, коагуляция, флокуляция, отстаивание и отдельный блок обеззараживания",
      "резервуары чистой воды и наружные сети",
      "автоматический выбор технологического пакета только по производительности",
      "неподтверждённые материалы, производительность оборудования и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_RAPID_GRAVITY_FILTRATION_STATION",
    stationAssembly: "FS_RGF_5000_4C_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "flt_station_count",
    knownScopeParameters: [...FILTRATION_STATION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(FILTRATION_STATION_SHORT_INPUT).length,
    automaticCivilProcessElectricalLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visibleFilterMediaProcurementBalance: true,
    directProjectGeometryAndSelectedProcessPackageRequired: true,
    conditionalTemporaryWorksAndStandbyPowerFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    adjacentTreatmentAndExternalNetworksExcluded: true,
  },
  binding: {
    rowId: "rc10:flt_acceptance",
    applicability: {
      technology_class: "RAPID_GRAVITY_POTABLE_WATER_FILTRATION",
      operation_class: "FILTRATION_STATION_CONSTRUCTION_AND_COMMISSIONING",
      station_assembly: "FS_RGF_5000_4C_EXPLICIT_PROJECT",
      scope_mode: "TEN_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: FILTRATION_STATION_SOURCE_ID,
      norm_id: FILTRATION_STATION_NORM_ID,
      exact_locator: FILTRATION_STATION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_FILTER_GEOMETRY_AND_SELECTED_PROCESS_PACKAGE_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "filtration-station-geometric-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: FILTRATION_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: FILTRATION_STATION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(FILTRATION_STATION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(FILTRATION_STATION_RUNTIME_INPUT),
      automaticFormulaIds: FILTRATION_STATION_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство фильтровальной станции питьевой воды",
    aliases: [
      "станция скорых гравитационных фильтров",
      "фильтровальный блок водоподготовки",
      "rapid gravity potable water filtration station",
    ],
    shortScopeRu: "Одна фильтровальная станция 5000 м3/сут с четырьмя ячейками 8x5 м, загрузкой, дренажом, промывкой, зданием, КИП и электрикой; количества рассчитываются автоматически.",
    keyDistinguishingParameters: [...FILTRATION_STATION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "железобетонный фильтровальный блок, защитные покрытия и технологическое здание",
      "загрузка, гравий, дренаж, форсунки, желоба, трубопроводы и арматура",
      "промывочные насосы и воздуходувки, КИП, электрика и автоматизация",
      "расходники, труд, механизмы, испытания, документация и логистика",
      "условные крепление, водопонижение и резервное питание только по проекту",
    ],
    excludedBoundaries: [
      "водозабор, коагуляция, флокуляция, отстаивание и обеззараживание",
      "резервуары чистой воды и наружные сети",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "фильтровальная станция быстрые гравитационные фильтры загрузка дренаж промывка воздуходувка КИП",
    sourceProvenance: {
      exactExpandedFiltrationStationOwner: true,
      tenPrimaryFactIngress: true,
      automaticGeometryAssembliesLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /water.intake|водозабор/iu,
    /coagulat|flocculat|sediment|коагуляц|флокуляц|отстаив/iu,
    /disinfection[_. -]?block|отдельн\p{L}*\s+блок\p{L}*\s+обеззаражив/iu,
    /clean.water.reservoir|резервуар.*чист/iu,
    /distribution.pipeline|распределительн.*трубопровод/iu,
  ],
  owner: "S27_26_FILTRATION_STATION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_FILTRATION_STATION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
