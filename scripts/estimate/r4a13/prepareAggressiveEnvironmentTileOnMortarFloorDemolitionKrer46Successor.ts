import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
    ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
    ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
    floor_covering_area_m2: 100,
  });
  if (!(short.rows.length === 5
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:labor")
      ?.quantity === "36.77"
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "0.46"
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:pneumatic_breaker")
      ?.quantity === "0.92")) {
    throw new Error(
      "STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_FIXTURE",
    );
  }
  if (!(acceptance.rows.length === 5
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:labor")
      ?.quantity === "13.05335"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "0.1633"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_mortar_floor_demolition:pneumatic_breaker")
      ?.quantity === "0.3266")) {
    throw new Error(
      "STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error(
      "STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FAIL_CLOSED",
    );
  }
  const serialized = JSON.stringify({
    formulas: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS,
    resources: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      "STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_HIDDEN_FACTOR",
    );
  }
  return {
    status: "GREEN_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CORE",
    catalogId: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
    exactRate: "46-04-011-02",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "36.77",
      machinistLaborManHours: "0.46",
      compressorMachineHours: "0.46",
      pneumaticBreakerMachineHours: "0.92",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "13.05335",
      machinistLaborManHours: "0.1633",
      compressorMachineHours: "0.1633",
      pneumaticBreakerMachineHours: "0.3266",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 5 },
    machinistLaborPricedSeparately: false,
    hiddenAreaFactorClaimed: false,
    ordinaryEnvironmentIncluded: false,
    otherBeddingOrColumnIncluded: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-3.f09-aggressive-environment-tile-on-mortar-floor-demolition-krer46-successor.v1",
  stopCode: "S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-aggressive-environment-tile-on-mortar-floor-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "46571756-532a-5656-8886-ec0745eef685",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "ffb46fd3-7682-5e96-ab6c-8eb02586ade6",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "aggressive-environment-tile-on-mortar-floor-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1.ts",
    "tests/estimateNorms/aggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка плиточного покрытия на растворе в агрессивной среде",
    workKey: "aggressive_environment_tile_on_mortar_demolition_krer_46_04_011_02",
    physicalResultRu:
      "Подтверждённая площадь существующего плиточного покрытия на растворе в агрессивной среде разобрана по КРЕР 46-04-011-02",
    includedScopeRu: [
      "разборка плиток на растворе в подтверждённой агрессивной среде",
      "очистка годных плиток и кирпича от раствора в составе нормы",
      "труд рабочих среднего разряда 3,8 по норме 36,77 чел.-ч на 100 м²",
      "передвижной компрессор 5 м³/мин до 686 кПа, 0,46 маш.-ч на 100 м²",
      "пневматические отбойные молотки 0,92 маш.-ч на 100 м²",
      "справочный труд машинистов 0,46 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новое плиточное покрытие, основание, стяжка и отделка",
      "обычная неагрессивная среда",
      "плитки на битумной мастике или другой постели, кирпич и иные покрытия колонки 01 и колонок 03–14",
      "ремонт и восстановление основания и примыканий",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_COVERING",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingFloorCoveringMaterial: "TILE",
    existingTileBedding: "MORTAR",
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-011-02",
    hiddenAreaFactorClaimed: false,
    ordinaryEnvironmentIncluded: false,
    otherBeddingOrColumnIncluded: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:aggressive_environment_tile_on_mortar_floor_demolition:labor",
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_TILE_FLOOR_COVERING",
      existing_floor_covering_material: "TILE",
      existing_tile_bedding: "MORTAR",
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      hidden_area_factor_claimed: false,
      ordinary_environment_included: false,
      other_bedding_or_column_included: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-011-02-aggressive-environment-tile-on-mortar-floor-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: "46-04-011-02",
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPage: 59,
      exactLocator: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        "existing_aggressive_environment_tile_on_mortar_floor_profile",
        "existing_tile_on_mortar_aggressive_environment_confirmed",
      ],
      existingFloorCoveringMaterial: "TILE",
      existingTileBedding: "MORTAR",
      environmentClass: "AGGRESSIVE",
      constructionLaborRatePer100M2: 36.77,
      machinistLaborRatePer100M2: 0.46,
      compressorMachineHourRatePer100M2: 0.46,
      pneumaticBreakerMachineHourRatePer100M2: 0.92,
      machinistLaborPricedSeparately: false,
      hiddenAreaFactorClaimed: false,
      ordinaryEnvironmentIncluded: false,
      otherBeddingOrColumnIncluded: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Разборка плиточного покрытия на растворе в агрессивной среде",
    aliases: [
      "разборка плитки на растворе в агрессивной среде",
      "демонтаж плиточного пола на растворе химическое помещение",
      "очистка годных плиток после разборки",
      "КРЕР 46-04-011-02",
      "aggressive environment tile on bituminous mastic floor demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого плиточного покрытия на растворе в агрессивной среде: труд 36,77 чел.-ч, компрессор 0,46 маш.-ч и пневматические молотки 0,92 маш.-ч на 100 м².",
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      "existing_aggressive_environment_tile_on_mortar_floor_profile",
      "existing_tile_on_mortar_aggressive_environment_confirmed",
    ],
    clarificationFields: [
      "existing_aggressive_environment_tile_on_mortar_floor_profile",
      "existing_tile_on_mortar_aggressive_environment_confirmed",
    ],
    includedBoundaries: [
      "плитки на растворе в подтверждённой агрессивной среде",
      "очистка годных плиток и кирпича от раствора",
      "компрессор, пневматические молотки и точная трудовая норма КРЕР 46-04-011-02",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "обычная неагрессивная среда",
      "плитки на битумной мастике и покрытия других типов колонки 01 и колонок 03–14",
      "новое покрытие пола и восстановление основания",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "разборка демонтаж плитка плиточное покрытие раствор агрессивная среда компрессор пневматический отбойный молоток КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460401101: true,
      exactOfficialArtifactSha256:
        AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborCompressorAndBreakerRatesApplied: true,
      machinistLaborNoDoubleCount: true,
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
  owner: "S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
