import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  HOT_WATER_BOILER_PIPING_CATALOG_ID,
  HOT_WATER_BOILER_PIPING_FORMULAS,
  HOT_WATER_BOILER_PIPING_NORM_ID,
  HOT_WATER_BOILER_PIPING_PARAMETERS,
  HOT_WATER_BOILER_PIPING_RESOURCES,
  HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  HOT_WATER_BOILER_PIPING_SOURCE_ID,
  HOT_WATER_BOILER_PIPING_SOURCE_METADATA,
  compileHotWaterBoilerPipingR1,
} from "../../../src/lib/estimate/v4/hotWaterBoilerPipingR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const CONDITIONAL_INPUTS = [
  "gas_train_mode", "gas_train_designation", "gas_train_quantity",
  "circulation_pump_mode", "circulation_pump_designation", "circulation_pump_quantity",
  "plate_heat_exchanger_mode", "plate_heat_exchanger_designation", "plate_heat_exchanger_quantity",
  "expansion_vessel_mode", "expansion_vessel_designation", "expansion_vessel_quantity",
  "water_treatment_mode", "water_treatment_designation", "water_treatment_quantity",
];

async function verifyCore(): Promise<Json> {
  const short = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  });
  const complete = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  });
  const conditional = await compileHotWaterBoilerPipingR1({
    ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
    gas_train_mode: "REQUIRED",
    gas_train_designation: "Газовая рампа по паспорту горелки",
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
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 4
    && short.rows.find((row) => row.row_id === "rc09:hot_water_boiler_install_pipe")
      ?.quantity === "1"
    && short.rows.find((row) => row.row_id === "rc09:hot_water_boiler_500kw")
      ?.quantity === "1"
    && short.rows.find((row) => row.row_id === "rc09:modulating_gas_burner_500kw")
      ?.quantity === "1"
    && short.rows.find((row) => row.row_id === "rc09:boiler_hydraulic_safety_commission")
      ?.quantity === "1"
    && short.preliminaryNeeds.length === 10)) {
    throw new Error("STOP_MASTER_HOT_WATER_BOILER_PIPING_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:boiler_flange_gasket_fastener_set",
    "rc09:boiler_isolation_valve",
    "rc09:boiler_safety_group",
    "rc09:boiler_thermomanometer_sensor_set",
    "rc09:high_temperature_flue_sealant",
    "rc09:gas_train",
    "rc09:boiler_circulation_pump",
    "rc09:plate_heat_exchanger",
    "rc09:expansion_vessel",
    "rc09:water_treatment",
  ]) {
    if (!needs.has(rowId)) throw new Error(`STOP_MASTER_HOT_WATER_BOILER_NEED:${rowId}`);
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 9
    && complete.rows.find((row) => row.row_id === "rc09:boiler_flange_gasket_fastener_set")
      ?.quantity === "4"
    && complete.rows.find((row) => row.row_id === "rc09:boiler_isolation_valve")
      ?.quantity === "4"
    && complete.rows.find((row) => row.row_id === "rc09:high_temperature_flue_sealant")
      ?.quantity === "1.1")) {
    throw new Error("STOP_MASTER_HOT_WATER_BOILER_PIPING_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 14)) {
    throw new Error("STOP_MASTER_HOT_WATER_BOILER_PIPING_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/full.boiler.house/iu.test(serialized)) {
    throw new Error("STOP_MASTER_HOT_WATER_BOILER_PIPING_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_HOT_WATER_BOILER_PIPING_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownBoilerCount: HOT_WATER_BOILER_PIPING_SHORT_INPUT.boiler_count,
      knownThermalPowerKw: HOT_WATER_BOILER_PIPING_SHORT_INPUT.thermal_power_kw,
      knownFuelType: HOT_WATER_BOILER_PIPING_SHORT_INPUT.fuel_type,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-hot-water-boiler-piping-successor.v1",
  stopCode: "MASTER_HOT_WATER_BOILER_PIPING",
  applicationName: "r4-a13-6-master-hot-water-boiler-piping-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "116b9d9d-83a7-5c4c-a250-ff493e1982cb",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "c8ae6306-efa4-5104-8807-5bcc358f96cd",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-hot-water-boiler-piping-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/hotWaterBoilerPipingR1.ts",
    "tests/estimateNorms/hotWaterBoilerPipingR1.contract.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterHotWaterBoilerPipingSuccessor.ts",
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
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 28,
  validationScenario: "MASTER_BENCHMARK_28_HOT_WATER_BOILER_PIPING",
  passport: {
    canonicalRuName: "Монтаж и обвязка водогрейного котла 500 кВт на природном газе",
    workKey: "hot_water_boiler_piping",
    physicalResultRu: "Водогрейный котёл 500 кВт с поставляемой модулируемой газовой горелкой смонтирован, обвязан и индивидуально испытан",
    includedScopeRu: [
      "монтаж и обвязка известного количества водогрейных котлов",
      "котёл и поставляемая модулируемая газовая горелка по паспортной мощности",
      "индивидуальное гидравлическое испытание и проверка защит каждого котла",
      "фланцы, арматура, группа безопасности, КИП и герметик только по утверждённым проектным документам",
      "газовая рампа, насос, теплообменник, расширительный бак и водоподготовка только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "полная котельная",
      "строительная часть котельной",
      "общие дымоходы и газоходы котельной",
      "общая вентиляция, пожарная система и автоматика здания котельной",
      "исторические нормы количества арматуры, комплектов и расхода герметика",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_PIPE_HOT_WATER_BOILER",
    boilerSystem: "HOT_WATER_BOILER_500KW_NATURAL_GAS_WITH_MODULATING_BURNER",
    primaryMeasureParameterId: "boiler_count",
    geometryParameters: ["boiler_count"],
    knownScopeParameters: ["thermal_power_kw", "fuel_type", "burner_configuration"],
    projectPackageRequiredForPipingInstrumentationAndQa: true,
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
      scope_mode: "KNOWN_BOILER_COUNT_POWER_FUEL_BURNER_PLUS_DIRECT_PROJECT_PIPING_INSTRUMENTATION_AND_QA",
      source_id: HOT_WATER_BOILER_PIPING_SOURCE_ID,
      norm_id: HOT_WATER_BOILER_PIPING_NORM_ID,
      exact_locator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_BOILER_CARDINALITY_PLUS_APPROVED_PROJECT_METHOD_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "hot-water-boiler-500kw-piping-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
      geometryInputs: ["boiler_count"],
      knownScopeInputs: ["thermal_power_kw", "fuel_type", "burner_configuration"],
      directProjectInputs: [
        "flange_set_designation", "flange_set_quantity",
        "isolation_valve_designation", "isolation_valve_quantity_piece",
        "safety_group_designation", "safety_group_quantity_set",
        "instrument_set_designation", "instrument_set_quantity_set",
        "flue_sealant_designation", "flue_sealant_mass_kg",
      ],
      conditionalInputs: CONDITIONAL_INPUTS,
    },
  },
  search: {
    primaryUom: "set",
    canonicalNameRu: "Монтаж и обвязка водогрейного котла 500 кВт на природном газе",
    aliases: [
      "монтаж водогрейного газового котла 500 кВт",
      "обвязка котла 500 кВт",
      "монтаж котла с газовой горелкой",
      "hot water boiler installation and piping",
    ],
    shortScopeRu: "Монтаж и обвязка одного водогрейного котла 500 кВт на природном газе: работа, котёл, поставляемая горелка и индивидуальное испытание доступны сразу; проектная арматура, КИП и вспомогательное оборудование добровольно уточняются.",
    keyDistinguishingParameters: [
      "boiler_count", "thermal_power_kw", "fuel_type", "burner_configuration",
    ],
    clarificationFields: [
      "flange_set_designation", "flange_set_quantity",
      "isolation_valve_designation", "isolation_valve_quantity_piece",
      "safety_group_designation", "safety_group_quantity_set",
      "instrument_set_designation", "instrument_set_quantity_set",
      "flue_sealant_designation", "flue_sealant_mass_kg",
      "gas_train_mode", "circulation_pump_mode", "plate_heat_exchanger_mode",
      "expansion_vessel_mode", "water_treatment_mode",
    ],
    includedBoundaries: [
      "монтаж и обвязка по известному количеству котлов",
      "котёл, поставляемая горелка и индивидуальное испытание по паспортной мощности и топливу",
      "арматура, группа безопасности, КИП и герметик по утверждённому проекту",
      "вспомогательное оборудование по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "полная котельная и её строительная часть",
      "общие системы дымоудаления, вентиляции, пожарной безопасности и автоматики здания",
      "исторические коэффициенты расхода и количества",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "котёл водогрейный газовый 500 кВт горелка модулируемая обвязка фланец прокладка арматура группа безопасности термометр манометр датчик герметик гидравлическое испытание защита газовая рампа насос теплообменник расширительный бак водоподготовка",
    sourceProvenance: {
      exactExpandedBoilerInstallationOwner: true,
      knownBoilerCountPowerFuelAndBurner: true,
      exactProjectPipingInstrumentationMethodAndQaPackageRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /full.boiler.house/iu,
  ],
  owner: "MASTER_HOT_WATER_BOILER_PIPING_SUCCESSOR",
  receiptFileStem: "MASTER_HOT_WATER_BOILER_PIPING",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
