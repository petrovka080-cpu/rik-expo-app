import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS,
  FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES,
  FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA,
  compileFireAlarmCommissioningStandardR1,
} from "../../../src/lib/estimate/v4/fireAlarmCommissioningStandardR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmCommissioningStandardR1({
    ...FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  });
  const complete = await compileFireAlarmCommissioningStandardR1({
    ...FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_system_point_identification"
    && short.rows[0]?.quantity === "100"
    && short.preliminaryNeeds.length === 7)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 8 && complete.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_COMPLETE_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete });
  const actualRows = JSON.stringify(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/(?:loop_)?cable|conduit|детектор|извещатель.*(?:поставка|монтаж)|блок.*питан|оповещател|кот[её]л|радиатор|отоплен/iu
    .test(actualRows)) {
    throw new Error("STOP_S273_F09_FIRE_ALARM_COMMISSIONING_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S273_F09_FIRE_ALARM_COMMISSIONING_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
    },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-fire-alarm-commissioning-standard-successor.v1",
  stopCode: "S273_F09_FIRE_ALARM_COMMISSIONING_STANDARD",
  applicationName: "s27-3-f09-fire-alarm-commissioning-standard-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "969c4312-e2e3-5b51-ab08-d5e778c97d46",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "deab420f-e783-53ca-86df-2c4ba617b290",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/fire-alarm-commissioning-standard-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmCommissioningStandardR1.ts",
    "tests/estimateNorms/fireAlarmCommissioningStandardR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmCommissioningStandardSuccessor.ts",
  ],
  catalogId: FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID,
  sourceId: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
  normId: FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
  sourceMetadata: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS,
  resourceDefinitions: FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES,
  shortInput: FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [8, 8, 8],
  benchmarkOrdinal: 2993,
  validationScenario: "F09_FIRE_ALARM_COMMISSIONING_STANDARD",
  passport: {
    canonicalRuName: "Системная пусконаладка пожарной сигнализации",
    workKey: "electrical_interior_fire_alarm_commission_standard",
    physicalResultRu:
      "Конфигурация пожарной сигнализации проверена по адресам, шлейфам, сценариям и внешним интерфейсам; результаты оформлены протоколами",
    includedScopeRu: [
      "системная идентификация и проверка отображения адресных точек",
      "настройка конфигурации приёмно-контрольных приборов",
      "контроль целостности и неисправностей шлейфов",
      "проверка утверждённых сценариев и внешних интерфейсов",
      "прямые проектные трудозатраты, время тестового оборудования и итоговые протоколы",
    ],
    excludedScopeRu: [
      "монтаж и поставка извещателей и их баз",
      "кабель, трубы, коробки и крепёж",
      "поставка приёмно-контрольного прибора, оповещателей и блоков питания",
      "универсальные нормы труда, времени приборов или количества сценариев",
      "неподтверждённые цены",
    ],
    independentCompletenessMap:
      FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "COMMISSION_FIRE_ALARM_SYSTEM",
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
    officialTechnicalBoundarySource: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
    approvedAddressScheduleRequired: true,
    approvedCauseEffectMatrixRequired: true,
    manufacturerDocumentationRequired: true,
    commissioningProgramRequired: true,
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
      scope_mode: "SYSTEM_LEVEL_COMMISSIONING_WITH_DIRECT_APPROVED_PROJECT_INPUTS",
      source_id: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
      norm_id: FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
      exact_locator: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.artifact_sha256,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "DIRECT_APPROVED_PROJECT_OR_COMMISSIONING_PROGRAM_INPUT",
    },
  },
  locator: {
    key: "sp-kr-21-101-2024-fire-alarm-commissioning-project-inputs-v1",
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      exactLocator: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.artifact_sha256,
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
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Системная пусконаладка пожарной сигнализации",
    aliases: [
      "пусконаладка автоматической пожарной сигнализации",
      "ПНР АПС",
      "настройка пожарной сигнализации",
      "commissioning fire alarm system",
    ],
    shortScopeRu:
      "Системная настройка и проверка адресных точек, приборов, шлейфов, сценариев и интерфейсов по утверждённому проекту и программе ПНР без поставки материалов.",
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
      "настройка приборов и проверка контроля шлейфов",
      "сценарии причинно-следственных связей и внешние интерфейсы",
      "труд, тестовое оборудование и итоговые протоколы по прямым проектным данным",
    ],
    excludedBoundaries: [
      "монтаж и поставка извещателей",
      "кабель, трубы, крепёж и иные монтажные материалы",
      "поставка приёмно-контрольного прибора, оповещателей и блоков питания",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      "АПС ПНР пожарная сигнализация адресная точка шлейф сценарий матрица интерфейс протокол настройка системная проверка",
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:loop_)?cable|кабел/iu,
    /conduit|труб|гофр/iu,
    /detector_(?:install|material)|извещател.*(?:поставка|монтаж)/iu,
    /control_panel_(?:product|material)|поставка.*при[её]мно-контрол/iu,
    /sounder|оповещател|power_supply|блок.*питан/iu,
    /boiler|radiator|heating|кот[её]л|радиатор|отоплен/iu,
  ],
  owner: "S273_F09_FIRE_ALARM_COMMISSIONING_STANDARD_SUCCESSOR",
  receiptFileStem: "S273_F09_FIRE_ALARM_COMMISSIONING_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
