import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT,
  FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
  FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID,
  FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS,
  FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID,
  FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS,
  FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES,
  FIRE_HYDRANT_INSTALLATION_KRER22_SHORT_INPUT,
  FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
  FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA,
  compileFireHydrantInstallationKrer22R1,
} from "../../../src/lib/estimate/v4/fireHydrantInstallationKrer22R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileFireHydrantInstallationKrer22R1({
    ...FIRE_HYDRANT_INSTALLATION_KRER22_SHORT_INPUT,
  });
  const complete = await compileFireHydrantInstallationKrer22R1({
    ...FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 8
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:fire_hydrant_dn125_product")?.quantity === "1")) {
    throw new Error("STOP_S273_F09_FIRE_HYDRANT_KRER22_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 8
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:fire_hydrant_installation_labor")?.quantity === "19.8"
    && complete.rows.find((row) =>
      row.row_id === "f09:fire_hydrant_bolts_d16")?.quantity === "0.038")) {
    throw new Error("STOP_S273_F09_FIRE_HYDRANT_KRER22_COMPLETE_FIXTURE");
  }
  const actualRows = JSON.stringify(FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/excavat|backfill|road_restor|pressure_test|well_construction|fire_hose_cabinet|sprinkler|pump_station|землян|обратн.*засып|испытан.*сет/iu
    .test(actualRows)) {
    throw new Error("STOP_S273_F09_FIRE_HYDRANT_KRER22_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S273_F09_FIRE_HYDRANT_KRER22_CORE",
    catalogId: FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID,
    short: { rowCount: short.rows.length, preliminaryNeedCount: 0 },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: 0,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    adjacentNetworkScopeExcluded: true,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-fire-hydrant-installation-krer22-successor.v1",
  stopCode: "S273_F09_FIRE_HYDRANT_KRER22",
  applicationName: "s27-3-f09-fire-hydrant-installation-krer22-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d6f3589a-f3f9-5f1d-a796-18c922984644",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "b5aa2629-5b32-51c6-8c8f-91b96c39a4ab",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/fire-hydrant-installation-krer22-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/fireHydrantInstallationKrer22R1.ts",
    "tests/estimateNorms/fireHydrantInstallationKrer22R1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireHydrantInstallationKrer22Successor.ts",
    ".release-runtime/r568/s27-3/f09-fire-current-lineage/official-snapshots/krer_22_2015.pdf",
  ],
  catalogId: FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID,
  sourceId: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
  normId: FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID,
  sourceMetadata: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA,
  parameterDefinitions: FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS,
  formulaDefinitions: FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS,
  resourceDefinitions: FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES,
  shortInput: FIRE_HYDRANT_INSTALLATION_KRER22_SHORT_INPUT,
  acceptanceInput: FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 0,
  validationScenario: "F09_FIRE_HYDRANT_INSTALLATION_KRER22",
  passport: {
    canonicalRuName: "Установка подземного пожарного гидранта DN125",
    workKey: "external_water_fire_hydrant_installation_dn125",
    physicalResultRu:
      "Подземный пожарный гидрант DN125 установлен на наружной водопроводной сети и соединён фланцами в границах расценки КРЕР 22-03-011-03",
    includedScopeRu: [
      "опускание и установка подземного пожарного гидранта",
      "соединение фланцев",
      "труд рабочих и справочная сумма труда машинистов",
      "автомобильный кран 10 т и бортовой автомобиль до 5 т",
      "болты с гайками и шайбами диаметром 16 мм",
      "прокладка из прессованной технической резины",
      "подземный пожарный гидрант DN125, 1,0 МПа, высотой 500–2500 мм",
    ],
    excludedScopeRu: [
      "наружный трубопровод и фасонные части за границами расценки",
      "колодец или камера",
      "земляные работы, обратная засыпка и восстановление покрытия",
      "испытание и промывка сети",
      "пожарная колонка, указатель и обозначение места гидранта",
      "внутренние пожарные краны, шкафы, спринклеры и насосная станция",
      "неподтверждённые цены",
    ],
    independentCompletenessMap:
      FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_UNDERGROUND_FIRE_HYDRANT_KRER_22_03_011_03",
    primaryMeasureParameterId: "hydrant_count",
    geometryParameters: ["hydrant_count"],
    hydrantType: "UNDERGROUND",
    nominalDiameterMm: 125,
    nominalPressureMpa: 1,
    allowedHeightMm: { min: 500, max: 2_500 },
    officialUnitRateSource: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
    officialArtifactSha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
    exactRateColumn: "22-03-011-03",
    adjacentNetworkScopeExcluded: true,
    universalAlternativeHydrantFactorClaimed: false,
  },
  binding: {
    rowId: "f09:fire_hydrant_installation_operation",
    applicability: {
      technology_class: "EXTERNAL_WATER_FIRE_HYDRANT",
      operation_class: "INSTALL_UNDERGROUND_FIRE_HYDRANT",
      hydrant_type: "UNDERGROUND_DN125_1MPA_HEIGHT_500_2500_MM",
      source_id: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_ID,
      norm_id: FIRE_HYDRANT_INSTALLATION_KRER22_NORM_ID,
      exact_locator: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_HYDRANT_COUNT_MULTIPLIED_BY_EXACT_RATE_COLUMN",
      adjacent_network_scope_excluded: true,
    },
  },
  locator: {
    key: "kg-krer-22-03-011-03-underground-fire-hydrant-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      table: "22-03-011",
      rate: "22-03-011-03",
      printedPages: [109, 110],
      pdfPages: [109, 110],
      exactLocator: FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
      knownScopeInputs: ["hydrant_count"],
      adjacentNetworkScopeExcluded: true,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Установка подземного пожарного гидранта DN125",
    aliases: [
      "монтаж пожарного гидранта наружной сети",
      "установка подземного пожарного гидранта DN125",
      "пожарный гидрант 22-03-011-03",
      "underground fire hydrant DN125 installation",
    ],
    shortScopeRu:
      "Установка подземного пожарного гидранта DN125, 1,0 МПа, высотой 500–2500 мм по КРЕР 22-03-011-03 без колодца, трубопровода и земляных работ.",
    keyDistinguishingParameters: ["hydrant_count"],
    clarificationFields: ["hydrant_count"],
    includedBoundaries: [
      "установка гидранта и соединение фланцев",
      "ресурсы точной колонки КРЕР 22-03-011-03",
    ],
    excludedBoundaries: [
      "трубопровод, колодец, земляные работы и восстановление покрытия",
      "испытание сети и пожарная колонка",
      "внутренние пожарные краны, спринклеры и насосные станции",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "наружный водопровод пожарный гидрант подземный DN125 1 МПа КРЕР 22 установка фланцы",
    sourceProvenance: {
      officialKrer22Rate220301103: true,
      exactOfficialArtifactSha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
      exactResourceRatesApplied: true,
      adjacentNetworkScopeRejected: true,
      genericWaterTemplateRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /excavat|backfill|road_restor|землян|обратн.*засып|восстановлен.*покрыт/iu,
    /well_construction|колодец|камера/iu,
    /pressure_test|испытан.*сет|промыв.*сет/iu,
    /fire_hose_cabinet|внутренн.*пожарн.*кран|пожарн.*шкаф/iu,
    /sprinkler|спринклер|pump_station|насосн.*станц/iu,
  ],
  owner: "S273_F09_FIRE_HYDRANT_KRER22_SUCCESSOR",
  receiptFileStem: "S273_F09_FIRE_HYDRANT_KRER22",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
