import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA,
  compileRolledRoofCoveringDemolitionKrer46R1,
} from "../../../src/lib/estimate/v4/rolledRoofCoveringDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileRolledRoofCoveringDemolitionKrer46R1({
    ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  });
  const acceptance = await compileRolledRoofCoveringDemolitionKrer46R1({
    ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  });
  const incomplete = await compileRolledRoofCoveringDemolitionKrer46R1({
    roof_covering_area_m2: 100,
  });
  if (!(short.rows.length === 3
    && short.preliminaryNeeds.length === 0
    && short.rows.find((row) =>
      row.row_id === "f09:rolled_roof_covering_demolition:labor")?.quantity === "14.38"
    && short.rows.find((row) =>
      row.row_id === "f09:rolled_roof_covering_demolition:electric_winch_19_62kn")?.quantity === "6.22")) {
    throw new Error("STOP_S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_FIXTURE");
  }
  if (!(acceptance.rows.length === 3
    && acceptance.preliminaryNeeds.length === 0
    && acceptance.rows.find((row) =>
      row.row_id === "f09:rolled_roof_covering_demolition:labor")?.quantity === "5.1049"
    && acceptance.rows.find((row) =>
      row.row_id === "f09:rolled_roof_covering_demolition:electric_winch_19_62kn")?.quantity === "2.2081")) {
    throw new Error(
      "STOP_S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_FIXTURE",
    );
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 3)) {
    throw new Error("STOP_S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FAIL_CLOSED");
  }
  const serialized = JSON.stringify({
    formulas: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS,
    resources: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES,
  });
  if (/area_factor|wet_zone_factor|minimum_area|mobilization_surcharge/iu
    .test(serialized)) {
    throw new Error("STOP_S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_HIDDEN_FACTOR");
  }
  return {
    status: "GREEN_S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CORE",
    catalogId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID,
    exactRate: "46-04-008-01",
    short: {
      rowCount: short.rows.length,
      constructionLaborManHours: "14.38",
      electricWinchMachineHours: "6.22",
    },
    acceptance: {
      areaM2: "35.5",
      constructionLaborManHours: "5.1049",
      electricWinchMachineHours: "2.2081",
    },
    incomplete: { rowCount: 0, preliminaryNeedCount: 3 },
    machinistLaborClaimed: false,
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-3.f09-rolled-roof-covering-demolition-krer46-successor.v1",
  stopCode: "S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46",
  applicationName: "s27-3-f09-rolled-roof-covering-demolition-krer46-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f3b9c38d-ff99-59bb-9cee-6e3cadbb9757",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "1c5e6eb8-b625-5936-b05e-b336c5d2d58e",
  currentReleasePath: resolve(
    "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  ),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-next-current-lineage/"
      + "rolled-roof-covering-demolition-krer46-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/rolledRoofCoveringDemolitionKrer46R1.ts",
    "tests/estimateNorms/rolledRoofCoveringDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareRolledRoofCoveringDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID,
  sourceId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
  normId: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES,
  shortInput: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46",
  passport: {
    canonicalRuName:
      "Разборка рулонного кровельного покрытия",
    workKey: "rolled_roof_covering_demolition_krer_46_04_008_01",
    physicalResultRu:
      "Подтверждённая площадь существующего рулонного кровельного покрытия разобрана по КРЕР 46-04-008-01",
    includedScopeRu: [
      "снятие существующего кровельного покрытия из рулонных материалов",
      "сворачивание снятого кровельного материала в рулоны",
      "труд рабочих среднего разряда 2,0 по норме 14,38 чел.-ч на 100 м²",
      "электрическая лебёдка тяговым усилием 19,62 (2) кН (т), 6,22 маш.-ч на 100 м²",
      "уборка и перемещение отходов до 50 м внутри объекта в составе нормы",
    ],
    excludedScopeRu: [
      "новое кровельное покрытие, основание, утепление, примыкания и отделка",
      "ремонт и восстановление основания кровли и примыканий",
      "листовая сталь, асбестоцементные плиты, черепица и волнистые асбестоцементные листы колонок 02–04",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент зоны и неподтверждённые цены",
    ],
    independentCompletenessMap:
      ROLLED_ROOF_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_ROLLED_ROOF_COVERING",
    catalogVariant: "STANDARD_SEARCH_IDENTITY_NARROWED_BY_CONFIRMED_MATERIAL",
    primaryMeasureParameterId: "roof_covering_area_m2",
    geometryParameters: ["roof_covering_area_m2"],
    existingRoofCoveringMaterialClass: "ROLLED_MATERIAL",
    existingRoofCoveringMaterial: "ROLLED_ROOFING_MATERIAL",
    officialUnitRateSource: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-008-01",
    hiddenAreaFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: "f09:rolled_roof_covering_demolition:labor",
    applicability: {
      technology_class: "ROLLED_ROOF_COVERING_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_ROOF_COVERING",
      existing_roof_covering_material_class: "ROLLED_MATERIAL",
      existing_roof_covering_material: "ROLLED_ROOFING_MATERIAL",
      source_id: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_NORM_ID,
      exact_locator: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_RATES_PER_100_M2",
      machinist_labor_claimed: false,
      hidden_area_factor_claimed: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: "kg-krer-46-04-008-01-rolled-roof-covering-demolition-v1",
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-008",
      rate: "46-04-008-01",
      technicalPartPrintedAndPdfPage: 5,
      workScopeAndResourceRatePrintedAndPdfPage: 57,
      exactLocator: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: [
        "roof_covering_area_m2",
        "existing_roof_covering_profile",
        "existing_rolled_roof_covering_confirmed",
      ],
      existingRoofCoveringMaterialClass: "ROLLED_MATERIAL",
      existingRoofCoveringMaterial: "ROLLED_ROOFING_MATERIAL",
      constructionLaborRatePer100M2: 14.38,
      electricWinchMachineHourRatePer100M2: 6.22,
      machinistLaborClaimed: false,
      hiddenAreaFactorClaimed: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu:
      "Разборка рулонного кровельного покрытия",
    aliases: [
      "разборка кровли из рулонных материалов",
      "демонтаж рулонного кровельного покрытия",
      "снятие и сворачивание рулонной кровли",
      "КРЕР 46-04-008-01",
      "rolled roofing material covering demolition",
    ],
    shortScopeRu:
      "Разборка подтверждённого рулонного кровельного покрытия по площади: труд 14,38 чел.-ч и электрическая лебёдка 6,22 маш.-ч на 100 м².",
    keyDistinguishingParameters: [
      "roof_covering_area_m2",
      "existing_roof_covering_profile",
      "existing_rolled_roof_covering_confirmed",
    ],
    clarificationFields: [
      "existing_roof_covering_profile",
      "existing_rolled_roof_covering_confirmed",
    ],
    includedBoundaries: [
      "кровельное покрытие из рулонных материалов",
      "снятие и сворачивание демонтированного материала в рулоны",
      "электрическая лебёдка и точная трудовая норма КРЕР 46-04-008-01",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "новое покрытие и восстановление основания или примыканий кровли",
      "листовая сталь, асбестоцементные плиты, черепица и волнистые листы",
      "внеобъектовый вывоз и полигон",
      "скрытые коэффициенты и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "разборка демонтаж снятие рулонное кровельное покрытие рубероид сворачивание лебёдка КРЕР 46 реконструкция",
    sourceProvenance: {
      officialKrer462015Rate460400801: true,
      exactOfficialArtifactSha256:
        ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndElectricWinchRatesApplied: true,
      machinistLaborNotClaimedWithoutTableRow: true,
      adjacentRoofReinstatementRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_roof|roof_install|нов.*кров|устрой.*кров/iu,
    /ceiling|partition|window|door|потол|перегород|окн|двер/iu,
    /roof_repair|ceiling_repair|floor_repair|восстанов.*кров|ремонт.*кров/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: "S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SUCCESSOR",
  receiptFileStem: "S273_F09_ROLLED_ROOF_COVERING_DEMOLITION_KRER46",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
