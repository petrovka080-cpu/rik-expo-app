import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CCTV_SYSTEM_ACCEPTANCE_INPUT,
  CCTV_SYSTEM_CATALOG_ID,
  CCTV_SYSTEM_FORMULAS,
  CCTV_SYSTEM_NORM_ID,
  CCTV_SYSTEM_PARAMETERS,
  CCTV_SYSTEM_RESOURCES,
  CCTV_SYSTEM_RUNTIME_CLASSIFICATION,
  CCTV_SYSTEM_RUNTIME_INPUT,
  CCTV_SYSTEM_RUNTIME_SOURCE_IDS,
  CCTV_SYSTEM_SHORT_INPUT,
  CCTV_SYSTEM_SOURCE_ID,
  CCTV_SYSTEM_SOURCE_METADATA,
  compileCctvSystemR1,
} from "../../../src/lib/estimate/v4/cctvSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileCctvSystemR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  video_analytics_mode: "REQUIRED",
  video_analytics_license_designation: "Лицензия аналитики по проекту",
  video_analytics_license_quantity_piece: 16,
  external_integration_mode: "REQUIRED",
  external_integration_gateway_designation: "Шлюз интеграции по архитектуре",
  external_integration_gateway_quantity_piece: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileCctvSystemR1({ ...CCTV_SYSTEM_SHORT_INPUT });
  const complete = await compileCctvSystemR1({ ...CCTV_SYSTEM_ACCEPTANCE_INPUT });
  const balanced = await compileCctvSystemR1({
    ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
    cctv_camera_retained_spare_piece: 2,
    cctv_camera_supplier_pack_size_piece: 10,
  });
  const conditional = await compileCctvSystemR1({
    ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 22
    && quantity(first, "rc09:cctv_system_install_commission") === "1"
    && quantity(first, "rc09:cctv_ip_camera") === "16"
    && quantity(first, "rc09:cctv_nvr") === "1"
    && quantity(first, "rc09:cctv_camera_test") === "16")) {
    throw new Error("STOP_S27_24_CCTV_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:cctv_camera_mounting_bracket", "rc09:cctv_camera_junction_box",
    "rc09:cctv_network_cable", "rc09:cctv_patch_panel", "rc09:cctv_poe_switch",
    "rc09:cctv_storage_drive", "rc09:cctv_monitor", "rc09:cctv_termination",
    "rc09:cctv_label", "rc09:cctv_fastening", "rc09:cctv_consumable",
    "rc09:cctv_grounding_conductor", "rc09:cctv_test_report",
    "rc09:labor:cctv-camera-equipment-install",
    "rc09:labor:cctv-cabling-termination",
    "rc09:labor:cctv-configuration-commissioning",
    "rc09:equipment:cctv-lifting", "rc09:equipment:cctv-network-tester",
    "rc09:logistics:cctv-delivery", "rc09:logistics:cctv-packaging-removal",
    "rc09:cctv_video_analytics_license", "rc09:cctv_external_integration_gateway",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_CCTV_NEED:${rowId}`);
  if (!(complete.rows.length === 31 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:cctv_camera_mounting_bracket") === "16"
    && quantity(complete, "rc09:cctv_camera_junction_box") === "16"
    && quantity(complete, "rc09:cctv_network_cable") === "720"
    && quantity(complete, "rc09:cctv_poe_switch") === "1"
    && quantity(complete, "rc09:cctv_storage_drive") === "4"
    && quantity(complete, "rc09:cctv_termination") === "32"
    && quantity(complete, "rc09:labor:cctv-cabling-termination") === "96"
    && quantity(complete, "rc09:equipment:cctv-network-tester") === "20"
    && quantity(complete, "rc09:logistics:cctv-delivery") === "2")) {
    throw new Error("STOP_S27_24_CCTV_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:cctv-camera-balance:installed-net") === "16"
    && quantity(balanced, "rc09:cctv-camera-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:cctv-camera-balance:total-need") === "18"
    && quantity(balanced, "rc09:cctv-camera-balance:package-count") === "2"
    && quantity(balanced, "rc09:cctv_ip_camera") === "20"
    && quantity(balanced, "rc09:cctv-camera-balance:remainder") === "4"
    && quantity(balanced, "rc09:cctv-camera-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_CCTV_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 33 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_CCTV_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:cctv_system_install_commission", "rc09:cctv_camera_test",
    "rc09:cctv_camera_register", "rc09:cctv_test_report",
  ]) {
    const graph = CCTV_SYSTEM_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_CCTV_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/access.control.system|fire.alarm.system|general.lan|general.ups/iu.test(serialized)) {
    throw new Error("STOP_S27_24_CCTV_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_CCTV_SYSTEM_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: CCTV_SYSTEM_SHORT_INPUT,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:cctv-camera-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:cctv-camera-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:cctv-camera-balance:total-need"),
      packageCount: quantity(balanced, "rc09:cctv-camera-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:cctv_ip_camera"),
      remainderPiece: quantity(balanced, "rc09:cctv-camera-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:cctv-camera-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.cctv-system-balanced-successor.v1",
  stopCode: "S27_24_CCTV_SYSTEM_BALANCED",
  applicationName: "s27-24-cctv-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "1851b879-c617-51a8-a7f9-94a963d77e5f",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "fd479bc1-f72e-5a80-84ca-3f3c9db09f73",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/cctv-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/cctv-system-balanced-s27-24.json",
    "src/lib/estimate/v4/cctvSystemR1.ts",
    "tests/estimateNorms/cctvSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724CctvSystemBalancedIndependent.ts",
  ],
  catalogId: CCTV_SYSTEM_CATALOG_ID,
  sourceId: CCTV_SYSTEM_SOURCE_ID,
  normId: CCTV_SYSTEM_NORM_ID,
  sourceMetadata: CCTV_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: CCTV_SYSTEM_PARAMETERS,
  formulaDefinitions: CCTV_SYSTEM_FORMULAS,
  resourceDefinitions: CCTV_SYSTEM_RESOURCES,
  shortInput: CCTV_SYSTEM_SHORT_INPUT,
  acceptanceInput: CCTV_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: CCTV_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: CCTV_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: CCTV_SYSTEM_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 32,
  validationScenario: "Q4_CCTV_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка системы видеонаблюдения CCTV",
    workKey: "CCTV_system",
    physicalResultRu: "Система CCTV с 16 PoE IP-камерами CAM-IP-4MP-IR, NVR-32CH и архивом 30 суток смонтирована, настроена и проверена",
    includedScopeRu: [
      "PoE IP-камеры, кронштейны и монтажные коробки по проекту",
      "NVR, диски архива, PoE-коммутатор, патч-панель и монитор",
      "сетевые кабели, окончания, маркировка, крепёж, расходники и заземление",
      "труд монтажа, кабельных работ, настройки и пусконаладки",
      "подъёмное средство, сетевой тестер, инженерная станция и логистика",
      "проверка изображения, записи, архива, исполнительный реестр и протокол",
      "аналитика и внешняя интеграция только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "СКУД и оборудование пожарной сигнализации",
      "общая LAN, серверная инфраструктура и общая UPS",
      "аналитика и интеграция без явной проектной ветви",
      "расчёт камер, трасс или архива только по площади",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "CCTV_SYSTEM_INSTALLATION_AND_COMMISSIONING",
    cctvSystem: "POE_IP_CAMERA_NVR_EXPLICIT_LAYOUT_AND_ARCHIVE",
    primaryMeasureParameterId: "cctv_system_count",
    knownScopeParameters: [
      "cctv_camera_count", "cctv_camera_designation", "cctv_camera_type",
      "cctv_nvr_count", "cctv_nvr_designation", "cctv_archive_retention_days",
    ],
    visibleProcurementBalance: true,
    projectLayoutArchiveNetworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    floorAreaDerivedQuantitiesForbidden: true,
    adjacentSecurityAndInfrastructureSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:cctv_system_install_commission",
    applicability: {
      technology_class: "VIDEO_SURVEILLANCE_AND_SECURITY",
      operation_class: "CCTV_SYSTEM_INSTALLATION_AND_COMMISSIONING",
      cctv_system: "POE_IP_CAMERA_NVR_EXPLICIT_LAYOUT_AND_ARCHIVE",
      scope_mode: "KNOWN_CCTV_CAMERA_NVR_ARCHIVE_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: CCTV_SYSTEM_SOURCE_ID,
      norm_id: CCTV_SYSTEM_NORM_ID,
      exact_locator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_CAMERA_NVR_ARCHIVE_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "cctv-system-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
      sourcePackSha256: CCTV_SYSTEM_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
        "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
        "cctv_archive_retention_days",
      ],
      visiblePreliminaryBalanceInputs: Object.keys(CCTV_SYSTEM_RUNTIME_INPUT),
      directProjectInputs: CCTV_SYSTEM_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          ...Object.keys(CCTV_SYSTEM_SHORT_INPUT),
          "video_analytics_mode", "video_analytics_license_designation",
          "video_analytics_license_quantity_piece", "external_integration_mode",
          "external_integration_gateway_designation",
          "external_integration_gateway_quantity_piece",
        ].includes(parameterId)),
      conditionalInputs: [
        "video_analytics_mode", "video_analytics_license_designation",
        "video_analytics_license_quantity_piece", "external_integration_mode",
        "external_integration_gateway_designation",
        "external_integration_gateway_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Монтаж и пусконаладка системы видеонаблюдения CCTV",
    aliases: [
      "монтаж системы CCTV",
      "установка IP камер видеонаблюдения",
      "монтаж PoE камер и NVR",
      "CCTV system installation commissioning",
    ],
    shortScopeRu: "Одна CCTV: 16 PoE IP-камер CAM-IP-4MP-IR, NVR-32CH и архив 30 суток; проектные материалы, труд, механизмы, ПНР и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
      "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
      "cctv_archive_retention_days",
    ],
    clarificationFields: CCTV_SYSTEM_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => !Object.hasOwn(CCTV_SYSTEM_SHORT_INPUT, parameterId)),
    includedBoundaries: [
      "камеры, кронштейны, NVR, архивное и сетевое оборудование CCTV",
      "кабели, окончания, маркировка, крепёж, расходники и заземление",
      "труд, подъём, тестирование, настройка, ПНР и логистика",
      "видимый закупочный баланс камер",
      "условные аналитика и интеграция только по проекту",
    ],
    excludedBoundaries: [
      "СКУД, пожарная сигнализация, общая LAN, серверная и общая UPS",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённые лицензии, интеграции и цены",
    ],
    extraSearchTermsRu: "CCTV видеонаблюдение IP PoE камера NVR архив диск коммутатор кабель окончание маркировка крепёж настройка ПНР",
    sourceProvenance: {
      exactExpandedCctvOwner: true,
      knownSystemCameraNvrArchive: true,
      visibleIndependentCameraProcurementBalance: true,
      exactProjectLayoutArchiveNetworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /access.control.system|скуд/iu,
    /fire.alarm.system|пожарн.*сигнализац/iu,
    /general.lan|общ.*lan/iu,
    /general.ups|общ.*ups/iu,
  ],
  owner: "S27_24_CCTV_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_CCTV_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
