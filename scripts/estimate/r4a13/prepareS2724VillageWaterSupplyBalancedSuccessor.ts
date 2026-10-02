import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT, VILLAGE_WATER_SUPPLY_CATALOG_ID,
  VILLAGE_WATER_SUPPLY_FORMULAS, VILLAGE_WATER_SUPPLY_NORM_ID,
  VILLAGE_WATER_SUPPLY_PARAMETERS, VILLAGE_WATER_SUPPLY_RESOURCES,
  VILLAGE_WATER_SUPPLY_RUNTIME_CLASSIFICATION, VILLAGE_WATER_SUPPLY_RUNTIME_INPUT,
  VILLAGE_WATER_SUPPLY_RUNTIME_SOURCE_IDS, VILLAGE_WATER_SUPPLY_SHORT_INPUT,
  VILLAGE_WATER_SUPPLY_SOURCE_ID, VILLAGE_WATER_SUPPLY_SOURCE_METADATA,
  compileVillageWaterSupplyR1,
} from "../../../src/lib/estimate/v4/villageWaterSupplyR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileVillageWaterSupplyR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "vws_network_count", "vws_network_designation", "vws_network_type",
  "vws_design_flow_m3_day", "vws_main_pipe_installed_m", "vws_main_pipe_designation",
  "vws_branch_pipe_installed_m", "vws_branch_pipe_designation",
  "vws_valve_chamber_piece", "vws_fire_hydrant_piece",
  "vws_house_service_connection_piece",
];
const CONDITIONAL_INPUT = Object.freeze({
  vws_rock_excavation_mode: "REQUIRED", vws_rock_excavation_designation: "HYDRAULIC-BREAKER",
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

async function verifyCore(): Promise<Json> {
  const first = await compileVillageWaterSupplyR1({ ...VILLAGE_WATER_SUPPLY_SHORT_INPUT });
  const complete = await compileVillageWaterSupplyR1({
    ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  });
  const balanced = await compileVillageWaterSupplyR1({
    ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
    vws_main_pipe_retained_spare_m: 40, vws_main_pipe_supplier_bundle_length_m: 100,
  });
  const conditional = await compileVillageWaterSupplyR1({
    ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 12 && first.preliminaryNeeds.length === 33
    && quantity(first, "rc09:vws_acceptance") === "1"
    && quantity(first, "rc09:vws_main_pipe") === "3000"
    && quantity(first, "rc09:vws_branch_pipe") === "1200"
    && quantity(first, "rc09:vws_valve_chambers") === "36"
    && quantity(first, "rc09:vws_fire_hydrants") === "18"
    && quantity(first, "rc09:vws_house_connections") === "150")) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:vws_trench_excavation") === "8600"
    && quantity(complete, "rc09:vws_bedding_sand") === "1280"
    && quantity(complete, "rc09:vws_isolation_valves") === "42"
    && quantity(complete, "rc09:vws_road_crossing_sleeves") === "220"
    && quantity(complete, "rc09:labor:vws-pipe-installation") === "4400"
    && quantity(complete, "rc09:equipment:vws-butt-fusion") === "360"
    && quantity(complete, "rc09:logistics:vws-material-delivery") === "210")) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:vws-main-pipe-balance:installed-net") === "3000"
    && quantity(balanced, "rc09:vws-main-pipe-balance:retained-spare") === "40"
    && quantity(balanced, "rc09:vws-main-pipe-balance:total-need") === "3040"
    && quantity(balanced, "rc09:vws-main-pipe-balance:package-count") === "31"
    && quantity(balanced, "rc09:vws_main_pipe") === "3100"
    && quantity(balanced, "rc09:vws-main-pipe-balance:remainder") === "100"
    && quantity(balanced, "rc09:vws-main-pipe-balance:surplus-beyond-spare") === "60")) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:vws_acceptance", "rc09:vws_hydraulic_tests",
    "rc09:vws_flushing_disinfection", "rc09:vws_water_quality_samples",
    "rc09:vws_compaction_tests", "rc09:vws_asbuilt_documents"]) {
    const graph = VILLAGE_WATER_SUPPLY_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_VILLAGE_WATER_SUPPLY_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu
    .test(JSON.stringify(VILLAGE_WATER_SUPPLY_FORMULAS))) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_LEGACY_COEFFICIENT");
  }
  if (/water_intake|borehole|pumping_station|treatment_plant|reservoir|water_tower|sewer/iu
    .test(JSON.stringify(VILLAGE_WATER_SUPPLY_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_VILLAGE_WATER_SUPPLY_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_VILLAGE_WATER_SUPPLY_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: VILLAGE_WATER_SUPPLY_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:vws-main-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:vws-main-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:vws-main-pipe-balance:total-need"),
      packageCount: quantity(balanced, "rc09:vws-main-pipe-balance:package-count"),
      orderedM: quantity(balanced, "rc09:vws_main_pipe"),
      remainderM: quantity(balanced, "rc09:vws-main-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:vws-main-pipe-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.village-water-supply-balanced-successor.v1",
  stopCode: "S27_24_VILLAGE_WATER_SUPPLY_BALANCED",
  applicationName: "s27-24-village-water-supply-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d34ecbda-a047-5965-ba85-b8a30c360c73",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "93ff4a36-9994-52da-abba-a60adf9349fc",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/village-water-supply-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/village-water-supply-pressure-main-balanced-s27-24.json",
    "src/lib/estimate/v4/villageWaterSupplyR1.ts",
    "tests/estimateNorms/villageWaterSupplyR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724VillageWaterSupplyBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724VillageWaterSupplyBalancedIndependent.ts",
  ],
  catalogId: VILLAGE_WATER_SUPPLY_CATALOG_ID,
  sourceId: VILLAGE_WATER_SUPPLY_SOURCE_ID, normId: VILLAGE_WATER_SUPPLY_NORM_ID,
  sourceMetadata: VILLAGE_WATER_SUPPLY_SOURCE_METADATA,
  parameterDefinitions: VILLAGE_WATER_SUPPLY_PARAMETERS,
  formulaDefinitions: VILLAGE_WATER_SUPPLY_FORMULAS,
  resourceDefinitions: VILLAGE_WATER_SUPPLY_RESOURCES,
  shortInput: VILLAGE_WATER_SUPPLY_SHORT_INPUT,
  acceptanceInput: VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  runtimeProfileInput: VILLAGE_WATER_SUPPLY_RUNTIME_INPUT,
  runtimeProfileClassification: VILLAGE_WATER_SUPPLY_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: VILLAGE_WATER_SUPPLY_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 54,
  validationScenario: "Q5_VILLAGE_WATER_SUPPLY_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство напорной водопроводной сети села",
    workKey: "village_water_supply",
    physicalResultRu: "Сеть VWS-HDPE-PE100-RC-OD160-110-4200 построена, испытана, продезинфицирована и принята",
    includedScopeRu: [
      "явные главная труба, ответвления, камеры, гидранты и домовые вводы",
      "траншеи, основание, фасонные части, арматура, засыпка, упоры, футляры, маркировка и расходники",
      "труд, механизмы, гидроиспытания, дезинфекция, лабораторный контроль, документы, логистика и баланс главной трубы",
      "скала, водопонижение, организация движения и восстановление дороги только условно",
    ],
    excludedScopeRu: [
      "водозабор, скважина, насосная или очистная станция", "резервуар, водонапорная башня, внутренний водопровод и канализация",
      "автоматические объёмы по длине, расходу или диаметру", "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "PRESSURE_VILLAGE_WATER_SUPPLY_NETWORK",
    packageAssembly: "VWS_HDPE_PE100_OD160_110_4200_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "vws_network_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleMainPipeProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalGroundAndRoadScopeFailClosed: true,
    lengthFlowOrDiameterDerivedQuantitiesForbidden: true,
    intakePumpingTreatmentStorageTowerInternalPlumbingAndSewerExcluded: true,
  },
  binding: {
    rowId: "rc09:vws_acceptance",
    applicability: {
      network_class: "PRESSURE_VILLAGE_WATER_SUPPLY",
      operation_class: "VILLAGE_WATER_SUPPLY_NETWORK_CONSTRUCTION",
      package_assembly: "VWS_HDPE_PE100_OD160_110_4200_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_SEGMENT_VALVE_CHAMBER_HYDRANT_CONNECTION_SCHEDULE_PLUS_VISIBLE_MAIN_PIPE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: VILLAGE_WATER_SUPPLY_SOURCE_ID, norm_id: VILLAGE_WATER_SUPPLY_NORM_ID,
      exact_locator: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SEGMENT_VALVE_CHAMBER_HYDRANT_CONNECTION_SCHEDULE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_BUNDLE",
    },
  },
  locator: {
    key: "village-water-supply-pressure-main-pipe-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
      sourcePackSha256: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(VILLAGE_WATER_SUPPLY_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(VILLAGE_WATER_SUPPLY_RUNTIME_INPUT),
      directProjectInputs: VILLAGE_WATER_SUPPLY_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(VILLAGE_WATER_SUPPLY_SHORT_INPUT, id)
          && !["rock_excavation", "groundwater_dewatering", "traffic_management",
            "road_reinstatement"].some((branch) => id.startsWith(`vws_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство напорной водопроводной сети села",
    aliases: [
      "строительство наружного водопровода села",
      "сельская водопроводная сеть с гидрантами и домовыми вводами",
      "village pressure water supply network with hydrants and house services",
    ],
    shortScopeRu: "Одна VWS-HDPE-PE100-RC-OD160-110-4200: 3000 м OD160, 1200 м OD110, 36 камер, 18 гидрантов и 150 вводов; ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: VILLAGE_WATER_SUPPLY_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(VILLAGE_WATER_SUPPLY_SHORT_INPUT, id)),
    includedBoundaries: [
      "главная труба и ответвления, камеры, арматура, гидранты, вводы, траншеи, основание и засыпка",
      "фасонные части, футляры, упоры, маркировка, расходники, труд, механизмы, QA и логистика",
      "условные скала, водопонижение, организация движения и восстановление дороги",
    ],
    excludedBoundaries: [
      "водозабор, скважина, насосная, очистная станция, резервуар и водонапорная башня",
      "внутренний водопровод, канализация и автоматические объёмы по длине, расходу или диаметру",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "водоснабжение села напорная сеть OD160 OD110 домовые вводы пожарные гидранты камеры арматуры",
    sourceProvenance: {
      exactExpandedVillageWaterSupplyOwner: true,
      knownSelectedSegmentsValvesChambersHydrantsAndConnections: true,
      visibleIndependentMainPipeProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /water intake|водозабор/iu, /borehole|скважин/iu, /pumping station|насосн.*станц/iu,
    /treatment plant|станц.*водоподготов|очистн.*станц/iu, /reservoir|резервуар/iu,
    /water tower|водонапорн.*башн/iu, /internal plumbing|внутренн.*водопровод/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_VILLAGE_WATER_SUPPLY_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_VILLAGE_WATER_SUPPLY_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
