import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAsphaltFloorCoveringDemolitionKrer46R1,
  resolveAsphaltFloorCoveringDemolitionKrer46Variant,
  type AsphaltFloorCoveringDemolitionKrer46VariantKey,
} from "../../../src/lib/estimate/v4/asphaltFloorCoveringDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_VARIANT ?? "wet_zone",
) as AsphaltFloorCoveringDemolitionKrer46VariantKey;
if (!( [ "wet_zone"] as const)
  .includes(variantKey as never)) {
  throw new Error(
    `STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_VARIANT_UNSUPPORTED:${variantKey}`,
  );
}
const variant = resolveAsphaltFloorCoveringDemolitionKrer46Variant(variantKey);
const token = variantKey.toUpperCase();
const stem = variantKey.replace(/_/gu, "-");
const contextRu = "влажной зоны";
const canonicalNameRu = "Разборка асфальтового или асфальтобетонного покрытия пола — влажная зона";

async function verifyCore(): Promise<Json> {
  const short = await compileAsphaltFloorCoveringDemolitionKrer46R1(
    { ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAsphaltFloorCoveringDemolitionKrer46R1(
    { ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAsphaltFloorCoveringDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  if (!(short.rows.length === 5
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:labor")?.quantity === "23.78"
    && short.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "4.71"
    && short.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:pneumatic_breaker")
      ?.quantity === "9.42")) {
    throw new Error(
      `STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_SHORT_FIXTURE`,
    );
  }
  if (!(acceptance.rows.length === 5
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:labor")?.quantity === "8.4419"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:compressor_5m3_min_686kpa")
      ?.quantity === "1.67205"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:asphalt_floor_covering_demolition:pneumatic_breaker")
      ?.quantity === "3.3441")) {
    throw new Error(
      `STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_ACCEPTANCE_FIXTURE`,
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error(
      `STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_FAIL_CLOSED`,
    );
  }
  const serialized = JSON.stringify({
    formulas: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
    resources: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  });
  if (/large_area_factor|small_area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error(
      `STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_HIDDEN_FACTOR`,
    );
  }
  return {
    status: `GREEN_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-010-01",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "23.78",
      machinistLaborManHours: "4.71",
      compressorMachineHours: "4.71",
      pneumaticBreakerMachineHours: "9.42",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "8.4419",
      machinistLaborManHours: "1.67205",
      compressorMachineHours: "1.67205",
      pneumaticBreakerMachineHours: "3.3441",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 5 },
    machinistLaborPricedSeparately: false,
    classificationFactorClaimed: false,
    floorBaseIncluded: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-3.f09-asphalt-floor-covering-demolition-krer46-${stem}-successor.v1`,
  stopCode: `S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}`,
  applicationName: `s27-3-f09-asphalt-floor-covering-demolition-krer46-${stem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b87bb1b7-d99e-52e8-8710-1d3d5b84e275",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e40870ee-f85d-5303-8a1c-0bb292d3dffe",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/`
      + `asphalt-floor-covering-demolition-krer46-${stem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/asphaltFloorCoveringDemolitionKrer46R1.ts",
    "tests/estimateNorms/asphaltFloorCoveringDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAsphaltFloorCoveringDemolitionKrer46RemainingVariantSuccessor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
  normId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  shortInput: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: `F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_${token}`,
  passport: {
    canonicalRuName: canonicalNameRu,
    workKey:
      `asphalt_floor_covering_demolition_krer_46_04_010_01_${variantKey}`,
    physicalResultRu:
      `Подтверждённая площадь существующего покрытия пола из асфальта или асфальтобетона ${contextRu} разобрана по КРЕР 46-04-010-01`,
    includedScopeRu: [
      "труд рабочих среднего разряда 3,6 по норме 23,78 чел.-ч на 100 м²",
      "передвижной компрессор 5 м³/мин до 686 кПа, 4,71 маш.-ч на 100 м²",
      "пневматические отбойные молотки 9,42 маш.-ч на 100 м²",
      "справочный труд машинистов 4,71 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новое покрытие пола, стяжка, подстилающий слой и отделка",
      "разборка бетонного основания пола по таблице 46-04-009",
      "покрытия пола иных типов по колонкам 46-04-010-02–07",
      "ремонт и восстановление основания и примыканий",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади, зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_ASPHALT_FLOOR_COVERING",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingFloorCoveringMaterial: "ASPHALT_OR_ASPHALT_CONCRETE",
    officialUnitRateSource: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-010-01",
    classificationFactorClaimed: false,
    floorBaseIncluded: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:asphalt_floor_covering_demolition:labor",
    applicability: {
      technology_class: "ASPHALT_FLOOR_COVERING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_floor_covering_material: "ASPHALT_OR_ASPHALT_CONCRETE",
      source_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
      exact_locator: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      classification_factor_claimed: false,
      floor_base_included: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-010-01-asphalt-floor-covering-demolition-${stem}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-010",
      rate: "46-04-010-01",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 57,
      resourceRatePrintedAndPdfPage: 58,
      exactLocator: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "floor_covering_area_m2",
        "existing_floor_covering_profile",
        "existing_asphalt_floor_covering_confirmed",
      ],
      existingFloorCoveringMaterial: "ASPHALT_OR_ASPHALT_CONCRETE",
      constructionLaborRatePer100M2: 23.78,
      machinistLaborRatePer100M2: 4.71,
      compressorMachineHourRatePer100M2: 4.71,
      pneumaticBreakerMachineHourRatePer100M2: 9.42,
      machinistLaborPricedSeparately: false,
      classificationFactorClaimed: false,
      floorBaseIncluded: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu,
    aliases: [
      `разборка асфальтового покрытия пола ${contextRu}`,
      `демонтаж асфальтобетонного покрытия пола ${contextRu}`,
      `КРЕР 46-04-010-01 ${contextRu}`,
      `${stem} asphalt floor covering demolition`,
    ],
    shortScopeRu:
      `Разборка подтверждённого покрытия пола из асфальта или асфальтобетона ${contextRu} по площади: труд 23,78 чел.-ч, компрессор 4,71 маш.-ч и пневматические молотки 9,42 маш.-ч на 100 м² без коэффициента классификации.`,
    keyDistinguishingParameters: [
      "floor_covering_area_m2",
      "existing_floor_covering_profile",
      "existing_asphalt_floor_covering_confirmed",
    ],
    clarificationFields: [
      "existing_floor_covering_profile",
      "existing_asphalt_floor_covering_confirmed",
    ],
    includedBoundaries: [
      "существующее покрытие пола из асфальта или асфальтобетона",
      "компрессор, пневматические молотки и точная трудовая норма КРЕР 46-04-010-01",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новое покрытие пола и восстановление основания",
      "бетонное основание пола и покрытия других типов",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `разборка демонтаж асфальтовый асфальтобетонный пол покрытие компрессор пневматический отбойный молоток ${contextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401001: true,
      exactOfficialArtifactSha256:
        ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborCompressorAndBreakerRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      classificationFactorRejected: true,
      concreteFloorBaseRejected: true,
      otherFloorCoveringsRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_floor|floor_install|нов.*покрыт|устрой.*пол/iu,
    /concrete_floor_base|floor_base_demolition|бетонн.*основан/iu,
    /partition|window|door|перегород|окн|двер/iu,
    /floor_repair|screed_install|восстанов.*основан|устрой.*стяж/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}_SUCCESSOR`,
  receiptFileStem: `S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_${token}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
