import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA,
  compileWoodCeilingFireproofCoatingKrer26R1,
} from "../../../src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileWoodCeilingFireproofCoatingKrer26R1({
    ...WOOD_CEILING_FIREPROOF_COATING_KRER26_SHORT_INPUT,
  });
  const complete = await compileWoodCeilingFireproofCoatingKrer26R1({
    ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 7
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_coating_operation")?.quantity === "10")) {
    throw new Error("STOP_S273_F09_WOOD_CEILING_FIREPROOF_KRER26_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 7
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_coating_labor")?.quantity === "3.73"
    && complete.rows.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_paint_evrika")?.quantity === "0.0412")) {
    throw new Error("STOP_S273_F09_WOOD_CEILING_FIREPROOF_KRER26_COMPLETE_FIXTURE");
  }
  const actualRows = JSON.stringify(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/steel|concrete|reinforced|wall|cable|penetration|inject|repair|seal|strengthen|металл|бетон|стен|кабел|проходк|инъект|ремонт|гермет|усилен/iu
    .test(actualRows)) {
    throw new Error("STOP_S273_F09_WOOD_CEILING_FIREPROOF_KRER26_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S273_F09_WOOD_CEILING_FIREPROOF_KRER26_CORE",
    catalogId: WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID,
    short: { rowCount: short.rows.length, preliminaryNeedCount: 0 },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: 0,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    crossSubstrateAndRepairScopeExcluded: true,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-wood-ceiling-fireproof-coating-krer26-successor.v1",
  stopCode: "S273_F09_WOOD_CEILING_FIREPROOF_KRER26",
  applicationName: "s27-3-f09-wood-ceiling-fireproof-coating-krer26-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "540134f0-5bb0-575a-8f48-ef3ade38687a",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d3e76a44-b192-5b00-a044-14d826f4a0d0",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/wood-ceiling-fireproof-coating-krer26-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1.ts",
    "tests/estimateNorms/woodCeilingFireproofCoatingKrer26R1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareWoodCeilingFireproofCoatingKrer26Successor.ts",
    ".release-runtime/r568/s27-3/f09-fire-current-lineage/official-snapshots/order_52_npa_2022.pdf",
  ],
  catalogId: WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID,
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
  validationScenario: "F09_WOOD_CEILING_FIREPROOF_COATING_KRER26",
  passport: {
    canonicalRuName: "Огнезащитное покрытие деревянных потолков краской «Эврика»",
    workKey: "wood_ceiling_fireproof_coating_evrika",
    physicalResultRu:
      "Поверхность деревянного потолка подготовлена, покрыта огнезащитной краской «Эврика», толщина нанесённого слоя измерена",
    includedScopeRu: [
      "подготовка поверхности деревянного потолка",
      "нанесение огнезащитной краски «Эврика»",
      "замер толщины нанесённого слоя",
      "рабочие среднего разряда 4,5",
      "автопогрузчик 1 т, одномачтовый подъёмник 15 м и окрасочный агрегат высокого давления 1 кВт",
      "расход огнезащитной краски по точной расценке",
    ],
    excludedScopeRu: [
      "металлические, бетонные и железобетонные конструкции",
      "стены, кабели и огнестойкие проходки",
      "ремонт или удаление существующей огнезащиты",
      "инъектирование, герметизация и усиление",
      "леса и иные механизмы, отсутствующие в точной расценке",
      "неподтверждённая огнезащитная эффективность и цены",
    ],
    independentCompletenessMap:
      WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "APPLY_FIREPROOF_PAINT_TO_WOOD_CEILING_KRER_26_02_015_02",
    primaryMeasureParameterId: "wood_ceiling_area_m2",
    geometryParameters: ["wood_ceiling_area_m2"],
    substrate: "WOOD",
    constructionElement: "CEILING",
    fireproofProduct: "EVRIKA_PAINT",
    officialUnitRateSource: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
    officialArtifactSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
    exactRate: "E26-02-015-02",
    crossSubstrateScopeExcluded: true,
    repairScopeExcluded: true,
    universalFireproofingFactorClaimed: false,
  },
  binding: {
    rowId: "f09:wood_ceiling_fireproof_coating_operation",
    applicability: {
      technology_class: "WOOD_CEILING_FIREPROOF_COATING",
      operation_class: "APPLY_FIREPROOF_PAINT_AND_MEASURE_LAYER",
      substrate: "WOOD",
      construction_element: "CEILING",
      product: "EVRIKA_FIREPROOF_PAINT",
      source_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_ID,
      norm_id: WOOD_CEILING_FIREPROOF_COATING_KRER26_NORM_ID,
      exact_locator: WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_WOOD_CEILING_AREA_MULTIPLIED_BY_EXACT_RATE_PER_100_M2",
      cross_substrate_and_repair_scope_excluded: true,
    },
  },
  locator: {
    key: "kg-order-52-npa-krer-26-02-015-02-wood-ceiling-fireproof-v1",
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
      crossSubstrateAndRepairScopeExcluded: true,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: "Огнезащитное покрытие деревянных потолков краской «Эврика»",
    aliases: [
      "огнезащитная окраска деревянного потолка",
      "огнезащита деревянных потолков Эврика",
      "Е26-02-015-02",
      "wood ceiling fireproof paint coating",
    ],
    shortScopeRu:
      "Подготовка, нанесение краски «Эврика» и замер толщины огнезащитного слоя на деревянных потолках по Е26-02-015-02.",
    keyDistinguishingParameters: ["wood_ceiling_area_m2"],
    clarificationFields: ["wood_ceiling_area_m2"],
    includedBoundaries: [
      "деревянный потолок и краска «Эврика»",
      "подготовка, окраска и замер толщины",
      "ресурсы точной расценки Е26-02-015-02",
    ],
    excludedBoundaries: [
      "другие основания, элементы и огнезащитные системы",
      "ремонт, инъектирование, герметизация и усиление",
      "неподтверждённые показатели огнестойкости и цены",
    ],
    extraSearchTermsRu:
      "огнезащита дерево деревянный потолок краска Эврика КРЕР 26 покрытие замер толщины",
    sourceProvenance: {
      officialOrder52NpaAppendix20RateE260201502: true,
      exactOfficialArtifactSha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      exactResourceRatesApplied: true,
      crossSubstrateScopeRejected: true,
      neighboringRepairOperationsRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /steel|concrete|reinforced|metal|металл|бетон|железобетон/iu,
    /wall|стен|cable|кабел|penetration|проходк/iu,
    /inject|инъект|repair|ремонт|seal|гермет|strengthen|усилен/iu,
  ],
  owner: "S273_F09_WOOD_CEILING_FIREPROOF_KRER26_SUCCESSOR",
  receiptFileStem: "S273_F09_WOOD_CEILING_FIREPROOF_KRER26",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
