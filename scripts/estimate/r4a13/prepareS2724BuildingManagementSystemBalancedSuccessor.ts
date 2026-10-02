import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
  BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID,
  BUILDING_MANAGEMENT_SYSTEM_FORMULAS,
  BUILDING_MANAGEMENT_SYSTEM_NORM_ID,
  BUILDING_MANAGEMENT_SYSTEM_PARAMETERS,
  BUILDING_MANAGEMENT_SYSTEM_RESOURCES,
  BUILDING_MANAGEMENT_SYSTEM_RUNTIME_CLASSIFICATION,
  BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT,
  BUILDING_MANAGEMENT_SYSTEM_RUNTIME_SOURCE_IDS,
  BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
  BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
  BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA,
  compileBuildingManagementSystemR1,
} from "../../../src/lib/estimate/v4/buildingManagementSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileBuildingManagementSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  integration_gateway_mode: "REQUIRED",
  integration_gateway_designation: "Шлюз BACnet/Modbus по архитектуре",
  integration_gateway_quantity_piece: 1,
  field_devices_mode: "REQUIRED",
  field_sensor_designation: "Датчик температуры по спецификации",
  field_sensor_quantity_piece: 40,
  field_actuator_designation: "Электропривод клапана по спецификации",
  field_actuator_quantity_piece: 12,
});

async function verifyCore(): Promise<Json> {
  const first = await compileBuildingManagementSystemR1({
    ...BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
  });
  const complete = await compileBuildingManagementSystemR1({
    ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
  });
  const balanced = await compileBuildingManagementSystemR1({
    ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
    bms_controller_retained_spare_piece: 1,
    bms_controller_supplier_pack_size_piece: 4,
  });
  const conditional = await compileBuildingManagementSystemR1({
    ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 21
    && quantity(first, "rc09:bms_system_install_commission") === "1"
    && quantity(first, "rc09:bms_ddc_controller") === "2"
    && quantity(first, "rc09:bms_operator_workstation") === "1"
    && quantity(first, "rc09:bms_point_test") === "120")) {
    throw new Error("STOP_S27_24_BMS_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:bms_automation_panel", "rc09:bms_io_module",
    "rc09:bms_network_cable", "rc09:bms_control_cable", "rc09:bms_containment",
    "rc09:bms_termination", "rc09:bms_label", "rc09:bms_fastening",
    "rc09:bms_consumable", "rc09:bms_pe_conductor", "rc09:bms_test_report",
    "rc09:labor:bms-panel-controller-install", "rc09:labor:bms-cabling-termination",
    "rc09:labor:bms-programming-commissioning",
    "rc09:equipment:bms-cable-installation-tool",
    "rc09:equipment:bms-commissioning-analyzer",
    "rc09:logistics:bms-delivery", "rc09:logistics:bms-packaging-removal",
    "rc09:bms_integration_gateway", "rc09:bms_field_sensor", "rc09:bms_field_actuator",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_BMS_NEED:${rowId}`);
  if (!(complete.rows.length === 29 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:bms_io_module") === "8"
    && quantity(complete, "rc09:bms_network_cable") === "360"
    && quantity(complete, "rc09:bms_control_cable") === "850"
    && quantity(complete, "rc09:labor:bms-programming-commissioning") === "80"
    && quantity(complete, "rc09:equipment:bms-commissioning-analyzer") === "32"
    && quantity(complete, "rc09:logistics:bms-delivery") === "2")) {
    throw new Error("STOP_S27_24_BMS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:bms-controller-balance:installed-net") === "2"
    && quantity(balanced, "rc09:bms-controller-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:bms-controller-balance:total-need") === "3"
    && quantity(balanced, "rc09:bms-controller-balance:package-count") === "1"
    && quantity(balanced, "rc09:bms_ddc_controller") === "4"
    && quantity(balanced, "rc09:bms-controller-balance:remainder") === "2"
    && quantity(balanced, "rc09:bms-controller-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_BMS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 32 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_BMS_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:bms_system_install_commission", "rc09:bms_point_test",
    "rc09:bms_asbuilt_point_register", "rc09:bms_test_report",
  ]) {
    const graph = BUILDING_MANAGEMENT_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_BMS_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/hvac.plant|electrical.distribution|fire.alarm.system|access.control.system/iu
    .test(serialized)) {
    throw new Error("STOP_S27_24_BMS_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_BUILDING_MANAGEMENT_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:bms-controller-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:bms-controller-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:bms-controller-balance:total-need"),
      packageCount: quantity(balanced, "rc09:bms-controller-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:bms_ddc_controller"),
      remainderPiece: quantity(balanced, "rc09:bms-controller-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:bms-controller-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.building-management-system-balanced-successor.v1",
  stopCode: "S27_24_BUILDING_MANAGEMENT_SYSTEM_BALANCED",
  applicationName: "s27-24-building-management-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "ab481aa5-b938-50a5-bf20-e07ef48ed3a0",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "366d5585-fc4b-5210-92e2-1325e545a61c",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/building-management-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/building-management-system-balanced-s27-24.json",
    "src/lib/estimate/v4/buildingManagementSystemR1.ts",
    "tests/estimateNorms/buildingManagementSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724BuildingManagementSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724BuildingManagementSystemBalancedIndependent.ts",
  ],
  catalogId: BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID,
  sourceId: BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
  normId: BUILDING_MANAGEMENT_SYSTEM_NORM_ID,
  sourceMetadata: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: BUILDING_MANAGEMENT_SYSTEM_PARAMETERS,
  formulaDefinitions: BUILDING_MANAGEMENT_SYSTEM_FORMULAS,
  resourceDefinitions: BUILDING_MANAGEMENT_SYSTEM_RESOURCES,
  shortInput: BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
  acceptanceInput: BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: BUILDING_MANAGEMENT_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: BUILDING_MANAGEMENT_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 31,
  validationScenario: "Q4_BUILDING_MANAGEMENT_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы автоматизации здания BMS",
    workKey: "BMS_system",
    physicalResultRu: "Система BMS с контроллерами DDC-24IO, 120 физическими точками, АРМ WS-BMS-01 и BACnet/IP смонтирована, запрограммирована и проверена",
    includedScopeRu: [
      "шкафы автоматики, DDC-контроллеры, модули I/O и АРМ по проекту",
      "сетевые и контрольные кабели, кабеленесущая система и окончания",
      "маркировка, крепёж, расходники и защитное заземление",
      "труд монтажа, кабельных работ, программирования и пусконаладки",
      "монтажный инструмент, инженерная станция и анализатор сети",
      "point-to-point контроль, исполнительный перечень, протокол и логистика",
      "шлюзы и полевые устройства только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "оборудование установок HVAC и силовое распределение",
      "оборудование пожарной сигнализации и СКУД",
      "полевые датчики и приводы без явной проектной ветви",
      "расчёт контроллеров, точек и трасс только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "BUILDING_MANAGEMENT_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    bmsSystem: "DDC_BMS_EXPLICIT_POINT_LIST_AND_ARCHITECTURE",
    primaryMeasureParameterId: "bms_system_count",
    knownScopeParameters: [
      "bms_controller_count", "bms_controller_designation",
      "bms_physical_point_count", "bms_operator_workstation_count",
      "bms_operator_workstation_designation", "bms_integration_protocol",
    ],
    visibleProcurementBalance: true,
    projectArchitecturePointListMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentEngineeringSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:bms_system_install_commission",
    applicability: {
      technology_class: "BUILDING_AUTOMATION_AND_CONTROLS",
      operation_class: "BUILDING_MANAGEMENT_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      bms_system: "DDC_BMS_EXPLICIT_POINT_LIST_AND_ARCHITECTURE",
      scope_mode: "KNOWN_BMS_IDENTITY_POINTS_PROTOCOL_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
      norm_id: BUILDING_MANAGEMENT_SYSTEM_NORM_ID,
      exact_locator: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_CONTROLLER_POINT_WORKSTATION_PROTOCOL_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "building-management-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "bms_system_count", "bms_controller_count", "bms_controller_designation",
        "bms_physical_point_count", "bms_operator_workstation_count",
        "bms_operator_workstation_designation", "bms_integration_protocol",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: BUILDING_MANAGEMENT_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT),
          "integration_gateway_mode", "integration_gateway_designation",
          "integration_gateway_quantity_piece", "field_devices_mode",
          "field_sensor_designation", "field_sensor_quantity_piece",
          "field_actuator_designation", "field_actuator_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "integration_gateway_mode", "integration_gateway_designation",
        "integration_gateway_quantity_piece", "field_devices_mode",
        "field_sensor_designation", "field_sensor_quantity_piece",
        "field_actuator_designation", "field_actuator_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы автоматизации здания BMS",
    aliases: [
      "монтаж BMS здания",
      "система диспетчеризации инженерного оборудования",
      "установка DDC контроллеров и АРМ BMS",
      "building management system installation commissioning",
    ],
    shortScopeRu: "Одна BMS: 2 контроллера DDC-24IO, 120 физических точек, АРМ WS-BMS-01 и BACnet/IP; проектные материалы, труд, инструмент, ПНР и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "bms_system_count", "bms_controller_count", "bms_controller_designation",
      "bms_physical_point_count", "bms_operator_workstation_count",
      "bms_operator_workstation_designation", "bms_integration_protocol",
    ],
    clarificationFields: BUILDING_MANAGEMENT_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "BMS-оборудование, кабели, окончания, крепёж и расходники",
      "труд, инструмент, программирование, ПНР и исполнительные записи",
      "видимый закупочный баланс DDC-контроллеров",
      "условные шлюзы, датчики и приводы только по проекту",
    ],
    excludedBoundaries: [
      "оборудование HVAC, силовое распределение, пожарная сигнализация и СКУД",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые полевые устройства и цены",
    ],
    extraSearchTermsRu: "BMS система автоматизация диспетчеризация DDC контроллер точка BACnet IP шкаф модуль I/O АРМ кабель окончание маркировка крепёж программирование ПНР",
    sourceProvenance: {
      exactExpandedBmsOwner: true,
      knownSystemControllerPointWorkstationAndProtocol: true,
      visibleIndependentControllerProcurementBalance: true,
      exactProjectArchitectureMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /hvac.plant|оборудован.*hvac/iu,
    /electrical.distribution|силов.*распределен/iu,
    /fire.alarm.system|пожарн.*сигнализац/iu,
    /access.control.system|скуд/iu,
  ],
  owner: "S27_24_BUILDING_MANAGEMENT_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_BUILDING_MANAGEMENT_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
