import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
  FIRE_ALARM_PROJECT_PREPARATION_FORMULAS,
  FIRE_ALARM_PROJECT_PREPARATION_NORM_ID,
  FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS,
  FIRE_ALARM_PROJECT_PREPARATION_RESOURCES,
  FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
  FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
  FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA,
  compileFireAlarmProjectPreparationVariantR1,
  fireAlarmProjectPreparationCompletenessMap,
  resolveFireAlarmProjectPreparationVariant,
  type FireAlarmProjectPreparationVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmProjectPreparationVariantsR1";
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
  process.env.S276_F09_FIRE_ALARM_PREPARATION_VARIANT ?? "standard",
) as FireAlarmProjectPreparationVariantKey;
const variant = resolveFireAlarmProjectPreparationVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S276_F09_FIRE_ALARM_PROJECT_PREPARATION_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmProjectPreparationVariantR1(variantKey, {
    ...FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
  });
  const complete = await compileFireAlarmProjectPreparationVariantR1(variantKey, {
    ...FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_alarm_preparation_protected_area_survey"
    && short.rows[0]?.quantity === "800"
    && short.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 12 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_PROJECT_PREPARATION_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/detector_install|loop_cable|control_panel|sounder|power_supply|commissioning|пусконалад/iu
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
  contract:
    `rik-expo-app.s27-6.f09-fire-alarm-project-preparation-${outputStem}-successor.v1`,
  stopCode,
  applicationName:
    `s27-6-f09-fire-alarm-project-preparation-${outputStem}-successor`,
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
      + `fire-alarm-project-preparation-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmProjectPreparationVariantsR1.ts",
    "tests/estimateNorms/fireAlarmProjectPreparationVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmProjectPreparationVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
  normId: FIRE_ALARM_PROJECT_PREPARATION_NORM_ID,
  sourceMetadata: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_PROJECT_PREPARATION_FORMULAS,
  resourceDefinitions: FIRE_ALARM_PROJECT_PREPARATION_RESOURCES,
  shortInput: FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [12, 12, 12],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_PROJECT_PREPARATION_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_prepare_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: защищаемая площадь обследована, исходные данные и проектные ведомости подготовлены, решения скоординированы`,
    includedScopeRu: [
      "обследование известной защищаемой площади и сбор исходных данных",
      "ведомости помещений, пожарных отсеков, точек, шлейфов и интерфейсов только по прямым данным задания и обследования",
      "труд обследования, проектирования и координации только по проектному плану",
      "реестр исходных данных, проектные документы и протоколы координации по прямому количеству",
    ],
    excludedScopeRu: [
      "автоматический пересчёт площади в устройства, помещения, шлейфы, документы или труд",
      "монтаж, кабель, извещатели, приборы, оповещатели и блоки питания",
      "пусконаладка и исполнительная документация смонтированной системы",
      "скрытый коэффициент площади, влажности или типа помещения",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      fireAlarmProjectPreparationCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "PREPARE_FIRE_ALARM_PROJECT",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "protected_area_m2",
    geometryParameters: ["protected_area_m2"],
    directProjectParameters: FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => parameterId !== "protected_area_m2"),
    officialTechnicalBoundarySource: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
    approvedDesignBriefRequired: true,
    approvedSurveyRequired: true,
    universalAreaConversionClaimed: false,
    universalClassificationFactorClaimed: false,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    installationExcluded: true,
    commissioningExcluded: true,
    materialProcurementExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_preparation_protected_area_survey",
    applicability: {
      technology_class: "AUTOMATIC_FIRE_ALARM_PROJECT_PREPARATION",
      operation_class: "PREPARE_FIRE_ALARM_PROJECT",
      catalog_variant: variant.catalogVariant,
      scope_mode: "KNOWN_AREA_PLUS_DIRECT_APPROVED_DESIGN_BRIEF_SURVEY_AND_PROJECT_INPUTS",
      source_id: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
      norm_id: FIRE_ALARM_PROJECT_PREPARATION_NORM_ID,
      exact_locator: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.exact_locator,
      official_artifact_sha256:
        FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.artifact_sha256,
      universal_area_conversion_claimed: false,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "KNOWN_AREA_OR_DIRECT_APPROVED_PROJECT_INPUT",
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-project-preparation-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_DIRECT_PROJECT_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.exact_locator,
      officialArtifactSha256:
        FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: ["protected_area_m2"],
      directProjectInputs: FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => parameterId !== "protected_area_m2"),
      universalAreaConversionClaimed: false,
      universalClassificationFactorClaimed: false,
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `fire alarm project preparation ${outputStem}`,
    ],
    shortScopeRu:
      "Обследование защищаемой площади, сбор исходных данных и подготовка проектных ведомостей АПС без пересчёта площади в устройства, труд или документы.",
    keyDistinguishingParameters: ["protected_area_m2"],
    clarificationFields: FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => parameterId !== "protected_area_m2"),
    includedBoundaries: [
      "обследование защищаемой площади и сбор исходных данных",
      "ведомости помещений, отсеков, точек, шлейфов и интерфейсов",
      "труд проектирования и координации по прямым данным",
      "реестры, проектные документы и протоколы координации",
    ],
    excludedBoundaries: [
      "монтаж, кабель, оборудование и материалы АПС",
      "пусконаладка и исполнительная документация",
      "автоматический коэффициент площади или классификационного суффикса",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      `АПС проект обследование исходные данные площадь помещения пожарный отсек точки шлейфы интерфейсы координация ${variantKey}`,
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256:
        FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      universalAreaConversionRejected: true,
      universalClassificationFactorRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /detector_install|монтаж.*извещател/iu,
    /loop_cable|кабел/iu,
    /control_panel|при[её]мн.*контрол.*прибор/iu,
    /sounder|оповещател/iu,
    /power_supply|блок.*питан/iu,
    /commissioning|пусконалад/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
