import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1";
import {
  WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID,
  compileWoodCeilingFireproofCoatingSmallAreaKrer26R1,
} from "../../../src/lib/estimate/v4/woodCeilingFireproofCoatingSmallAreaKrer26R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileWoodCeilingFireproofCoatingSmallAreaKrer26R1({
    ...WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT,
  });
  const complete = await compileWoodCeilingFireproofCoatingSmallAreaKrer26R1({
    ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 7
    && short.preliminaryNeeds.length === 0
    && complete.rows.length === 7
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_coating_labor")?.quantity === "3.73"
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_paint_evrika")?.quantity === "0.0412")) {
    throw new Error("STOP_S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_KRER26_FIXTURE");
  }
  const serializedRows = JSON.stringify(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES);
  if (/small_area_factor|minimum_area|mobilization_surcharge/iu.test(serializedRows)) {
    throw new Error("STOP_S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_KRER26_CORE",
    catalogId: WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID,
    short: { rowCount: short.rows.length, preliminaryNeedCount: 0 },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: 0,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    smallAreaFactorClaimed: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-wood-ceiling-fireproof-coating-small-area-krer26-successor.v1",
  stopCode: "S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_KRER26",
  applicationName: "s27-3-f09-wood-ceiling-fireproof-small-area-krer26-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "85cb86c3-0cb8-5e73-8c98-b395f55690e6",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "c24ef9d4-0b35-5f37-8ff6-afdfd134a662",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/wood-ceiling-fireproof-coating-small-area-krer26-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1.ts",
    "src/lib/estimate/v4/woodCeilingFireproofCoatingSmallAreaKrer26R1.ts",
    "tests/estimateNorms/woodCeilingFireproofCoatingSmallAreaKrer26R1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodCeilingFireproofCoatingSmallAreaKrer26Successor.ts",
    ".release-runtime/r568/s27-3/f09-fire-current-lineage/official-snapshots/order_52_npa_2022.pdf",
  ],
  catalogId: WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID,
  sourceId: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
  normId: WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
  sourceMetadata: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA,
  parameterDefinitions: WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS,
  formulaDefinitions: WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS,
  resourceDefinitions: WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
  shortInput: WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT,
  acceptanceInput: WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26",
  passport: {
    canonicalRuName:
      "Огнезащитное покрытие деревянных потолков краской «Эврика» — малая площадь",
    workKey: "wood_ceiling_fireproof_coating_evrika_small_area",
    physicalResultRu:
      "Подтверждённая малая площадь деревянного потолка подготовлена, покрыта краской «Эврика», толщина слоя измерена без скрытого коэффициента площади",
    includedScopeRu: [
      "подготовка фактически указанной площади деревянного потолка",
      "нанесение огнезащитной краски «Эврика»",
      "замер толщины нанесённого слоя",
      "точные труд, машины и материал Е26-02-015-02",
    ],
    excludedScopeRu: [
      "минимальная площадь, надбавка или коэффициент малой площади",
      "другие основания, элементы и огнезащитные системы",
      "ремонт, удаление, инъектирование, герметизация и усиление",
      "неподтверждённые показатели огнестойкости и цены",
    ],
    independentCompletenessMap:
      WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "APPLY_FIREPROOF_PAINT_TO_WOOD_CEILING_KRER_26_02_015_02",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY",
    primaryMeasureParameterId: "wood_ceiling_area_m2",
    geometryParameters: ["wood_ceiling_area_m2"],
    substrate: "WOOD",
    constructionElement: "CEILING",
    fireproofProduct: "EVRIKA_PAINT",
    officialUnitRateSource: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
    officialArtifactSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
    exactRate: "E26-02-015-02",
    smallAreaFactorClaimed: false,
    minimumAreaClaimed: false,
    crossSubstrateAndRepairScopeExcluded: true,
  },
  binding: {
    rowId: "f09:wood_ceiling_fireproof_coating_operation",
    applicability: {
      technology_class: "WOOD_CEILING_FIREPROOF_COATING",
      operation_class: "APPLY_FIREPROOF_PAINT_AND_MEASURE_LAYER",
      catalog_variant: "SMALL_AREA_SEARCH_IDENTITY",
      substrate: "WOOD",
      construction_element: "CEILING",
      product: "EVRIKA_FIREPROOF_PAINT",
      source_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
      norm_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
      exact_locator: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_WITH_NO_SMALL_AREA_FACTOR",
      small_area_factor_claimed: false,
      cross_substrate_and_repair_scope_excluded: true,
    },
  },
  locator: {
    key: "kg-order-52-npa-krer-26-02-015-02-wood-ceiling-small-area-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE_AMENDMENT",
      appendix: 20,
      table: "26-02-015",
      rate: "E26-02-015-02",
      printedPage: 209,
      pdfPage: 209,
      exactLocator: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      knownScopeInputs: ["wood_ceiling_area_m2"],
      smallAreaFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Огнезащитное покрытие деревянных потолков краской «Эврика» — малая площадь",
    aliases: [
      "огнезащитная окраска малого участка деревянного потолка",
      "огнезащита деревянного потолка Эврика малая площадь",
      "Е26-02-015-02 малая площадь",
      "small area wood ceiling fireproof paint coating",
    ],
    shortScopeRu:
      "Фактическая малая площадь деревянного потолка: подготовка, краска «Эврика» и замер толщины по Е26-02-015-02 без надбавки площади.",
    keyDistinguishingParameters: ["wood_ceiling_area_m2"],
    clarificationFields: ["wood_ceiling_area_m2"],
    includedBoundaries: [
      "деревянный потолок и краска «Эврика»",
      "точные ресурсы Е26-02-015-02 по введённой площади",
    ],
    excludedBoundaries: [
      "скрытый коэффициент или минимум малой площади",
      "другие основания, элементы, ремонтные и огнезащитные системы",
      "неподтверждённые показатели и цены",
    ],
    extraSearchTermsRu:
      "малая площадь огнезащита дерево деревянный потолок краска Эврика КРЕР 26",
    sourceProvenance: {
      officialOrder52NpaAppendix20RateE260201502: true,
      exactOfficialArtifactSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      exactResourceRatesApplied: true,
      smallAreaFactorRejected: true,
      neighboringOperationsRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /small_area_factor|minimum_area|mobilization_surcharge/iu,
    /steel|concrete|reinforced|metal|металл|бетон|железобетон/iu,
    /wall|стен|cable|кабел|penetration|проходк/iu,
    /inject|инъект|repair|ремонт|seal|гермет|strengthen|усилен/iu,
  ],
  owner: "S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_KRER26_SUCCESSOR",
  receiptFileStem: "S273_F09_WOOD_CEILING_FIREPROOF_SMALL_AREA_KRER26",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
