import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA,
  compilePumpUnitAlignmentConnectionR1,
} from "../../../src/lib/estimate/v4/pumpUnitAlignmentConnectionR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  });
  const complete = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  });
  const conditional = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
    vibration_isolator_mode: "REQUIRED",
    vibration_isolator_designation: "Виброизоляторы по чертежу насосной рамы",
    vibration_isolator_quantity_set: 2,
    flexible_connector_mode: "REQUIRED",
    flexible_connector_designation: "Гибкие вставки по схеме обвязки",
    flexible_connector_quantity_set: 4,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 3
    && short.rows.find((row) => row.row_id === "rc09:pump_unit_install_align")
      ?.quantity === "2"
    && short.rows.find((row) => row.row_id === "rc09:pump_motor_baseframe_45m3h_55m")
      ?.quantity === "2"
    && short.rows.find((row) => row.row_id === "rc09:pump_vibration_qh_current_test")
      ?.quantity === "2"
    && short.preliminaryNeeds.length === 7)) {
    throw new Error("STOP_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:pump_anchor_bolt_set",
    "rc09:pump_alignment_shim_set",
    "rc09:non_shrink_pump_base_grout",
    "rc09:pump_flange_gasket_fastener_set",
    "rc09:laser_shaft_alignment_tool",
    "rc09:pump_vibration_isolator",
    "rc09:pump_flexible_connector",
  ]) {
    if (!needs.has(rowId)) throw new Error(`STOP_MASTER_PUMP_UNIT_NEED:${rowId}`);
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) => row.row_id === "rc09:pump_anchor_bolt_set")
      ?.quantity === "2"
    && complete.rows.find((row) => row.row_id === "rc09:non_shrink_pump_base_grout")
      ?.quantity === "84"
    && complete.rows.find((row) => row.row_id === "rc09:pump_flange_gasket_fastener_set")
      ?.quantity === "4"
    && complete.rows.find((row) => row.row_id === "rc09:laser_shaft_alignment_tool")
      ?.quantity === "1")) {
    throw new Error("STOP_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 10)) {
    throw new Error("STOP_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(pumping.station.collectors|water.reservoir|pumping.station.automation|full.pumping.station)/iu
    .test(serialized)) {
    throw new Error("STOP_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownPumpCount: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.pump_count,
      knownDesignFlowM3H: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.design_flow_m3_h,
      knownDesignHeadM: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.design_head_m,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-pump-unit-alignment-connection-successor.v1",
  stopCode: "MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION",
  applicationName: "r4-a13-6-master-pump-unit-alignment-connection-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "8ac86296-41eb-5706-ab1f-732976f7fe1b",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "62c1df52-0931-5320-934b-23af2c6aeb03",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-pump-unit-alignment-connection-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/pumpUnitAlignmentConnectionR1.ts",
    "tests/estimateNorms/pumpUnitAlignmentConnectionR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterPumpUnitAlignmentConnectionSuccessor.ts",
  ],
  catalogId: PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  sourceId: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
  normId: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
  sourceMetadata: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA,
  parameterDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
  formulaDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS,
  resourceDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES,
  shortInput: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  acceptanceInput: PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 27,
  validationScenario: "MASTER_BENCHMARK_27_PUMP_UNIT_ALIGNMENT_CONNECTION",
  passport: {
    canonicalRuName: "Монтаж, центровка и подключение насосного агрегата на раме",
    workKey: "plumbing_interior_pump_install_standard",
    physicalResultRu: "Насосные агрегаты Q=45 м³/ч, H=55 м смонтированы на рамах, отцентрованы, присоединены и индивидуально испытаны",
    includedScopeRu: [
      "монтаж и центровка известного количества насосных агрегатов на рамах",
      "насосные агрегаты с двигателем по паспортным Q/H",
      "индивидуальный контроль соосности, вибрации, Q/H и тока каждого агрегата",
      "анкеры, регулировочные пластины, подливка, фланцевые комплекты и лазерный прибор только по утверждённым проектным и ППР-документам",
      "виброизоляторы и гибкие вставки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "коллекторы насосной станции",
      "резервуар воды",
      "автоматика насосной станции",
      "полная насосная станция",
      "исторические нормы расхода подливки, числа фланцевых комплектов и смен прибора",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ALIGN_CONNECT_PUMP_UNIT",
    pumpConfiguration: "PUMP_MOTOR_ON_BASEFRAME",
    primaryMeasureParameterId: "pump_count",
    geometryParameters: ["pump_count"],
    knownScopeParameters: ["design_flow_m3_h", "design_head_m", "pump_configuration"],
    projectPackageRequiredForFoundationPipingAlignmentAndQa: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    pumpingStationCollectorsExcluded: true,
    waterReservoirExcluded: true,
    pumpingStationAutomationExcluded: true,
    fullPumpingStationExcluded: true,
  },
  binding: {
    rowId: "rc09:pump_unit_install_align",
    applicability: {
      technology_class: "PUMP_UNIT_ON_BASEFRAME",
      operation_class: "INSTALL_ALIGN_CONNECT_PUMP_UNIT",
      pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
      scope_mode: "KNOWN_PUMP_COUNT_Q_H_PLUS_DIRECT_PROJECT_FOUNDATION_PIPING_ALIGNMENT_AND_QA",
      source_id: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
      norm_id: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
      exact_locator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_PUMP_CARDINALITY_PLUS_APPROVED_PROJECT_METHOD_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "pump-unit-alignment-connection-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
      geometryInputs: ["pump_count"],
      knownScopeInputs: ["design_flow_m3_h", "design_head_m", "pump_configuration"],
      directProjectInputs: [
        "anchor_set_designation", "anchor_set_quantity",
        "shim_set_designation", "shim_set_quantity",
        "base_grout_designation", "base_grout_mass_kg",
        "flange_set_designation", "flange_set_quantity",
        "alignment_tool_designation", "alignment_tool_shift",
      ],
      conditionalInputs: [
        "vibration_isolator_mode", "vibration_isolator_designation",
        "vibration_isolator_quantity_set", "flexible_connector_mode",
        "flexible_connector_designation", "flexible_connector_quantity_set",
      ],
    },
  },
  search: {
    primaryUom: "set",
    canonicalNameRu: "Монтаж, центровка и подключение насосного агрегата на раме",
    aliases: [
      "монтаж насоса на фундаментную раму",
      "центровка насоса и электродвигателя",
      "подключение насосного агрегата 45 м3/ч 55 м",
      "pump unit installation alignment connection",
    ],
    shortScopeRu: "Монтаж двух насосных агрегатов на раме, Q=45 м³/ч и H=55 м: работа, агрегаты и индивидуальные испытания доступны сразу; проектные анкеры, пластины, подливка, фланцы и прибор добровольно уточняются.",
    keyDistinguishingParameters: [
      "pump_count", "design_flow_m3_h", "design_head_m", "pump_configuration",
    ],
    clarificationFields: [
      "anchor_set_designation", "anchor_set_quantity",
      "shim_set_designation", "shim_set_quantity",
      "base_grout_designation", "base_grout_mass_kg",
      "flange_set_designation", "flange_set_quantity",
      "alignment_tool_designation", "alignment_tool_shift",
      "vibration_isolator_mode", "flexible_connector_mode",
    ],
    includedBoundaries: [
      "монтаж, центровка и подключение по известному количеству агрегатов",
      "агрегаты и индивидуальные испытания по паспортным Q/H",
      "фундаментные, обвязочные и центровочные материалы по утверждённому проекту и ППР",
      "виброизоляторы и гибкие вставки по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "коллекторы и резервуар насосной станции",
      "автоматика и полная насосная станция",
      "исторические коэффициенты расхода и трудоёмкости",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "насос агрегат двигатель рама фундамент анкеры пластины безусадочная подливка фланец прокладка крепёж лазерная центровка вибрация Q H ток гибкая вставка виброизолятор",
    sourceProvenance: {
      exactPumpUnitOwner: true,
      knownPumpCountAndPassportQH: true,
      exactProjectFoundationPipingMethodAndQaPackageRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /pumping.station.collectors/iu,
    /water.reservoir/iu,
    /pumping.station.automation/iu,
    /full.pumping.station/iu,
  ],
  owner: "MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_SUCCESSOR",
  receiptFileStem: "MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
