import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAkmigranSuspendedCeilingDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/akmigranSuspendedCeilingDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
    ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
    ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
    ceiling_area_m2: 100,
  });
  if (!(short.rows.length === 4
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:akmigran_suspended_ceiling_demolition:labor")?.quantity === "66.87"
    && short.rows.find((row) =>
      row.row_id === "f09:akmigran_suspended_ceiling_demolition:lift_500kg")?.quantity === "2.2")) {
    throw new Error("STOP_S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_FIXTURE");
  }
  if (!(acceptance.rows.length === 4
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:akmigran_suspended_ceiling_demolition:labor")?.quantity === "23.73885"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:akmigran_suspended_ceiling_demolition:lift_500kg")?.quantity === "0.781")) {
    throw new Error(
      "STOP_S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error("STOP_S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FAIL_CLOSED");
  }
  const serialized = JSON.stringify({
    formulas: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
    resources: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error("STOP_S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CORE",
    catalogId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
    exactRate: "46-04-007-06",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "66.87",
      machinistLaborManHours: "2.2",
      liftMachineHours: "2.2",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "23.73885",
      machinistLaborManHours: "0.781",
      liftMachineHours: "0.781",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 4 },
    machinistLaborPricedSeparately: false,
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-3.f09-akmigran-suspended-ceiling-demolition-krer46-successor.v1",
  stopCode: "S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-akmigran-suspended-ceiling-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "bbfeca72-2413-519b-a09b-c527c4353955",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "91ed8bad-3533-5ae3-b2c6-a514bb29a728",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "akmigran-suspended-ceiling-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/akmigranSuspendedCeilingDemolitionKrer46R1.ts",
    "tests/estimateNorms/akmigranSuspendedCeilingDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAkmigranSuspendedCeilingDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  sourceId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
  normId: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  shortInput: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка деревянного подвесного потолка из плит «Акмигран»",
    workKey: "wooden_suspended_ceiling_akmigran_panel_demolition_krer_46_04_007_06",
    physicalResultRu:
      "Подтверждённая площадь существующего деревянного подвесного потолка из плит «Акмигран» разобрана по КРЕР 46-04-007-06",
    includedScopeRu: [
      "вывинчивание шурупов и удаление крепежа несущих балок и деревянных направляющих брусков",
      "снятие плит «Акмигран», алюминиевых гребёнок, подвесов и опорных уголков с отвинчиванием болтов",
      "труд рабочих среднего разряда 3,1 по норме 66,87 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота 45 м, 2,20 маш.-ч на 100 м²",
      "справочный труд машинистов 2,20 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новый подвесной потолок, новые плиты, направляющие, подвесы, уголки и отделка",
      "ремонт и восстановление примыканий потолка и стен",
      "асбестоцементные плиты колонки 46-04-007-05 и потолки иной конструкции",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_AKMIGRAN_SUSPENDED_CEILING",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "ceiling_area_m2",
    geometryParameters: ["ceiling_area_m2"],
    existingCeilingSupport: "WOOD",
    existingCeilingPanelMaterial: "AKMIGRAN",
    officialUnitRateSource: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-007-06",
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:akmigran_suspended_ceiling_demolition:labor",
    applicability: {
      technology_class: "AKMIGRAN_SUSPENDED_CEILING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_SUSPENDED_CEILING",
      existing_ceiling_support: "WOOD",
      existing_ceiling_panel_material: "AKMIGRAN",
      source_id: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      hidden_area_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-007-06-akmigran-suspended-ceiling-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-007",
      rate: "46-04-007-06",
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 55,
      resourceRatePrintedAndPdfPage: 56,
      exactLocator: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "ceiling_area_m2",
        "existing_suspended_ceiling_profile",
        "existing_wooden_suspended_ceiling_akmigran_panel_confirmed",
      ],
      existingCeilingSupport: "WOOD",
      existingCeilingPanelMaterial: "AKMIGRAN",
      constructionLaborRatePer100M2: 66.87,
      machinistLaborRatePer100M2: 2.2,
      liftMachineHourRatePer100M2: 2.2,
      machinistLaborPricedSeparately: false,
      hiddenAreaFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Разборка деревянного подвесного потолка из плит «Акмигран»",
    aliases: [
      "разборка деревянного подвесного потолка Акмигран",
      "демонтаж плит Акмигран с подвесами и направляющими",
      "снятие плит алюминиевых гребёнок подвесов и опорных уголков",
      "КРЕР 46-04-007-06",
      "Akmigran panel wooden suspended ceiling demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого деревянного подвесного потолка из плит «Акмигран» по площади: труд 66,87 чел.-ч и подъёмник 2,20 маш.-ч на 100 м².",
    keyDistinguishingParameters: [
      "ceiling_area_m2",
      "existing_suspended_ceiling_profile",
      "existing_wooden_suspended_ceiling_akmigran_panel_confirmed",
    ],
    clarificationFields: [
      "existing_suspended_ceiling_profile",
      "existing_wooden_suspended_ceiling_akmigran_panel_confirmed",
    ],
    includedBoundaries: [
      "деревянный подвесной потолок из плит «Акмигран»",
      "снятие крепежа, плит, гребёнок, подвесов и опорных уголков",
      "подъёмник и точная трудовая норма КРЕР 46-04-007-06",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новый потолок и восстановление примыкающих конструкций",
      "асбестоцементные плиты и подвесной потолок иной конструкции",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "разборка демонтаж деревянный подвесной потолок плиты Акмигран гребёнки подвесы уголки крепёж КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460400706: true,
      exactOfficialArtifactSha256:
        AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndLiftRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      adjacentCeilingReinstatementRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_ceiling|ceiling_install|нов.*потол|устрой.*потол/iu,
    /partition|window|door|перегород|окн|двер/iu,
    /wall_repair|ceiling_repair|floor_repair|восстанов.*стен|ремонт.*потол/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: "S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
