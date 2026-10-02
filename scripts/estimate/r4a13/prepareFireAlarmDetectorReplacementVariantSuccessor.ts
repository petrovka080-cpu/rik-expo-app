import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
  FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS,
  FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID,
  FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS,
  FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES,
  FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
  FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
  FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA,
  compileFireAlarmDetectorReplacementVariantR1,
  fireAlarmDetectorReplacementCompletenessMap,
  resolveFireAlarmDetectorReplacementVariant,
  type FireAlarmDetectorReplacementVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmDetectorReplacementVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown;
  searchReleaseId?: unknown;
};
const variantKey = String(
  process.env.S276_F09_FIRE_ALARM_REPLACEMENT_VARIANT ?? "high_load",
) as FireAlarmDetectorReplacementVariantKey;
const variant = resolveFireAlarmDetectorReplacementVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S276_F09_FIRE_ALARM_DETECTOR_REPLACEMENT_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmDetectorReplacementVariantR1(variantKey, {
    ...FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
  });
  const complete = await compileFireAlarmDetectorReplacementVariantR1(variantKey, {
    ...FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 3
    && short.rows.every((row) => row.quantity === "25")
    && short.preliminaryNeeds.length === 6)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 14 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(
    FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })),
  );
  if (/loop_cable|control_panel|sounder|power_supply|full_fire_alarm_system/iu
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
    automaticWasteFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-6.f09-fire-alarm-detector-replacement-${outputStem}-successor.v1`,
  stopCode,
  applicationName:
    `s27-6-f09-fire-alarm-detector-replacement-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (42).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "223a3809cd2c861685ead3d1e701f7150572333a069f334c14f21f69541401d3",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? requiredPointer(currentRelease.definitionReleaseId, "DEFINITION_RELEASE_ID"),
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? requiredPointer(currentRelease.searchReleaseId, "SEARCH_RELEASE_ID"),
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-6/f09-fire-current-lineage/`
      + `fire-alarm-detector-replacement-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmDetectorReplacementVariantsR1.ts",
    "tests/estimateNorms/fireAlarmDetectorReplacementVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmDetectorReplacementVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
  normId: FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID,
  sourceMetadata: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS,
  resourceDefinitions: FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES,
  shortInput: FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_DETECTOR_REPLACEMENT_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_replace_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: неисправные устройства сняты, совместимые устройства установлены, адресация и срабатывание проверены, снятые устройства переданы по утверждённому решению`,
    includedScopeRu: [
      "новый совместимый адресный извещатель и новая адресная метка по подтверждённому количеству замен",
      "труд безопасного отключения, демонтажа, монтажа, восстановления адресации и проверки только по прямым данным проекта и ППР",
      "новая база и огнестойкий крепёж только по явным условным ветвям",
      "тестовый аэрозоль, устройство подачи и протоколы только по утверждённой программе проверки",
      "возврат снятых устройств собственнику либо тара, масса, перевозка и документы электронных отходов по выбранной ветви",
    ],
    excludedScopeRu: [
      "автоматическая норма труда, аэрозоля, крепежа, тары, массы или перевозки",
      "кабель шлейфа, приёмно-контрольный прибор, оповещатели и блоки питания",
      "полная система пожарной сигнализации и общесистемная пусконаладка",
      "скрытый коэффициент площади, нагрузки, влажности или классификационного суффикса",
      "неподтверждённые цены",
    ],
    independentCompletenessMap:
      fireAlarmDetectorReplacementCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "REPLACE_ADDRESSABLE_FIRE_ALARM_DETECTOR",
    catalogVariant: variant.catalogVariant,
    detectorSystem: "ADDRESSABLE_FIRE_ALARM_WITH_COMPATIBLE_REPLACEMENT_DEVICE",
    primaryMeasureParameterId: "replacement_device_count",
    knownScopeParameters: [
      "replacement_device_count",
      "existing_detector_designation",
      "new_detector_designation",
    ],
    directProjectParameters: FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "replacement_device_count",
        "existing_detector_designation",
        "new_detector_designation",
      ].includes(parameterId)),
    officialTechnicalBoundarySource:
      FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
    approvedDefectAndReplacementStatementRequired: true,
    approvedMethodAndTestProgramRequired: true,
    removedDeviceDecisionRequired: true,
    universalClassificationFactorClaimed: false,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    automaticWasteFactorClaimed: false,
    loopCableExcluded: true,
    controlPanelExcluded: true,
    sounderAndPowerExcluded: true,
    fullFireAlarmSystemExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_replacement_new_detector",
    applicability: {
      technology_class: "ADDRESSABLE_FIRE_ALARM_DETECTOR_REPLACEMENT",
      operation_class: "REPLACE_ADDRESSABLE_FIRE_ALARM_DETECTOR",
      catalog_variant: variant.catalogVariant,
      detector_system: "ADDRESSABLE_FIRE_ALARM_WITH_COMPATIBLE_REPLACEMENT_DEVICE",
      scope_mode:
        "KNOWN_REPLACEMENT_COUNT_PLUS_DIRECT_PROJECT_METHOD_QA_AND_REMOVED_DEVICE_INPUTS",
      source_id: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
      norm_id: FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID,
      exact_locator:
        FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.exact_locator,
      official_artifact_sha256:
        FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.artifact_sha256,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      automatic_waste_factor_claimed: false,
      quantity_basis:
        "KNOWN_REPLACEMENT_COUNT_OR_DIRECT_APPROVED_PROJECT_METHOD_QA_OR_WASTE_INPUT",
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-detector-replacement-${outputStem}-v1`,
    payload: {
      kind:
        "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_DIRECT_REPLACEMENT_PROJECT_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator:
        FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.exact_locator,
      officialArtifactSha256:
        FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "replacement_device_count",
        "existing_detector_designation",
        "new_detector_designation",
      ],
      directProjectInputs: FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          "replacement_device_count",
          "existing_detector_designation",
          "new_detector_designation",
        ].includes(parameterId)),
      universalClassificationFactorClaimed: false,
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
      automaticWasteFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `addressable fire alarm detector replacement ${outputStem}`,
    ],
    shortScopeRu:
      "Замена подтверждённого числа адресных пожарных извещателей с явным демонтажом, монтажом, восстановлением адресации, проверкой и решением по снятым устройствам.",
    keyDistinguishingParameters: [
      "replacement_device_count",
      "existing_detector_designation",
      "new_detector_designation",
    ],
    clarificationFields: FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "replacement_device_count",
        "existing_detector_designation",
        "new_detector_designation",
      ].includes(parameterId)),
    includedBoundaries: [
      "совместимый новый извещатель и адресная метка по числу замен",
      "демонтаж, монтаж, адресация и проверка по прямой трудоёмкости",
      "условные база и огнестойкий крепёж",
      "аэрозоль, устройство подачи и протоколы проверки",
      "возврат снятых устройств либо обращение с электронными отходами",
    ],
    excludedBoundaries: [
      "кабель шлейфа, приёмно-контрольный прибор, оповещатели и питание",
      "полная система АПС и общесистемная пусконаладка",
      "автоматические нормы труда, расхода и отходов",
      "коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС замена адресный пожарный извещатель демонтаж монтаж адресация аэрозоль протокол электронные отходы ${variantKey}`,
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256:
        FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.artifact_sha256,
      directApprovedReplacementInputsRequired: true,
      universalClassificationFactorRejected: true,
      universalRatesRejected: true,
      automaticWasteFactorRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /loop_cable|кабел.*шлейф/iu,
    /control_panel|при[её]мн.*контрол.*прибор/iu,
    /sounder|оповещател/iu,
    /power_supply|блок.*питан/iu,
    /full_fire_alarm_system|полн.*систем.*пожарн.*сигнал/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
