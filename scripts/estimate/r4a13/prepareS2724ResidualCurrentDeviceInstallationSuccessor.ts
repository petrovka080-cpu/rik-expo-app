import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_CLASSIFICATION,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_SOURCE_IDS,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA,
  compileResidualCurrentDeviceInstallationR1,
} from "../../../src/lib/estimate/v4/residualCurrentDeviceInstallationR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileResidualCurrentDeviceInstallationR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const first = await compileResidualCurrentDeviceInstallationR1({
    ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
  });
  const complete = await compileResidualCurrentDeviceInstallationR1({
    ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
  });
  const balanced = await compileResidualCurrentDeviceInstallationR1({
    ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
    rcd_retained_spare_piece: 2,
    rcd_supplier_pack_size_piece: 4,
  });
  const conditional = await compileResidualCurrentDeviceInstallationR1({
    ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
    comb_bus_mode: "REQUIRED",
    comb_bus_designation: "Шина 2P 63 A, шаг 18 мм",
    comb_bus_length_m: 0.22,
    comb_bus_end_cap_designation: "Заглушка совместимой серии",
    comb_bus_end_cap_quantity_piece: 2,
    auxiliary_contact_mode: "REQUIRED",
    auxiliary_contact_designation: "Контакт состояния совместимой серии",
    auxiliary_contact_quantity_piece: 2,
    din_rail_segment_mode: "REQUIRED",
    din_rail_segment_designation: "DIN-рейка 35 мм",
    din_rail_segment_length_m: 0.3,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 16
    && quantity(first, "q4:rcd:install") === "8"
    && quantity(first, "q4:rcd:device-order") === "8"
    && quantity(first, "q4:rcd:balance:package-count") === "8")) {
    throw new Error("STOP_S27_24_RCD_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "q4:rcd:selection-basis", "q4:rcd:circuit-marker",
    "q4:rcd:terminal-accessory", "q4:rcd:torque-seal", "q4:rcd:trip-test",
    "q4:rcd:labor:installation", "q4:rcd:labor:testing",
    "q4:rcd:equipment:torque-screwdriver", "q4:rcd:equipment:installation-tool",
    "q4:rcd:equipment:tester", "q4:rcd:logistics:delivery",
    "q4:rcd:logistics:waste-removal", "q4:rcd:conditional:comb-bus",
    "q4:rcd:conditional:comb-bus-end-cap", "q4:rcd:conditional:auxiliary-contact",
    "q4:rcd:conditional:din-rail-segment",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_RCD_NEED:${rowId}`);
  if (!(complete.rows.length === 20 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "q4:rcd:terminal-accessory") === "16"
    && quantity(complete, "q4:rcd:labor:installation") === "5.6"
    && quantity(complete, "q4:rcd:equipment:tester") === "4"
    && quantity(complete, "q4:rcd:logistics:delivery") === "1")) {
    throw new Error("STOP_S27_24_RCD_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "q4:rcd:balance:installed-net") === "8"
    && quantity(balanced, "q4:rcd:balance:retained-spare") === "2"
    && quantity(balanced, "q4:rcd:balance:total-need") === "10"
    && quantity(balanced, "q4:rcd:balance:package-count") === "3"
    && quantity(balanced, "q4:rcd:device-order") === "12"
    && quantity(balanced, "q4:rcd:balance:remainder") === "4"
    && quantity(balanced, "q4:rcd:balance:surplus-beyond-reserve") === "2")) {
    throw new Error("STOP_S27_24_RCD_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 24 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_RCD_CONDITIONAL_PROFILE");
  }
  const ownedRows = RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES
    .map((row) => `${row.row_id} ${row.title_ru}`).join("\n");
  if (/(?:cable.line|circuit.breaker|panel.enclosure|complete.switchboard)/iu.test(ownedRows)) {
    throw new Error("STOP_S27_24_RCD_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_RESIDUAL_CURRENT_DEVICE_INSTALLATION_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      selectedDeviceCount: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT.rcd_count,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "q4:rcd:balance:installed-net"),
      retainedSparePiece: quantity(balanced, "q4:rcd:balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "q4:rcd:balance:total-need"),
      packageCount: quantity(balanced, "q4:rcd:balance:package-count"),
      orderedPiece: quantity(balanced, "q4:rcd:device-order"),
      remainderPiece: quantity(balanced, "q4:rcd:balance:remainder"),
      surplusBeyondReservePiece:
        quantity(balanced, "q4:rcd:balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-24.residual-current-device-installation-balanced-successor.v1",
  stopCode: "S27_24_RESIDUAL_CURRENT_DEVICE_INSTALLATION_BALANCED",
  applicationName: "s27-24-residual-current-device-installation-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "60945859-1504-5fa1-ad29-dc7f1cd64b87",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "364a17bb-3520-51c3-aa7d-6bcc02b6f168",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/residual-current-device-installation-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/residual-current-device-installation-balanced-s27-24.json",
    "src/lib/estimate/v4/residualCurrentDeviceInstallationR1.ts",
    "tests/estimateNorms/residualCurrentDeviceInstallationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724ResidualCurrentDeviceInstallationSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724ResidualCurrentDeviceInstallationIndependent.ts",
  ],
  catalogId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID,
  sourceId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
  normId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID,
  sourceMetadata: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA,
  parameterDefinitions: RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS,
  formulaDefinitions: RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS,
  resourceDefinitions: RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES,
  shortInput: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
  acceptanceInput: RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT,
  runtimeProfileClassification: RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: "S27_24_Q4_RCD_8_EXPLICIT_SELECTED_DEVICES",
  passport: {
    canonicalRuName: "Монтаж выбранного УЗО или RCBO на DIN-рейке",
    workKey: "electrical_interior_rcd_install_standard",
    physicalResultRu:
      "Выбранные проектом устройства дифференциальной защиты установлены на существующей DIN-рейке, подключены, промаркированы, затяжка и предусмотренные программой проверки выполнены",
    includedScopeRu: [
      "монтаж известного количества конкретно выбранных проектом RCCB или RCBO",
      "видимый баланс установленных устройств, резерва, упаковки, заказа и остатка",
      "маркировка, наконечники или клеммные принадлежности и контроль затяжки по проекту и ППР",
      "труд, инструмент и измерение параметров срабатывания по программе приёмки",
      "гребенчатая шина, её заглушки, вспомогательный контакт и дополнительная DIN-рейка только по условным проектным ветвям",
      "доставка и вывоз отходов по проектному плану логистики",
    ],
    excludedScopeRu: [
      "расчёт и выбор дифференциальной защиты", "кабельная линия",
      "отдельный автоматический выключатель",
      "корпус, внутренняя сборка и комплектный распределительный щит",
      "универсальные нормы расхода, производительности или неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_SELECTED_RESIDUAL_CURRENT_DEVICE",
    materialSystem: "EXPLICIT_RCCB_OR_RCBO_EXISTING_DIN_RAIL",
    primaryMeasureParameterId: "rcd_count",
    knownScopeParameters: [
      "rcd_product_designation", "rcd_device_type", "pole_configuration",
      "rated_current_a", "rated_residual_current_ma", "residual_current_type",
      "rated_voltage_v", "mounting_system",
    ],
    visibleProcurementBalance: true,
    protectionSelectionPerformed: false,
    projectCalculationRequired: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    cableLineExcluded: true,
    separateCircuitBreakerExcluded: true,
    completeSwitchboardExcluded: true,
  },
  binding: {
    rowId: "q4:rcd:install",
    applicability: {
      technology_class: "RESIDUAL_CURRENT_DEVICE_INSTALLATION",
      operation_class: "INSTALL_SELECTED_RESIDUAL_CURRENT_DEVICE",
      material_system: "EXPLICIT_RCCB_OR_RCBO_EXISTING_DIN_RAIL",
      scope_mode:
        "KNOWN_SELECTED_DEVICE_PLUS_VISIBLE_PROCUREMENT_BALANCE_AND_PROJECT_RESOURCES",
      source_id: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
      norm_id: RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID,
      exact_locator: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.exact_locator,
      protection_selection_performed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_linear_rates_claimed: false,
      quantity_basis:
        "NET_INSTALLED_DEVICE_COUNT_PLUS_VISIBLE_SPARE_PACKAGING_AND_APPROVED_PROJECT_RESOURCES",
    },
  },
  locator: {
    key: "residual-current-device-eaeu-krerm-project-balance-s27-24-v1",
    payload: {
      kind: "OFFICIAL_PRODUCT_SAFETY_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.exact_locator,
      officialProductSafetyArtifactSha256:
        RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.artifact_sha256,
      officialKrermGuidanceArtifactSha256:
        RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.companion_krerm_sha256,
      officialAcceptanceSnapshotSha256:
        RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.electrical_acceptance_snapshot_sha256,
      visiblePreliminaryBalanceInputs:
        Object.keys(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT),
      directProjectInputs: [
        "selection_basis_reference", "circuit_marker_designation",
        "circuit_marker_quantity_piece", "terminal_accessory_designation",
        "terminal_accessory_quantity_piece", "torque_seal_designation",
        "torque_seal_quantity_set", "rcd_trip_test_designation", "rcd_trip_test_count",
        "rcd_installation_labor_h", "rcd_testing_labor_h",
        "torque_screwdriver_machine_h", "rcd_installation_tool_machine_h",
        "rcd_tester_machine_h", "rcd_delivery_trip_count",
        "rcd_waste_removal_trip_count",
      ],
      conditionalInputs: [
        "comb_bus_mode", "comb_bus_designation", "comb_bus_length_m",
        "comb_bus_end_cap_designation", "comb_bus_end_cap_quantity_piece",
        "auxiliary_contact_mode", "auxiliary_contact_designation",
        "auxiliary_contact_quantity_piece", "din_rail_segment_mode",
        "din_rail_segment_designation", "din_rail_segment_length_m",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж выбранного УЗО или RCBO на DIN-рейке",
    aliases: [
      "установка УЗО", "монтаж УЗО", "установка дифавтомата",
      "RCCB installation", "RCBO installation on DIN rail",
    ],
    shortScopeRu:
      "Монтаж 8 явно выбранных устройств ABB F202 RCCB 2P 40 A 30 mA типа A 230 V на существующей DIN-рейке с видимым балансом закупки; проектные комплектующие, труд, инструмент, тесты и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "rcd_count", "rcd_product_designation", "rcd_device_type", "pole_configuration",
      "rated_current_a", "rated_residual_current_ma", "residual_current_type",
      "rated_voltage_v", "mounting_system",
    ],
    clarificationFields: RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "rcd_count", "rcd_product_designation", "rcd_device_type", "pole_configuration",
        "rated_current_a", "rated_residual_current_ma", "residual_current_type",
        "rated_voltage_v", "mounting_system",
      ].includes(parameterId)),
    includedBoundaries: [
      "явно выбранное УЗО или RCBO и его видимый закупочный баланс",
      "проектные маркировка, оконцевание, контроль затяжки, труд, инструмент и проверки",
      "условные шина, заглушки, вспомогательный контакт и DIN-рейка",
      "логистика по проектному плану",
    ],
    excludedBoundaries: [
      "расчёт и выбор защиты", "кабельная линия", "отдельный автоматический выключатель",
      "корпус и комплектная сборка щита", "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "УЗО RCCB RCBO дифавтомат DIN 2P 40 A 30 mA тип A резерв упаковка заказ остаток маркировка наконечник гребенчатая шина вспомогательный контакт труд инструмент проверка доставка",
    sourceProvenance: {
      officialEaeuProductSafetyCaptured: true,
      officialKrermGuidanceCaptured: true,
      officialKgAcceptanceRulesCaptured: true,
      exactProtectionSelectionRequiredFromProject: true,
      protectionSelectionPerformedByApplication: false,
      visibleProcurementBalance: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /cable.line|кабельн.*лини/iu,
    /circuit.breaker|автоматическ.*выключател/iu,
    /panel.enclosure|корпус.*щит/iu,
    /complete.switchboard|комплектн.*щит/iu,
  ],
  owner: "S27_24_RESIDUAL_CURRENT_DEVICE_INSTALLATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_RESIDUAL_CURRENT_DEVICE_INSTALLATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
