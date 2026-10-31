import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOODEN_PARTITION_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS,
  WOODEN_PARTITION_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_PARTITION_DEMOLITION_KRER46_NORM_ID,
  WOODEN_PARTITION_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES,
  WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_ID,
  WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_METADATA,
  compileWoodenPartitionDemolitionKrer46R1,
  resolveWoodenPartitionDemolitionKrer46Variant,
  type WoodenPartitionDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/woodenPartitionDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_WOODEN_PARTITION_DEMOLITION_VARIANT ?? "wet_zone",
) as WoodenPartitionDemolitionKrer46VariantKey;
if (!( [ "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_WOODEN_PARTITION_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveWoodenPartitionDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = "влажной зоны";
const canonicalNameRu = "Разборка оштукатуренной однослойной деревянной щитовой перегородки — влажная зона";

async function verifyCore(): Promise<Json> {
  const short = await compileWoodenPartitionDemolitionKrer46R1(
    { ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileWoodenPartitionDemolitionKrer46R1(
    { ...WOODEN_PARTITION_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileWoodenPartitionDemolitionKrer46R1(
    { partition_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 4
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_partition_demolition:labor")?.quantity === "42.86"
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_partition_demolition:lift_500kg")?.quantity === "7.41")) {
    throw new Error(
      `STOP_S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 4
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_partition_demolition:labor")?.quantity === "15.2153"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_partition_demolition:lift_500kg")?.quantity === "2.63055")) {
    throw new Error(
      `STOP_S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error(
      `STOP_S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS,
    resources: WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-006-01",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "42.86",
      machinistLaborManHours: "7.41",
      liftMachineHours: "7.41",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "15.2153",
      machinistLaborManHours: "2.63055",
      liftMachineHours: "2.63055",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 4 },
    machinistLaborPricedSeparately: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-wooden-partition-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_WOODEN_PARTITION_DEMOLITION_${token}`,
  applicationName: `s27-3-f09-wooden-partition-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "7c1b52f1-ddd0-5913-807e-367ccec0dda5",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "35c1822f-838d-53f2-bcef-571d4f3b4894",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `wooden-partition-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodenPartitionDemolitionKrer46R1.ts",
    "tests/estimateNorms/woodenPartitionDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodenPartitionDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_ID,
  normId: WOODEN_PARTITION_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: WOODEN_PARTITION_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES,
  shortInput: WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: WOODEN_PARTITION_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOODEN_PARTITION_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: canonicalNameRu,
    workKey:
      `plastered_single_layer_timber_board_panel_partition_demolition_krer_46_04_006_01_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь оштукатуренной однослойной деревянной щитовой перегородки из досок ${contextRu} разобрана по КРЕР 46-04-006-01`,
    includedScopeRu: [
      "разборка существующей однослойной щитовой перегородки из досок со снятием креплений",
      "отбивка штукатурки с перегородки",
      "труд рабочих среднего разряда 1,6 по норме 42,86 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота 45 м, 7,41 маш.-ч на 100 м²",
      "справочный труд машинистов 7,41 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новая перегородка, каркас, доски, штукатурка и отделка",
      "восстановление примыкающих стен, пола и потолка",
      "сплошные перегородки с утеплением, чистые дощатые, гипсовые, шлакобетонные и древесноволокнистые перегородки",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      WOODEN_PARTITION_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_WOODEN_PARTITION",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "partition_area_m2",
    geometryParameters: ["partition_area_m2"],
    existingPartitionMaterial: "WOOD",
    existingPartitionConstruction: "PLASTERED_SINGLE_LAYER_TIMBER_BOARD_PANEL",
    officialUnitRateSource: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-006-01",
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:wooden_partition_demolition:labor",
    applicability: {
      technology_class: "WOODEN_PARTITION_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_PARTITION",
      catalog_variant: variant.catalogVariant,
      existing_partition_material: "WOOD",
      existing_partition_construction: "PLASTERED_SINGLE_LAYER_TIMBER_BOARD_PANEL",
      source_id: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: WOODEN_PARTITION_DEMOLITION_KRER46_NORM_ID,
      exact_locator: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      classification_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-006-01-wooden-partition-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-006",
      rate: "46-04-006-01",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopeAndResourceRatePrintedAndPdfPage: 55,
      exactLocator: WOODEN_PARTITION_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "partition_area_m2",
        "existing_partition_profile",
        "existing_plastered_single_layer_timber_board_panel_partition_confirmed",
      ],
      existingPartitionConstruction: "PLASTERED_SINGLE_LAYER_TIMBER_BOARD_PANEL",
      constructionLaborRatePer100M2: 42.86,
      machinistLaborRatePer100M2: 7.41,
      liftMachineHourRatePer100M2: 7.41,
      machinistLaborPricedSeparately: false,
      classificationFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu,
    aliases: [
      `разборка оштукатуренной деревянной щитовой перегородки ${contextRu}`,
      `демонтаж однослойной перегородки из досок ${contextRu}`,
      `КРЕР 46-04-006-01 ${contextRu}`,
      `${stem} plastered timber board panel partition demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённой оштукатуренной однослойной деревянной щитовой перегородки ${contextRu} по площади: труд 42,86 чел.-ч и подъёмник 7,41 маш.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "partition_area_m2",
      "existing_partition_profile",
      "existing_plastered_single_layer_timber_board_panel_partition_confirmed",
    ],
    clarificationFields: [
      "existing_partition_profile",
      "existing_plastered_single_layer_timber_board_panel_partition_confirmed",
    ],
    includedBoundaries: [
      "однослойная деревянная щитовая перегородка из досок",
      "снятие креплений и отбивка штукатурки в составе разборки",
      "подъёмник и точная трудовая норма КРЕР 46-04-006-01",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новая перегородка и восстановление примыкающих конструкций",
      "сплошная утеплённая, чистая дощатая, гипсовая, шлакобетонная или древесноволокнистая перегородка",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж оштукатуренная деревянная щитовая однослойная перегородка доски крепления штукатурка ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460400601: true,
      exactOfficialArtifactSha256:
        WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndLiftRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      classificationFactorRejected: true,
      adjacentPartitionReinstatementRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_partition|partition_install|нов.*перегород|устрой.*перегород/iu,
    /window|door|окн|двер/iu,
    /wall_repair|ceiling_repair|floor_repair|восстанов.*стен|ремонт.*перегород/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_WOODEN_PARTITION_DEMOLITION_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_WOODEN_PARTITION_DEMOLITION_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
