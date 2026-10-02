import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  ACCESS_CONTROL_SYSTEM_FORMULAS,
  ACCESS_CONTROL_SYSTEM_NORM_ID,
  ACCESS_CONTROL_SYSTEM_PARAMETERS,
  ACCESS_CONTROL_SYSTEM_RESOURCES,
  ACCESS_CONTROL_SYSTEM_RUNTIME_CLASSIFICATION,
  ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  ACCESS_CONTROL_SYSTEM_RUNTIME_SOURCE_IDS,
  ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  ACCESS_CONTROL_SYSTEM_SOURCE_ID,
  ACCESS_CONTROL_SYSTEM_SOURCE_METADATA,
  compileAccessControlSystemR1,
} from "../../../src/lib/estimate/v4/accessControlSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileAccessControlSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  intercom_integration_mode: "REQUIRED",
  intercom_gateway_designation: "Шлюз интеграции с домофонией по архитектуре",
  intercom_gateway_quantity_piece: 1,
  fire_release_integration_mode: "REQUIRED",
  fire_release_interface_designation: "Интерфейс сигнала аварийного открытия",
  fire_release_interface_quantity_piece: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileAccessControlSystemR1({ ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT });
  const complete = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  });
  const balanced = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    acs_controller_retained_spare_piece: 1,
    acs_controller_supplier_pack_size_piece: 4,
  });
  const conditional = await compileAccessControlSystemR1({
    ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 13 && first.preliminaryNeeds.length === 23
    && quantity(first, "rc09:acs_system_install_commission") === "1"
    && quantity(first, "rc09:acs_controller") === "2"
    && quantity(first, "rc09:acs_reader") === "16"
    && quantity(first, "rc09:acs_lock") === "8"
    && quantity(first, "rc09:acs_exit_device") === "8"
    && quantity(first, "rc09:acs_door_functional_test") === "8")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:acs_door_contact", "rc09:acs_emergency_release",
    "rc09:acs_power_supply", "rc09:acs_standby_battery",
    "rc09:acs_network_cable", "rc09:acs_reader_cable", "rc09:acs_lock_cable",
    "rc09:acs_mounting_box", "rc09:acs_termination", "rc09:acs_label",
    "rc09:acs_fastening", "rc09:acs_consumable", "rc09:acs_grounding_conductor",
    "rc09:acs_test_report", "rc09:labor:acs-device-install",
    "rc09:labor:acs-cabling-termination",
    "rc09:labor:acs-configuration-commissioning",
    "rc09:equipment:acs-lifting", "rc09:equipment:acs-cable-device-tester",
    "rc09:logistics:acs-delivery", "rc09:logistics:acs-packaging-removal",
    "rc09:acs_intercom_gateway", "rc09:acs_fire_release_interface",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_ACCESS_CONTROL_NEED:${rowId}`);
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:acs_door_contact") === "8"
    && quantity(complete, "rc09:acs_emergency_release") === "8"
    && quantity(complete, "rc09:acs_power_supply") === "4"
    && quantity(complete, "rc09:acs_standby_battery") === "4"
    && quantity(complete, "rc09:acs_network_cable") === "180"
    && quantity(complete, "rc09:acs_reader_cable") === "520"
    && quantity(complete, "rc09:acs_lock_cable") === "360"
    && quantity(complete, "rc09:acs_termination") === "96"
    && quantity(complete, "rc09:labor:acs-cabling-termination") === "88"
    && quantity(complete, "rc09:equipment:acs-cable-device-tester") === "24"
    && quantity(complete, "rc09:logistics:acs-delivery") === "2")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:acs-controller-balance:installed-net") === "2"
    && quantity(balanced, "rc09:acs-controller-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:acs-controller-balance:total-need") === "3"
    && quantity(balanced, "rc09:acs-controller-balance:package-count") === "1"
    && quantity(balanced, "rc09:acs_controller") === "4"
    && quantity(balanced, "rc09:acs-controller-balance:remainder") === "2"
    && quantity(balanced, "rc09:acs-controller-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:acs_system_install_commission", "rc09:acs_door_functional_test",
    "rc09:acs_door_register", "rc09:acs_test_report",
  ]) {
    const graph = ACCESS_CONTROL_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_ACCESS_CONTROL_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/cctv.system|fire.alarm.system|general.lan|general.ups/iu.test(serialized)) {
    throw new Error("STOP_S27_24_ACCESS_CONTROL_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_ACCESS_CONTROL_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:acs-controller-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:acs-controller-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:acs-controller-balance:total-need"),
      packageCount: quantity(balanced, "rc09:acs-controller-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:acs_controller"),
      remainderPiece: quantity(balanced, "rc09:acs-controller-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:acs-controller-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.access-control-system-balanced-successor.v1",
  stopCode: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED",
  applicationName: "s27-24-access-control-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c7c5a9ad-bc7f-525d-8925-3bb84b6edc44",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "5a438edb-cdeb-5d27-8218-d8055b77c7d0",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/access-control-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/access-control-system-balanced-s27-24.json",
    "src/lib/estimate/v4/accessControlSystemR1.ts",
    "tests/estimateNorms/accessControlSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724AccessControlSystemBalancedIndependent.ts",
  ],
  catalogId: ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  sourceId: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
  normId: ACCESS_CONTROL_SYSTEM_NORM_ID,
  sourceMetadata: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: ACCESS_CONTROL_SYSTEM_PARAMETERS,
  formulaDefinitions: ACCESS_CONTROL_SYSTEM_FORMULAS,
  resourceDefinitions: ACCESS_CONTROL_SYSTEM_RESOURCES,
  shortInput: ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  acceptanceInput: ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: ACCESS_CONTROL_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ACCESS_CONTROL_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 33,
  validationScenario: "Q4_ACCESS_CONTROL_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы контроля и управления доступом",
    workKey: "access_control_system",
    physicalResultRu: "СКУД для 8 дверей с контроллерами ACS-CTRL-4D, считывателями READER-MF, замками MAGLOCK-300 и кнопками EXIT-NO смонтирована, настроена и проверена",
    includedScopeRu: [
      "контроллеры, считыватели, замки, кнопки выхода и датчики дверей по проекту",
      "устройства аварийного открытия, локальные блоки питания и аккумуляторы",
      "сетевые, считывательные и замковые кабели, окончания и монтажные коробки",
      "маркировка, крепёж, расходники и защитное заземление",
      "труд монтажа, кабельных работ, настройки и пусконаладки",
      "подъёмное средство, тестеры, функциональные проверки, реестр и логистика",
      "домофония и интерфейс аварийного открытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "CCTV и оборудование пожарной сигнализации",
      "общая LAN, серверная инфраструктура и общая UPS",
      "интеграции и логика доступа без явной проектной ветви",
      "расчёт дверей, устройств и трасс только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "ACCESS_CONTROL_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    accessControlSystem: "CONTROLLED_DOOR_CONTROLLER_READER_LOCK_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "acs_system_count",
    knownScopeParameters: [
      "acs_controlled_door_count", "acs_controller_count", "acs_controller_designation",
      "acs_reader_count", "acs_reader_designation", "acs_lock_count",
      "acs_lock_designation", "acs_exit_device_count", "acs_exit_device_designation",
    ],
    visibleProcurementBalance: true,
    projectDoorDevicePowerMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentSecurityAndInfrastructureSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:acs_system_install_commission",
    applicability: {
      technology_class: "ACCESS_CONTROL_AND_SECURITY",
      operation_class: "ACCESS_CONTROL_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      access_control_system: "CONTROLLED_DOOR_CONTROLLER_READER_LOCK_EXPLICIT_SCHEDULE",
      scope_mode: "KNOWN_DOOR_DEVICE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
      norm_id: ACCESS_CONTROL_SYSTEM_NORM_ID,
      exact_locator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_DOOR_CONTROLLER_READER_LOCK_EXIT_DEVICE_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "access-control-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
        "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
        "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
        "acs_exit_device_designation",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: ACCESS_CONTROL_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(ACCESS_CONTROL_SYSTEM_SHORT_INPUT),
          "intercom_integration_mode", "intercom_gateway_designation",
          "intercom_gateway_quantity_piece", "fire_release_integration_mode",
          "fire_release_interface_designation", "fire_release_interface_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "intercom_integration_mode", "intercom_gateway_designation",
        "intercom_gateway_quantity_piece", "fire_release_integration_mode",
        "fire_release_interface_designation", "fire_release_interface_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы контроля и управления доступом",
    aliases: [
      "монтаж системы СКУД",
      "установка контроллеров и считывателей доступа",
      "монтаж электрозамков и кнопок выхода",
      "access control system installation commissioning",
    ],
    shortScopeRu: "Одна СКУД: 8 дверей, 2 контроллера ACS-CTRL-4D, 16 считывателей READER-MF, 8 замков MAGLOCK-300 и 8 кнопок EXIT-NO; проектные материалы, труд, механизмы и ПНР уточняются по документам.",
    keyDistinguishingParameters: [
      "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
      "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
      "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
      "acs_exit_device_designation",
    ],
    clarificationFields: ACCESS_CONTROL_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(ACCESS_CONTROL_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "контроллеры, считыватели, замки, выходные и дверные устройства СКУД",
      "локальное питание, кабели, окончания, маркировка, крепёж и расходники",
      "труд, подъём, тестирование, настройка, ПНР и логистика",
      "видимый закупочный баланс контроллеров",
      "условные интерфейсы только по проекту",
    ],
    excludedBoundaries: [
      "CCTV, пожарная сигнализация, общая LAN, серверная и общая UPS",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые интерфейсы, логика и цены",
    ],
    extraSearchTermsRu: "СКУД контроль доступа дверь контроллер считыватель замок кнопка выхода питание кабель окончание маркировка настройка ПНР",
    sourceProvenance: {
      exactExpandedAccessControlOwner: true,
      knownSystemDoorControllerReaderLockAndExitDevice: true,
      visibleIndependentControllerProcurementBalance: true,
      exactProjectDoorDevicePowerMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /cctv.system|видеонаблюден/iu,
    /fire.alarm.system|оборудован.*пожарн.*сигнализац/iu,
    /general.lan|общ.*lan/iu,
    /general.ups|общ.*ups/iu,
  ],
  owner: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_ACCESS_CONTROL_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
