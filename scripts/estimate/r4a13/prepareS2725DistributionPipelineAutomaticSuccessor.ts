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
type Result = Awaited<ReturnType<typeof compileDistributionPipelineR1>>;

const quantity = (result: Result, rowId: string): number => {
  const value = result.rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`STOP_S27_25_DISTRIBUTION_PIPELINE_ROW:${rowId}`);
  return Number(value);
};

const close = (actual: number, expected: number, tolerance = 0.000_001) =>
  Math.abs(actual - expected) <= tolerance;

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
  dpm_trench_support_mode: "REQUIRED",
  dpm_trench_support_designation: "TRENCH-BOX-SYSTEM",
  dpm_trench_support_length_m: 1800,
});

async function verifyCore(): Promise<Json> {
  const first = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_SHORT_INPUT });
  const changedDepth = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
    dpm_trench_depth_m: 2.4,
  });
  const sections = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
    dpm_section_2_length_m: 300,
    dpm_section_2_trench_bottom_width_m: 1.5,
    dpm_section_2_trench_depth_m: 2.4,
    dpm_section_2_bedding_thickness_m: 0.2,
    dpm_section_2_surround_width_m: 0.9,
    dpm_section_2_surround_cover_above_pipe_m: 0.4,
  });
  const packageChanged = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
    dpm_pipe_supplier_segment_length_m: 100,
  });
  const withStock = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
    dpm_pipe_available_stock_m: 60,
  });
  const conditional = await compileDistributionPipelineR1({
    ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });

  if (!(first.rows.length === 56 && first.preliminaryNeeds.length === 0
    && close(quantity(first, "rc09:dpm_trench_excavation"), 4320)
    && close(quantity(first, "rc09:dpm_bedding"), 324)
    && close(quantity(first, "rc09:dpm_surround"), 589.93059236)
    && close(quantity(first, "rc09:dpm_backfill_placement"), 3334.5)
    && close(quantity(first, "rc09:dpm_backfill"), 94.5)
    && close(quantity(first, "rc09:dpm_excess_soil_removal"), 1080)
    && quantity(first, "rc09:dpm_pipe_joint") === 149
    && quantity(first, "rc09:dpm_fusion_consumables") === 149
    && quantity(first, "rc09:dpm_compaction_water") === 166.725)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC_FIRST_RESULT");
  }
  if (!(quantity(changedDepth, "rc09:dpm_trench_excavation") === 5184
    && quantity(changedDepth, "rc09:dpm_backfill_placement") === 4198.5
    && quantity(changedDepth, "rc09:dpm_backfill") === 310.5
    && quantity(changedDepth, "rc09:dpm_excess_soil_removal") === 1296
    && quantity(changedDepth, "rc09:dpm_pipe_joint") === 149
    && quantity(changedDepth, "rc09:dpm_fitting") === 34)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_GEOMETRY_RECALCULATION");
  }
  const sectionTrench = 1500 * 1.2 * 2 + 300 * 1.5 * 2.4;
  const sectionBedding = 1500 * 1.2 * 0.15 + 300 * 1.5 * 0.2;
  if (!(quantity(sections, "rc09:dpm_trench_excavation") === sectionTrench
    && quantity(sections, "rc09:dpm_bedding") === sectionBedding
    && quantity(sections, "rc09:dpm_pipe_joint") === 149)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_MULTI_SECTION");
  }
  if (!(quantity(packageChanged, "rc09:dpm_pipe") === 1900
    && quantity(packageChanged, "rc09:dpm-pipe-balance:segment-count") === 19
    && quantity(packageChanged, "rc09:dpm-pipe-balance:remainder") === 64
    && quantity(packageChanged, "rc09:dpm-pipe-balance:surplus-beyond-spare") === 40
    && quantity(packageChanged, "rc09:dpm_pipe_joint") === 149)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_PACKAGE_RECALCULATION");
  }
  if (!(quantity(withStock, "rc09:dpm-pipe-balance:total-need") === 1860
    && quantity(withStock, "rc09:dpm-pipe-balance:net-order-need") === 1800
    && quantity(withStock, "rc09:dpm_pipe") === 1800
    && quantity(withStock, "rc09:dpm-pipe-balance:remainder") === 24)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_STOCK_BALANCE");
  }
  if (!(conditional.rows.length === 60 && conditional.preliminaryNeeds.length === 0
    && quantity(conditional, "rc09:dpm_trench_support") === 7200)) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_CONDITIONAL_PROFILE");
  }
  if (/length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|golden_rate|normFactor|villageWaterSupplyCalculator/iu
    .test(JSON.stringify(DISTRIBUTION_PIPELINE_FORMULAS))) {
    throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_LEGACY_COEFFICIENT");
  }
  const requiredRows = [
    "rc09:dpm_pipe", "rc09:dpm_pipe_joint", "rc09:dpm_fusion_consumables",
    "rc09:dpm_fitting", "rc09:dpm_valve", "rc09:dpm_flange_connection_kits",
    "rc09:dpm_bedding", "rc09:dpm_surround", "rc09:dpm_backfill",
    "rc09:dpm_compaction_water", "rc09:dpm_chamber_joint_sealant",
    "rc09:dpm_cover_bedding_mortar", "rc09:dpm_disinfection_reagent",
    "rc09:dpm_temporary_test_end_closures", "rc09:dpm_test_water_connection_set",
    "rc09:dpm_pressure_test_measurement_set",
  ];
  if (!requiredRows.every((rowId) => DISTRIBUTION_PIPELINE_RESOURCES.some(
    (resource) => resource.row_id === rowId,
  ))) throw new Error("STOP_S27_25_DISTRIBUTION_PIPELINE_COMPLETION_CHAIN");

  return {
    status: "GREEN_S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(DISTRIBUTION_PIPELINE_SHORT_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: 0 },
    automaticGeometry: {
      trenchM3: quantity(first, "rc09:dpm_trench_excavation"),
      beddingM3: quantity(first, "rc09:dpm_bedding"),
      surroundM3: quantity(first, "rc09:dpm_surround"),
      importedBackfillM3: quantity(first, "rc09:dpm_backfill"),
      earthworksLaborH: quantity(first, "rc09:labor:dpm-earthworks"),
      excavatorH: quantity(first, "rc09:equipment:dpm-excavator"),
    },
    changedDepth: { trenchM3: quantity(changedDepth, "rc09:dpm_trench_excavation") },
    multipleSections: { trenchM3: quantity(sections, "rc09:dpm_trench_excavation") },
    procurement: {
      installedM: quantity(first, "rc09:dpm-pipe-balance:installed-net"),
      expectedLossM: quantity(first, "rc09:dpm-pipe-balance:expected-loss"),
      retainedSpareM: quantity(first, "rc09:dpm-pipe-balance:retained-spare"),
      orderedM: quantity(first, "rc09:dpm_pipe"),
      package100MOrderedM: quantity(packageChanged, "rc09:dpm_pipe"),
    },
    conditionalRowCount: conditional.rows.length,
    serializedSha256: createHash("sha256").update(JSON.stringify({
      first, changedDepth, sections, packageChanged, withStock, conditional,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-25.distribution-pipeline-automatic-successor.v1",
  stopCode: "S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC",
  applicationName: "s27-25-distribution-pipeline-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (65).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "40902da6adf07ea2c06479d08f9fa9df2d51a380b3f6bd97bd7b0e9f7ecad726",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "21d2df16-8058-5945-807f-342e095f0bbe",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "dbdc70ec-177d-584e-95b0-2fdaa542fb5f",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-25/distribution-pipeline-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/distribution-pipeline-geometric-automatic-s27-25.json",
    "src/lib/estimate/v4/settlementWaterNetworkR1.ts",
    "src/lib/estimate/v4/distributionPipelineR1.ts",
    "tests/estimateNorms/distributionPipelineR1.contract.test.ts",
    "tests/requestEstimate/distributionPipelineOrdinaryRoute.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/release/auditCurrentCoreNoTestWeakening.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2725DistributionPipelineAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2725DistributionPipelineAutomaticIndependent.ts",
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
  expectedParentShape: [63, 45, 45],
  benchmarkOrdinal: 65,
  validationScenario: "Q5_DISTRIBUTION_PIPELINE_AUTOMATIC_S27_25",
  passport: {
    canonicalRuName: "Строительство распределительной магистрали питьевой воды",
    workKey: "distribution_pipeline",
    physicalResultRu: "Магистраль PE100-RC OD225 построена, испытана, продезинфицирована и принята",
    includedScopeRu: [
      "подготовка трассы, траншея по участкам, основание, обсыпка, засыпка, уплотнение и вывоз",
      "труба, соединения и расходники, фасонные части, арматура, гидранты, камеры, люки и анкеровка",
      "промывка, испытание, дезинфекция, анализ воды, труд, механизмы, доставка и завершение",
      "футляры, крепление траншеи, водоотлив и восстановление дороги только по условным ветвям",
    ],
    excludedScopeRu: [
      "поселковая сеть целиком, вводы в здания, внутренний водопровод, канализация и ливневая сеть",
      "неподтверждённые цены и выдача предварительного профиля за утверждённый проект",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_DISTRIBUTION_MAIN_CONSTRUCTION",
    pipeSystem: "PE100_RC_SDR17_OD225_PN10_VISIBLE_PRELIMINARY_PROFILE",
    primaryMeasureParameterId: "dpm_main_count",
    knownScopeParameters: [...DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(DISTRIBUTION_PIPELINE_SHORT_INPUT).length,
    automaticSectionGeometryAndResourceCalculation: true,
    visibleEditablePreliminaryProfile: true,
    visiblePipeProcurementBalance: true,
    conditionalCrossingSupportDewateringAndRoadReinstatementFailClosed: true,
    settlementVillageHouseConnectionSewerAndStormwaterExcluded: true,
  },
  binding: {
    rowId: "rc09:dpm_network_install_acceptance",
    applicability: {
      technology_class: "POTABLE_WATER_DISTRIBUTION_MAIN",
      operation_class: "DISTRIBUTION_MAIN_CONSTRUCTION_AND_ACCEPTANCE",
      pipe_system: "PE100_RC_SDR17_OD225_PN10_VISIBLE_PRELIMINARY_PROFILE",
      source_id: DISTRIBUTION_PIPELINE_SOURCE_ID,
      norm_id: DISTRIBUTION_PIPELINE_NORM_ID,
      exact_locator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "ORDINARY_PRIMARY_FACTS_PLUS_VISIBLE_EDITABLE_PROFILE_PLUS_AUTOMATIC_FORMULAS",
    },
  },
  locator: {
    key: "distribution-pipeline-potable-main-geometric-automatic-s27-25-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
      sourcePackSha256: DISTRIBUTION_PIPELINE_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(DISTRIBUTION_PIPELINE_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(DISTRIBUTION_PIPELINE_RUNTIME_INPUT),
      automaticFormulaIds: DISTRIBUTION_PIPELINE_FORMULAS.map((formula) => formula.formula_id),
      ordinaryClarificationFields: [],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Строительство распределительной магистрали питьевой воды",
    aliases: ["распределительный водопровод PE100-RC", "магистраль питьевой воды OD225 PN10",
      "potable water distribution main"],
    shortScopeRu: "Одна магистраль 1800 м с автоматическим расчётом геометрии, ресурсов и закупки по видимому предварительному профилю.",
    keyDistinguishingParameters: [...DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "трасса, земляные слои, труба, соединения, узлы, испытания, труд, механизмы и логистика",
      "видимые редактируемые assumptions и условные проектные ветви",
    ],
    excludedBoundaries: [
      "полная поселковая сеть, вводы в здания, внутренний водопровод, канализация и ливневая сеть",
      "неподтверждённые цены и скрытые инженерные defaults",
    ],
    extraSearchTermsRu: "распределительная магистраль питьевая вода PE100-RC OD225 PN10 траншея закупка",
    sourceProvenance: {
      exactExpandedDistributionPipelineOwner: true,
      ordinaryEightFactIngress: true,
      automaticSectionGeometryLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /house.connection|ввод.*здан/iu,
    /sewer|канализац/iu,
    /stormwater|ливнев/iu,
  ],
  owner: "S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_25_DISTRIBUTION_PIPELINE_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
