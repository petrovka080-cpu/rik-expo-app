import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WOOD_FIREPROOFING_SEALING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SEALING_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_SEALING_FORMULAS,
  WOOD_FIREPROOFING_SEALING_NORM_ID,
  WOOD_FIREPROOFING_SEALING_PARAMETERS,
  WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_SEALING_RESOURCES,
  WOOD_FIREPROOFING_SEALING_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_SEALING_RUNTIME_SOURCE_IDS,
  WOOD_FIREPROOFING_SEALING_SHORT_INPUT,
  WOOD_FIREPROOFING_SEALING_SOURCE_ID,
  WOOD_FIREPROOFING_SEALING_SOURCE_METADATA,
  compileWoodFireproofingSealingVariantR1,
  resolveWoodFireproofingSealingVariant,
  woodFireproofingSealingCompletenessMap,
  type WoodFireproofingSealingVariantKey,
} from "../../../src/lib/estimate/v4/woodFireproofingSealingVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown; searchReleaseId?: unknown;
};
const variantKey = String(
  process.env.S277_F09_FIREPROOF_SEAL_VARIANT ?? "standard",
) as WoodFireproofingSealingVariantKey;
const variant = resolveWoodFireproofingSealingVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S277_F09_WOOD_FIREPROOFING_SEALING_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}
function rowQuantity(compiled: Awaited<ReturnType<typeof compileWoodFireproofingSealingVariantR1>>,
  rowId: string): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

async function verifyCore(): Promise<Json> {
  const short = await compileWoodFireproofingSealingVariantR1(variantKey,
    WOOD_FIREPROOFING_SEALING_SHORT_INPUT);
  const edited = await compileWoodFireproofingSealingVariantR1(variantKey, {
    ...WOOD_FIREPROOFING_SEALING_ACCEPTANCE_INPUT,
    sealing_area_m2: 50, sealant_rate_kg_m2: 0.35, primer_rate_l_m2: 0.1,
    backing_cord_length_rate_m_m2: 0.6, labor_rate_man_hour_m2: 0.55,
    inspection_area_per_count_m2: 8, waste_mass_rate_kg_m2: 0.1,
    waste_container_capacity_kg: 4,
  });
  if (!(short.rows.length === 13 && short.preliminaryNeeds.length === 0
    && rowQuantity(short, "f09:wood_fireproofing_sealing_labor") === "45"
    && rowQuantity(short, "f09:wood_fireproofing_sealant") === "25"
    && rowQuantity(short, "f09:wood_fireproofing_sealing_primer") === "8"
    && rowQuantity(short, "f09:wood_fireproofing_sealing_backing_cord") === "40"
    && rowQuantity(short, "f09:wood_fireproofing_sealing_waste_container") === "1")) {
    throw new Error(`STOP_${stopCode}_AUTOMATIC_FIRST_ESTIMATE`);
  }
  if (!(edited.rows.length === 13 && edited.preliminaryNeeds.length === 0
    && rowQuantity(edited, "f09:wood_fireproofing_sealing_labor") === "27.5"
    && rowQuantity(edited, "f09:wood_fireproofing_sealant") === "17.5"
    && rowQuantity(edited, "f09:wood_fireproofing_sealing_primer") === "5"
    && rowQuantity(edited, "f09:wood_fireproofing_sealing_backing_cord") === "30"
    && rowQuantity(edited, "f09:wood_fireproofing_sealing_inspection") === "7"
    && rowQuantity(edited, "f09:wood_fireproofing_sealing_waste_container") === "2")) {
    throw new Error(`STOP_${stopCode}_EDITED_PROFILE_COMPOSITION`);
  }
  const actualRows = JSON.stringify(WOOD_FIREPROOFING_SEALING_RESOURCES.map((row) => ({
    row_id: row.row_id, title_ru: row.title_ru, category: row.category,
  })));
  if (/injection|инъект|structural_strengthen|усиление конструкции|ремонтный состав/iu.test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`, variantKey, catalogId: variant.catalogId,
    automaticFirstEstimate: { rowCount: short.rows.length, preliminaryNeedCount: 0,
      quantities: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    editedProfile: { rowCount: edited.rows.length, preliminaryNeedCount: 0,
      quantities: edited.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    runtimeProfileParameters: Object.keys(WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE),
    allUnverifiedRatesClassifiedAsAssumptions: true, classificationFactorApplied: false,
    serializedSha256: createHash("sha256").update(JSON.stringify({ variantKey, short, edited })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-7.f09-wood-fireproofing-sealing-${outputStem}-automatic-successor.v1`,
  stopCode,
  applicationName: `s27-7-f09-wood-fireproofing-sealing-${outputStem}-automatic-successor`,
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
    ?? `.release-runtime/r568/s27-7/f09-fire-current-lineage/wood-fireproofing-sealing-${outputStem}-automatic-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodFireproofingSealingVariantsR1.ts",
    "tests/estimateNorms/woodFireproofingSealingVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodFireproofingSealingVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId, sourceId: WOOD_FIREPROOFING_SEALING_SOURCE_ID,
  normId: WOOD_FIREPROOFING_SEALING_NORM_ID, sourceMetadata: WOOD_FIREPROOFING_SEALING_SOURCE_METADATA,
  parameterDefinitions: WOOD_FIREPROOFING_SEALING_PARAMETERS,
  formulaDefinitions: WOOD_FIREPROOFING_SEALING_FORMULAS,
  resourceDefinitions: WOOD_FIREPROOFING_SEALING_RESOURCES,
  shortInput: WOOD_FIREPROOFING_SEALING_SHORT_INPUT,
  acceptanceInput: WOOD_FIREPROOFING_SEALING_ACCEPTANCE_INPUT,
  runtimeProfileInput: WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE,
  runtimeProfileClassification: WOOD_FIREPROOFING_SEALING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WOOD_FIREPROOFING_SEALING_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [1, 59, 59], benchmarkOrdinal: 0,
  validationScenario: `F09_WOOD_FIREPROOFING_SEALING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_seal_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: зоны и примыкания герметизированы совместимой системой, выполнены контроль и учёт отходов`,
    includedScopeRu: [
      "герметизация подтверждённой площади существующей огнезащиты",
      "совместимые герметик, грунт и уплотнительный шнур по видимому профилю",
      "труд, инструмент нанесения и малярная лента",
      "контрольные точки, пробы адгезии и протокол",
      "сбор, тара и перевозка отходов",
    ],
    excludedScopeRu: ["ремонт огнезащитного слоя и инъектирование", "конструктивное усиление",
      "скрытый коэффициент варианта", "официальные универсальные нормы из предварительного профиля",
      "неподтверждённые цены"],
    independentCompletenessMap: woodFireproofingSealingCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG", operationClass: "SEAL_EXISTING_FIREPROOFED_WOOD",
    catalogVariant: variant.catalogVariant, primaryMeasureParameterId: "sealing_area_m2",
    knownScopeParameters: Object.keys(WOOD_FIREPROOFING_SEALING_SHORT_INPUT),
    visibleEditablePreliminaryProfileParameters: Object.keys(WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE),
    officialTechnicalBoundarySource: WOOD_FIREPROOFING_SEALING_SOURCE_ID,
    officialArtifactSha256: WOOD_FIREPROOFING_SEALING_ARTIFACT_SHA256,
    preliminaryRatesClaimedAsOfficialNorms: false, automaticFirstEstimateClaimed: true,
    compatibleSealingMethodApprovalRequiredBeforeExecution: true,
    repairInjectionStructuralStrengtheningExcluded: true,
  },
  binding: { rowId: "f09:wood_fireproofing_sealing_area", applicability: {
    technology_class: "EXISTING_FIREPROOFED_WOOD_SEALING",
    operation_class: "SEAL_EXISTING_FIREPROOFED_WOOD", catalog_variant: variant.catalogVariant,
    scope_mode: "KNOWN_SCOPE_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
    source_id: WOOD_FIREPROOFING_SEALING_SOURCE_ID, norm_id: WOOD_FIREPROOFING_SEALING_NORM_ID,
    exact_locator: WOOD_FIREPROOFING_SEALING_SOURCE_METADATA.exact_locator,
    official_artifact_sha256: WOOD_FIREPROOFING_SEALING_ARTIFACT_SHA256,
    universal_classification_factor_claimed: false,
    quantity_basis: "AREA_TIMES_VISIBLE_PROFILE_RATES_WITH_CEIL_FOR_DISCRETE_RESOURCES",
  } },
  locator: { key: `sp-kr-54-101-2023-fireproofed-wood-sealing-${outputStem}-v1`, payload: {
    kind: "OFFICIAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
    catalogVariant: variant.catalogVariant,
    exactLocator: WOOD_FIREPROOFING_SEALING_SOURCE_METADATA.exact_locator,
    officialArtifactSha256: WOOD_FIREPROOFING_SEALING_ARTIFACT_SHA256,
    knownScopeInputs: Object.keys(WOOD_FIREPROOFING_SEALING_SHORT_INPUT),
    profileInputs: Object.keys(WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE),
    preliminaryRatesClaimedAsOfficialNorms: false, universalClassificationFactorClaimed: false,
  } },
  search: {
    primaryUom: "m2", canonicalNameRu: variant.canonicalNameRu,
    aliases: [...variant.aliasesRu, `existing fireproofed wood sealing ${outputStem}`],
    shortScopeRu: "Совместимая герметизация существующей огнезащиты с герметиком, грунтом, уплотнительным шнуром, трудом, инструментом, контролем и отходами.",
    keyDistinguishingParameters: Object.keys(WOOD_FIREPROOFING_SEALING_SHORT_INPUT),
    clarificationFields: Object.keys(WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE),
    includedBoundaries: ["герметик, грунт и уплотнительный шнур", "труд и инструмент нанесения",
      "контроль, протокол и отходы"],
    excludedBoundaries: ["ремонт слоя и инъектирование", "конструктивное усиление",
      "скрытый классификационный коэффициент и неподтверждённые цены"],
    extraSearchTermsRu: `огнезащита древесина герметизация примыкания герметик грунт шнур контроль отходы ${variantKey}`,
    sourceProvenance: { officialSpKr541012023TechnicalBoundary: true,
      exactOfficialArtifactSha256: WOOD_FIREPROOFING_SEALING_ARTIFACT_SHA256,
      visibleEditablePreliminaryProfile: true, preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorRejected: true },
  },
  forbiddenAdjacentMatchers: [/injection|инъект/iu, /structural_strengthen|усиление конструкции/iu,
    /repair_compound|ремонтный состав/iu],
  owner: `S277_F09_WOOD_FIREPROOFING_SEALING_${variantToken}_SUCCESSOR`,
  receiptFileStem: `01_S277_F09_WOOD_FIREPROOFING_SEALING_${variantToken}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
