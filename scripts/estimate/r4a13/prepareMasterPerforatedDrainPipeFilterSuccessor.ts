import { resolve } from "node:path";

import {
  PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
  PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID,
  PERFORATED_DRAIN_PIPE_FILTER_FORMULAS,
  PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
  PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS,
  PERFORATED_DRAIN_PIPE_FILTER_RESOURCES,
  PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
  PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA,
  compilePerforatedDrainPipeFilterR1,
} from "../../../src/lib/estimate/v4/perforatedDrainPipeFilterR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compilePerforatedDrainPipeFilterR1({
    ...PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  });
  const complete = await compilePerforatedDrainPipeFilterR1({
    ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
  });
  const conditional = await compilePerforatedDrainPipeFilterR1({
    ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
    inspection_chamber_mode: "REQUIRED",
    inspection_chamber_designation: "Колодец дренажный смотровой по плану трассы",
    inspection_chamber_quantity_piece: 3,
    sand_bedding_mode: "REQUIRED",
    sand_bedding_designation: "Песок мытый для постели по проектному узлу",
    sand_bedding_volume_m3: 8.5,
  });
  const shortNeeds = new Map(short.preliminaryNeeds.map((need) => [need.row_id, need]));
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "rc09:perforated_drain_pipe_lay"
    && short.rows[0]?.quantity === "60"
    && short.preliminaryNeeds.length === 8)) {
    throw new Error("STOP_MASTER_PERFORATED_DRAIN_PIPE_FILTER_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:perforated_drain_pipe_d110",
    "rc09:drain_pipe_coupler_d110",
    "rc09:needle_punched_geotextile_300",
    "rc09:washed_granite_crushed_stone_20_40",
    "rc09:drainage_laser_level",
    "rc09:drainage_flush_flow_test",
    "rc09:drain_inspection_chamber",
    "rc09:sand_drain_bedding",
  ]) {
    if (!shortNeeds.has(rowId)) {
      throw new Error(`STOP_MASTER_PERFORATED_DRAIN_PIPE_FILTER_SHORT_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 7
    && complete.rows.find((row) =>
      row.row_id === "rc09:perforated_drain_pipe_d110")?.quantity === "61.8"
    && complete.rows.find((row) =>
      row.row_id === "rc09:drainage_flush_flow_test")?.quantity === "2")) {
    throw new Error("STOP_MASTER_PERFORATED_DRAIN_PIPE_FILTER_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 9)) {
    throw new Error("STOP_MASTER_PERFORATED_DRAIN_PIPE_FILTER_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(stormwater.main.collector|road.drainage.full.system)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_PERFORATED_DRAIN_PIPE_FILTER_ADJACENT_SCOPE");
  }
  const { createHash } = await import("node:crypto");
  return {
    status: "GREEN_MASTER_PERFORATED_DRAIN_PIPE_FILTER_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLengthM: PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT.length_m,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-perforated-drain-pipe-filter-successor.v1",
  stopCode: "MASTER_PERFORATED_DRAIN_PIPE_FILTER",
  applicationName: "r4-a13-6-master-perforated-drain-pipe-filter-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c57e769f-0994-5bc3-b06d-a81b8039886d",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "a6645f7e-7462-53f9-9250-ede5a436e796",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-perforated-drain-pipe-filter-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/perforatedDrainPipeFilterR1.ts",
    "tests/estimateNorms/perforatedDrainPipeFilterR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterPerforatedDrainPipeFilterSuccessor.ts",
  ],
  catalogId: PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID,
  sourceId: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
  normId: PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
  sourceMetadata: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA,
  parameterDefinitions: PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS,
  formulaDefinitions: PERFORATED_DRAIN_PIPE_FILTER_FORMULAS,
  resourceDefinitions: PERFORATED_DRAIN_PIPE_FILTER_RESOURCES,
  shortInput: PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  acceptanceInput: PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 17,
  validationScenario: "MASTER_BENCHMARK_17_PERFORATED_DRAIN_PIPE_FILTER",
  passport: {
    canonicalRuName: "Укладка перфорированной дренажной трубы в фильтрующей обсыпке",
    workKey: "paving_roads_landscape_interior_drainage_lay_standard",
    physicalResultRu: "Участок перфорированной дренажной трубы Ø110 мм уложен по подтверждённой длине в фильтрующей обсыпке с предусмотренными контролем и проверкой водопропускания",
    includedScopeRu: [
      "укладка указанной длины перфорированной дренажной трубы Ø110 мм",
      "труба и муфты только по ведомости выбранной дренажной системы",
      "геотекстиль 300 г/м² и промытый щебень 20–40 мм только по проектному узлу и раскрою",
      "контроль уклона, промывка и проверка водопропускания по ППР и программе контроля",
      "смотровые колодцы и песчаная постель только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "магистральный ливневый коллектор и полная система дорожного водоотвода",
      "автоматический отход трубы или интервал установки муфт",
      "автоматические ширина и нахлёст геотекстиля либо сечение фильтрующей обсыпки",
      "автоматические смены прибора и интервалы испытаний",
      "неподтверждённые цены и неуказанные условные элементы",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "LAY_PERFORATED_DRAIN_PIPE_FILTER",
    materialSystem: "PERFORATED_DRAIN_PIPE_D110_GEOTEXTILE_300_AGGREGATE_20_40",
    primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m"],
    knownScopeParameters: [
      "pipe_construction",
      "perforation_type",
      "pipe_outside_diameter_mm",
      "geotextile_areal_density_g_m2",
      "aggregate_fraction",
    ],
    projectScheduleRequiredForNonGeometricQuantities: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    stormwaterMainCollectorExcluded: true,
    fullRoadDrainageSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:perforated_drain_pipe_lay",
    applicability: {
      technology_class: "PERFORATED_DRAIN_PIPE_FILTER",
      operation_class: "LAY_PERFORATED_DRAIN_PIPE_FILTER",
      material_system: "PERFORATED_DRAIN_PIPE_D110_GEOTEXTILE_300_AGGREGATE_20_40",
      scope_mode: "KNOWN_ROUTE_AND_FILTER_IDENTITY_PLUS_DIRECT_PROJECT_PRODUCT_FILTER_METHOD_QA_QUANTITIES",
      source_id: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
      norm_id: PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
      exact_locator: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      length_based_consumption_or_productivity_rates_claimed: false,
      quantity_basis: "KNOWN_ROUTE_LENGTH_AND_FILTER_IDENTITY_PLUS_APPROVED_DRAINAGE_SCHEDULE_FILTER_DETAILS_METHOD_AND_QA_PLAN",
    },
  },
  locator: {
    key: "perforated-drain-pipe-filter-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.exact_locator,
      geometryInputs: ["length_m"],
      knownScopeInputs: [
        "pipe_construction",
        "perforation_type",
        "pipe_outside_diameter_mm",
        "geotextile_areal_density_g_m2",
        "aggregate_fraction",
      ],
      directScheduleInputs: [
        "pipe_designation", "pipe_quantity_m",
        "coupler_designation", "coupler_quantity_piece",
        "geotextile_designation", "geotextile_area_m2",
        "aggregate_designation", "aggregate_volume_m3",
        "laser_designation", "laser_shift",
        "flow_test_designation", "flow_test_count_test",
      ],
      conditionalInputs: [
        "inspection_chamber_mode", "inspection_chamber_designation",
        "inspection_chamber_quantity_piece", "sand_bedding_mode",
        "sand_bedding_designation", "sand_bedding_volume_m3",
      ],
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: "Укладка перфорированной дренажной трубы в фильтрующей обсыпке",
    aliases: [
      "перфорированная дренажная труба Ø110",
      "укладка дренажа в геотекстиле и щебне",
      "дренажная труба в фильтрующей обсыпке",
      "perforated drain pipe filter",
    ],
    shortScopeRu: "Укладка указанной длины перфорированной дренажной трубы Ø110 мм в фильтрующей обсыпке; длина сразу даёт объём работ, а труба, муфты, геотекстиль, щебень, контроль, испытания и условные элементы уточняются добровольно по проекту.",
    keyDistinguishingParameters: [
      "length_m", "pipe_construction", "perforation_type", "pipe_outside_diameter_mm",
      "geotextile_areal_density_g_m2", "aggregate_fraction",
    ],
    clarificationFields: [
      "pipe_designation", "pipe_quantity_m", "coupler_designation", "coupler_quantity_piece",
      "geotextile_designation", "geotextile_area_m2", "aggregate_designation",
      "aggregate_volume_m3", "laser_designation", "laser_shift", "flow_test_designation",
      "flow_test_count_test", "inspection_chamber_mode", "sand_bedding_mode",
    ],
    includedBoundaries: [
      "укладка перфорированной трубы Ø110 по известной длине",
      "труба и муфты выбранной дренажной системы",
      "геотекстиль 300 г/м² и промытый щебень 20–40 мм по проектному узлу",
      "контроль уклона и проверка водопропускания по ППР",
      "колодцы и песчаная постель только по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "магистральный ливневый коллектор",
      "полная система дорожного водоотвода",
      "автоматические нормы трубы, муфт, геотекстиля, щебня, смен или испытаний",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "дренаж перфорированная труба муфта геотекстиль щебень фильтрующая обсыпка уклон промывка проверка водопропускания смотровой колодец песчаная постель",
    sourceProvenance: {
      exactPerforatedDrainPipeFilterOwner: true,
      exactRouteProductFilterMethodAndQaPackageRequiredForNonWorkQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /stormwater_main_collector|магистральн.*ливнев.*коллектор/iu,
    /road_drainage_full_system|полн.*систем.*дорожн.*водоотвод/iu,
  ],
  owner: "MASTER_PERFORATED_DRAIN_PIPE_FILTER_SUCCESSOR",
  receiptFileStem: "MASTER_PERFORATED_DRAIN_PIPE_FILTER",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
