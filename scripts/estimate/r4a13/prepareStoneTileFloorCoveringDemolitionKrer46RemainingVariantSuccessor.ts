import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  compileStoneTileFloorDemolitionKrer46R1,
  resolveStoneTileFloorDemolitionKrer46Variant,
  type StoneTileFloorDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/stoneTileFloorCoveringDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_STONE_TILE_FLOOR_DEMOLITION_VARIANT ?? "large_area",
) as StoneTileFloorDemolitionKrer46VariantKey;
if (!( ["large_area", "small_area", "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_STONE_TILE_FLOOR_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveStoneTileFloorDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = variantKey === "large_area"
  ? "большой площади"
  : variantKey === "small_area" ? "малой площади" : "влажной зоны";

async function verifyCore(): Promise<Json> {
  const short = await compileStoneTileFloorDemolitionKrer46R1(
    { ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileStoneTileFloorDemolitionKrer46R1(
    { ...STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileStoneTileFloorDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 2
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:stone_tile_floor_demolition:labor")?.quantity === "39.18")) {
    throw new Error(
      `STOP_S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 2
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:stone_tile_floor_demolition:labor")?.quantity === "13.9089")) {
    throw new Error(
      `STOP_S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 2)) {
    throw new Error(
      `STOP_S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
    resources: STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-010-05",
    short: { rowCount: short.rows.length, laborManHours: "39.18" },
    acceptance: { areaM2: "35.5", laborManHours: "13.9089" },
    incomplete: { rowCount: 0, preliminaryNeedCount: 2 },
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-stone-tile-floor-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_STONE_TILE_FLOOR_DEMOLITION_${token}`,
  applicationName:
    `s27-3-f09-stone-tile-floor-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "37c39b1b-c078-52eb-8a91-94e1058c684e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "f283066b-0808-54cd-8dd4-14ca7a2f314d",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `stone-tile-floor-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/stoneTileFloorCoveringDemolitionKrer46R1.ts",
    "tests/estimateNorms/stoneTileFloorCoveringDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareStoneTileFloorCoveringDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
  shortInput: STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_STONE_TILE_FLOOR_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `stone_tile_floor_covering_demolition_krer_46_04_010_05_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующего покрытия пола из каменной плитки ${contextRu} разобрана по КРЕР 46-04-010-05`,
    includedScopeRu: [
      "разборка существующего покрытия пола из каменной плитки",
      "труд рабочих среднего разряда 2,0 по норме 39,18 чел.-ч на 100 м²",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "бетонное основание и стяжка под покрытием",
      "новое покрытие, клей, раствор и отделочные слои",
      "внеобъектовый вывоз и размещение отходов",
      "другие материалы покрытия и соседние колонки КРЕР 46-04-010",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_STONE_TILE_FLOOR_COVERING",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingCoveringMaterial: "STONE_TILE",
    officialUnitRateSource: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-010-05",
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:stone_tile_floor_demolition:labor",
    applicability: {
      technology_class: "STONE_TILE_FLOOR_COVERING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_covering_material: "STONE_TILE",
      source_id: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
      exact_locator: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_39_18_MAN_HOURS_PER_100_M2",
      classification_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-010-05-stone-tile-floor-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-010",
      rate: "46-04-010-05",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 57,
      resourceRatePrintedAndPdfPage: 58,
      exactLocator: STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        "existing_covering_profile",
        "existing_stone_tile_covering_confirmed",
      ],
      laborRatePer100M2: 39.18,
      classificationFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж каменной плитки с пола ${contextRu}`,
      `снятие покрытия пола из каменной плитки ${contextRu}`,
      `КРЕР 46-04-010-05 ${contextRu}`,
      `${stem} stone tile floor covering demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённого существующего покрытия пола из каменной плитки ${contextRu} по площади; труд 39,18 чел.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      "existing_covering_profile",
      "existing_stone_tile_covering_confirmed",
    ],
    clarificationFields: [
      "existing_covering_profile",
      "existing_stone_tile_covering_confirmed",
    ],
    includedBoundaries: [
      "разборка каменной плитки",
      "внутриобъектовое перемещение отходов в границах нормы",
      "точная трудовая норма КРЕР 46-04-010-05",
    ],
    excludedBoundaries: [
      "основание и новая конструкция пола",
      "внеобъектовый вывоз и полигон",
      "другие покрытия и скрытые коэффициенты",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж снятие покрытие пол каменная плитка ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401005: true,
      exactOfficialArtifactSha256:
        STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborRateApplied: true,
      classificationFactorRejected: true,
      adjacentFloorLayersRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_floor|adhesive|screed_install|нов.*покрыт|клей|устройств.*стяж/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /parquet|asphalt|wood_block|metal_plate|паркет|асфальт|деревян|металл/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_STONE_TILE_FLOOR_DEMOLITION_KRER46_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_STONE_TILE_FLOOR_DEMOLITION_KRER46_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
