import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT,
  HOUSE_WATER_CONNECTION_CATALOG_ID,
  HOUSE_WATER_CONNECTION_FORMULAS,
  HOUSE_WATER_CONNECTION_KNOWN_SCOPE_PARAMETERS,
  HOUSE_WATER_CONNECTION_NORM_ID,
  HOUSE_WATER_CONNECTION_PARAMETERS,
  HOUSE_WATER_CONNECTION_RESOURCES,
  HOUSE_WATER_CONNECTION_RUNTIME_CLASSIFICATION,
  HOUSE_WATER_CONNECTION_RUNTIME_INPUT,
  HOUSE_WATER_CONNECTION_RUNTIME_SOURCE_IDS,
  HOUSE_WATER_CONNECTION_SHORT_INPUT,
  HOUSE_WATER_CONNECTION_SOURCE_ID,
  HOUSE_WATER_CONNECTION_SOURCE_METADATA,
  compileHouseWaterConnectionR1,
} from "../../../src/lib/estimate/v4/houseWaterConnectionR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
type Result = Awaited<ReturnType<typeof compileHouseWaterConnectionR1>>;

const quantity = (result: Result, rowId: string): number => {
  const value = result.rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`STOP_S27_25_HOUSE_WATER_CONNECTION_ROW:${rowId}`);
  return Number(value);
};
const close = (actual: number, expected: number, tolerance = 0.000_001) =>
  Math.abs(actual - expected) <= tolerance;

const CONDITIONAL_INPUT = Object.freeze({
  hcw_dewatering_mode: "REQUIRED",
  hcw_dewatering_designation: "SUBMERSIBLE-DEWATERING-PUMP",
  hcw_dewatering_pump_count: 2,
  hcw_dewatering_duration_h: 16,
  hcw_road_restoration_mode: "REQUIRED",
  hcw_road_restoration_designation: "ASPHALT-YARD-RESTORATION",
  hcw_road_restoration_area_m2: 24,
  hcw_external_meter_chamber_mode: "REQUIRED",
  hcw_external_meter_chamber_designation: "HCW-METER-CHAMBER-DN1000",
  hcw_trench_support_mode: "REQUIRED",
  hcw_trench_support_designation: "TRENCH-BOX-SYSTEM",
  hcw_trench_support_length_m: 12,
});

async function verifyCore(): Promise<Json> {
  const first = await compileHouseWaterConnectionR1({
    ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
  });
  const changedDepth = await compileHouseWaterConnectionR1({
    ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    hcw_trench_depth_m: 1.8,
  });
  const packageChanged = await compileHouseWaterConnectionR1({
    ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    hcw_installed_pipe_piece_length_m: 12,
    hcw_pipe_supplier_package_length_m: 10,
  });
  const withStock = await compileHouseWaterConnectionR1({
    ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    hcw_installed_pipe_piece_length_m: 12,
    hcw_pipe_supplier_package_length_m: 10,
    hcw_pipe_available_stock_m: 15,
  });
  const conditional = await compileHouseWaterConnectionR1({
    ...HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });

  if (!(first.rows.length === 62 && first.preliminaryNeeds.length === 0
    && close(quantity(first, "rc09:hcw_trench_excavation"), 25.2)
    && close(quantity(first, "rc09:hcw_bedding"), 1.68)
    && close(quantity(first, "rc09:hcw_imported_backfill"), 0.4368)
    && close(quantity(first, "rc09:hcw_excess_soil_removal"), 5.04)
    && quantity(first, "rc09:hcw_pipe") === 100
    && quantity(first, "rc09:hcw_tapping_saddle") === 1
    && quantity(first, "rc09:hcw_water_meter") === 1
    && quantity(first, "rc09:hcw_wall_sleeve") === 1)) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC_FIRST_RESULT");
  }
  if (!(close(quantity(changedDepth, "rc09:hcw_trench_excavation"), 30.24)
    && quantity(changedDepth, "rc09:hcw_pipe") === 100
    && quantity(changedDepth, "rc09:hcw_tapping_saddle") === 1
    && quantity(changedDepth, "rc09:hcw_water_meter") === 1)) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(packageChanged, "rc09:hcw_pipe") === 40
    && quantity(packageChanged, "rc09:hcw-pipe-balance:package-count") === 4
    && close(quantity(packageChanged, "rc09:hcw-pipe-balance:remainder"), 11.16)
    && close(quantity(packageChanged, "rc09:hcw-pipe-balance:surplus-beyond-spare"), 9.16)
    && quantity(packageChanged, "rc09:hcw_pipe_joint") === 2)) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_PACKAGE_RECALCULATION");
  }
  if (!(close(quantity(withStock, "rc09:hcw-pipe-balance:net-order-need"), 15.84)
    && quantity(withStock, "rc09:hcw_pipe") === 20
    && quantity(withStock, "rc09:hcw_pipe_joint") === 2)) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_STOCK_RECALCULATION");
  }
  if (!(conditional.rows.length === 66 && conditional.preliminaryNeeds.length === 0
    && quantity(conditional, "rc09:hcw_dewatering") === 32
    && quantity(conditional, "rc09:hcw_road_restoration") === 24
    && quantity(conditional, "rc09:hcw_external_meter_chamber") === 1
    && quantity(conditional, "rc09:hcw_trench_support") === 36)) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_CONDITIONAL_PROFILE");
  }
  if (/villageWaterSupplyCalculator|length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)/iu
    .test(JSON.stringify(HOUSE_WATER_CONNECTION_FORMULAS))) {
    throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_LEGACY_COEFFICIENT");
  }
  const requiredRows = [
    "rc09:hcw_pipe", "rc09:hcw_pipe_joint", "rc09:hcw_fusion_consumables",
    "rc09:hcw_tapping_saddle", "rc09:hcw_corporation_stop",
    "rc09:hcw_service_adapter", "rc09:hcw_curb_stop", "rc09:hcw_valve_box",
    "rc09:hcw_internal_stop_valve", "rc09:hcw_water_meter", "rc09:hcw_strainer",
    "rc09:hcw_check_valve", "rc09:hcw_union", "rc09:hcw_meter_seal",
    "rc09:hcw_wall_sleeve", "rc09:hcw_penetration_seal",
    "rc09:hcw_entry_insulation", "rc09:hcw_warning_tape", "rc09:hcw_tracer_wire",
    "rc09:hcw_bedding", "rc09:hcw_surround", "rc09:hcw_imported_backfill",
    "rc09:hcw_flushing_water", "rc09:hcw_disinfection_reagent",
    "rc09:hcw_test_closure", "rc09:hcw_fill_air_drain_set",
    "rc09:hcw_pressure_measurement_set", "rc09:hcw_compaction_water",
    "rc09:equipment:hcw-test-pump", "rc09:logistics:hcw-delivery",
  ];
  if (!requiredRows.every((rowId) => HOUSE_WATER_CONNECTION_RESOURCES.some(
    (resource) => resource.row_id === rowId,
  ))) throw new Error("STOP_S27_25_HOUSE_WATER_CONNECTION_COMPLETION_CHAIN");

  return {
    status: "GREEN_S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(HOUSE_WATER_CONNECTION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: 0 },
    automaticGeometry: {
      trenchM3: quantity(first, "rc09:hcw_trench_excavation"),
      beddingM3: quantity(first, "rc09:hcw_bedding"),
      surroundM3: quantity(first, "rc09:hcw_surround"),
      importedBackfillM3: quantity(first, "rc09:hcw_imported_backfill"),
      changedDepthTrenchM3: quantity(changedDepth, "rc09:hcw_trench_excavation"),
    },
    procurement: {
      installedM: quantity(first, "rc09:hcw-pipe-balance:installed-net"),
      expectedLossM: quantity(first, "rc09:hcw-pipe-balance:expected-loss"),
      retainedSpareM: quantity(first, "rc09:hcw-pipe-balance:retained-spare"),
      defaultOrderedM: quantity(first, "rc09:hcw_pipe"),
      tenMetrePackageOrderedM: quantity(packageChanged, "rc09:hcw_pipe"),
      withStockOrderedM: quantity(withStock, "rc09:hcw_pipe"),
      installedJointCountStable: quantity(withStock, "rc09:hcw_pipe_joint"),
    },
    conditionalRowCount: conditional.rows.length,
    serializedSha256: createHash("sha256").update(JSON.stringify({
      first, changedDepth, packageChanged, withStock, conditional,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-25.house-water-connection-automatic-successor.v1",
  stopCode: "S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC",
  applicationName: "s27-25-house-water-connection-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (65).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "40902da6adf07ea2c06479d08f9fa9df2d51a380b3f6bd97bd7b0e9f7ecad726",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b7d0a2fc-d84e-53be-a366-c676325c09b7",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "c1a25cbf-b86a-5527-8173-909fbcf517d8",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-25/house-water-connection-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/house-water-connection-geometric-automatic-s27-25.json",
    "src/lib/estimate/v4/houseWaterConnectionR1.ts",
    "tests/estimateNorms/houseWaterConnectionR1.contract.test.ts",
    "tests/requestEstimate/houseWaterConnectionOrdinaryRoute.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/release/auditCurrentCoreNoTestWeakening.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2725HouseWaterConnectionAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2725HouseWaterConnectionAutomaticIndependent.ts",
  ],
  catalogId: HOUSE_WATER_CONNECTION_CATALOG_ID,
  sourceId: HOUSE_WATER_CONNECTION_SOURCE_ID,
  normId: HOUSE_WATER_CONNECTION_NORM_ID,
  sourceMetadata: HOUSE_WATER_CONNECTION_SOURCE_METADATA,
  parameterDefinitions: HOUSE_WATER_CONNECTION_PARAMETERS,
  formulaDefinitions: HOUSE_WATER_CONNECTION_FORMULAS,
  resourceDefinitions: HOUSE_WATER_CONNECTION_RESOURCES,
  shortInput: HOUSE_WATER_CONNECTION_SHORT_INPUT,
  acceptanceInput: HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT,
  runtimeProfileInput: HOUSE_WATER_CONNECTION_RUNTIME_INPUT,
  runtimeProfileClassification: HOUSE_WATER_CONNECTION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: HOUSE_WATER_CONNECTION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 66,
  validationScenario: "Q5_HOUSE_WATER_CONNECTION_AUTOMATIC_S27_25",
  passport: {
    canonicalRuName: "Устройство полного ввода питьевого водопровода в дом",
    workKey: "house_connection_water",
    physicalResultRu: "Ввод от существующей магистрали до водомерного узла смонтирован, испытан, промыт, продезинфицирован и передан",
    includedScopeRu: [
      "разбивка, траншея, постель, обсыпка, засыпка, уплотнение и вывоз",
      "врезка, сервисная труба, отключающая арматура, гильза, герметизация и теплоизоляция ввода",
      "водомерный узел с фильтром, обратным клапаном, разъёмами и пломбами",
      "испытание, промывка, дезинфекция, пробы, труд, механизмы, доставка и документы",
      "водоотлив, покрытие, наружная камера и крепление траншеи только по условным ветвям",
    ],
    excludedScopeRu: [
      "строительство распределительной магистрали и внутренняя разводка здания после водомерного узла",
      "пожарный ввод, проектирование несущего проёма и неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_HOUSE_SERVICE_CONNECTION",
    connectionSystem: "PE100_RC_SDR11_OD32_PN16_VISIBLE_PRELIMINARY_PROFILE",
    primaryMeasureParameterId: "hcw_connection_count",
    knownScopeParameters: [...HOUSE_WATER_CONNECTION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(HOUSE_WATER_CONNECTION_SHORT_INPUT).length,
    automaticGeometryLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    conditionalDewateringRoadChamberAndTrenchSupportFailClosed: true,
    distributionMainAndInternalBuildingNetworkExcluded: true,
  },
  binding: {
    rowId: "rc09:hcw_asbuilt_documents",
    applicability: {
      technology_class: "POTABLE_WATER_HOUSE_SERVICE_CONNECTION",
      operation_class: "CONNECTION_FROM_EXISTING_MAIN_TO_BUILDING_METER_ASSEMBLY",
      pipe_system: "PE100_RC_SDR11_OD32_PN16_VISIBLE_PRELIMINARY_PROFILE",
      source_id: HOUSE_WATER_CONNECTION_SOURCE_ID,
      norm_id: HOUSE_WATER_CONNECTION_NORM_ID,
      exact_locator: HOUSE_WATER_CONNECTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "TEN_PRIMARY_FACTS_PLUS_VISIBLE_EDITABLE_PROFILE_PLUS_AUTOMATIC_FORMULAS",
    },
  },
  locator: {
    key: "house-water-connection-geometric-automatic-s27-25-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: HOUSE_WATER_CONNECTION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: HOUSE_WATER_CONNECTION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(HOUSE_WATER_CONNECTION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT),
      automaticFormulaIds: HOUSE_WATER_CONNECTION_FORMULAS.map((formula) => formula.formula_id),
      ordinaryClarificationFields: [],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Устройство полного ввода питьевого водопровода в дом",
    aliases: ["ввод воды в дом", "подключение дома к водопроводу", "house water service connection"],
    shortScopeRu: "Один ввод 28 м от существующей магистрали до водомерного узла с автоматическим расчётом геометрии, состава и закупки.",
    keyDistinguishingParameters: [...HOUSE_WATER_CONNECTION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "врезка, сервисная труба, земляные слои, ввод через стену, водомерный узел, испытание и завершение",
      "видимые редактируемые assumptions и условные проектные ветви",
    ],
    excludedBoundaries: [
      "распределительная магистраль целиком, внутренний водопровод после счётчика и пожарный ввод",
      "неподтверждённые цены и скрытые инженерные defaults",
    ],
    extraSearchTermsRu: "ввод воды дом врезка седёлка сервисная труба PE100-RC OD32 водомер счётчик",
    sourceProvenance: {
      exactExpandedHouseConnectionOwner: true,
      ordinaryTenFactIngress: true,
      automaticGeometryAssemblyLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /distribution.main|распределительн.*магистрал/iu,
    /sewer|канализац/iu,
    /fire.water|пожарн.*вод/iu,
  ],
  owner: "S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_25_HOUSE_WATER_CONNECTION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
