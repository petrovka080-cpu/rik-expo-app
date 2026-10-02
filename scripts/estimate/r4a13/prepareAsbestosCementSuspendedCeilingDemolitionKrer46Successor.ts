import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA,
  compileAsbestosCementSuspendedCeilingDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/asbestosCementSuspendedCeilingDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
    ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
    ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
    ceiling_area_m2: 100,
  });
  if (!(short.rows.length === 4
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:asbestos_cement_suspended_ceiling_demolition:labor")?.quantity === "112.62"
    && short.rows.find((row) =>
      row.row_id === "f09:asbestos_cement_suspended_ceiling_demolition:lift_500kg")?.quantity === "2.2")) {
    throw new Error("STOP_S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_FIXTURE");
  }
  if (!(acceptance.rows.length === 4
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:asbestos_cement_suspended_ceiling_demolition:labor")?.quantity === "39.9801"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:asbestos_cement_suspended_ceiling_demolition:lift_500kg")?.quantity === "0.781")) {
    throw new Error(
      "STOP_S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error("STOP_S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FAIL_CLOSED");
  }
  const serialized = JSON.stringify({
    formulas: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
    resources: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error("STOP_S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CORE",
    catalogId: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
    exactRate: "46-04-007-05",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "112.62",
      machinistLaborManHours: "2.2",
      liftMachineHours: "2.2",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "39.9801",
      machinistLaborManHours: "0.781",
      liftMachineHours: "0.781",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 4 },
    machinistLaborPricedSeparately: false,
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    asbestosHazardControlsIncluded: false,
    hazardousWasteRouteIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-3.f09-asbestos-cement-suspended-ceiling-demolition-krer46-successor.v1",
  stopCode: "S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-asbestos-cement-suspended-ceiling-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "ee7f8cce-4e02-5a58-8c15-07878eb65a39",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "9136c63f-a0bf-508e-abb9-8ccd5fd5b371",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "asbestos-cement-suspended-ceiling-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/asbestosCementSuspendedCeilingDemolitionKrer46R1.ts",
    "tests/estimateNorms/asbestosCementSuspendedCeilingDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAsbestosCementSuspendedCeilingDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  sourceId: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
  normId: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  shortInput: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка деревянного подвесного потолка из асбестоцементных плит",
    workKey: "wooden_suspended_ceiling_asbestos_cement_panel_demolition_krer_46_04_007_05",
    physicalResultRu:
      "Подтверждённая площадь существующего деревянного подвесного потолка из асбестоцементных плит разобрана по КРЕР 46-04-007-05",
    includedScopeRu: [
      "вывинчивание шурупов и удаление крепежа несущих балок и деревянных направляющих брусков",
      "труд рабочих среднего разряда 3,4 по норме 112,62 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота 45 м, 2,20 маш.-ч на 100 м²",
      "справочный труд машинистов 2,20 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новый подвесной потолок, новые плиты, направляющие, подвесы, уголки и отделка",
      "ремонт и восстановление примыканий потолка и стен",
      "плиты «Акмигран» колонки 46-04-007-06 и потолки иной конструкции",
      "обследование опасного материала, безопасный метод работ, локализация пыли и средства защиты",
      "упаковка, транспортирование и размещение асбестосодержащих отходов",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_ASBESTOS_CEMENT_SUSPENDED_CEILING",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "ceiling_area_m2",
    geometryParameters: ["ceiling_area_m2"],
    existingCeilingSupport: "WOOD",
    existingCeilingPanelMaterial: "ASBESTOS_CEMENT",
    officialUnitRateSource: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-007-05",
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:asbestos_cement_suspended_ceiling_demolition:labor",
    applicability: {
      technology_class: "ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_SUSPENDED_CEILING",
      existing_ceiling_support: "WOOD",
      existing_ceiling_panel_material: "ASBESTOS_CEMENT",
      source_id: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_NORM_ID,
      exact_locator: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      hidden_area_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-007-05-asbestos-cement-suspended-ceiling-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-007",
      rate: "46-04-007-05",
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 55,
      resourceRatePrintedAndPdfPage: 56,
      exactLocator: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "ceiling_area_m2",
        "existing_suspended_ceiling_profile",
        "existing_wooden_suspended_ceiling_asbestos_cement_panel_confirmed",
      ],
      existingCeilingSupport: "WOOD",
      existingCeilingPanelMaterial: "ASBESTOS_CEMENT",
      constructionLaborRatePer100M2: 112.62,
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
      "Разборка деревянного подвесного потолка из асбестоцементных плит",
    aliases: [
      "разборка деревянного подвесного потолка Акмигран",
      "демонтаж асбестоцементных плит с деревянных направляющих",
      "отвинчивание шурупов и снятие болтов несущих балок и направляющих",
      "КРЕР 46-04-007-05",
      "asbestos-cement panel wooden suspended ceiling demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого деревянного подвесного потолка из асбестоцементных плит по площади: труд 112,62 чел.-ч и подъёмник 2,20 маш.-ч на 100 м².",
    keyDistinguishingParameters: [
      "ceiling_area_m2",
      "existing_suspended_ceiling_profile",
      "existing_wooden_suspended_ceiling_asbestos_cement_panel_confirmed",
    ],
    clarificationFields: [
      "existing_suspended_ceiling_profile",
      "existing_wooden_suspended_ceiling_asbestos_cement_panel_confirmed",
    ],
    includedBoundaries: [
      "деревянный подвесной потолок из асбестоцементных плит",
      "отвинчивание шурупов и снятие болтов с несущих балок и деревянных направляющих",
      "подъёмник и точная трудовая норма КРЕР 46-04-007-05",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новый потолок и восстановление примыкающих конструкций",
      "плиты «Акмигран» и подвесной потолок иной конструкции",
      "обследование и меры безопасного обращения с асбестом",
      "упаковка, транспортирование и размещение опасных отходов",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "разборка демонтаж деревянный подвесной потолок асбестоцементные плиты шурупы болты балки направляющие КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460400705: true,
      exactOfficialArtifactSha256:
        ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
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
  owner: "S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
