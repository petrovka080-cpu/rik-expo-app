import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAsphaltFloorCoveringDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/asphaltFloorCoveringDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileAsphaltFloorCoveringDemolitionKrer46R1({
    ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileAsphaltFloorCoveringDemolitionKrer46R1({
    ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileAsphaltFloorCoveringDemolitionKrer46R1({
    floor_covering_area_m2: 100,
  });
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
    throw new Error("STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_FIXTURE");
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
      "STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error("STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FAIL_CLOSED");
  }
  const serialized = JSON.stringify({
    formulas: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
    resources: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error("STOP_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CORE",
    catalogId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID,
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
    hiddenAreaFactorClaimed: false,
    floorBaseIncluded: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-3.f09-asphalt-floor-covering-demolition-krer46-successor.v1",
  stopCode: "S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-asphalt-floor-covering-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "5ee88bae-2019-5824-8344-ed6cb268a2a1",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "2010dfec-8b9e-5b25-a0fb-5b7b3a7a280c",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "asphalt-floor-covering-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/asphaltFloorCoveringDemolitionKrer46R1.ts",
    "tests/estimateNorms/asphaltFloorCoveringDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAsphaltFloorCoveringDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID,
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
  validationScenario: "F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка асфальтового или асфальтобетонного покрытия пола",
    workKey: "asphalt_floor_covering_demolition_krer_46_04_010_01",
    physicalResultRu:
      "Подтверждённая площадь существующего покрытия пола из асфальта или асфальтобетона разобрана по КРЕР 46-04-010-01",
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
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_ASPHALT_FLOOR_COVERING",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingFloorCoveringMaterial: "ASPHALT_OR_ASPHALT_CONCRETE",
    officialUnitRateSource: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-010-01",
    hiddenAreaFactorClaimed: false,
    floorBaseIncluded: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:asphalt_floor_covering_demolition:labor",
    applicability: {
      technology_class: "ASPHALT_FLOOR_COVERING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      existing_floor_covering_material: "ASPHALT_OR_ASPHALT_CONCRETE",
      source_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_NORM_ID,
      exact_locator: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      hidden_area_factor_claimed: false,
      floor_base_included: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-010-01-asphalt-floor-covering-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-010",
      rate: "46-04-010-01",
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
      hiddenAreaFactorClaimed: false,
      floorBaseIncluded: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Разборка асфальтового или асфальтобетонного покрытия пола",
    aliases: [
      "разборка асфальтового покрытия пола",
      "демонтаж асфальтобетонного покрытия пола",
      "снятие асфальта внутри здания компрессором и отбойными молотками",
      "КРЕР 46-04-010-01",
      "asphalt floor covering demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого покрытия пола из асфальта или асфальтобетона по площади: труд 23,78 чел.-ч, компрессор 4,71 маш.-ч и пневматические молотки 9,42 маш.-ч на 100 м².",
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
      "разборка демонтаж асфальтовый асфальтобетонный пол покрытие компрессор пневматический отбойный молоток КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460401001: true,
      exactOfficialArtifactSha256:
        ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborCompressorAndBreakerRatesApplied: true,
      machinistLaborNoDoubleCount: true,
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
  owner: "S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
