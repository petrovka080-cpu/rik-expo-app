import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_SOURCE_IDS,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA,
  compileWoodFireproofingSurfacePreparationVariantR1,
  resolveWoodFireproofingSurfacePreparationVariant,
  woodFireproofingSurfacePreparationCompletenessMap,
  type WoodFireproofingSurfacePreparationVariantKey,
} from "../../../src/lib/estimate/v4/woodFireproofingSurfacePreparationVariantsR1";
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
  process.env.S277_F09_FIREPROOF_PREPARE_VARIANT ?? "small_area",
) as WoodFireproofingSurfacePreparationVariantKey;
const variant = resolveWoodFireproofingSurfacePreparationVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S277_F09_WOOD_FIREPROOFING_SURFACE_PREPARATION_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

function rowQuantity(
  compiled: Awaited<ReturnType<typeof compileWoodFireproofingSurfacePreparationVariantR1>>,
  rowId: string,
): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingSurfacePreparationVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  });
  const edited = await compileWoodFireproofingSurfacePreparationVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT,
    preparation_area_m2: 50,
    labor_rate_man_hour_m2: 0.3,
    abrasive_rate_kg_m2: 0.1,
    masking_area_factor: 1.5,
    profile_measurement_area_per_count_m2: 8,
    waste_container_capacity_kg: 5,
  });
  if (!(short.rows.length === 11
    && short.preliminaryNeeds.length === 0
    && rowQuantity(short, "f09:wood_fireproofing_prepared_area") === "100"
    && rowQuantity(short, "f09:wood_fireproofing_preparation_labor") === "24"
    && rowQuantity(short, "f09:wood_fireproofing_preparation_abrasive") === "6"
    && rowQuantity(short, "f09:wood_fireproofing_preparation_masking") === "120"
    && rowQuantity(short, "f09:wood_fireproofing_preparation_waste_containers") === "8")) {
    throw new Error(`STOP_${stopCode}_AUTOMATIC_FIRST_ESTIMATE`);
  }
  if (!(edited.rows.length === 11
    && edited.preliminaryNeeds.length === 0
    && rowQuantity(edited, "f09:wood_fireproofing_preparation_labor") === "15"
    && rowQuantity(edited, "f09:wood_fireproofing_preparation_abrasive") === "5"
    && rowQuantity(edited, "f09:wood_fireproofing_preparation_masking") === "75"
    && rowQuantity(edited, "f09:wood_fireproofing_surface_profile_measurements") === "7"
    && rowQuantity(edited, "f09:wood_fireproofing_preparation_waste_containers") === "3")) {
    throw new Error(`STOP_${stopCode}_EDITED_PROFILE_COMPOSITION`);
  }
  const actualRows = JSON.stringify(WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/paint_evrika|coating_application|injection|sealing|strengthening/iu.test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    automaticFirstEstimate: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      quantities: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    editedProfile: {
      rowCount: edited.rows.length,
      preliminaryNeedCount: edited.preliminaryNeeds.length,
      quantities: edited.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    runtimeProfileParameters:
      Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE),
    allUnverifiedRatesClassifiedAsAssumptions: true,
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, edited }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-7.f09-wood-fireproofing-surface-preparation-${outputStem}-automatic-successor.v2`,
  stopCode,
  applicationName:
    `s27-7-f09-wood-fireproofing-surface-preparation-${outputStem}-automatic-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (43).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "94ad8582e8e5c43aa4479d8e5c1db285f5220f6888cf2eae29c146b6202bcf66",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? requiredPointer(currentRelease.definitionReleaseId, "DEFINITION_RELEASE_ID"),
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? requiredPointer(currentRelease.searchReleaseId, "SEARCH_RELEASE_ID"),
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-7/f09-fire-current-lineage/`
      + `wood-fireproofing-surface-preparation-${outputStem}-automatic-successor-v2`),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingSurfacePreparationVariantsR1.ts",
    "tests/estimateNorms/woodFireproofingSurfacePreparationVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingSurfacePreparationVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
  normId: WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID,
  sourceMetadata: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES,
  shortInput: WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
  runtimeProfileClassification:
    WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WOOD_FIREPROOFING_SURFACE_PREPARATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOOD_FIREPROOFING_SURFACE_PREPARATION_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_prepare_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: непрочные участки удалены, поверхность обеспылена, смежные поверхности защищены, готовность и отходы учтены`,
    includedScopeRu: [
      "подготовка подтверждённой площади существующей огнезащищённой деревянной поверхности",
      "труд, пылеудаление и механизированный ручной инструмент",
      "удаляемый материал, совместимый абразив и укрытие смежных поверхностей",
      "контрольные участки профиля и протокол готовности",
      "тара и перевозка отходов подготовки",
    ],
    excludedScopeRu: [
      "последующее нанесение огнезащитного покрытия",
      "локальный ремонт, инъектирование, герметизация или усиление",
      "скрытый коэффициент варианта small_area или standard",
      "выдача предварительных производительностей за официальные универсальные нормы",
      "неподтверждённые цены",
    ],
    independentCompletenessMap:
      woodFireproofingSurfacePreparationCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "PREPARE_EXISTING_FIREPROOFED_WOOD_SURFACE",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "preparation_area_m2",
    knownScopeParameters: Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT),
    visibleEditablePreliminaryProfileParameters:
      Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE),
    officialTechnicalBoundarySource: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
    preliminaryRatesClaimedAsOfficialNorms: false,
    automaticFirstEstimateClaimed: true,
    compatibleMethodApprovalRequiredBeforeExecution: true,
    coatingApplicationExcluded: true,
    repairInjectionSealingStrengtheningExcluded: true,
  },
  binding: {
    rowId: "f09:wood_fireproofing_prepared_area",
    applicability: {
      technology_class: "EXISTING_FIREPROOFED_WOOD_SURFACE_PREPARATION",
      operation_class: "PREPARE_EXISTING_FIREPROOFED_WOOD_SURFACE",
      catalog_variant: variant.catalogVariant,
      scope_mode: "KNOWN_SCOPE_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      source_id: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_ID,
      norm_id: WOOD_FIREPROOFING_SURFACE_PREPARATION_NORM_ID,
      exact_locator: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      quantity_basis: "AREA_TIMES_VISIBLE_PROFILE_RATES_WITH_CEIL_FOR_DISCRETE_RESOURCES",
    },
  },
  locator: {
    key: `sp-kr-54-101-2023-fireproofed-wood-preparation-${outputStem}-v2`,
    payload: {
      kind: "OFFICIAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      catalogVariant: variant.catalogVariant,
      exactLocator: WOOD_FIREPROOFING_SURFACE_PREPARATION_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
      knownScopeInputs: Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT),
      profileInputs: Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE),
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [...variant.aliasesRu, `existing fireproofed wood preparation ${outputStem}`],
    shortScopeRu:
      "Подготовка существующей огнезащищённой деревянной поверхности до готовности к согласованной последующей операции с пылеудалением, укрытием, контролем и отходами.",
    keyDistinguishingParameters: Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT),
    clarificationFields: Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE),
    includedBoundaries: [
      "локальное удаление непрочных участков и механическая подготовка",
      "пылеудаление, совместимый абразив и защита смежных поверхностей",
      "контроль профиля, протокол готовности, тара и перевозка отходов",
    ],
    excludedBoundaries: [
      "нанесение нового огнезащитного покрытия",
      "ремонт, инъектирование, герметизация и усиление",
      "скрытые коэффициенты классификационного суффикса",
      "неподтверждённые цены и официальные нормы производительности",
    ],
    extraSearchTermsRu:
      `огнезащита древесина подготовка поверхности абразив обеспыливание укрытие отходы готовность ${variantKey}`,
    sourceProvenance: {
      officialSpKr541012023TechnicalBoundary: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_SURFACE_PREPARATION_ARTIFACT_SHA256,
      visibleEditablePreliminaryProfile: true,
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /paint_evrika|нанес.*краск/iu,
    /coating_application|нанес.*покрыт/iu,
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
