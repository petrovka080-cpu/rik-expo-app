import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_NORM_ID,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_ID,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA,
  compileFireAlarmCommissioningLargeAreaR1,
} from "../../../src/lib/estimate/v4/fireAlarmCommissioningLargeAreaR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmCommissioningLargeAreaR1({
    ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT,
  });
  const complete = await compileFireAlarmCommissioningLargeAreaR1({
    ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_system_point_identification"
    && short.rows[0]?.quantity === "100"
    && short.preliminaryNeeds.length === 7)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 8 && complete.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA_COMPLETE_FIXTURE");
  }
  const actualRows = JSON.stringify(FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/(?:loop_)?cable|conduit|detector_(?:install|material)|boiler|radiator|heating/iu
    .test(actualRows)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      quantities: complete.rows.map((row) => row.quantity),
    },
    largeAreaFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-fire-alarm-commissioning-large-area-successor.v1",
  stopCode: "S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA",
  applicationName: "s27-3-f09-fire-alarm-commissioning-large-area-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "740bc4ae-ab6a-59ad-aaa2-5907edac4001",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "0cd113ac-488b-504b-93d3-f0b696054ffc",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/fire-alarm-commissioning-large-area-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmCommissioningStandardR1.ts",
    "src/lib/estimate/v4/fireAlarmCommissioningLargeAreaR1.ts",
    "tests/estimateNorms/fireAlarmCommissioningLargeAreaR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmCommissioningLargeAreaSuccessor.ts",
  ],
  catalogId: FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID,
  sourceId: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_ID,
  normId: FIRE_ALARM_COMMISSIONING_LARGE_AREA_NORM_ID,
  sourceMetadata: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS,
  resourceDefinitions: FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES,
  shortInput: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [8, 8, 8],
  benchmarkOrdinal: 0,
  validationScenario: "F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA",
  passport: {
    canonicalRuName: "Системная пусконаладка пожарной сигнализации большой площади",
    workKey: "electrical_interior_fire_alarm_commission_large_area",
    physicalResultRu:
      "Система пожарной сигнализации большой площади проверена по адресам, шлейфам, сценариям и внешним интерфейсам; результаты оформлены протоколами",
    includedScopeRu: [
      "системная идентификация и проверка отображения адресных точек",
      "настройка конфигурации приёмно-контрольных приборов",
      "контроль целостности и неисправностей шлейфов",
      "проверка утверждённых сценариев и внешних интерфейсов",
      "труд, тестовое оборудование и протоколы по прямым проектным данным",
    ],
    excludedScopeRu: [
      "монтаж и поставка извещателей и их баз",
      "кабель, трубы, коробки и крепёж",
      "поставка приборов, оповещателей и блоков питания",
      "коэффициент количества или трудоёмкости только из признака большой площади",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      FIRE_ALARM_COMMISSIONING_LARGE_AREA_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "COMMISSION_FIRE_ALARM_SYSTEM",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY",
    primaryMeasureParameterId: "device_point_count",
    geometryParameters: ["device_point_count"],
    directProjectParameters: [
      "panel_count",
      "loop_count",
      "cause_effect_scenario_count",
      "interface_count",
      "commissioning_labor_man_hour",
      "test_equipment_machine_hour",
      "commissioning_protocol_document_count",
    ],
    officialTechnicalBoundarySource: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_ID,
    approvedAddressScheduleRequired: true,
    approvedCauseEffectMatrixRequired: true,
    manufacturerDocumentationRequired: true,
    commissioningProgramRequired: true,
    universalLargeAreaFactorClaimed: false,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    deviceInstallationExcluded: true,
    materialProcurementExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_system_point_identification",
    applicability: {
      technology_class: "AUTOMATIC_FIRE_ALARM_SYSTEM",
      operation_class: "COMMISSION_FIRE_ALARM_SYSTEM",
      catalog_variant: "LARGE_AREA_SEARCH_IDENTITY",
      scope_mode: "SYSTEM_LEVEL_COMMISSIONING_WITH_DIRECT_APPROVED_PROJECT_INPUTS",
      source_id: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_ID,
      norm_id: FIRE_ALARM_COMMISSIONING_LARGE_AREA_NORM_ID,
      exact_locator: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA.exact_locator,
      official_artifact_sha256:
        FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA.artifact_sha256,
      universal_large_area_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "DIRECT_APPROVED_PROJECT_OR_COMMISSIONING_PROGRAM_INPUT",
    },
  },
  locator: {
    key: "sp-kr-21-101-2024-fire-alarm-commissioning-large-area-project-inputs-v1",
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      catalogVariant: "LARGE_AREA_SEARCH_IDENTITY",
      exactLocator: FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA.exact_locator,
      officialArtifactSha256:
        FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: ["device_point_count"],
      directProjectInputs: [
        "panel_count",
        "loop_count",
        "cause_effect_scenario_count",
        "interface_count",
        "commissioning_labor_man_hour",
        "test_equipment_machine_hour",
        "commissioning_protocol_document_count",
      ],
      universalLargeAreaFactorClaimed: false,
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Системная пусконаладка пожарной сигнализации большой площади",
    aliases: [
      "пусконаладка АПС большой площади",
      "ПНР пожарной сигнализации большого объекта",
      "commissioning large area fire alarm system",
    ],
    shortScopeRu:
      "Системная настройка и проверка адресных точек, приборов, шлейфов, сценариев и интерфейсов по утверждённому проекту без скрытого коэффициента площади и без поставки материалов.",
    keyDistinguishingParameters: ["device_point_count"],
    clarificationFields: [
      "panel_count",
      "loop_count",
      "cause_effect_scenario_count",
      "interface_count",
      "commissioning_labor_man_hour",
      "test_equipment_machine_hour",
      "commissioning_protocol_document_count",
    ],
    includedBoundaries: [
      "системная идентификация адресных точек",
      "настройка приборов и контроль шлейфов",
      "сценарии причинно-следственных связей и внешние интерфейсы",
      "труд, оборудование и протоколы по прямым проектным данным",
    ],
    excludedBoundaries: [
      "монтаж и поставка извещателей",
      "кабель, трубы, крепёж и другие монтажные материалы",
      "поставка приборов, оповещателей и блоков питания",
      "скрытый коэффициент большой площади",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      "АПС ПНР большая площадь пожарная сигнализация адресная точка шлейф сценарий матрица интерфейс протокол системная проверка",
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256:
        FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      universalLargeAreaFactorRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:loop_)?cable|кабел/iu,
    /conduit|труб|гофр/iu,
    /detector_(?:install|material)|извещател.*(?:поставк|монтаж)/iu,
    /control_panel_(?:product|material)|поставка.*при[её]мно-контрол/iu,
    /sounder|оповещател|power_supply|блок.*питан/iu,
    /boiler|radiator|heating|кот[её]л|радиатор|отоплен/iu,
  ],
  owner: "S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA_SUCCESSOR",
  receiptFileStem: "S273_F09_FIRE_ALARM_COMMISSIONING_LARGE_AREA",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
