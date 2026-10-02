import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS,
  WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID,
  WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS,
  WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES,
  WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
  WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
  WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA,
  compileWoodFireproofingSurfaceCleaningVariantR1,
  resolveWoodFireproofingSurfaceCleaningVariant,
  woodFireproofingSurfaceCleaningCompletenessMap,
  type WoodFireproofingSurfaceCleaningVariantKey,
} from "../../../src/lib/estimate/v4/woodFireproofingSurfaceCleaningVariantsR1";
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
  process.env.S276_F09_FIREPROOF_CLEAN_VARIANT ?? "small_area",
) as WoodFireproofingSurfaceCleaningVariantKey;
const variant = resolveWoodFireproofingSurfaceCleaningVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S276_F09_WOOD_FIREPROOFING_SURFACE_CLEANING_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingSurfaceCleaningVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
  });
  const complete = await compileWoodFireproofingSurfaceCleaningVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:wood_fireproofing_cleaned_area"
    && short.rows[0]?.quantity === "100"
    && short.preliminaryNeeds.length === 7)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 11 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(
    WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })),
  );
  if (/paint_evrika|coating_application|repair_compound|injection|sealing|strengthening/iu
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
    automaticCleaningRateApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-6.f09-wood-fireproofing-surface-cleaning-${outputStem}-successor.v1`,
  stopCode,
  applicationName:
    `s27-6-f09-wood-fireproofing-surface-cleaning-${outputStem}-successor`,
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
      + `wood-fireproofing-surface-cleaning-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingSurfaceCleaningVariantsR1.ts",
    "tests/estimateNorms/woodFireproofingSurfaceCleaningVariantsR1.contract.test.ts",
    "src/lib/estimate/v4/woodFireproofingQualityControlSpKr54R1.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingSurfaceCleaningVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
  normId: WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID,
  sourceMetadata: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES,
  shortInput: WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOOD_FIREPROOFING_SURFACE_CLEANING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_clean_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: подтверждённое загрязнение удалено совместимым способом без назначения нового покрытия, отходы собраны, готовность поверхности оформлена`,
    includedScopeRu: [
      "очистка подтверждённой площади существующей огнезащищённой деревянной поверхности",
      "труд, пылеудаляющее оборудование и ручной инструмент только по совместимой технологической карте",
      "очиститель и укрытие только по явным условным ветвям",
      "салфетки, тара, масса отходов и перевозка только по прямым данным плана работ",
      "протокол готовности очищенной поверхности",
    ],
    excludedScopeRu: [
      "автоматический расход очистителя, укрытия, труда, оборудования или отходов",
      "нанесение огнезащитного покрытия или краски",
      "ремонт, герметизация, инъектирование и усиление",
      "металл, бетон, кабели и огнезащитные проходки",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      woodFireproofingSurfaceCleaningCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "CLEAN_EXISTING_FIREPROOFED_WOOD_SURFACE",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "cleaning_area_m2",
    knownScopeParameters: [
      "cleaning_area_m2",
      "existing_fireproof_system_designation",
      "contamination_description",
    ],
    directMethodParameters: WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "cleaning_area_m2",
        "existing_fireproof_system_designation",
        "contamination_description",
      ].includes(parameterId)),
    officialTechnicalBoundarySource: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
    compatibleCleaningMethodRequired: true,
    existingSystemDocumentationRequired: true,
    universalClassificationFactorClaimed: false,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    coatingApplicationExcluded: true,
    repairExcluded: true,
    sealingInjectionAndStrengtheningExcluded: true,
  },
  binding: {
    rowId: "f09:wood_fireproofing_cleaned_area",
    applicability: {
      technology_class: "EXISTING_FIREPROOFED_WOOD_SURFACE_CLEANING",
      operation_class: "CLEAN_EXISTING_FIREPROOFED_WOOD_SURFACE",
      catalog_variant: variant.catalogVariant,
      scope_mode:
        "KNOWN_AREA_SYSTEM_AND_CONTAMINATION_PLUS_DIRECT_COMPATIBLE_METHOD_AND_WASTE_INPUTS",
      source_id: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
      norm_id: WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID,
      exact_locator: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis:
        "KNOWN_CLEANING_AREA_OR_DIRECT_APPROVED_COMPATIBLE_METHOD_OR_WASTE_INPUT",
    },
  },
  locator: {
    key: `sp-kr-54-101-2023-fireproofed-wood-cleaning-${outputStem}-v1`,
    payload: {
      kind:
        "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_DIRECT_COMPATIBLE_CLEANING_METHOD_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
      knownScopeInputs: [
        "cleaning_area_m2",
        "existing_fireproof_system_designation",
        "contamination_description",
      ],
      directMethodInputs: WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          "cleaning_area_m2",
          "existing_fireproof_system_designation",
          "contamination_description",
        ].includes(parameterId)),
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
      `existing fireproofed wood surface cleaning ${outputStem}`,
    ],
    shortScopeRu:
      "Совместимая очистка существующей огнезащищённой деревянной поверхности по ведомости состояния и технологической карте без нанесения или ремонта покрытия.",
    keyDistinguishingParameters: [
      "cleaning_area_m2",
      "existing_fireproof_system_designation",
      "contamination_description",
    ],
    clarificationFields: WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "cleaning_area_m2",
        "existing_fireproof_system_designation",
        "contamination_description",
      ].includes(parameterId)),
    includedBoundaries: [
      "очистка огнезащищённой деревянной поверхности совместимым способом",
      "труд и оборудование по прямым данным технологической карты",
      "условные очиститель и укрывной материал",
      "расходники, сбор и перевозка отходов",
      "протокол готовности поверхности",
    ],
    excludedBoundaries: [
      "нанесение нового огнезащитного покрытия",
      "ремонт, герметизация, инъектирование и усиление",
      "автоматические нормы труда, расхода и отходов",
      "коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `огнезащита древесина очистка загрязнение пыль очиститель укрытие отходы готовность поверхности ${variantKey}`,
    sourceProvenance: {
      officialSpKr541012023TechnicalBoundary: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
      directApprovedCompatibleMethodInputsRequired: true,
      universalClassificationFactorRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /paint_evrika|нанесен.*краск/iu,
    /coating_application|нанесен.*покрыт/iu,
    /repair_compound|ремонт.*покрыт/iu,
    /injection|инъектир/iu,
    /sealing|герметизац/iu,
    /strengthening|усилен/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
