import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_FORMULAS,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_SOURCE_IDS,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA,
  compileWoodFireproofingLayerStrengtheningVariantR1,
  resolveWoodFireproofingLayerStrengtheningVariant,
  woodFireproofingLayerStrengtheningCompletenessMap,
  type WoodFireproofingLayerStrengtheningVariantKey,
} from "../../../src/lib/estimate/v4/woodFireproofingLayerStrengtheningVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown; searchReleaseId?: unknown;
};
const variantKey = String(
  process.env.S277_F09_FIREPROOF_STRENGTHEN_VARIANT ?? "small_area",
) as WoodFireproofingLayerStrengtheningVariantKey;
const variant = resolveWoodFireproofingLayerStrengtheningVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S277_F09_WOOD_FIREPROOFING_LAYER_STRENGTHENING_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

function rowQuantity(
  compiled: Awaited<ReturnType<typeof compileWoodFireproofingLayerStrengtheningVariantR1>>,
  rowId: string,
): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingLayerStrengtheningVariantR1(
    variantKey, WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
  );
  const edited = await compileWoodFireproofingLayerStrengtheningVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT,
    strengthening_area_m2: 50,
    strengthening_compound_rate_kg_m2: 0.7,
    primer_rate_l_m2: 0.12,
    reinforcement_mesh_area_factor: 1.25,
    mesh_fastener_density_pcs_m2: 5,
    labor_rate_man_hour_m2: 0.9,
    inspection_area_per_count_m2: 8,
    waste_mass_rate_kg_m2: 0.16,
    waste_container_capacity_kg: 3,
  });
  if (!(short.rows.length === 15 && short.preliminaryNeeds.length === 0
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_labor") === "75"
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_compound") === "55"
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_primer") === "10"
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_mesh") === "115"
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_mesh_fastener") === "400"
    && rowQuantity(short, "f09:wood_fireproofing_layer_strengthening_waste_container") === "2")) {
    throw new Error(`STOP_${stopCode}_AUTOMATIC_FIRST_ESTIMATE`);
  }
  if (!(edited.rows.length === 15 && edited.preliminaryNeeds.length === 0
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_labor") === "45"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_compound") === "35"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_primer") === "6"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_mesh") === "62.5"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_mesh_fastener") === "250"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_inspection") === "7"
    && rowQuantity(edited, "f09:wood_fireproofing_layer_strengthening_waste_container") === "3")) {
    throw new Error(`STOP_${stopCode}_EDITED_PROFILE_COMPOSITION`);
  }
  const actualRows = JSON.stringify(
    WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES.map((row) => ({
      row_id: row.row_id, title_ru: row.title_ru, category: row.category,
    })),
  );
  if (/injection|инъект|герметизац|structural_strengthen|усиление конструкции|усиление деревянн/iu
    .test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`, variantKey, catalogId: variant.catalogId,
    automaticFirstEstimate: { rowCount: short.rows.length, preliminaryNeedCount: 0,
      quantities: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    editedProfile: { rowCount: edited.rows.length, preliminaryNeedCount: 0,
      quantities: edited.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    runtimeProfileParameters:
      Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE),
    allUnverifiedRatesClassifiedAsAssumptions: true,
    classificationFactorApplied: false,
    timberStructuralStrengtheningExcluded: true,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, edited })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-7.f09-wood-fireproofing-layer-strengthening-${outputStem}-automatic-successor.v1`,
  stopCode,
  applicationName:
    `s27-7-f09-wood-fireproofing-layer-strengthening-${outputStem}-automatic-successor`,
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
    ?? `.release-runtime/r568/s27-7/f09-fire-current-lineage/wood-fireproofing-layer-strengthening-${outputStem}-automatic-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingLayerStrengtheningVariantsR1.ts",
    "tests/estimateNorms/woodFireproofingLayerStrengtheningVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingLayerStrengtheningVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
  normId: WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID,
  sourceMetadata: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_LAYER_STRENGTHENING_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES,
  shortInput: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT,
  runtimeProfileInput: WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE,
  runtimeProfileClassification:
    WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOOD_FIREPROOFING_LAYER_STRENGTHENING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_strengthen_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: слой усилен совместимой системой, выполнены контроль и учёт отходов`,
    includedScopeRu: [
      "усиление подтверждённой площади существующего огнезащитного слоя",
      "совместимые состав, грунт, армирующая сетка и её крепёж по видимому профилю",
      "труд, смеситель, инструмент нанесения и укрывной материал",
      "контрольные точки, пробы адгезии и протокол",
      "сбор, тара и перевозка отходов",
    ],
    excludedScopeRu: ["конструктивное усиление деревянного элемента",
      "инъектирование, герметизация и полная замена системы",
      "скрытый коэффициент варианта",
      "официальные универсальные нормы из предварительного профиля",
      "неподтверждённые цены"],
    independentCompletenessMap:
      woodFireproofingLayerStrengtheningCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "STRENGTHEN_EXISTING_FIREPROOF_LAYER_ON_WOOD",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "strengthening_area_m2",
    knownScopeParameters: Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT),
    visibleEditablePreliminaryProfileParameters:
      Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE),
    officialTechnicalBoundarySource: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
    preliminaryRatesClaimedAsOfficialNorms: false,
    automaticFirstEstimateClaimed: true,
    compatibleLayerStrengtheningMethodApprovalRequiredBeforeExecution: true,
    timberStructuralStrengtheningInjectionSealingExcluded: true,
  },
  binding: {
    rowId: "f09:wood_fireproofing_layer_strengthening_area",
    applicability: {
      technology_class: "EXISTING_FIREPROOFED_WOOD_LAYER_STRENGTHENING",
      operation_class: "STRENGTHEN_EXISTING_FIREPROOF_LAYER_ON_WOOD",
      catalog_variant: variant.catalogVariant,
      scope_mode: "KNOWN_SCOPE_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      source_id: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_ID,
      norm_id: WOOD_FIREPROOFING_LAYER_STRENGTHENING_NORM_ID,
      exact_locator: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      quantity_basis:
        "AREA_TIMES_VISIBLE_PROFILE_RATES_WITH_CEIL_FOR_DISCRETE_RESOURCES",
    },
  },
  locator: {
    key: `sp-kr-54-101-2023-fireproofed-wood-layer-strengthening-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      catalogVariant: variant.catalogVariant,
      exactLocator: WOOD_FIREPROOFING_LAYER_STRENGTHENING_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
      knownScopeInputs: Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT),
      profileInputs: Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE),
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorClaimed: false,
      timberStructuralStrengtheningExcluded: true,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [...variant.aliasesRu, `existing fireproofed wood layer strengthening ${outputStem}`],
    shortScopeRu:
      "Усиление существующего огнезащитного слоя с совместимыми составом, грунтом, сеткой, крепежом, трудом, механизмами, контролем и отходами.",
    keyDistinguishingParameters:
      Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT),
    clarificationFields:
      Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE),
    includedBoundaries: ["усиливающий состав, грунт, сетка и крепёж",
      "труд и механизмы", "контроль, протокол и отходы"],
    excludedBoundaries: ["конструктивное усиление деревянного элемента",
      "инъектирование, герметизация и полная замена",
      "скрытый классификационный коэффициент и неподтверждённые цены"],
    extraSearchTermsRu:
      `огнезащита древесина усиление слоя армирование сетка крепёж контроль отходы ${variantKey}`,
    sourceProvenance: {
      officialSpKr541012023TechnicalBoundary: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_LAYER_STRENGTHENING_ARTIFACT_SHA256,
      visibleEditablePreliminaryProfile: true,
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorRejected: true,
      timberStructuralStrengtheningExcluded: true,
    },
  },
  forbiddenAdjacentMatchers: [/injection|инъект/iu, /герметизац/iu,
    /structural_strengthen|усиление конструкции|усиление деревянн/iu],
  owner: `S277_F09_WOOD_FIREPROOFING_LAYER_STRENGTHENING_${variantToken}_SUCCESSOR`,
  receiptFileStem: `01_S277_F09_WOOD_FIREPROOFING_LAYER_STRENGTHENING_${variantToken}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
