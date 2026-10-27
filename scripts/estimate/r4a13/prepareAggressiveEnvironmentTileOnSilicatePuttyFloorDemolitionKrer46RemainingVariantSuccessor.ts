import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1,
  resolveAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46Variant,
  type AggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_VARIANT ?? "wet_zone",
) as AggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46VariantKey;
if (!( [ "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = "влажной зоны";
const canonicalNameRu = "Разборка плиточного покрытия на силикатной замазке в агрессивной среде — влажная зона";

async function verifyCore(): Promise<Json> {
  const short = await compileAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 5
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:labor")
      ?.quantity === "30.86"
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "0.57"
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:pneumatic_breaker")
      ?.quantity === "1.14")) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 5
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:labor")
      ?.quantity === "10.9553"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "0.20235"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:pneumatic_breaker")
      ?.quantity === "0.4047")) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_FORMULAS,
    resources: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-011-03",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "30.86",
      machinistLaborManHours: "0.57",
      compressorMachineHours: "0.57",
      pneumaticBreakerMachineHours: "1.14",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "10.9553",
      machinistLaborManHours: "0.20235",
      compressorMachineHours: "0.20235",
      pneumaticBreakerMachineHours: "0.4047",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 5 },
    machinistLaborPricedSeparately: false,
    classificationFactorClaimed: false,
    ordinaryEnvironmentIncluded: false,
    otherBeddingOrColumnIncluded: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-aggressive-environment-tile-on-silicate-putty-floor-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}`,
  applicationName: `s27-3-f09-aggressive-environment-tile-on-silicate-putty-floor-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "3a74e902-b568-5d01-bc6f-de77c63150de",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "eb3dd7ab-32ec-5985-8b6d-fa911d60ab44",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `aggressive-environment-tile-on-silicate-putty-floor-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1.ts",
    "tests/estimateNorms/aggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentTileOnSilicatePuttyFloorDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: canonicalNameRu,
    workKey:
      `aggressive_environment_tile_on_silicate_putty_demolition_krer_46_04_011_03_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующего плиточного покрытия на силикатной замазке в агрессивной среде ${contextRu} разобрана по КРЕР 46-04-011-03`,
    includedScopeRu: [
      "разборка плиток на силикатной замазке в подтверждённой агрессивной среде",
      "очистка годных плиток и кирпича от раствора в составе нормы",
      "труд рабочих среднего разряда 3,8 по норме 30,86 чел.-ч на 100 м²",
      "передвижной компрессор 5 м³/мин до 686 кПа, 0,57 маш.-ч на 100 м²",
      "пневматические отбойные молотки 1,14 маш.-ч на 100 м²",
      "справочный труд машинистов 0,57 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новое плиточное покрытие, основание, стяжка и отделка",
      "обычная неагрессивная среда",
      "плитки на битумной мастике, растворе или другой постели, кирпич и иные покрытия колонок 01–02 и 04–14",
      "ремонт и восстановление основания и примыканий",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_COVERING",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingFloorCoveringMaterial: "TILE",
    existingTileBedding: "SILICATE_PUTTY",
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-011-03",
    classificationFactorClaimed: false,
    ordinaryEnvironmentIncluded: false,
    otherBeddingOrColumnIncluded: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:aggressive_environment_tile_on_silicate_putty_floor_demolition:labor",
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_TILE_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_floor_covering_material: "TILE",
      existing_tile_bedding: "SILICATE_PUTTY",
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      classification_factor_claimed: false,
      ordinary_environment_included: false,
      other_bedding_or_column_included: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-03-aggressive-environment-tile-on-silicate-putty-floor-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: "46-04-011-03",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPage: 59,
      exactLocator: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        "existing_aggressive_environment_tile_on_silicate_putty_floor_profile",
        "existing_tile_on_silicate_putty_aggressive_environment_confirmed",
      ],
      existingFloorCoveringMaterial: "TILE",
      existingTileBedding: "SILICATE_PUTTY",
      environmentClass: "AGGRESSIVE",
      constructionLaborRatePer100M2: 30.86,
      machinistLaborRatePer100M2: 0.57,
      compressorMachineHourRatePer100M2: 0.57,
      pneumaticBreakerMachineHourRatePer100M2: 1.14,
      machinistLaborPricedSeparately: false,
      classificationFactorClaimed: false,
      ordinaryEnvironmentIncluded: false,
      otherBeddingOrColumnIncluded: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu,
    aliases: [
      `разборка плитки на силикатной замазке в агрессивной среде ${contextRu}`,
      `демонтаж плиточного пола в химическом помещении ${contextRu}`,
      `КРЕР 46-04-011-03 ${contextRu}`,
      `${stem} aggressive environment tile on bituminous mastic demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённого плиточного покрытия на силикатной замазке в агрессивной среде ${contextRu}: труд 30,86 чел.-ч, компрессор 0,57 маш.-ч и пневматические молотки 1,14 маш.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      "existing_aggressive_environment_tile_on_silicate_putty_floor_profile",
      "existing_tile_on_silicate_putty_aggressive_environment_confirmed",
    ],
    clarificationFields: [
      "existing_aggressive_environment_tile_on_silicate_putty_floor_profile",
      "existing_tile_on_silicate_putty_aggressive_environment_confirmed",
    ],
    includedBoundaries: [
      "плитки на силикатной замазке в подтверждённой агрессивной среде",
      "очистка годных плиток и кирпича от раствора",
      "компрессор, пневматические молотки и точная трудовая норма КРЕР 46-04-011-03",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "обычная неагрессивная среда",
      "плитки на битумной мастике, растворе и покрытия других типов колонок 01–02 и 04–14",
      "новое покрытие пола и восстановление основания",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж плитка плиточное покрытие силикатная замазка агрессивная среда компрессор пневматический отбойный молоток ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401101: true,
      exactOfficialArtifactSha256:
        AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborCompressorAndBreakerRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      classificationFactorRejected: true,
      ordinaryEnvironmentRejected: true,
      otherBeddingsAndColumnsRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_tile|tile_install|нов.*плит|устрой.*плит/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /tile_on_bituminous_mastic|brick_floor|polymer_cement|битумн.*мастик|кирпичн.*покрыт/iu,
    /floor_repair|screed_install|восстанов.*основан|устрой.*стяж/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_SILICATE_PUTTY_FLOOR_DEMOLITION_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
