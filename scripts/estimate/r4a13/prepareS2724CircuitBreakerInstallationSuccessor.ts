import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
  CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID,
  CIRCUIT_BREAKER_INSTALLATION_FORMULAS,
  CIRCUIT_BREAKER_INSTALLATION_NORM_ID,
  CIRCUIT_BREAKER_INSTALLATION_PARAMETERS,
  CIRCUIT_BREAKER_INSTALLATION_RESOURCES,
  CIRCUIT_BREAKER_INSTALLATION_RUNTIME_CLASSIFICATION,
  CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT,
  CIRCUIT_BREAKER_INSTALLATION_RUNTIME_SOURCE_IDS,
  CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
  CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
  CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA,
  compileCircuitBreakerInstallationR1,
} from "../../../src/lib/estimate/v4/circuitBreakerInstallationR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileCircuitBreakerInstallationR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const first = await compileCircuitBreakerInstallationR1({
    ...CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
  });
  const complete = await compileCircuitBreakerInstallationR1({
    ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
  });
  const balanced = await compileCircuitBreakerInstallationR1({
    ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
    breaker_retained_spare_piece: 2,
    breaker_supplier_pack_size_piece: 5,
  });
  const conditional = await compileCircuitBreakerInstallationR1({
    ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
    comb_bus_mode: "REQUIRED",
    comb_bus_designation: "Шина 1P 63 A, шаг 18 мм",
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
    && quantity(first, "q4:breaker:install") === "12"
    && quantity(first, "q4:breaker:device-order") === "12"
    && quantity(first, "q4:breaker:balance:package-count") === "12")) {
    throw new Error("STOP_S27_24_BREAKER_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "q4:breaker:selection-basis", "q4:breaker:circuit-marker",
    "q4:breaker:terminal-accessory", "q4:breaker:torque-seal", "q4:breaker:test",
    "q4:breaker:labor:installation", "q4:breaker:labor:testing",
    "q4:breaker:equipment:torque-screwdriver", "q4:breaker:equipment:installation-tool",
    "q4:breaker:equipment:tester", "q4:breaker:logistics:delivery",
    "q4:breaker:logistics:waste-removal", "q4:breaker:conditional:comb-bus",
    "q4:breaker:conditional:comb-bus-end-cap",
    "q4:breaker:conditional:auxiliary-contact",
    "q4:breaker:conditional:din-rail-segment",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_BREAKER_NEED:${rowId}`);
  if (!(complete.rows.length === 20 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "q4:breaker:terminal-accessory") === "24"
    && quantity(complete, "q4:breaker:labor:installation") === "7.2"
    && quantity(complete, "q4:breaker:equipment:tester") === "2.4"
    && quantity(complete, "q4:breaker:logistics:delivery") === "1")) {
    throw new Error("STOP_S27_24_BREAKER_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "q4:breaker:balance:installed-net") === "12"
    && quantity(balanced, "q4:breaker:balance:retained-spare") === "2"
    && quantity(balanced, "q4:breaker:balance:total-need") === "14"
    && quantity(balanced, "q4:breaker:balance:package-count") === "3"
    && quantity(balanced, "q4:breaker:device-order") === "15"
    && quantity(balanced, "q4:breaker:balance:remainder") === "3"
    && quantity(balanced, "q4:breaker:balance:surplus-beyond-reserve") === "1")) {
    throw new Error("STOP_S27_24_BREAKER_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 24 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_BREAKER_CONDITIONAL_PROFILE");
  }
  const ownedRows = CIRCUIT_BREAKER_INSTALLATION_RESOURCES
    .map((row) => `${row.row_id} ${row.title_ru}`).join("\n");
  if (/(?:cable.line|rcd|panel.enclosure|complete.switchboard)/iu.test(ownedRows)) {
    throw new Error("STOP_S27_24_BREAKER_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_CIRCUIT_BREAKER_INSTALLATION_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      selectedDeviceCount: CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT.breaker_count,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "q4:breaker:balance:installed-net"),
      retainedSparePiece: quantity(balanced, "q4:breaker:balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "q4:breaker:balance:total-need"),
      packageCount: quantity(balanced, "q4:breaker:balance:package-count"),
      orderedPiece: quantity(balanced, "q4:breaker:device-order"),
      remainderPiece: quantity(balanced, "q4:breaker:balance:remainder"),
      surplusBeyondReservePiece:
        quantity(balanced, "q4:breaker:balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.circuit-breaker-installation-balanced-successor.v1",
  stopCode: "S27_24_CIRCUIT_BREAKER_INSTALLATION_BALANCED",
  applicationName: "s27-24-circuit-breaker-installation-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d7de4bec-38bc-5dad-a025-4cb3130ac9b1",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "42a17576-0fa1-521d-a9f6-94ffeacdf417",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/circuit-breaker-installation-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/circuit-breaker-installation-balanced-s27-24.json",
    "src/lib/estimate/v4/circuitBreakerInstallationR1.ts",
    "tests/estimateNorms/circuitBreakerInstallationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724CircuitBreakerInstallationSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724CircuitBreakerInstallationIndependent.ts",
  ],
  catalogId: CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID,
  sourceId: CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
  normId: CIRCUIT_BREAKER_INSTALLATION_NORM_ID,
  sourceMetadata: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA,
  parameterDefinitions: CIRCUIT_BREAKER_INSTALLATION_PARAMETERS,
  formulaDefinitions: CIRCUIT_BREAKER_INSTALLATION_FORMULAS,
  resourceDefinitions: CIRCUIT_BREAKER_INSTALLATION_RESOURCES,
  shortInput: CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
  acceptanceInput: CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT,
  runtimeProfileClassification: CIRCUIT_BREAKER_INSTALLATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: CIRCUIT_BREAKER_INSTALLATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: "S27_24_Q4_CIRCUIT_BREAKER_12_EXPLICIT_SELECTED_DEVICES",
  passport: {
    canonicalRuName: "Монтаж выбранного автоматического выключателя на DIN-рейке",
    workKey: "electrical_interior_breaker_install_standard",
    physicalResultRu:
      "Выбранные проектом автоматические выключатели установлены на существующей DIN-рейке, подключены, промаркированы, затяжка и предусмотренные программой проверки выполнены",
    includedScopeRu: [
      "монтаж известного количества конкретно выбранных проектом аппаратов",
      "видимый баланс установленных аппаратов, резерва, упаковки, заказа и остатка",
      "маркировка, наконечники или клеммные принадлежности и контроль затяжки по проекту и ППР",
      "труд, инструмент и проверки по ППР и программе приёмки",
      "гребенчатая шина, её заглушки, вспомогательный контакт и дополнительная DIN-рейка только по условным проектным ветвям",
      "доставка и вывоз отходов по проектному плану логистики",
    ],
    excludedScopeRu: [
      "расчёт и выбор защиты", "кабельная линия", "УЗО или дифавтомат",
      "корпус, внутренняя сборка и комплектный распределительный щит",
      "универсальные нормы расхода, производительности или неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_SELECTED_LOW_VOLTAGE_CIRCUIT_BREAKER",
    materialSystem: "EXPLICIT_DEVICE_EXISTING_DIN_RAIL",
    primaryMeasureParameterId: "breaker_count",
    knownScopeParameters: [
      "breaker_product_designation", "pole_configuration", "trip_curve",
      "rated_current_a", "breaking_capacity_ka", "rated_voltage_v", "mounting_system",
    ],
    visibleProcurementBalance: true,
    protectionSelectionPerformed: false,
    projectCalculationRequired: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    cableLineExcluded: true,
    rcdExcluded: true,
    completeSwitchboardExcluded: true,
  },
  binding: {
    rowId: "q4:breaker:install",
    applicability: {
      technology_class: "CIRCUIT_BREAKER_INSTALLATION",
      operation_class: "INSTALL_SELECTED_LOW_VOLTAGE_CIRCUIT_BREAKER",
      material_system: "EXPLICIT_DEVICE_EXISTING_DIN_RAIL",
      scope_mode: "KNOWN_SELECTED_DEVICE_PLUS_VISIBLE_PROCUREMENT_BALANCE_AND_PROJECT_RESOURCES",
      source_id: CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
      norm_id: CIRCUIT_BREAKER_INSTALLATION_NORM_ID,
      exact_locator: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.exact_locator,
      protection_selection_performed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_linear_rates_claimed: false,
      quantity_basis:
        "NET_INSTALLED_DEVICE_COUNT_PLUS_VISIBLE_SPARE_PACKAGING_AND_APPROVED_PROJECT_RESOURCES",
    },
  },
  locator: {
    key: "circuit-breaker-eaeu-krerm-project-balance-s27-24-v1",
    payload: {
      kind: "OFFICIAL_PRODUCT_SAFETY_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.exact_locator,
      officialProductSafetyArtifactSha256:
        CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.artifact_sha256,
      officialKrermGuidanceArtifactSha256:
        CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.companion_krerm_sha256,
      officialAcceptanceSnapshotSha256:
        CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.electrical_acceptance_snapshot_sha256,
      visiblePreliminaryBalanceInputs:
        Object.keys(CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT),
      directProjectInputs: [
        "selection_basis_reference", "circuit_marker_designation",
        "circuit_marker_quantity_piece", "terminal_accessory_designation",
        "terminal_accessory_quantity_piece", "torque_seal_designation",
        "torque_seal_quantity_set", "breaker_test_designation", "breaker_test_count",
        "breaker_installation_labor_h", "breaker_testing_labor_h",
        "torque_screwdriver_machine_h", "breaker_installation_tool_machine_h",
        "breaker_tester_machine_h", "breaker_delivery_trip_count",
        "breaker_waste_removal_trip_count",
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
    canonicalNameRu: "Монтаж выбранного автоматического выключателя на DIN-рейке",
    aliases: [
      "установка автоматического выключателя", "монтаж группового автомата",
      "монтаж автомата 1P C16", "circuit breaker installation on DIN rail",
    ],
    shortScopeRu:
      "Монтаж 12 явно выбранных автоматических выключателей IEK BA47-29 1P C16 6 kA 230 V на существующей DIN-рейке с видимым балансом закупки; проектные комплектующие, труд, инструмент, тесты и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "breaker_count", "breaker_product_designation", "pole_configuration", "trip_curve",
      "rated_current_a", "breaking_capacity_ka", "rated_voltage_v", "mounting_system",
    ],
    clarificationFields: CIRCUIT_BREAKER_INSTALLATION_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "breaker_count", "breaker_product_designation", "pole_configuration", "trip_curve",
        "rated_current_a", "breaking_capacity_ka", "rated_voltage_v", "mounting_system",
      ].includes(parameterId)),
    includedBoundaries: [
      "явно выбранный автоматический выключатель и его видимый закупочный баланс",
      "проектные маркировка, оконцевание, контроль затяжки, труд, инструмент и проверки",
      "условные шина, заглушки, вспомогательный контакт и DIN-рейка",
      "логистика по проектному плану",
    ],
    excludedBoundaries: [
      "расчёт и выбор защиты", "кабельная линия", "УЗО или дифавтомат",
      "корпус и комплектная сборка щита", "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "автоматический выключатель автомат DIN 1P C16 6 kA 230 V резерв упаковка заказ остаток маркировка наконечник гребенчатая шина вспомогательный контакт труд инструмент проверка доставка",
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
    /\brcd\b|\bузо\b|дифавтомат/iu,
    /panel.enclosure|корпус.*щит/iu,
    /complete.switchboard|комплектн.*щит/iu,
  ],
  owner: "S27_24_CIRCUIT_BREAKER_INSTALLATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_CIRCUIT_BREAKER_INSTALLATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
