import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_NORM_ID,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_ID,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  compileWoodenDoorFillDemolitionKrer46R1,
  resolveWoodenDoorFillDemolitionKrer46Variant,
  type WoodenDoorFillDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/woodenDoorOpeningFillDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_WOODEN_DOOR_FILL_DEMOLITION_VARIANT ?? "large_area",
) as WoodenDoorFillDemolitionKrer46VariantKey;
if (!( ["large_area", "small_area", "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveWoodenDoorFillDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = variantKey === "large_area"
  ? "большой площади"
  : variantKey === "small_area" ? "малой площади" : "влажной зоны";

async function verifyCore(): Promise<Json> {
  const short = await compileWoodenDoorFillDemolitionKrer46R1(
    { ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileWoodenDoorFillDemolitionKrer46R1(
    { ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileWoodenDoorFillDemolitionKrer46R1(
    { opening_fill_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 4
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_door_fill_demolition:labor")?.quantity === "103.91"
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_door_fill_demolition:lift_500kg")?.quantity === "7.74")) {
    throw new Error(
      `STOP_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 4
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_door_fill_demolition:labor")?.quantity === "36.88805"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_door_fill_demolition:lift_500kg")?.quantity === "2.7477")) {
    throw new Error(
      `STOP_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error(
      `STOP_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS,
    resources: WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-012-03",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "103.91",
      machinistLaborManHours: "7.74",
      liftMachineHours: "7.74",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "36.88805",
      machinistLaborManHours: "2.7477",
      liftMachineHours: "2.7477",
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
    `rik-expo-app.s27-3.f09-wooden-door-fill-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}`,
  applicationName: `s27-3-f09-wooden-door-fill-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "5cf2b48e-f429-5b81-b1e3-b3835402bedd",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "26f398da-2547-5fee-9797-fb01d6f8a386",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `wooden-door-fill-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/woodenDoorOpeningFillDemolitionKrer46R1.ts",
    "tests/estimateNorms/woodenDoorOpeningFillDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodenDoorOpeningFillDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_ID,
  normId: WOODEN_DOOR_FILL_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: WOODEN_DOOR_FILL_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES,
  shortInput: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: WOODEN_DOOR_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_WOODEN_DOOR_FILL_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `wooden_door_opening_fill_demolition_krer_46_04_012_03_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующего деревянного дверного заполнения ${contextRu} разобрана по КРЕР 46-04-012-03`,
    includedScopeRu: [
      "снятие существующих деревянных дверных полотен",
      "выемка коробок со снятием наличников и отбивкой откосов и четвертей в проёмах",
      "труд рабочих среднего разряда 2,4 по норме 103,91 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота 45 м, 7,74 маш.-ч на 100 м²",
      "справочный труд машинистов 7,74 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новый дверной блок, полотно, коробка, наличники и фурнитура",
      "восстановление кладки, откосов, четвертей и отделки проёма",
      "оконные, металлические и иные заполнения проёмов",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      WOODEN_DOOR_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_WOODEN_DOOR_OPENING_FILL",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "opening_fill_area_m2",
    geometryParameters: ["opening_fill_area_m2"],
    existingOpeningFillMaterial: "WOOD",
    existingOpeningFillKind: "DOOR",
    officialUnitRateSource: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-012-03",
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:wooden_door_fill_demolition:labor",
    applicability: {
      technology_class: "WOODEN_DOOR_OPENING_FILL_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_OPENING_FILL",
      catalog_variant: variant.catalogVariant,
      existing_opening_fill_material: "WOOD",
      existing_opening_fill_kind: "DOOR",
      source_id: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: WOODEN_DOOR_FILL_DEMOLITION_KRER46_NORM_ID,
      exact_locator: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      classification_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-012-03-wooden-door-fill-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-012",
      rate: "46-04-012-03",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopeAndResourceRatePrintedAndPdfPage: 60,
      exactLocator: WOODEN_DOOR_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "opening_fill_area_m2",
        "existing_opening_fill_profile",
        "existing_wooden_door_fill_confirmed",
      ],
      constructionLaborRatePer100M2: 103.91,
      machinistLaborRatePer100M2: 7.74,
      liftMachineHourRatePer100M2: 7.74,
      machinistLaborPricedSeparately: false,
      classificationFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `разборка деревянного дверного блока ${contextRu}`,
      `демонтаж деревянной двери с коробкой ${contextRu}`,
      `КРЕР 46-04-012-03 ${contextRu}`,
      `${stem} wooden door opening fill demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённого существующего деревянного дверного заполнения ${contextRu} по площади: труд 103,91 чел.-ч и подъёмник 7,74 маш.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "opening_fill_area_m2",
      "existing_opening_fill_profile",
      "existing_wooden_door_fill_confirmed",
    ],
    clarificationFields: [
      "existing_opening_fill_profile",
      "existing_wooden_door_fill_confirmed",
    ],
    includedBoundaries: [
      "деревянные дверные полотна и коробки",
      "наличники, откосы и четверти в составе разборки",
      "подъёмник и точная трудовая норма КРЕР 46-04-012-03",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новое заполнение и восстановление проёма",
      "окна, металлические двери и другой материал",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж деревянная дверь полотно коробка ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401203: true,
      exactOfficialArtifactSha256:
        WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndLiftRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      classificationFactorRejected: true,
      adjacentOpeningRestorationRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_door|door_install|нов.*двер|установ.*двер/iu,
    /window|metal_door|окон|металлическ.*двер/iu,
    /masonry_repair|slope_restoration|восстанов.*откос|ремонт.*проём/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_WOODEN_DOOR_FILL_DEMOLITION_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
