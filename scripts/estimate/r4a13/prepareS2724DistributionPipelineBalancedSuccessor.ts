import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
  DISTRIBUTION_PIPELINE_CATALOG_ID,
  DISTRIBUTION_PIPELINE_FORMULAS,
  DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS,
  DISTRIBUTION_PIPELINE_NORM_ID,
  DISTRIBUTION_PIPELINE_PARAMETERS,
  DISTRIBUTION_PIPELINE_RESOURCES,
  DISTRIBUTION_PIPELINE_RUNTIME_CLASSIFICATION,
  DISTRIBUTION_PIPELINE_RUNTIME_INPUT,
  DISTRIBUTION_PIPELINE_RUNTIME_SOURCE_IDS,
  DISTRIBUTION_PIPELINE_SHORT_INPUT,
  DISTRIBUTION_PIPELINE_SOURCE_ID,
  DISTRIBUTION_PIPELINE_SOURCE_METADATA,
  compileDistributionPipelineR1,
} from "../../../src/lib/estimate/v4/distributionPipelineR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileDistributionPipelineR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  dpm_crossing_casing_mode: "REQUIRED",
  dpm_crossing_casing_designation: "STEEL-CASING-DN400-PN16",
  dpm_crossing_casing_length_m: 72,
  dpm_dewatering_mode: "REQUIRED",
  dpm_dewatering_designation: "WELLPOINT-DPM-SET",
  dpm_dewatering_machine_h: 420,
  dpm_road_restoration_mode: "REQUIRED",
  dpm_road_restoration_designation: "ROAD-REINSTATEMENT-DPM",
  dpm_road_restoration_area_m2: 2160,
});

async function verifyCore(): Promise<Json> {
  const first = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_SHORT_INPUT });
  const complete = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT });
  const balanced = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
    dpm_pipe_retained_spare_m: 24,
    dpm_pipe_supplier_segment_length_m: 12,
  });
  const conditional = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 37
    && quantity(first, "rc09:dpm_network_install_acceptance") === "1"
    && quantity(first, "rc09:dpm_pipe") === "1800")) {
    throw new Error("STOP_S27_24_DISTRIBUTION_PIPELINE_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:dpm_hydrant") === "8"
    && quantity(complete, "rc09:dpm_thrust_block_concrete") === "18.6"
    && quantity(complete, "rc09:dpm_disinfection_reagent") === "48"
    && quantity(complete, "rc09:dpm_laboratory_analysis") === "6"
    && quantity(complete, "rc09:equipment:dpm-hydrotest-pump") === "48"
    && quantity(complete, "rc09:labor:dpm-pipe-appurtenance-install") === "1460")) {
    throw new Error("STOP_S27_24_DISTRIBUTION_PIPELINE_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:dpm-pipe-balance:installed-net") === "1800"
    && quantity(balanced, "rc09:dpm-pipe-balance:retained-spare") === "24"
    && quantity(balanced, "rc09:dpm-pipe-balance:total-need") === "1824"
    && quantity(balanced, "rc09:dpm-pipe-balance:segment-count") === "152"
    && quantity(balanced, "rc09:dpm_pipe") === "1824"
    && quantity(balanced, "rc09:dpm-pipe-balance:remainder") === "24"
    && quantity(balanced, "rc09:dpm-pipe-balance:surplus-beyond-spare") === "0")) {
    throw new Error("STOP_S27_24_DISTRIBUTION_PIPELINE_PROCUREMENT_BALANCE");
  }
  if (conditional.rows.length !== 45 || conditional.preliminaryNeeds.length !== 0) {
    throw new Error("STOP_S27_24_DISTRIBUTION_PIPELINE_CONDITIONAL_PROFILE");
  }
  if (/length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|golden_rate|normFactor/iu
    .test(JSON.stringify(DISTRIBUTION_PIPELINE_FORMULAS))) {
    throw new Error("STOP_S27_24_DISTRIBUTION_PIPELINE_LEGACY_COEFFICIENT");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_DISTRIBUTION_PIPELINE_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: DISTRIBUTION_PIPELINE_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:dpm-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:dpm-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:dpm-pipe-balance:total-need"),
      segmentCount: quantity(balanced, "rc09:dpm-pipe-balance:segment-count"),
      orderedM: quantity(balanced, "rc09:dpm_pipe"),
      remainderM: quantity(balanced, "rc09:dpm-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:dpm-pipe-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.distribution-pipeline-balanced-successor.v1",
  stopCode: "S27_24_DISTRIBUTION_PIPELINE_BALANCED",
  applicationName: "s27-24-distribution-pipeline-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "66456bc8-1a87-5077-9b71-36f331246afa",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "4451fddb-1486-52c4-ac2b-60820e7c69a4",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/distribution-pipeline-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/distribution-pipeline-pipe-procurement-balanced-s27-24.json",
    "src/lib/estimate/v4/settlementWaterNetworkR1.ts",
    "src/lib/estimate/v4/distributionPipelineR1.ts",
    "tests/estimateNorms/distributionPipelineR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724DistributionPipelineBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724DistributionPipelineBalancedIndependent.ts",
  ],
  catalogId: DISTRIBUTION_PIPELINE_CATALOG_ID,
  sourceId: DISTRIBUTION_PIPELINE_SOURCE_ID,
  normId: DISTRIBUTION_PIPELINE_NORM_ID,
  sourceMetadata: DISTRIBUTION_PIPELINE_SOURCE_METADATA,
  parameterDefinitions: DISTRIBUTION_PIPELINE_PARAMETERS,
  formulaDefinitions: DISTRIBUTION_PIPELINE_FORMULAS,
  resourceDefinitions: DISTRIBUTION_PIPELINE_RESOURCES,
  shortInput: DISTRIBUTION_PIPELINE_SHORT_INPUT,
  acceptanceInput: DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
  runtimeProfileInput: DISTRIBUTION_PIPELINE_RUNTIME_INPUT,
  runtimeProfileClassification: DISTRIBUTION_PIPELINE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: DISTRIBUTION_PIPELINE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 64,
  validationScenario: "Q5_DISTRIBUTION_PIPELINE_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство распределительной магистрали питьевой воды",
    workKey: "distribution_pipeline",
    physicalResultRu: "Магистраль DPM-HDPE-PE100-RC-SDR17-OD225-PN10 построена, испытана, продезинфицирована и принята",
    includedScopeRu: [
      "1800 м выбранной напорной трубы, прямые земляные объёмы, основание, обсыпка и засыпка",
      "соединения, фасонные части, арматура, гидранты, камеры, упорные и маркировочные элементы",
      "промывка, испытание, дезинфекция, анализ воды, труд, механизмы, документы и логистика",
      "футляры, водоотлив и восстановление дороги только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "поселковая сеть целиком, вводы в здания, внутренний водопровод, канализация и ливневая сеть",
      "автоматические количества по длине, диаметру или интервалам размещения",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_DISTRIBUTION_MAIN_CONSTRUCTION",
    pipeSystem: "PE100_RC_SDR17_OD225_PN10_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "dpm_main_count",
    knownScopeParameters: [...DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    visiblePipeProcurementBalance: true,
    directProjectTrenchAppurtenanceLaborEquipmentQaAndLogisticsRequired: true,
    conditionalCrossingDewateringAndRoadReinstatementFailClosed: true,
    routeLengthDerivedProjectResourcesForbidden: true,
    settlementVillageHouseConnectionSewerAndStormwaterExcluded: true,
  },
  binding: {
    rowId: "rc09:dpm_network_install_acceptance",
    applicability: {
      technology_class: "POTABLE_WATER_DISTRIBUTION_MAIN",
      operation_class: "DISTRIBUTION_MAIN_CONSTRUCTION_AND_ACCEPTANCE",
      pipe_system: "PE100_RC_SDR17_OD225_PN10_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_MAIN_SCOPE_PLUS_VISIBLE_PIPE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: DISTRIBUTION_PIPELINE_SOURCE_ID,
      norm_id: DISTRIBUTION_PIPELINE_NORM_ID,
      exact_locator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_MAIN_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PIPE_SEGMENT",
    },
  },
  locator: {
    key: "distribution-pipeline-potable-main-pipe-procurement-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
      sourcePackSha256: DISTRIBUTION_PIPELINE_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(DISTRIBUTION_PIPELINE_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(DISTRIBUTION_PIPELINE_RUNTIME_INPUT),
      directProjectInputs: DISTRIBUTION_PIPELINE_PARAMETERS.map((parameter) => parameter.parameter_id)
        .filter((id) => !Object.hasOwn(DISTRIBUTION_PIPELINE_SHORT_INPUT, id)
          && !["crossing_casing", "dewatering", "road_restoration"]
            .some((branch) => id.startsWith(`dpm_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Строительство распределительной магистрали питьевой воды",
    aliases: ["распределительный водопровод PE100-RC", "магистраль питьевой воды OD225 PN10",
      "potable water distribution main"],
    shortScopeRu: "Одна магистраль DPM-HDPE-PE100-RC-SDR17-OD225-PN10 длиной 1800 м; земляные объёмы, арматура, QA, труд и механизмы только по проекту.",
    keyDistinguishingParameters: [...DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: DISTRIBUTION_PIPELINE_PARAMETERS.map((parameter) => parameter.parameter_id)
      .filter((id) => !Object.hasOwn(DISTRIBUTION_PIPELINE_SHORT_INPUT, id)),
    includedBoundaries: [
      "выбранная труба, траншея, основание, обсыпка, засыпка, арматура, гидранты и камеры",
      "промывка, испытание, дезинфекция, анализ воды, труд, механизмы и логистика",
      "условные футляры, водоотлив и восстановление дороги только по проекту",
    ],
    excludedBoundaries: [
      "полная поселковая сеть, вводы в здания, внутренний водопровод, канализация и ливневая сеть",
      "автоматические количества по длине или интервалам", "неподтверждённые цены",
    ],
    extraSearchTermsRu: "распределительная магистраль питьевая вода PE100-RC OD225 PN10 гидранты камеры",
    sourceProvenance: {
      exactExpandedDistributionPipelineOwner: true,
      knownPipeSystemDiameterPressureClassAndInstalledLength: true,
      visibleIndependentPipeProcurementBalance: true,
      exactProjectTrenchAppurtenanceLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /house.connection|ввод.*здан/iu,
    /sewer|канализац/iu,
    /stormwater|ливнев/iu,
  ],
  owner: "S27_24_DISTRIBUTION_PIPELINE_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_DISTRIBUTION_PIPELINE_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
