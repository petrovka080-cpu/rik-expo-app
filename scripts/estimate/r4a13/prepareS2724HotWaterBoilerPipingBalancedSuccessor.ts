import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  HOT_WATER_BOILER_PIPING_CATALOG_ID,
  HOT_WATER_BOILER_PIPING_FORMULAS,
  HOT_WATER_BOILER_PIPING_NORM_ID,
  HOT_WATER_BOILER_PIPING_PARAMETERS,
  HOT_WATER_BOILER_PIPING_RESOURCES,
  HOT_WATER_BOILER_PIPING_RUNTIME_CLASSIFICATION,
  HOT_WATER_BOILER_PIPING_RUNTIME_INPUT,
  HOT_WATER_BOILER_PIPING_RUNTIME_SOURCE_IDS,
  HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  HOT_WATER_BOILER_PIPING_SOURCE_ID,
  HOT_WATER_BOILER_PIPING_SOURCE_METADATA,
  compileHotWaterBoilerPipingR1,
} from "../../../src/lib/estimate/v4/hotWaterBoilerPipingR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileHotWaterBoilerPipingR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  gas_train_mode: "REQUIRED",
  gas_train_designation: "Газовая рампа по паспорту выбранной горелки",
  gas_train_quantity: 1,
  circulation_pump_mode: "REQUIRED",
  circulation_pump_designation: "Насос котлового контура по проекту",
  circulation_pump_quantity: 2,
  plate_heat_exchanger_mode: "REQUIRED",
  plate_heat_exchanger_designation: "Теплообменник по тепломеханической схеме",
  plate_heat_exchanger_quantity: 1,
  expansion_vessel_mode: "REQUIRED",
  expansion_vessel_designation: "Расширительный бак по расчёту проекта",
  expansion_vessel_quantity: 1,
  water_treatment_mode: "REQUIRED",
  water_treatment_designation: "Водоподготовка по анализу исходной воды",
  water_treatment_quantity: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  });
  const complete = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  });
  const balanced = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
    boiler_retained_spare_set: 1,
    boiler_supplier_pack_size_set: 2,
    burner_retained_spare_set: 2,
    burner_supplier_pack_size_set: 4,
  });
  const conditional = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 16 && first.preliminaryNeeds.length === 19
    && quantity(first, "rc09:hot_water_boiler_install_pipe") === "1"
    && quantity(first, "rc09:hot_water_boiler_500kw") === "1"
    && quantity(first, "rc09:modulating_gas_burner_500kw") === "1"
    && quantity(first, "rc09:boiler_hydraulic_safety_commission") === "1")) {
    throw new Error("STOP_S27_24_HOT_WATER_BOILER_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "rc09:boiler_flange_gasket_fastener_set", "rc09:boiler_isolation_valve",
    "rc09:boiler_safety_group", "rc09:boiler_thermomanometer_sensor_set",
    "rc09:high_temperature_flue_sealant", "rc09:gas_train",
    "rc09:boiler_circulation_pump", "rc09:plate_heat_exchanger",
    "rc09:expansion_vessel", "rc09:water_treatment",
    "rc09:boiler_commissioning_record",
    "rc09:labor:boiler-installation-piping", "rc09:labor:boiler-commissioning",
    "rc09:equipment:boiler-lifting", "rc09:equipment:boiler-welding",
    "rc09:equipment:boiler-hydraulic-test-pump",
    "rc09:equipment:boiler-flue-gas-analyzer",
    "rc09:logistics:boiler-delivery", "rc09:logistics:boiler-waste-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_HOT_WATER_BOILER_NEED:${rowId}`);
  if (!(complete.rows.length === 30 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:boiler_flange_gasket_fastener_set") === "4"
    && quantity(complete, "rc09:boiler_isolation_valve") === "4"
    && quantity(complete, "rc09:high_temperature_flue_sealant") === "1.1"
    && quantity(complete, "rc09:labor:boiler-installation-piping") === "48"
    && quantity(complete, "rc09:equipment:boiler-welding") === "12"
    && quantity(complete, "rc09:logistics:boiler-delivery") === "1")) {
    throw new Error("STOP_S27_24_HOT_WATER_BOILER_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:boiler-balance:installed-net") === "1"
    && quantity(balanced, "rc09:boiler-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:boiler-balance:total-need") === "2"
    && quantity(balanced, "rc09:boiler-balance:package-count") === "1"
    && quantity(balanced, "rc09:hot_water_boiler_500kw") === "2"
    && quantity(balanced, "rc09:boiler-balance:remainder") === "1"
    && quantity(balanced, "rc09:boiler-balance:surplus-beyond-reserve") === "0"
    && quantity(balanced, "rc09:burner-balance:installed-net") === "1"
    && quantity(balanced, "rc09:burner-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:burner-balance:total-need") === "3"
    && quantity(balanced, "rc09:burner-balance:package-count") === "1"
    && quantity(balanced, "rc09:modulating_gas_burner_500kw") === "4"
    && quantity(balanced, "rc09:burner-balance:remainder") === "3"
    && quantity(balanced, "rc09:burner-balance:surplus-beyond-reserve") === "1")) {
    throw new Error("STOP_S27_24_HOT_WATER_BOILER_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 35 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_HOT_WATER_BOILER_CONDITIONAL_PROFILE");
  }
  const informationalRows = [
    "rc09:hot_water_boiler_install_pipe",
    "rc09:boiler_hydraulic_safety_commission",
    "rc09:boiler_commissioning_record",
  ];
  for (const rowId of informationalRows) {
    const graph = HOT_WATER_BOILER_PIPING_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_HOT_WATER_BOILER_DOUBLE_COST:${rowId}`);
    }
  }
  const ownedRows = HOT_WATER_BOILER_PIPING_RESOURCES
    .map((row) => `${row.row_id} ${row.title_ru}`).join("\n");
  if (/(?:full.boiler.house|civil.works|common.flue|building.ventilation|building.fire|building.automation)/iu
    .test(ownedRows)) {
    throw new Error("STOP_S27_24_HOT_WATER_BOILER_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_HOT_WATER_BOILER_PIPING_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      knownBoilerCount: HOT_WATER_BOILER_PIPING_SHORT_INPUT.boiler_count,
      knownThermalPowerKw: HOT_WATER_BOILER_PIPING_SHORT_INPUT.thermal_power_kw,
      knownBoilerProduct:
        HOT_WATER_BOILER_PIPING_SHORT_INPUT.boiler_product_designation,
      knownBurnerProduct:
        HOT_WATER_BOILER_PIPING_SHORT_INPUT.burner_product_designation,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      boiler: {
        installedSet: quantity(balanced, "rc09:boiler-balance:installed-net"),
        retainedSpareSet: quantity(balanced, "rc09:boiler-balance:retained-spare"),
        totalNeedSet: quantity(balanced, "rc09:boiler-balance:total-need"),
        packageCount: quantity(balanced, "rc09:boiler-balance:package-count"),
        orderedSet: quantity(balanced, "rc09:hot_water_boiler_500kw"),
        remainderSet: quantity(balanced, "rc09:boiler-balance:remainder"),
        surplusBeyondReserveSet:
          quantity(balanced, "rc09:boiler-balance:surplus-beyond-reserve"),
      },
      burner: {
        installedSet: quantity(balanced, "rc09:burner-balance:installed-net"),
        retainedSpareSet: quantity(balanced, "rc09:burner-balance:retained-spare"),
        totalNeedSet: quantity(balanced, "rc09:burner-balance:total-need"),
        packageCount: quantity(balanced, "rc09:burner-balance:package-count"),
        orderedSet: quantity(balanced, "rc09:modulating_gas_burner_500kw"),
        remainderSet: quantity(balanced, "rc09:burner-balance:remainder"),
        surplusBeyondReserveSet:
          quantity(balanced, "rc09:burner-balance:surplus-beyond-reserve"),
      },
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.hot-water-boiler-piping-balanced-successor.v2",
  stopCode: "S27_24_HOT_WATER_BOILER_PIPING_BALANCED",
  applicationName: "s27-24-hot-water-boiler-piping-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "34a785a1-867e-5434-8229-4e515a08b29c",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "0246f177-d0fa-58e0-b2a0-8704aa4da5af",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/hot-water-boiler-piping-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/hot-water-boiler-piping-balanced-s27-24.json",
    "src/lib/estimate/v4/hotWaterBoilerPipingR1.ts",
    "tests/estimateNorms/hotWaterBoilerPipingR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724HotWaterBoilerPipingBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724HotWaterBoilerPipingBalancedIndependent.ts",
  ],
  catalogId: HOT_WATER_BOILER_PIPING_CATALOG_ID,
  sourceId: HOT_WATER_BOILER_PIPING_SOURCE_ID,
  normId: HOT_WATER_BOILER_PIPING_NORM_ID,
  sourceMetadata: HOT_WATER_BOILER_PIPING_SOURCE_METADATA,
  parameterDefinitions: HOT_WATER_BOILER_PIPING_PARAMETERS,
  formulaDefinitions: HOT_WATER_BOILER_PIPING_FORMULAS,
  resourceDefinitions: HOT_WATER_BOILER_PIPING_RESOURCES,
  shortInput: HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  acceptanceInput: HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  runtimeProfileInput: HOT_WATER_BOILER_PIPING_RUNTIME_INPUT,
  runtimeProfileClassification: HOT_WATER_BOILER_PIPING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: HOT_WATER_BOILER_PIPING_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [29, 14, 14],
  benchmarkOrdinal: 28,
  validationScenario: "MASTER_BENCHMARK_28_HOT_WATER_BOILER_PIPING_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и обвязка водогрейного котла 500 кВт на природном газе",
    workKey: "hot_water_boiler_piping",
    physicalResultRu:
      "Выбранный водогрейный котёл 500 кВт с выбранной модулируемой газовой горелкой смонтирован, обвязан и индивидуально испытан",
    includedScopeRu: [
      "монтаж и обвязка известного количества котлов точной выбранной марки",
      "выбранная горелка, отдельные видимые закупочные балансы котла и горелки",
      "фланцы, арматура, группа безопасности, КИП и герметик по проекту",
      "труд монтажников и наладчиков, подъём, сварка, гидравлический насос и газоанализатор по ППР",
      "индивидуальное испытание, акт, доставка и вывоз отходов",
      "газовая рампа, насос, теплообменник, бак и водоподготовка только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "полная котельная и её строительная часть",
      "общие дымоходы, вентиляция, пожарная система и автоматика здания",
      "автоматический выбор котла, горелки или гидравлический расчёт",
      "универсальные нормы расхода, производительности и неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_PIPE_HOT_WATER_BOILER",
    boilerSystem: "HOT_WATER_BOILER_500KW_NATURAL_GAS_WITH_MODULATING_BURNER",
    primaryMeasureParameterId: "boiler_count",
    knownScopeParameters: [
      "boiler_product_designation", "burner_product_designation",
      "thermal_power_kw", "fuel_type", "burner_configuration",
    ],
    visibleProcurementBalance: true,
    projectPackageRequiredForPipingLaborEquipmentTestingAndLogistics: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fullBoilerHouseExcluded: true,
  },
  binding: {
    rowId: "rc09:hot_water_boiler_install_pipe",
    applicability: {
      technology_class: "HOT_WATER_BOILER_PIPING",
      operation_class: "INSTALL_AND_PIPE_HOT_WATER_BOILER",
      boiler_system: "HOT_WATER_BOILER_500KW_NATURAL_GAS_WITH_MODULATING_BURNER",
      scope_mode:
        "KNOWN_SELECTED_BOILER_BURNER_PLUS_VISIBLE_BALANCES_AND_DIRECT_PROJECT_RESOURCES",
      source_id: HOT_WATER_BOILER_PIPING_SOURCE_ID,
      norm_id: HOT_WATER_BOILER_PIPING_NORM_ID,
      exact_locator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis:
        "KNOWN_BOILER_CARDINALITY_PLUS_VISIBLE_PACKAGING_AND_APPROVED_PROJECT_METHOD_QA_LOGISTICS",
    },
  },
  locator: {
    key: "hot-water-boiler-500kw-piping-project-balance-s27-24-v2",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
      sourcePackSha256: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "boiler_count", "boiler_product_designation", "thermal_power_kw",
        "fuel_type", "burner_configuration", "burner_product_designation",
      ],
      visiblePreliminaryBalanceInputs:
        Object.keys(HOT_WATER_BOILER_PIPING_RUNTIME_INPUT),
      directProjectInputs: [
        "flange_set_designation", "flange_set_quantity",
        "isolation_valve_designation", "isolation_valve_quantity_piece",
        "safety_group_designation", "safety_group_quantity_set",
        "instrument_set_designation", "instrument_set_quantity_set",
        "flue_sealant_designation", "flue_sealant_mass_kg",
        "boiler_commissioning_record_designation",
        "boiler_commissioning_record_quantity_document",
        "boiler_installation_piping_labor_h", "boiler_commissioning_labor_h",
        "boiler_lifting_equipment_machine_h", "boiler_welding_equipment_machine_h",
        "boiler_hydraulic_test_pump_machine_h",
        "boiler_flue_gas_analyzer_machine_h", "boiler_delivery_trip_count",
        "boiler_waste_removal_trip_count",
      ],
      conditionalInputs: [
        "gas_train_mode", "gas_train_designation", "gas_train_quantity",
        "circulation_pump_mode", "circulation_pump_designation",
        "circulation_pump_quantity", "plate_heat_exchanger_mode",
        "plate_heat_exchanger_designation", "plate_heat_exchanger_quantity",
        "expansion_vessel_mode", "expansion_vessel_designation",
        "expansion_vessel_quantity", "water_treatment_mode",
        "water_treatment_designation", "water_treatment_quantity",
      ],
    },
  },
  search: {
    primaryUom: "set",
    canonicalNameRu: "Монтаж и обвязка водогрейного котла 500 кВт на природном газе",
    aliases: [
      "монтаж водогрейного газового котла 500 кВт",
      "обвязка котла 500 кВт",
      "монтаж котла с модулируемой газовой горелкой",
      "hot water boiler installation and piping",
    ],
    shortScopeRu:
      "Монтаж выбранного котла BOILER-500-NG 500 кВт и горелки BURNER-500-MOD с независимыми закупочными балансами; проектные материалы, труд, механизмы, испытания и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "boiler_count", "boiler_product_designation", "thermal_power_kw",
      "fuel_type", "burner_configuration", "burner_product_designation",
    ],
    clarificationFields: HOT_WATER_BOILER_PIPING_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "boiler_count", "boiler_product_designation", "thermal_power_kw",
        "fuel_type", "burner_configuration", "burner_product_designation",
      ].includes(parameterId)),
    includedBoundaries: [
      "выбранные котёл и горелка, их монтаж, обвязка и закупочные балансы",
      "проектные материалы, труд, механизмы, индивидуальные испытания и акты",
      "доставка, вывоз отходов и условное вспомогательное оборудование",
    ],
    excludedBoundaries: [
      "полная котельная и строительная часть",
      "общие дымоходы, вентиляция, пожарная система и автоматика здания",
      "автоматический выбор оборудования и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "котёл водогрейный газовый 500 кВт горелка модулируемая обвязка фланец арматура безопасность КИП герметик резерв упаковка труд сварка гидравлическое испытание газоанализатор акт доставка",
    sourceProvenance: {
      exactHotWaterBoilerOwner: true,
      exactSelectedBoilerBurnerAndPassportPowerRequired: true,
      visibleIndependentProcurementBalances: true,
      exactProjectPipingLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /full.boiler.house|полн.*котельн/iu,
    /civil.works|строительн.*част.*котельн/iu,
    /common.flue|общ.*дымоход/iu,
    /building.ventilation|вентиляц.*здани/iu,
    /building.fire|пожарн.*систем.*здани/iu,
    /building.automation|автоматик.*здани/iu,
  ],
  owner: "S27_24_HOT_WATER_BOILER_PIPING_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_HOT_WATER_BOILER_PIPING_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
