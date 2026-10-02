import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_CATALOG_ID,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_FORMULAS,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_NORM_ID,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_RESOURCES,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_ID,
  WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  compileWoodenWindowFillDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/woodenWindowOpeningFillDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileWoodenWindowFillDemolitionKrer46R1({
    ...WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileWoodenWindowFillDemolitionKrer46R1({
    ...WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileWoodenWindowFillDemolitionKrer46R1({
    opening_fill_area_m2: 100,
  });
  if (!(short.rows.length === 4
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_window_fill_demolition:labor")?.quantity === "188.54"
    && short.rows.find((row) =>
      row.row_id === "f09:wooden_window_fill_demolition:lift_500kg")?.quantity === "7.74")) {
    throw new Error("STOP_S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SHORT_FIXTURE");
  }
  if (!(acceptance.rows.length === 4
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_window_fill_demolition:labor")?.quantity === "66.9317"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:wooden_window_fill_demolition:lift_500kg")?.quantity === "2.7477")) {
    throw new Error(
      "STOP_S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 4)) {
    throw new Error("STOP_S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_FAIL_CLOSED");
  }
  const serialized = JSON.stringify({
    formulas: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_FORMULAS,
    resources: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error("STOP_S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_CORE",
    catalogId: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_CATALOG_ID,
    exactRate: "46-04-012-01",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "188.54",
      machinistLaborManHours: "7.74",
      liftMachineHours: "7.74",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "66.9317",
      machinistLaborManHours: "2.7477",
      liftMachineHours: "2.7477",
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
    "rik-expo-app.s27-3.f09-wooden-window-fill-demolition-krer46-successor.v1",
  stopCode: "S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-wooden-window-fill-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c7a8ee5e-0293-56cd-afa9-8b4b10e325c8",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "1f243456-4185-5615-8f43-6ee2a24754f4",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "wooden-window-fill-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/woodenWindowOpeningFillDemolitionKrer46R1.ts",
    "tests/estimateNorms/woodenWindowOpeningFillDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodenWindowOpeningFillDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_CATALOG_ID,
  sourceId: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_ID,
  normId: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_RESOURCES,
  shortInput: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка существующего деревянного оконного заполнения проёма с подоконной доской",
    workKey: "wooden_window_opening_fill_demolition_krer_46_04_012_01",
    physicalResultRu:
      "Подтверждённая площадь существующего деревянного оконного заполнения проёма с подоконной доской разобрана по КРЕР 46-04-012-01",
    includedScopeRu: [
      "снятие существующих деревянных оконных створок",
      "выемка коробок со снятием наличников и отбивкой откосов и четвертей в проёмах",
      "труд рабочих среднего разряда 2,4 по норме 188,54 чел.-ч на 100 м²",
      "одномачтовый подъёмник до 500 кг, высота 45 м, 7,74 маш.-ч на 100 м²",
      "справочный труд машинистов 7,74 чел.-ч на 100 м² без повторной оплаты",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новый оконный блок, створки, коробка, подоконная доска, наличники и фурнитура",
      "восстановление кладки, откосов, четвертей и отделки проёма",
      "деревянные окна без подоконных досок, двери, металлические и иные заполнения проёмов",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      WOODEN_WINDOW_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_WOODEN_WINDOW_OPENING_FILL",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "opening_fill_area_m2",
    geometryParameters: ["opening_fill_area_m2"],
    existingOpeningFillMaterial: "WOOD",
    existingOpeningFillKind: "WINDOW",
    existingWindowSillBoard: "PRESENT",
    officialUnitRateSource: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-012-01",
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:wooden_window_fill_demolition:labor",
    applicability: {
      technology_class: "WOODEN_WINDOW_OPENING_FILL_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_OPENING_FILL",
      existing_opening_fill_material: "WOOD",
      existing_opening_fill_kind: "WINDOW",
      existing_window_sill_board: "PRESENT",
      source_id: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_NORM_ID,
      exact_locator: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_priced_separately: false,
      hidden_area_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-012-01-wooden-window-fill-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-012",
      rate: "46-04-012-01",
      technicalPartPrintedAndPdfPage: 5,
      workScopeAndResourceRatePrintedAndPdfPage: 60,
      exactLocator: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "opening_fill_area_m2",
        "existing_opening_fill_profile",
        "existing_wooden_window_with_sill_board_confirmed",
      ],
      existingWindowSillBoard: "PRESENT",
      constructionLaborRatePer100M2: 188.54,
      machinistLaborRatePer100M2: 7.74,
      liftMachineHourRatePer100M2: 7.74,
      machinistLaborPricedSeparately: false,
      hiddenAreaFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Разборка существующего деревянного оконного заполнения проёма с подоконной доской",
    aliases: [
      "разборка деревянного оконного блока с подоконной доской",
      "демонтаж деревянного окна с коробкой и подоконной доской",
      "снятие оконных створок и коробки с подоконной доской",
      "КРЕР 46-04-012-01",
      "wooden window opening fill demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого существующего деревянного оконного заполнения с подоконной доской по площади: труд 188,54 чел.-ч и подъёмник 7,74 маш.-ч на 100 м².",
    keyDistinguishingParameters: [
      "opening_fill_area_m2",
      "existing_opening_fill_profile",
      "existing_wooden_window_with_sill_board_confirmed",
    ],
    clarificationFields: [
      "existing_opening_fill_profile",
      "existing_wooden_window_with_sill_board_confirmed",
    ],
    includedBoundaries: [
      "деревянные оконные створки, коробки и подоконные доски",
      "наличники, откосы и четверти в составе разборки",
      "подъёмник и точная трудовая норма КРЕР 46-04-012-01",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новое заполнение и восстановление проёма",
      "деревянные окна без подоконных досок, двери, металлические окна и другой материал",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "разборка демонтаж деревянное окно створки коробка подоконная доска наличник откос проём КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460401201: true,
      exactOfficialArtifactSha256:
        WOODEN_WINDOW_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndLiftRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      adjacentOpeningRestorationRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_window|window_install|нов.*окон|установ.*окон/iu,
    /door|metal_window|двер|металлическ.*окон/iu,
    /masonry_repair|slope_restoration|восстанов.*откос|ремонт.*проём/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: "S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_WOODEN_WINDOW_FILL_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
