import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
  SETTLEMENT_WATER_NETWORK_CATALOG_ID,
  SETTLEMENT_WATER_NETWORK_FORMULAS,
  SETTLEMENT_WATER_NETWORK_NORM_ID,
  SETTLEMENT_WATER_NETWORK_PARAMETERS,
  SETTLEMENT_WATER_NETWORK_RESOURCES,
  SETTLEMENT_WATER_NETWORK_RUNTIME_CLASSIFICATION,
  SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT,
  SETTLEMENT_WATER_NETWORK_RUNTIME_SOURCE_IDS,
  SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
  SETTLEMENT_WATER_NETWORK_SOURCE_ID,
  SETTLEMENT_WATER_NETWORK_SOURCE_METADATA,
  compileSettlementWaterNetworkR1,
} from "../../../src/lib/estimate/v4/settlementWaterNetworkR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileSettlementWaterNetworkR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  swn_crossing_casing_mode: "REQUIRED",
  swn_crossing_casing_designation: "Стальной футляр по узлу пересечения",
  swn_crossing_casing_length_m: 48,
  swn_dewatering_mode: "REQUIRED",
  swn_dewatering_designation: "Иглофильтровая установка по ППР",
  swn_dewatering_machine_h: 320,
  swn_road_restoration_mode: "REQUIRED",
  swn_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  swn_road_restoration_area_m2: 1440,
});

async function verifyCore(): Promise<Json> {
  const first = await compileSettlementWaterNetworkR1({
    ...SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
  });
  const complete = await compileSettlementWaterNetworkR1({
    ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
  });
  const balanced = await compileSettlementWaterNetworkR1({
    ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
    swn_pipe_retained_spare_m: 20,
    swn_pipe_supplier_segment_length_m: 12,
  });
  const conditional = await compileSettlementWaterNetworkR1({
    ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 29
    && quantity(first, "rc09:swn_network_install_acceptance") === "1"
    && quantity(first, "rc09:swn_pipe") === "1200"
    && quantity(first, "rc09:swn-pipe-balance:installed-net") === "1200")) {
    throw new Error("STOP_S27_24_SETTLEMENT_WATER_NETWORK_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:swn_trench_excavation", "rc09:swn_bedding", "rc09:swn_surround",
    "rc09:swn_backfill", "rc09:swn_excess_soil_removal", "rc09:swn_pipe_joint",
    "rc09:swn_fitting", "rc09:swn_valve", "rc09:swn_hydrant", "rc09:swn_chamber",
    "rc09:swn_chamber_cover", "rc09:swn_warning_tape", "rc09:swn_flushing_water",
    "rc09:swn_pressure_test", "rc09:swn_disinfection", "rc09:swn_asbuilt_documents",
    "rc09:swn_crossing_casing", "rc09:swn_dewatering", "rc09:swn_road_restoration",
    "rc09:labor:swn-survey", "rc09:labor:swn-earthworks",
    "rc09:labor:swn-pipe-appurtenance-install", "rc09:labor:swn-qa-documentation",
    "rc09:equipment:swn-excavator", "rc09:equipment:swn-compactor",
    "rc09:equipment:swn-jointing", "rc09:equipment:swn-crane",
    "rc09:logistics:swn-delivery", "rc09:logistics:swn-removal",
  ]) if (!needs.has(rowId)) {
    throw new Error(`STOP_S27_24_SETTLEMENT_WATER_NETWORK_NEED:${rowId}`);
  }
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:swn_trench_excavation") === "2520"
    && quantity(complete, "rc09:swn_bedding") === "216"
    && quantity(complete, "rc09:swn_valve") === "8"
    && quantity(complete, "rc09:swn_hydrant") === "6"
    && quantity(complete, "rc09:swn_chamber") === "10"
    && quantity(complete, "rc09:labor:swn-pipe-appurtenance-install") === "920"
    && quantity(complete, "rc09:equipment:swn-jointing") === "140"
    && quantity(complete, "rc09:logistics:swn-delivery") === "28")) {
    throw new Error("STOP_S27_24_SETTLEMENT_WATER_NETWORK_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:swn-pipe-balance:installed-net") === "1200"
    && quantity(balanced, "rc09:swn-pipe-balance:retained-spare") === "20"
    && quantity(balanced, "rc09:swn-pipe-balance:total-need") === "1220"
    && quantity(balanced, "rc09:swn-pipe-balance:segment-count") === "102"
    && quantity(balanced, "rc09:swn_pipe") === "1224"
    && quantity(balanced, "rc09:swn-pipe-balance:remainder") === "24"
    && quantity(balanced, "rc09:swn-pipe-balance:surplus-beyond-spare") === "4")) {
    throw new Error("STOP_S27_24_SETTLEMENT_WATER_NETWORK_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 37 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SETTLEMENT_WATER_NETWORK_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:swn_network_install_acceptance", "rc09:swn_pressure_test",
    "rc09:swn_disinfection", "rc09:swn_asbuilt_documents"]) {
    const graph = SETTLEMENT_WATER_NETWORK_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SETTLEMENT_WATER_NETWORK_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(SETTLEMENT_WATER_NETWORK_FORMULAS);
  if (/length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|0\.6\s*\*\s*1\.4/iu
    .test(formulaText)) {
    throw new Error("STOP_S27_24_SETTLEMENT_WATER_NETWORK_LEGACY_COEFFICIENT");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_SETTLEMENT_WATER_NETWORK_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: SETTLEMENT_WATER_NETWORK_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:swn-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:swn-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:swn-pipe-balance:total-need"),
      segmentCount: quantity(balanced, "rc09:swn-pipe-balance:segment-count"),
      orderedM: quantity(balanced, "rc09:swn_pipe"),
      remainderM: quantity(balanced, "rc09:swn-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:swn-pipe-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.settlement-water-network-balanced-successor.v1",
  stopCode: "S27_24_SETTLEMENT_WATER_NETWORK_BALANCED",
  applicationName: "s27-24-settlement-water-network-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "2263f1ff-8db4-5df9-8fdb-b1b323f81408",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "304ad3dd-e463-5e76-9d30-b07c83500557",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/settlement-water-network-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/settlement-water-network-balanced-s27-24.json",
    "src/lib/estimate/v4/settlementWaterNetworkR1.ts",
    "tests/estimateNorms/settlementWaterNetworkR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724SettlementWaterNetworkBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724SettlementWaterNetworkBalancedIndependent.ts",
  ],
  catalogId: SETTLEMENT_WATER_NETWORK_CATALOG_ID,
  sourceId: SETTLEMENT_WATER_NETWORK_SOURCE_ID,
  normId: SETTLEMENT_WATER_NETWORK_NORM_ID,
  sourceMetadata: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA,
  parameterDefinitions: SETTLEMENT_WATER_NETWORK_PARAMETERS,
  formulaDefinitions: SETTLEMENT_WATER_NETWORK_FORMULAS,
  resourceDefinitions: SETTLEMENT_WATER_NETWORK_RESOURCES,
  shortInput: SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
  acceptanceInput: SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
  runtimeProfileInput: SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT,
  runtimeProfileClassification: SETTLEMENT_WATER_NETWORK_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SETTLEMENT_WATER_NETWORK_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 37,
  validationScenario: "Q5_SETTLEMENT_WATER_NETWORK_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка поселковой водопроводной сети",
    workKey: "settlement_water_network",
    physicalResultRu: "Поселковая сеть из 1200 м трубы HDPE PE100-RC SDR17 OD 160 PN10 построена, испытана, промыта и продезинфицирована",
    includedScopeRu: [
      "выбранная напорная трубная система, соединения и фасонные части",
      "проектные траншея, основание, обсыпка, засыпка и вывоз грунта",
      "арматура, гидранты, камеры, люки и сигнальная лента",
      "труд, механизмы, испытание, промывка, дезинфекция, документы и логистика",
      "футляры, водоотлив и восстановление дороги только по условным ветвям",
    ],
    excludedScopeRu: [
      "автоматическое определение траншеи, фитингов, арматуры, гидрантов или камер по длине",
      "внутренний водопровод, канализация и ливневая сеть",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "SETTLEMENT_WATER_NETWORK_CONSTRUCTION_AND_ACCEPTANCE",
    waterNetworkSystem: "HDPE_PE100_RC_EXPLICIT_ROUTE_TRENCH_APPURTENANCE_SCHEDULE",
    primaryMeasureParameterId: "swn_network_count",
    knownScopeParameters: ["swn_route_length_m", "swn_pipe_material", "swn_pipe_grade",
      "swn_sdr_class", "swn_pipe_outside_diameter_mm", "swn_pressure_class",
      "swn_pipe_designation"],
    visibleProcurementBalance: true,
    directProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, genericLengthCoefficientsForbidden: true,
    adjacentSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:swn_network_install_acceptance",
    applicability: {
      technology_class: "SETTLEMENT_WATER_SUPPLY",
      operation_class: "SETTLEMENT_WATER_NETWORK_CONSTRUCTION_AND_ACCEPTANCE",
      water_network_system: "HDPE_PE100_RC_EXPLICIT_ROUTE_TRENCH_APPURTENANCE_SCHEDULE",
      scope_mode: "KNOWN_ROUTE_PIPE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: SETTLEMENT_WATER_NETWORK_SOURCE_ID,
      norm_id: SETTLEMENT_WATER_NETWORK_NORM_ID,
      exact_locator: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_NETWORK_ROUTE_PIPE_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "settlement-water-network-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.exact_locator,
      sourcePackSha256: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(SETTLEMENT_WATER_NETWORK_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT),
      directProjectInputs: SETTLEMENT_WATER_NETWORK_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(SETTLEMENT_WATER_NETWORK_SHORT_INPUT, id)
          && !id.startsWith("swn_crossing_casing_") && !id.startsWith("swn_dewatering_")
          && !id.startsWith("swn_road_restoration_")),
      conditionalInputs: [
        "swn_crossing_casing_mode", "swn_crossing_casing_designation",
        "swn_crossing_casing_length_m", "swn_dewatering_mode",
        "swn_dewatering_designation", "swn_dewatering_machine_h",
        "swn_road_restoration_mode", "swn_road_restoration_designation",
        "swn_road_restoration_area_m2",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Строительство поселковой водопроводной сети",
    aliases: ["поселковая водопроводная сеть", "наружный водопровод",
      "водопровод PE100-RC", "settlement water network construction"],
    shortScopeRu: "Одна сеть: 1200 м HDPE PE100-RC SDR17 OD 160 PN10; траншея, арматура, гидранты, камеры, труд, механизмы и контроль уточняются по проекту.",
    keyDistinguishingParameters: ["swn_network_count", "swn_route_length_m",
      "swn_pipe_material", "swn_pipe_grade", "swn_sdr_class",
      "swn_pipe_outside_diameter_mm", "swn_pressure_class", "swn_pipe_designation"],
    clarificationFields: SETTLEMENT_WATER_NETWORK_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SETTLEMENT_WATER_NETWORK_SHORT_INPUT, id)),
    includedBoundaries: [
      "напорная труба, траншея, основание, обсыпка, арматура, гидранты и камеры по проекту",
      "труд, механизмы, испытание, промывка, дезинфекция, документы, логистика и баланс трубы",
      "условные футляры, водоотлив и восстановление дороги только по проекту",
    ],
    excludedBoundaries: [
      "внутренний водопровод, канализация и ливневая сеть",
      "автоматические коэффициенты траншеи и шаг гидрантов 300 м, камер 400 м или арматуры 500 м",
      "неподтверждённые материалы, условные работы и цены",
    ],
    extraSearchTermsRu: "поселковый наружный водопровод HDPE PE100-RC SDR PN труба траншея задвижка гидрант камера промывка дезинфекция",
    sourceProvenance: {
      exactExpandedSettlementWaterNetworkOwner: true,
      knownRouteAndSelectedPressurePipeIdentity: true,
      visibleIndependentPipeProcurementBalance: true,
      exactProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /building.plumbing|внутренн.*водопровод/iu,
    /gravity.sewer|самотечн.*канализац/iu,
    /stormwater|ливнев/iu,
    /pumping.station|насосн.*станц/iu,
  ],
  owner: "S27_24_SETTLEMENT_WATER_NETWORK_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SETTLEMENT_WATER_NETWORK_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
