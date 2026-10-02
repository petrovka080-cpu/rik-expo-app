import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_NORM_ID,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_ID,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA,
  compileFireAlarmCommissioningClassifiedVariantR1,
  fireAlarmCommissioningClassifiedCompletenessMap,
  resolveFireAlarmCommissioningClassifiedVariant,
  type FireAlarmCommissioningClassifiedVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmCommissioningClassifiedVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_COMMISSIONING_VARIANT ?? "small_area",
) as FireAlarmCommissioningClassifiedVariantKey;
const variant = resolveFireAlarmCommissioningClassifiedVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const stopCode = `S273_F09_FIRE_ALARM_COMMISSIONING_${variantToken}`;
const outputStem = variantKey.replace(/_/gu, "-");

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmCommissioningClassifiedVariantR1(variantKey, {
    ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT,
  });
  const complete = await compileFireAlarmCommissioningClassifiedVariantR1(variantKey, {
    ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_system_point_identification"
    && short.rows[0]?.quantity === "100"
    && short.preliminaryNeeds.length === 7)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 8 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/(?:loop_)?cable|conduit|detector_(?:install|material)|boiler|radiator|heating/iu
    .test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
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
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-fire-alarm-commissioning-${outputStem}-successor.v1`,
  stopCode,
  applicationName: `s27-3-f09-fire-alarm-commissioning-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "4254235b-f2cb-5c01-b8bb-1f28bc7b2e4c",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d2c7f1ad-17bf-5ab3-bc1f-dc3a8bb61a5b",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-fire-current-lineage/`
      + `fire-alarm-commissioning-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmCommissioningStandardR1.ts",
    "src/lib/estimate/v4/fireAlarmCommissioningClassifiedVariantsR1.ts",
    "tests/estimateNorms/fireAlarmCommissioningClassifiedVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmCommissioningClassifiedVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_ID,
  normId: FIRE_ALARM_COMMISSIONING_CLASSIFIED_NORM_ID,
  sourceMetadata: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS,
  resourceDefinitions: FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES,
  shortInput: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [8, 8, 8],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_COMMISSIONING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_commission_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: адреса, шлейфы, сценарии и внешние интерфейсы проверены; результаты оформлены протоколами`,
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
      "коэффициент количества или трудоёмкости только из классификационного суффикса",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      fireAlarmCommissioningClassifiedCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "COMMISSION_FIRE_ALARM_SYSTEM",
    catalogVariant: variant.catalogVariant,
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
    officialTechnicalBoundarySource: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_ID,
    approvedAddressScheduleRequired: true,
    approvedCauseEffectMatrixRequired: true,
    manufacturerDocumentationRequired: true,
    commissioningProgramRequired: true,
    universalClassificationFactorClaimed: false,
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
      catalog_variant: variant.catalogVariant,
      scope_mode: "SYSTEM_LEVEL_COMMISSIONING_WITH_DIRECT_APPROVED_PROJECT_INPUTS",
      source_id: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_ID,
      norm_id: FIRE_ALARM_COMMISSIONING_CLASSIFIED_NORM_ID,
      exact_locator: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA.exact_locator,
      official_artifact_sha256:
        FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA.artifact_sha256,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "DIRECT_APPROVED_PROJECT_OR_COMMISSIONING_PROGRAM_INPUT",
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-commissioning-${outputStem}-project-inputs-v1`,
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA.exact_locator,
      officialArtifactSha256:
        FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA.artifact_sha256,
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
      universalClassificationFactorClaimed: false,
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `commissioning fire alarm system ${outputStem}`,
    ],
    shortScopeRu:
      "Системная настройка и проверка адресных точек, приборов, шлейфов, сценариев и интерфейсов по утверждённому проекту без скрытого коэффициента классификации и без поставки материалов.",
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
      "скрытый коэффициент классификационного суффикса",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      `АПС ПНР ${variantKey} пожарная сигнализация адресная точка шлейф сценарий матрица интерфейс протокол системная проверка`,
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256:
        FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      universalClassificationFactorRejected: true,
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
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
