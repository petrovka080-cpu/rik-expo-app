import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_LOCAL_REPAIR_FORMULAS,
  WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID,
  WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS,
  WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES,
  WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_SOURCE_IDS,
  WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
  WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
  WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA,
  compileWoodFireproofingLocalRepairVariantR1,
  resolveWoodFireproofingLocalRepairVariant,
  woodFireproofingLocalRepairCompletenessMap,
  type WoodFireproofingLocalRepairVariantKey,
} from "../../../src/lib/estimate/v4/woodFireproofingLocalRepairVariantsR1";
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
  process.env.S277_F09_FIREPROOF_REPAIR_VARIANT ?? "standard",
) as WoodFireproofingLocalRepairVariantKey;
const variant = resolveWoodFireproofingLocalRepairVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S277_F09_WOOD_FIREPROOFING_LOCAL_REPAIR_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

function rowQuantity(
  compiled: Awaited<ReturnType<typeof compileWoodFireproofingLocalRepairVariantR1>>,
  rowId: string,
): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingLocalRepairVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
  });
  const edited = await compileWoodFireproofingLocalRepairVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT,
    repair_area_m2: 50,
    repair_compound_rate_kg_m2: 0.6,
    primer_rate_l_m2: 0.15,
    reinforcement_area_factor: 1.2,
    labor_rate_man_hour_m2: 0.8,
    inspection_area_per_count_m2: 8,
    waste_mass_rate_kg_m2: 0.12,
    waste_container_capacity_kg: 4,
  });
  if (!(short.rows.length === 14
    && short.preliminaryNeeds.length === 0
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_area") === "100"
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_labor") === "65"
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_compound") === "45"
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_primer") === "12"
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_reinforcement") === "110"
    && rowQuantity(short, "f09:wood_fireproofing_local_repair_waste_container") === "2")) {
    throw new Error(`STOP_${stopCode}_AUTOMATIC_FIRST_ESTIMATE`);
  }
  if (!(edited.rows.length === 14
    && edited.preliminaryNeeds.length === 0
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_labor") === "40"
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_compound") === "30"
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_primer") === "7.5"
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_reinforcement") === "60"
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_inspection") === "7"
    && rowQuantity(edited, "f09:wood_fireproofing_local_repair_waste_container") === "2")) {
    throw new Error(`STOP_${stopCode}_EDITED_PROFILE_COMPOSITION`);
  }
  const actualRows = JSON.stringify(WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    category: row.category,
  })));
  if (/injection|seal|strengthen|полное новое нанесение/iu.test(actualRows)) {
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
    runtimeProfileParameters: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE),
    allUnverifiedRatesClassifiedAsAssumptions: true,
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, edited }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-7.f09-wood-fireproofing-local-repair-${outputStem}-automatic-successor.v1`,
  stopCode,
  applicationName: `s27-7-f09-wood-fireproofing-local-repair-${outputStem}-automatic-successor`,
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
    ?? `.release-runtime/r568/s27-7/f09-fire-current-lineage/wood-fireproofing-local-repair-${outputStem}-automatic-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingLocalRepairVariantsR1.ts",
    "tests/estimateNorms/woodFireproofingLocalRepairVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingLocalRepairVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
  normId: WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID,
  sourceMetadata: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_LOCAL_REPAIR_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES,
  shortInput: WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT,
  runtimeProfileInput: WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE,
  runtimeProfileClassification: WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOOD_FIREPROOFING_LOCAL_REPAIR_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_repair_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: границы дефектов восстановлены совместимой системой, выполнены контроль и учёт отходов`,
    includedScopeRu: [
      "локальное восстановление подтверждённой площади существующей огнезащиты",
      "совместимые ремонтный состав, грунт и армирование по видимому редактируемому профилю",
      "труд, смесительное оборудование и инструмент нанесения",
      "укрытие смежных поверхностей, контрольные точки, образцы и протокол",
      "сбор, тара и перевозка отходов ремонта",
    ],
    excludedScopeRu: [
      "полное новое нанесение огнезащиты вне границ локального ремонта",
      "инъектирование, герметизация или усиление конструкции",
      "скрытый коэффициент варианта small_area, standard или large_area",
      "выдача предварительных расходов за официальные универсальные нормы",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: woodFireproofingLocalRepairCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "LOCAL_REPAIR_EXISTING_FIREPROOFED_WOOD",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "repair_area_m2",
    knownScopeParameters: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT),
    visibleEditablePreliminaryProfileParameters:
      Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE),
    officialTechnicalBoundarySource: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
    preliminaryRatesClaimedAsOfficialNorms: false,
    automaticFirstEstimateClaimed: true,
    compatibleRepairMethodApprovalRequiredBeforeExecution: true,
    fullNewCoatingExcluded: true,
    injectionSealingStrengtheningExcluded: true,
  },
  binding: {
    rowId: "f09:wood_fireproofing_local_repair_area",
    applicability: {
      technology_class: "EXISTING_FIREPROOFED_WOOD_LOCAL_REPAIR",
      operation_class: "LOCAL_REPAIR_EXISTING_FIREPROOFED_WOOD",
      catalog_variant: variant.catalogVariant,
      scope_mode: "KNOWN_SCOPE_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      source_id: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_ID,
      norm_id: WOOD_FIREPROOFING_LOCAL_REPAIR_NORM_ID,
      exact_locator: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      quantity_basis: "AREA_TIMES_VISIBLE_PROFILE_RATES_WITH_CEIL_FOR_DISCRETE_RESOURCES",
    },
  },
  locator: {
    key: `sp-kr-54-101-2023-fireproofed-wood-local-repair-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      catalogVariant: variant.catalogVariant,
      exactLocator: WOOD_FIREPROOFING_LOCAL_REPAIR_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
      knownScopeInputs: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT),
      profileInputs: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE),
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [...variant.aliasesRu, `existing fireproofed wood local repair ${outputStem}`],
    shortScopeRu:
      "Локальное восстановление существующей огнезащиты деревянной конструкции совместимыми материалами с трудом, механизмами, укрытием, контролем и отходами.",
    keyDistinguishingParameters: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT),
    clarificationFields: Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE),
    includedBoundaries: [
      "ремонтный состав, совместимые грунт и армирование",
      "труд, оборудование нанесения и укрытие смежных поверхностей",
      "контроль, протокол, сбор и перевозка отходов",
    ],
    excludedBoundaries: [
      "полное новое нанесение вне границ ремонта",
      "инъектирование, герметизация и усиление",
      "скрытые коэффициенты классификационного суффикса и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `огнезащита древесина локальный ремонт восстановление дефектов грунт армирование контроль отходы ${variantKey}`,
    sourceProvenance: {
      officialSpKr541012023TechnicalBoundary: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_LOCAL_REPAIR_ARTIFACT_SHA256,
      visibleEditablePreliminaryProfile: true,
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /injection|инъект/iu,
    /seal(?:ing)?|герметиз/iu,
    /strengthen|усилен/iu,
    /new[_ -]?coating|полное новое нанесение/iu,
  ],
  owner: `S277_F09_WOOD_FIREPROOFING_LOCAL_REPAIR_${variantToken}_SUCCESSOR`,
  receiptFileStem: `01_S277_F09_WOOD_FIREPROOFING_LOCAL_REPAIR_${variantToken}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
