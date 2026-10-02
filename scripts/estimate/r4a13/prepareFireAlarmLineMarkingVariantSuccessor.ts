import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
  FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
  FIRE_ALARM_LINE_MARKING_FORMULAS,
  FIRE_ALARM_LINE_MARKING_NORM_ID,
  FIRE_ALARM_LINE_MARKING_PARAMETERS,
  FIRE_ALARM_LINE_MARKING_RESOURCES,
  FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
  FIRE_ALARM_LINE_MARKING_SOURCE_ID,
  FIRE_ALARM_LINE_MARKING_SOURCE_METADATA,
  compileFireAlarmLineMarkingVariantR1,
  fireAlarmLineMarkingCompletenessMap,
  resolveFireAlarmLineMarkingVariant,
  type FireAlarmLineMarkingVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmLineMarkingVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_LINE_MARKING_VARIANT ?? "high_load",
) as FireAlarmLineMarkingVariantKey;
const variant = resolveFireAlarmLineMarkingVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const stopCode = `S273_F09_FIRE_ALARM_LINE_MARKING_${variantToken}`;
const outputStem = variantKey.replace(/_/gu, "-");

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmLineMarkingVariantR1(variantKey, {
    ...FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
  });
  const complete = await compileFireAlarmLineMarkingVariantR1(variantKey, {
    ...FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_mark_objects"
    && short.rows[0]?.quantity === "40"
    && short.preliminaryNeeds.length === 3)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 4
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:fire_alarm_marker_material")?.quantity === "80")) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_LINE_MARKING_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/line_laying|connection_end|device_install|system_commission|boiler|radiator|heating/iu
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
      rows: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    automaticMarkerConsumptionClaimed: false,
    automaticLaborRateClaimed: false,
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-fire-alarm-line-marking-${outputStem}-successor.v1`,
  stopCode,
  applicationName: `s27-3-f09-fire-alarm-line-marking-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "3083fcda-3c0e-5a4b-b11f-cc37905c6934",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "96d4760e-92af-56d7-8b15-ba967da457d9",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-fire-current-lineage/`
      + `fire-alarm-line-marking-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmLineMarkingVariantsR1.ts",
    "tests/estimateNorms/fireAlarmLineMarkingVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmLineMarkingVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
  normId: FIRE_ALARM_LINE_MARKING_NORM_ID,
  sourceMetadata: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_LINE_MARKING_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_LINE_MARKING_FORMULAS,
  resourceDefinitions: FIRE_ALARM_LINE_MARKING_RESOURCES,
  shortInput: FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_LINE_MARKING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_mark_${variantKey}`,
    physicalResultRu:
      "Подтверждённые объекты пожарной сигнализации промаркированы в соответствии с кабельным журналом и схемой маркировки",
    includedScopeRu: [
      "операция маркировки известного количества объектов",
      "материал маркировки и его количество по прямым проектным данным",
      "трудоёмкость и записи контроля по прямым проектным данным",
    ],
    excludedScopeRu: [
      "универсальный расход бирок, краски или труда",
      "прокладка и подключение кабелей",
      "монтаж извещателей, приборов и блоков питания",
      "системная пусконаладка",
      "коэффициент количества или трудоёмкости из классификационного суффикса",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: fireAlarmLineMarkingCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "MARK_FIRE_ALARM_LINE_OBJECTS",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "marked_object_count",
    geometryParameters: ["marked_object_count"],
    classificationParameterId: "marking_scope",
    directProjectParameters: [
      "marker_designation",
      "marker_quantity",
      "marking_labor_man_hour",
      "marking_inspection_record_count",
    ],
    officialTechnicalBoundarySource: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
    officialArtifactSha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
    universalClassificationFactorClaimed: false,
    universalMarkerConsumptionClaimed: false,
    universalLaborRateClaimed: false,
    cableLayingExcluded: true,
    electricalConnectionExcluded: true,
    deviceInstallationExcluded: true,
    systemCommissioningExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_mark_objects",
    applicability: {
      technology_class: "FIRE_ALARM_LINE_MARKING",
      operation_class: "MARK_FIRE_ALARM_LINE_OBJECTS",
      catalog_variant: variant.catalogVariant,
      source_id: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
      norm_id: FIRE_ALARM_LINE_MARKING_NORM_ID,
      exact_locator: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_MARKED_OBJECT_COUNT_AND_DIRECT_APPROVED_PROJECT_INPUTS",
      universal_classification_factor_claimed: false,
      universal_marker_consumption_claimed: false,
      universal_labor_rate_claimed: false,
      adjacent_scope_excluded: true,
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-line-marking-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      clause: "12.60",
      printedPage: 60,
      pdfPage: 168,
      exactLocator: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
      knownScopeInputs: ["marked_object_count", "marking_scope"],
      directProjectInputsRequired: true,
      universalClassificationFactorClaimed: false,
      universalMarkerConsumptionClaimed: false,
      universalLaborRateClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `маркировка кабелей пожарной сигнализации ${variantKey}`,
      `маркировка шлейфов АПС ${variantKey}`,
      `fire alarm line marking ${outputStem}`,
    ],
    shortScopeRu:
      "Маркировка подтверждённого числа объектов пожарной сигнализации; материал, труд и контроль берутся только из кабельного журнала, схемы маркировки и плана контроля.",
    keyDistinguishingParameters: ["marked_object_count", "marking_scope"],
    clarificationFields: [
      "marker_designation",
      "marker_quantity",
      "marking_labor_man_hour",
      "marking_inspection_record_count",
    ],
    includedBoundaries: [
      "маркировка подтверждённых линий, пар, коробок или клемм",
      "проектный материал маркировки",
      "проектная трудоёмкость и контроль",
    ],
    excludedBoundaries: [
      "универсальный расход маркировочных материалов",
      "прокладка и подключение кабеля",
      "монтаж оборудования",
      "системная пусконаладка",
      "скрытый коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС пожарная сигнализация маркировка бирка маркер кабель шлейф пара коробка клемма журнал ${variantKey}`,
    sourceProvenance: {
      officialSpKr211012024Clause1260: true,
      exactOfficialArtifactSha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
      directApprovedProjectInputsRequired: true,
      universalClassificationFactorRejected: true,
      universalMarkerConsumptionRejected: true,
      universalLaborRateRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /line_laying|прокладк.*кабел/iu,
    /connection_end|присоединен.*конц/iu,
    /device_install|монтаж.*извещател/iu,
    /system_commission|системн.*пусконалад/iu,
    /boiler|radiator|heating|кот[её]л|радиатор|отоплен/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
