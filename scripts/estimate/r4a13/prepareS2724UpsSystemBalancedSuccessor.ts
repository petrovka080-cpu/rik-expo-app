import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  UPS_SYSTEM_ACCEPTANCE_INPUT,
  UPS_SYSTEM_CATALOG_ID,
  UPS_SYSTEM_FORMULAS,
  UPS_SYSTEM_NORM_ID,
  UPS_SYSTEM_PARAMETERS,
  UPS_SYSTEM_RESOURCES,
  UPS_SYSTEM_RUNTIME_CLASSIFICATION,
  UPS_SYSTEM_RUNTIME_INPUT,
  UPS_SYSTEM_RUNTIME_SOURCE_IDS,
  UPS_SYSTEM_SHORT_INPUT,
  UPS_SYSTEM_SOURCE_ID,
  UPS_SYSTEM_SOURCE_METADATA,
  compileUpsSystemR1,
} from "../../../src/lib/estimate/v4/upsSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileUpsSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  external_battery_cabinet_mode: "REQUIRED",
  external_battery_cabinet_designation: "Внешний батарейный шкаф по компоновке",
  external_battery_cabinet_quantity_piece: 2,
  ups_monitoring_mode: "REQUIRED",
  ups_monitoring_gateway_designation: "Карта SNMP по архитектуре мониторинга",
  ups_monitoring_gateway_quantity_piece: 2,
});

async function verifyCore(): Promise<Json> {
  const first = await compileUpsSystemR1({ ...UPS_SYSTEM_SHORT_INPUT });
  const complete = await compileUpsSystemR1({ ...UPS_SYSTEM_ACCEPTANCE_INPUT });
  const balanced = await compileUpsSystemR1({
    ...UPS_SYSTEM_ACCEPTANCE_INPUT,
    ups_unit_retained_spare_piece: 1,
    ups_unit_supplier_pack_size_piece: 2,
  });
  const conditional = await compileUpsSystemR1({
    ...UPS_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 10 && first.preliminaryNeeds.length === 22
    && quantity(first, "rc09:ups_system_install_commission") === "1"
    && quantity(first, "rc09:ups_unit") === "2"
    && quantity(first, "rc09:ups_acceptance_test") === "2")) {
    throw new Error("STOP_S27_24_UPS_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:ups_input_protection", "rc09:ups_output_panel",
    "rc09:ups_maintenance_bypass", "rc09:ups_input_cable", "rc09:ups_output_cable",
    "rc09:ups_battery_cable", "rc09:ups_battery_module", "rc09:ups_termination",
    "rc09:ups_label", "rc09:ups_fastening", "rc09:ups_consumable",
    "rc09:ups_grounding_conductor", "rc09:ups_test_report",
    "rc09:labor:ups-equipment-install", "rc09:labor:ups-cabling-termination",
    "rc09:labor:ups-configuration-commissioning", "rc09:equipment:ups-handling",
    "rc09:equipment:ups-load-battery-tester", "rc09:logistics:ups-delivery",
    "rc09:logistics:ups-packaging-removal", "rc09:ups_external_battery_cabinet",
    "rc09:ups_monitoring_gateway",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_UPS_NEED:${rowId}`);
  if (!(complete.rows.length === 30 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:ups_input_protection") === "2"
    && quantity(complete, "rc09:ups_output_panel") === "1"
    && quantity(complete, "rc09:ups_maintenance_bypass") === "2"
    && quantity(complete, "rc09:ups_input_cable") === "120"
    && quantity(complete, "rc09:ups_output_cable") === "180"
    && quantity(complete, "rc09:ups_battery_cable") === "80"
    && quantity(complete, "rc09:ups_battery_module") === "16"
    && quantity(complete, "rc09:ups_termination") === "48"
    && quantity(complete, "rc09:labor:ups-cabling-termination") === "72"
    && quantity(complete, "rc09:equipment:ups-load-battery-tester") === "20"
    && quantity(complete, "rc09:logistics:ups-delivery") === "2")) {
    throw new Error("STOP_S27_24_UPS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:ups-unit-balance:installed-net") === "2"
    && quantity(balanced, "rc09:ups-unit-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:ups-unit-balance:total-need") === "3"
    && quantity(balanced, "rc09:ups-unit-balance:package-count") === "2"
    && quantity(balanced, "rc09:ups_unit") === "4"
    && quantity(balanced, "rc09:ups-unit-balance:remainder") === "2"
    && quantity(balanced, "rc09:ups-unit-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_UPS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 32 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_UPS_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:ups_system_install_commission", "rc09:ups_acceptance_test",
    "rc09:ups_protocol_register", "rc09:ups_test_report",
  ]) {
    const graph = UPS_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_UPS_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/downstream.loads|general.distribution|generator.system|low.voltage.system/iu
    .test(serialized)) throw new Error("STOP_S27_24_UPS_ADJACENT_SCOPE");
  return {
    status: "GREEN_S27_24_UPS_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: UPS_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:ups-unit-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:ups-unit-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:ups-unit-balance:total-need"),
      packageCount: quantity(balanced, "rc09:ups-unit-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:ups_unit"),
      remainderPiece: quantity(balanced, "rc09:ups-unit-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:ups-unit-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.ups-system-balanced-successor.v1",
  stopCode: "S27_24_UPS_SYSTEM_BALANCED",
  applicationName: "s27-24-ups-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "3e48e562-6ea0-51b7-92ca-dcb787979f35",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "61512954-e71a-5778-94df-e6ba77aa6be1",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/ups-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/ups-system-balanced-s27-24.json",
    "src/lib/estimate/v4/upsSystemR1.ts",
    "tests/estimateNorms/upsSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724UpsSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724UpsSystemBalancedIndependent.ts",
  ],
  catalogId: UPS_SYSTEM_CATALOG_ID,
  sourceId: UPS_SYSTEM_SOURCE_ID,
  normId: UPS_SYSTEM_NORM_ID,
  sourceMetadata: UPS_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: UPS_SYSTEM_PARAMETERS,
  formulaDefinitions: UPS_SYSTEM_FORMULAS,
  resourceDefinitions: UPS_SYSTEM_RESOURCES,
  shortInput: UPS_SYSTEM_SHORT_INPUT,
  acceptanceInput: UPS_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: UPS_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: UPS_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: UPS_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 34,
  validationScenario: "Q4_UPS_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы бесперебойного электропитания",
    workKey: "UPS_system",
    physicalResultRu: "Система из двух online UPS UPS-20KVA-3P по 20 кВА с расчётной автономией 30 минут смонтирована, подключена и проверена",
    includedScopeRu: [
      "выбранные UPS и батарейные модули по расчёту нагрузки и автономии",
      "вводная защита, выходной щит и сервисный байпас по однолинейной схеме",
      "вводные, выходные и батарейные кабели, окончания и маркировка",
      "крепёж, расходники и защитное заземление",
      "труд монтажа, кабельных работ, настройки и пусконаладки",
      "такелаж, нагрузочный и батарейный тестер, протоколы и логистика",
      "внешние батарейные шкафы и мониторинг только по условным ветвям",
    ],
    excludedScopeRu: [
      "конечные нагрузки и общее распределение здания",
      "генераторные установки и другие слаботочные системы",
      "автоматический выбор мощности, батарей, защиты, байпаса или мониторинга",
      "расчёт оборудования и трасс только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "UPS_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    upsSystem: "ONLINE_UPS_EXPLICIT_POWER_AUTONOMY_AND_SINGLE_LINE",
    primaryMeasureParameterId: "ups_system_count",
    knownScopeParameters: [
      "ups_unit_count", "ups_unit_designation", "ups_topology",
      "ups_rated_power_kva", "ups_autonomy_min",
    ],
    visibleProcurementBalance: true,
    projectLoadBatteryProtectionCableMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentDistributionGenerationAndLowVoltageSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:ups_system_install_commission",
    applicability: {
      technology_class: "UNINTERRUPTIBLE_POWER_SUPPLY",
      operation_class: "UPS_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      ups_system: "ONLINE_UPS_EXPLICIT_POWER_AUTONOMY_AND_SINGLE_LINE",
      scope_mode: "KNOWN_UPS_IDENTITY_POWER_AUTONOMY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: UPS_SYSTEM_SOURCE_ID,
      norm_id: UPS_SYSTEM_NORM_ID,
      exact_locator: UPS_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_UPS_TOPOLOGY_POWER_AUTONOMY_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "ups-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: UPS_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: UPS_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "ups_system_count", "ups_unit_count", "ups_unit_designation",
        "ups_topology", "ups_rated_power_kva", "ups_autonomy_min",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(UPS_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: UPS_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(UPS_SYSTEM_SHORT_INPUT),
          "external_battery_cabinet_mode", "external_battery_cabinet_designation",
          "external_battery_cabinet_quantity_piece", "ups_monitoring_mode",
          "ups_monitoring_gateway_designation", "ups_monitoring_gateway_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "external_battery_cabinet_mode", "external_battery_cabinet_designation",
        "external_battery_cabinet_quantity_piece", "ups_monitoring_mode",
        "ups_monitoring_gateway_designation", "ups_monitoring_gateway_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы бесперебойного электропитания",
    aliases: [
      "монтаж системы UPS",
      "установка источников бесперебойного питания",
      "монтаж ИБП и батарей",
      "UPS system installation commissioning",
    ],
    shortScopeRu: "Одна UPS-система: 2 online UPS UPS-20KVA-3P по 20 кВА, автономия 30 минут; батареи, защита, кабели, труд, механизмы и ПНР уточняются по проекту.",
    keyDistinguishingParameters: [
      "ups_system_count", "ups_unit_count", "ups_unit_designation",
      "ups_topology", "ups_rated_power_kva", "ups_autonomy_min",
    ],
    clarificationFields: UPS_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(UPS_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "UPS, батареи, вводная защита, выходной щит и сервисный байпас",
      "силовые и батарейные кабели, окончания, маркировка, крепёж и расходники",
      "труд, такелаж, тестирование, ПНР и логистика",
      "видимый закупочный баланс UPS",
      "условные батарейные шкафы и мониторинг только по проекту",
    ],
    excludedBoundaries: [
      "конечные нагрузки, общее распределение, генераторы и прочие слаботочные системы",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые батареи, защита, мониторинг и цены",
    ],
    extraSearchTermsRu: "UPS ИБП бесперебойное питание online double conversion кВА автономия батарея байпас кабель нагрузочный тест ПНР",
    sourceProvenance: {
      exactExpandedUpsOwner: true,
      knownSystemUpsTopologyPowerAndAutonomy: true,
      visibleIndependentUpsProcurementBalance: true,
      exactProjectLoadBatteryProtectionCableMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /downstream.loads|конечн.*нагруз/iu,
    /general.distribution|общ.*распределен/iu,
    /generator.system|генераторн.*установ/iu,
    /low.voltage.system|проч.*слаботоч/iu,
  ],
  owner: "S27_24_UPS_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_UPS_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
