import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT, VILLAGE_SEWER_NETWORK_CATALOG_ID,
  VILLAGE_SEWER_NETWORK_FORMULAS, VILLAGE_SEWER_NETWORK_NORM_ID,
  VILLAGE_SEWER_NETWORK_PARAMETERS, VILLAGE_SEWER_NETWORK_RESOURCES,
  VILLAGE_SEWER_NETWORK_RUNTIME_CLASSIFICATION, VILLAGE_SEWER_NETWORK_RUNTIME_INPUT,
  VILLAGE_SEWER_NETWORK_RUNTIME_SOURCE_IDS, VILLAGE_SEWER_NETWORK_SHORT_INPUT,
  VILLAGE_SEWER_NETWORK_SOURCE_ID, VILLAGE_SEWER_NETWORK_SOURCE_METADATA,
  compileVillageSewerNetworkR1,
} from "../../../src/lib/estimate/v4/villageSewerNetworkR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileVillageSewerNetworkR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "vsn_network_count", "vsn_network_designation", "vsn_network_type",
  "vsn_design_flow_m3_day", "vsn_main_pipe_installed_m", "vsn_main_pipe_designation",
  "vsn_lateral_pipe_installed_m", "vsn_lateral_pipe_designation",
  "vsn_inspection_manhole_piece", "vsn_house_connection_piece",
];
const CONDITIONAL_INPUT = Object.freeze({
  vsn_rock_excavation_mode: "REQUIRED", vsn_rock_excavation_designation: "HYDRAULIC-BREAKER",
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

async function verifyCore(): Promise<Json> {
  const first = await compileVillageSewerNetworkR1({ ...VILLAGE_SEWER_NETWORK_SHORT_INPUT });
  const complete = await compileVillageSewerNetworkR1({
    ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
  });
  const balanced = await compileVillageSewerNetworkR1({
    ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
    vsn_main_pipe_retained_spare_m: 30, vsn_main_pipe_supplier_bundle_length_m: 60,
  });
  const conditional = await compileVillageSewerNetworkR1({
    ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 32
    && quantity(first, "rc09:vsn_acceptance") === "1"
    && quantity(first, "rc09:vsn_main_pipe") === "2400"
    && quantity(first, "rc09:vsn_lateral_pipe") === "800"
    && quantity(first, "rc09:vsn_inspection_manholes") === "64"
    && quantity(first, "rc09:vsn_house_connections") === "120")) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:vsn_trench_excavation") === "7200"
    && quantity(complete, "rc09:vsn_bedding_sand") === "980"
    && quantity(complete, "rc09:vsn_manhole_covers") === "64"
    && quantity(complete, "rc09:vsn_road_crossing_sleeves") === "180"
    && quantity(complete, "rc09:labor:vsn-pipe-installation") === "3600"
    && quantity(complete, "rc09:equipment:vsn-excavator") === "820"
    && quantity(complete, "rc09:logistics:vsn-material-delivery") === "180")) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:vsn-main-pipe-balance:installed-net") === "2400"
    && quantity(balanced, "rc09:vsn-main-pipe-balance:retained-spare") === "30"
    && quantity(balanced, "rc09:vsn-main-pipe-balance:total-need") === "2430"
    && quantity(balanced, "rc09:vsn-main-pipe-balance:package-count") === "41"
    && quantity(balanced, "rc09:vsn_main_pipe") === "2460"
    && quantity(balanced, "rc09:vsn-main-pipe-balance:remainder") === "60"
    && quantity(balanced, "rc09:vsn-main-pipe-balance:surplus-beyond-spare") === "30")) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 43 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:vsn_acceptance", "rc09:vsn_leak_tests",
    "rc09:vsn_cctv_inspections", "rc09:vsn_compaction_tests",
    "rc09:vsn_asbuilt_documents"]) {
    const graph = VILLAGE_SEWER_NETWORK_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_VILLAGE_SEWER_NETWORK_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu
    .test(JSON.stringify(VILLAGE_SEWER_NETWORK_FORMULAS))) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_LEGACY_COEFFICIENT");
  }
  if (/pressure_sewer|pumping_station|wtp_|stf_|stormwater/iu
    .test(JSON.stringify(VILLAGE_SEWER_NETWORK_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_VILLAGE_SEWER_NETWORK_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_VILLAGE_SEWER_NETWORK_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: VILLAGE_SEWER_NETWORK_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:vsn-main-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:vsn-main-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:vsn-main-pipe-balance:total-need"),
      packageCount: quantity(balanced, "rc09:vsn-main-pipe-balance:package-count"),
      orderedM: quantity(balanced, "rc09:vsn_main_pipe"),
      remainderM: quantity(balanced, "rc09:vsn-main-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:vsn-main-pipe-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.village-sewer-network-balanced-successor.v1",
  stopCode: "S27_24_VILLAGE_SEWER_NETWORK_BALANCED",
  applicationName: "s27-24-village-sewer-network-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "7eeaab0c-6a6f-5e39-8fbd-58f345c0e4ae",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "9a415fe2-80f5-595b-a2d5-d6942c667f23",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/village-sewer-network-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/village-sewer-network-gravity-main-balanced-s27-24.json",
    "src/lib/estimate/v4/villageSewerNetworkR1.ts",
    "tests/estimateNorms/villageSewerNetworkR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724VillageSewerNetworkBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724VillageSewerNetworkBalancedIndependent.ts",
  ],
  catalogId: VILLAGE_SEWER_NETWORK_CATALOG_ID,
  sourceId: VILLAGE_SEWER_NETWORK_SOURCE_ID, normId: VILLAGE_SEWER_NETWORK_NORM_ID,
  sourceMetadata: VILLAGE_SEWER_NETWORK_SOURCE_METADATA,
  parameterDefinitions: VILLAGE_SEWER_NETWORK_PARAMETERS,
  formulaDefinitions: VILLAGE_SEWER_NETWORK_FORMULAS,
  resourceDefinitions: VILLAGE_SEWER_NETWORK_RESOURCES,
  shortInput: VILLAGE_SEWER_NETWORK_SHORT_INPUT,
  acceptanceInput: VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
  runtimeProfileInput: VILLAGE_SEWER_NETWORK_RUNTIME_INPUT,
  runtimeProfileClassification: VILLAGE_SEWER_NETWORK_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: VILLAGE_SEWER_NETWORK_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 53,
  validationScenario: "Q5_VILLAGE_SEWER_NETWORK_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство самотечной канализационной сети села",
    workKey: "village_sewer_network",
    physicalResultRu: "Сеть VSN-HDPE-SN8-OD200-160-3200 построена, испытана и принята",
    includedScopeRu: [
      "явные главная труба, трубы подключений, колодцы и домовые подключения",
      "траншеи, основание, фасонные части, засыпка, футляры, маркировка и расходники",
      "труд, механизмы, испытания, телеинспекция, документы, логистика и баланс главной трубы",
      "скала, водопонижение, организация движения и восстановление дороги только условно",
    ],
    excludedScopeRu: [
      "напорная канализация и КНС", "очистные сооружения, септик и ливневая сеть",
      "автоматические объёмы по длине, расходу или диаметру", "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "GRAVITY_VILLAGE_SEWER_NETWORK",
    packageAssembly: "VSN_HDPE_SN8_OD200_160_3200_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "vsn_network_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleMainPipeProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalGroundAndRoadScopeFailClosed: true,
    lengthFlowOrDiameterDerivedQuantitiesForbidden: true,
    pressurePumpingTreatmentSepticAndStormwaterExcluded: true,
  },
  binding: {
    rowId: "rc09:vsn_acceptance",
    applicability: {
      network_class: "GRAVITY_VILLAGE_SEWER",
      operation_class: "VILLAGE_SEWER_NETWORK_CONSTRUCTION",
      package_assembly: "VSN_HDPE_SN8_OD200_160_3200_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_SEGMENT_SCHEDULE_PLUS_VISIBLE_MAIN_PIPE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: VILLAGE_SEWER_NETWORK_SOURCE_ID, norm_id: VILLAGE_SEWER_NETWORK_NORM_ID,
      exact_locator: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SEGMENT_MANHOLE_CONNECTION_SCHEDULE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_BUNDLE",
    },
  },
  locator: {
    key: "village-sewer-network-gravity-main-pipe-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.exact_locator,
      sourcePackSha256: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(VILLAGE_SEWER_NETWORK_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(VILLAGE_SEWER_NETWORK_RUNTIME_INPUT),
      directProjectInputs: VILLAGE_SEWER_NETWORK_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(VILLAGE_SEWER_NETWORK_SHORT_INPUT, id)
          && !["rock_excavation", "groundwater_dewatering", "traffic_management",
            "road_reinstatement"].some((branch) => id.startsWith(`vsn_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство самотечной канализационной сети села",
    aliases: [
      "устройство наружной канализации села",
      "самотечная сельская канализационная сеть с домовыми подключениями",
      "village gravity sewer network with house connections",
    ],
    shortScopeRu: "Одна VSN-HDPE-SN8-OD200-160-3200: 2400 м OD200, 800 м OD160, 64 колодца и 120 подключений; ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: VILLAGE_SEWER_NETWORK_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(VILLAGE_SEWER_NETWORK_SHORT_INPUT, id)),
    includedBoundaries: [
      "главная и подключаемая труба, колодцы, подключения, траншеи, основание и засыпка",
      "фасонные части, футляры, маркировка, расходники, труд, механизмы, QA и логистика",
      "условные скала, водопонижение, организация движения и восстановление дороги",
    ],
    excludedBoundaries: [
      "напорная канализация, КНС, очистные сооружения, септик и ливневая сеть",
      "автоматические объёмы по длине, расходу или диаметру",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "канализация села самотечная сеть OD200 OD160 домовые подключения смотровые колодцы",
    sourceProvenance: {
      exactExpandedVillageSewerNetworkOwner: true,
      knownSelectedSegmentsManholesAndConnections: true,
      visibleIndependentMainPipeProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /pressure sewer|напорн.*канализац/iu, /pumping station|КНС/iu,
    /treatment plant|очистн.*сооруж/iu, /septic|септик/iu,
    /stormwater|ливнев/iu,
  ],
  owner: "S27_24_VILLAGE_SEWER_NETWORK_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_VILLAGE_SEWER_NETWORK_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
