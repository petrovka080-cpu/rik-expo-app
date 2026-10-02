import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
  FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS,
  FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID,
  FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS,
  FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES,
  FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
  FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
  FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA,
  compileFireAlarmFunctionalTestVariantR1,
  fireAlarmFunctionalTestCompletenessMap,
  resolveFireAlarmFunctionalTestVariant,
  type FireAlarmFunctionalTestVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmFunctionalTestVariantsR1";
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
  process.env.S276_F09_FIRE_ALARM_FUNCTIONAL_TEST_VARIANT ?? "high_load",
) as FireAlarmFunctionalTestVariantKey;
const variant = resolveFireAlarmFunctionalTestVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S276_F09_FIRE_ALARM_FUNCTIONAL_TEST_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmFunctionalTestVariantR1(variantKey, {
    ...FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
  });
  const complete = await compileFireAlarmFunctionalTestVariantR1(variantKey, {
    ...FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_detector_functional_test"
    && short.rows[0]?.quantity === "100"
    && short.preliminaryNeeds.length === 10)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 11 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/detector_install|detector_replacement|panel_configuration|loop_cable|device_procurement/iu
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
    automaticSystemCountApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-6.f09-fire-alarm-functional-test-${outputStem}-successor.v1`,
  stopCode,
  applicationName:
    `s27-6-f09-fire-alarm-functional-test-${outputStem}-successor`,
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
      + `fire-alarm-functional-test-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmFunctionalTestVariantsR1.ts",
    "tests/estimateNorms/fireAlarmFunctionalTestVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmFunctionalTestVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
  normId: FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID,
  sourceMetadata: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS,
  resourceDefinitions: FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES,
  shortInput: FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_FUNCTIONAL_TEST_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_test_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: предусмотренные программой точки, цепи, интерфейсы и резервное питание проверены, результаты и дефекты оформлены документально`,
    includedScopeRu: [
      "функциональные проверки извещателей по подтверждённому количеству",
      "ручные извещатели, контроль неисправности шлейфов, передача тревоги, внешние интерфейсы и резервное питание только по прямым количествам программы проверки",
      "труд специалистов только по утверждённому плану проверки",
      "тестовый аэрозоль и оборудование только по утверждённой методике",
      "протоколы и реестры дефектов по прямому количеству",
    ],
    excludedScopeRu: [
      "монтаж, замена и закупка устройств системы",
      "конфигурирование приёмно-контрольного прибора и общесистемная пусконаладка",
      "автоматический пересчёт числа извещателей в другие виды испытаний, труд, расход или документы",
      "скрытый коэффициент площади, нагрузки, влажности или классификационного суффикса",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      fireAlarmFunctionalTestCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "FUNCTIONALLY_TEST_EXISTING_FIRE_ALARM",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "detector_test_count",
    knownScopeParameters: ["detector_test_count"],
    directTestProgramParameters: FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => parameterId !== "detector_test_count"),
    officialTechnicalBoundarySource: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
    approvedFunctionalTestProgramRequired: true,
    actualSystemConfigurationRequired: true,
    universalClassificationFactorClaimed: false,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    automaticSystemCountClaimed: false,
    installationExcluded: true,
    replacementExcluded: true,
    configurationExcluded: true,
    commissioningExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_detector_functional_test",
    applicability: {
      technology_class: "EXISTING_FIRE_ALARM_FUNCTIONAL_TEST",
      operation_class: "FUNCTIONALLY_TEST_EXISTING_FIRE_ALARM",
      catalog_variant: variant.catalogVariant,
      scope_mode:
        "KNOWN_DETECTOR_TEST_COUNT_PLUS_DIRECT_APPROVED_FUNCTIONAL_TEST_PROGRAM_INPUTS",
      source_id: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
      norm_id: FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID,
      exact_locator: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.exact_locator,
      official_artifact_sha256:
        FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.artifact_sha256,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      automatic_system_count_claimed: false,
      quantity_basis:
        "KNOWN_DETECTOR_TEST_COUNT_OR_DIRECT_APPROVED_FUNCTIONAL_TEST_PROGRAM_INPUT",
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-functional-test-${outputStem}-v1`,
    payload: {
      kind:
        "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_DIRECT_FUNCTIONAL_TEST_PROGRAM_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.exact_locator,
      officialArtifactSha256:
        FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: ["detector_test_count"],
      directTestProgramInputs: FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => parameterId !== "detector_test_count"),
      universalClassificationFactorClaimed: false,
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
      automaticSystemCountClaimed: false,
    },
  },
  search: {
    primaryUom: "test",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `existing fire alarm functional test ${outputStem}`,
    ],
    shortScopeRu:
      "Функциональная проверка существующей пожарной сигнализации по утверждённой программе без монтажа, замены, конфигурирования и пусконаладки.",
    keyDistinguishingParameters: ["detector_test_count"],
    clarificationFields: FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => parameterId !== "detector_test_count"),
    includedBoundaries: [
      "проверка извещателей, ручных извещателей, шлейфов и передачи тревоги",
      "проверка внешних интерфейсов и перехода на резервное питание",
      "труд, тестовый аэрозоль и оборудование по прямым данным программы",
      "протоколы и реестры дефектов",
    ],
    excludedBoundaries: [
      "монтаж, замена и закупка устройств",
      "конфигурация прибора и общесистемная пусконаладка",
      "автоматические нормы труда, расхода и количества смежных испытаний",
      "коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС функциональная проверка испытание извещатель ручной шлейф тревога интерфейс резервное питание аэрозоль протокол дефекты ${variantKey}`,
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256:
        FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.artifact_sha256,
      directApprovedTestProgramInputsRequired: true,
      universalClassificationFactorRejected: true,
      universalRatesRejected: true,
      automaticSystemCountRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /detector_install|монтаж.*извещател/iu,
    /detector_replacement|замен.*извещател/iu,
    /panel_configuration|настройк.*прибор/iu,
    /loop_cable|прокладк.*кабел/iu,
    /device_procurement|поставк.*оборудован/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
