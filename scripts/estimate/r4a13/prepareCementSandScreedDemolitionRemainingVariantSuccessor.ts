import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
  CEMENT_SAND_SCREED_DEMOLITION_FORMULAS,
  CEMENT_SAND_SCREED_DEMOLITION_INDEPENDENT_COMPLETENESS_MAP,
  CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
  CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS,
  CEMENT_SAND_SCREED_DEMOLITION_RESOURCES,
  CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
  CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
  CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA,
  compileCementSandScreedDemolitionR1,
  resolveCementSandScreedDemolitionVariant,
  type CementSandScreedDemolitionVariantKey,
} from "../../../src/lib/estimate/v4/cementSandScreedDemolitionR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_SCREED_DEMOLITION_VARIANT ?? "small_area",
) as CementSandScreedDemolitionVariantKey;
if (!(["small_area", "wet_zone"] as const).includes(variantKey as never)) {
  throw new Error(`STOP_S273_F09_SCREED_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`);
}
const variant = resolveCementSandScreedDemolitionVariant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = variantKey === "small_area" ? "малой площади" : "влажной зоны";

async function verifyCore(): Promise<Json> {
  const short = await compileCementSandScreedDemolitionR1(
    { ...CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const complete = await compileCementSandScreedDemolitionR1(
    { ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const withWater = await compileCementSandScreedDemolitionR1({
    ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
    dust_suppression_mode: "REQUIRED",
    dust_suppression_water_volume_l: 300,
  }, { catalogId: variant.catalogId });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "rc09:screed_demolition"
    && short.rows[0]?.quantity === "150"
    && short.preliminaryNeeds.length === 8)) {
    throw new Error(`STOP_S273_F09_SCREED_DEMOLITION_${token}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 8
    && complete.preliminaryNeeds.length === 0
    && withWater.rows.length === 9
    && withWater.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_S273_F09_SCREED_DEMOLITION_${token}_COMPLETE_COMPOSITION`);
  }
  const serialized = JSON.stringify({
    formulas: CEMENT_SAND_SCREED_DEMOLITION_FORMULAS,
    resources: CEMENT_SAND_SCREED_DEMOLITION_RESOURCES,
  });
  if (/small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(`STOP_S273_F09_SCREED_DEMOLITION_${token}_HIDDEN_FACTOR`);
  }
  return {
    status: `GREEN_S273_F09_SCREED_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
    },
    conditionalWaterRowCount: withWater.rows.length,
    classificationFactorClaimed: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-cement-sand-screed-demolition-${stem}-successor.v1`,
  stopCode: `S273_F09_SCREED_DEMOLITION_${token}`,
  applicationName: `s27-3-f09-screed-demolition-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "693858af-2d51-58c2-987a-e4ca84dbc432",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "9feb9d52-5b5e-51f0-81f4-29248fd67458",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `cement-sand-screed-demolition-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/cementSandScreedDemolitionR1.ts",
    "tests/estimateNorms/cementSandScreedDemolitionR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareCementSandScreedDemolitionRemainingVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
  normId: CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
  sourceMetadata: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA,
  parameterDefinitions: CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS,
  formulaDefinitions: CEMENT_SAND_SCREED_DEMOLITION_FORMULAS,
  resourceDefinitions: CEMENT_SAND_SCREED_DEMOLITION_RESOURCES,
  shortInput: CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
  acceptanceInput: CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_CEMENT_SAND_SCREED_DEMOLITION_${token}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `cement_sand_screed_demolition_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующей цементно-песчаной стяжки ${contextRu} демонтирована, а защита, оборудование и отходы учтены по прямым проектным данным`,
    includedScopeRu: [
      "резка и демонтаж по подтверждённой площади существующей цементно-песчаной стяжки",
      "пылезащитная плёнка, тара и расходные материалы по утверждённым планам",
      "отбойное и пылеудаляющее оборудование по ППР и ведомости",
      "масса и передача отходов по утверждённому маршруту",
      "вода только при явно выбранной ветви пылеподавления",
    ],
    excludedScopeRu: [
      "скрытый коэффициент площади, зоны или производительности",
      "автоматическая плотность, масса отходов и расход воды",
      "новая стяжка, гидроизоляция и чистовое покрытие пола",
      "демонтаж других материалов без подтверждения цементно-песчаной стяжки",
      "неподтверждённые нормы и цены",
    ],
    independentCompletenessMap:
      CEMENT_SAND_SCREED_DEMOLITION_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DEMOLISH_EXISTING_CEMENT_SAND_SCREED",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2", "existing_screed_thickness_mm"],
    substrate: "EXISTING_CEMENT_SAND_SCREED",
    projectPackageSource: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
    classificationFactorClaimed: false,
    universalProductivityClaimed: false,
    adjacentNewFloorScopeExcluded: true,
  },
  binding: {
    rowId: "rc09:screed_demolition",
    applicability: {
      technology_class: "EXISTING_CEMENT_SAND_SCREED_DEMOLITION",
      operation_class: "CUT_AND_DEMOLISH_EXISTING_SCREED",
      catalog_variant: variant.catalogVariant,
      source_id: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
      norm_id: CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
      exact_locator: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.exact_locator,
      quantity_basis: "CONFIRMED_AREA_AND_DIRECT_APPROVED_PROJECT_INPUTS",
      classification_factor_claimed: false,
      adjacent_new_floor_scope_excluded: true,
    },
  },
  locator: {
    key: `project-cement-sand-screed-demolition-${stem}-v1`,
    payload: {
      kind: "APPROVED_PROJECT_SYSTEM_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.exact_locator,
      knownScopeInputs: ["area_m2", "existing_screed_thickness_mm"],
      directProjectInputsRequired: true,
      classificationFactorClaimed: false,
      universalProductivityClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж стяжки ${contextRu}`,
      `разборка цементно-песчаной стяжки ${contextRu}`,
      `${stem} cement sand screed demolition`,
    ],
    shortScopeRu:
      `Демонтаж подтверждённой цементно-песчаной стяжки ${contextRu} по фактической площади без скрытого коэффициента; остальные количества — из ППР и ведомостей.`,
    keyDistinguishingParameters: ["area_m2", "existing_screed_thickness_mm"],
    clarificationFields: [
      "dust_protection_film_area_m2",
      "waste_bag_quantity_piece",
      "diamond_cutting_disc_quantity_piece",
      "electric_breaker_machine_h",
      "industrial_vacuum_machine_h",
      "screed_waste_mass_t",
      "dust_suppression_mode",
    ],
    includedBoundaries: [
      "существующая цементно-песчаная стяжка",
      "демонтаж по фактической площади",
      "защита, оборудование и отходы по прямым проектным данным",
    ],
    excludedBoundaries: [
      "скрытый коэффициент площади или зоны",
      "новая конструкция пола",
      "неподтверждённые расход, производительность и цена",
    ],
    extraSearchTermsRu:
      `демонтаж стяжка цемент песок ${contextRu} резка пылезащита отходы ППР`,
    sourceProvenance: {
      approvedProjectPackageRequired: true,
      exactUserAreaApplied: true,
      directProjectQuantitiesRequired: true,
      classificationFactorRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_screed|новая стяжка|устройство стяжки/iu,
    /tile|laminate|parquet|плитк|ламинат|паркет/iu,
    /waterproofing|гидроизоляц/iu,
    /small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_CEMENT_SAND_SCREED_DEMOLITION_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_SCREED_DEMOLITION_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
