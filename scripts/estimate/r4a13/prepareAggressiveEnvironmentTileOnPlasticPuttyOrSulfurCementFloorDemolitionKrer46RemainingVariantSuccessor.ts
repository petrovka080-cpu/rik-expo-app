import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1,
  resolveAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46Variant,
  type AggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_VARIANT ?? "large_area",
) as AggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46VariantKey;
if (!( ["large_area", "small_area", "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = variantKey === "large_area"
  ? "большой площади"
  : variantKey === "small_area" ? "малой площади" : "влажной зоны";

async function verifyCore(): Promise<Json> {
  const short = await compileAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 2
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_demolition:labor")?.quantity === "15.9")) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 2
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_demolition:labor")?.quantity === "5.6445")) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 2)) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_FORMULAS,
    resources: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge|compressor|pneumatic_breaker|machinist|machine_hour/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-011-05",
    short: { rowCount: short.rows.length, laborManHours: "15.9" },
    acceptance: { areaM2: "35.5", laborManHours: "5.6445" },
    incomplete: { rowCount: 0, preliminaryNeedCount: 2 },
    machineResourcesIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-aggressive-environment-tile-on-plastic-putty-or-sulfur-cement-floor-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_${token}`,
  applicationName:
    `s27-3-f09-aggressive-environment-tile-on-plastic-putty-or-sulfur-cement-floor-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b6baa14f-45e8-5e8b-b268-2366f1f65ae7",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e8a1c885-327b-5c75-a43e-c2b23e903b43",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `aggressive-environment-tile-on-plastic-putty-or-sulfur-cement-floor-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1.ts",
    "tests/estimateNorms/aggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46Successor.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentTileOnPlasticPuttyOrSulfurCementFloorDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_demolition_krer_46_04_011_05_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующего плиточного покрытия на пластзамазке или серном цементе в агрессивной среде ${contextRu} разобрана по КРЕР 46-04-011-05`,
    includedScopeRu: [
      "разборка существующего плиточного покрытия на пластзамазке или серном цементе в агрессивной среде",
      "очистка годных плиток и кирпича от раствора в составе нормы",
      "труд рабочих среднего разряда 3,3 по норме 15,90 чел.-ч на 100 м²",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "бетонное основание и стяжка под покрытием",
      "новое покрытие, клей, раствор и отделочные слои",
      "машины, материалы и труд машиниста, отсутствующие в колонке 46-04-011-05",
      "внеобъектовый вывоз и размещение отходов",
      "колонки 46-04-011-01–04 и 46-04-011-06–14, другие замазки и обычная среда",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_AGGRESSIVE_ENVIRONMENT_FLOOR_COVERING",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingCoveringMaterial: "TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_AGGRESSIVE_ENVIRONMENT",
    existingTileBedding: "PLASTIC_PUTTY_OR_SULFUR_CEMENT",
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-011-05",
    machineResourcesIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_demolition:labor",
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_covering_material: "TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_AGGRESSIVE_ENVIRONMENT",
      existing_tile_bedding: "PLASTIC_PUTTY_OR_SULFUR_CEMENT",
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_15_90_MAN_HOURS_PER_100_M2",
      machine_resources_included: false,
      classification_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-05-aggressive-environment-tile-on-plastic-putty-or-sulfur-cement-floor-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: "46-04-011-05",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPage: 59,
      exactLocator: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        "existing_aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_profile",
        "existing_tile_on_plastic_putty_or_sulfur_cement_aggressive_environment_confirmed",
      ],
      existingTileBedding: "PLASTIC_PUTTY_OR_SULFUR_CEMENT",
      environmentClass: "AGGRESSIVE",
      laborRatePer100M2: 15.90,
      machineResourcesIncluded: false,
      classificationFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж плитки на пластзамазке или серном цементе в агрессивной среде с пола ${contextRu}`,
      `снятие плиточного покрытия на пластзамазке или серном цементе в агрессивной среде ${contextRu}`,
      `КРЕР 46-04-011-05 ${contextRu}`,
      `${stem} aggressive-environment tile-on-plastic-putty-or-sulfur-cement floor covering demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённого существующего плиточного покрытия на пластзамазке или серном цементе в агрессивной среде ${contextRu} по площади; труд 15,90 чел.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      "existing_aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_profile",
      "existing_tile_on_plastic_putty_or_sulfur_cement_aggressive_environment_confirmed",
    ],
    clarificationFields: [
      "existing_aggressive_environment_tile_on_plastic_putty_or_sulfur_cement_floor_profile",
      "existing_tile_on_plastic_putty_or_sulfur_cement_aggressive_environment_confirmed",
    ],
    includedBoundaries: [
      "разборка плитки на пластзамазке или серном цементе в агрессивной среде",
      "очистка годных плиток и кирпича от раствора",
      "внутриобъектовое перемещение отходов в границах нормы",
      "точная трудовая норма КРЕР 46-04-011-05",
    ],
    excludedBoundaries: [
      "основание и новая конструкция пола",
      "машины и материалы, отсутствующие в колонке 46-04-011-05",
      "внеобъектовый вывоз и полигон",
      "другие замазки, обычная среда, соседние колонки и скрытые коэффициенты",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж снятие покрытие пол плитка на пластзамазке или серном цементе в агрессивной среде ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401105: true,
      exactOfficialArtifactSha256:
        AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborRateApplied: true,
      machineResourcesRejected: true,
      otherBeddingsAndColumnsRejected: true,
      ordinaryEnvironmentRejected: true,
      classificationFactorRejected: true,
      adjacentFloorLayersRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_floor|adhesive|screed_install|нов.*покрыт|клей|устройств.*стяж/iu,
    /compressor|pneumatic_breaker|machinist|machine_hour|material_row/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /arz(amite)?_putty|silicate_putty|bituminous_mastic|арзамит|силикатн|битумн/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /parquet|asphalt|wood_block|metal_plate|паркет|асфальт|деревян|металл/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_AGGRESSIVE_ENVIRONMENT_TILE_ON_PLASTIC_PUTTY_OR_SULFUR_CEMENT_FLOOR_DEMOLITION_KRER46_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
