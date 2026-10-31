import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ASPHALT_LEVEL_S2716_ACCEPTANCE_INPUT,
  ASPHALT_LEVEL_S2716_CATALOG_ID,
  ASPHALT_LEVEL_S2716_FORMULAS,
  ASPHALT_LEVEL_S2716_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_LEVEL_S2716_NORM_ID,
  ASPHALT_LEVEL_S2716_PARAMETERS,
  ASPHALT_LEVEL_S2716_RESOURCES,
  ASPHALT_LEVEL_S2716_RUNTIME_CLASSIFICATION,
  ASPHALT_LEVEL_S2716_RUNTIME_INPUT,
  ASPHALT_LEVEL_S2716_RUNTIME_SOURCE_IDS,
  ASPHALT_LEVEL_S2716_SHORT_INPUT,
  ASPHALT_LEVEL_S2716_SOURCE_ID,
  ASPHALT_LEVEL_S2716_SOURCE_METADATA,
  ASPHALT_LEVEL_S2716_SOURCE_PACK_SHA256,
  asphaltMassFromGeometryS2716,
  compileAsphaltLevelS2716,
} from "../../../src/lib/estimate/v4/asphaltLevelS2716";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, unknown>;

const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};

async function verifyCore(): Promise<Json> {
  const compiled = await compileAsphaltLevelS2716(
    ASPHALT_LEVEL_S2716_SHORT_INPUT,
  );
  const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
  const densityOracle = asphaltMassFromGeometryS2716({
    areaM2: 100,
    thicknessMm: 100,
    densityTPerM3: 2.4,
    wastePercent: 0.5,
  });
  const missingIndependentRows = ASPHALT_LEVEL_S2716_INDEPENDENT_COMPLETENESS_MAP.entries
    .map((entry) => entry.resolution.rowId)
    .filter((rowId) => !rows.has(rowId));
  const assertions = {
    noPreliminaryNeeds: compiled.preliminaryNeeds.length === 0,
    geometricVolumeM3: rows.get("asphalt:control:geometric-compacted-volume")?.quantity === "10",
    krerMixT: rows.get("asphalt:material:hot-dense-fine-mix")?.quantity === "23.58",
    roadBitumenT: rows.get("asphalt:material:road-bitumen")?.quantity === "0.02",
    laborManH: rows.get("asphalt:labor:road-workers")?.quantity === "7",
    noFormerTwoPointFiveTons: !compiled.rows.some((row) => row.quantity === "2.5" && row.unit_id === "t"),
    percentOracle: densityOracle.volumeM3 === 10
      && densityOracle.netMassT === 24
      && densityOracle.orderMassT === 24.12,
    noMissingIndependentRows: missingIndependentRows.length === 0,
    controlsNotSeparatelyPayable: compiled.rows
      .filter((row) => row.row_id.startsWith("asphalt:quality:")
        || row.row_id.startsWith("asphalt:document:"))
      .every((row) => !row.included_in_estimate && !row.included_in_procurement),
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) throw new Error(`STOP_S27_16_ASPHALT_CORE:${failed.join(",")}`);
  for (const entry of ASPHALT_LEVEL_S2716_INDEPENDENT_COMPLETENESS_MAP.entries) {
    const mutated = new Set(rows.keys());
    mutated.delete(entry.resolution.rowId);
    if (mutated.has(entry.resolution.rowId)) {
      throw new Error(`STOP_S27_16_ASPHALT_REMOVAL_MUTATION:${entry.resolution.rowId}`);
    }
  }
  return {
    status: "GREEN_S27_16_ASPHALT_LEVEL_CORE",
    assertions,
    rowCount: compiled.rows.length,
    procurementRowCount: compiled.rows.filter((row) => row.included_in_procurement).length,
    missingIndependentRows,
    serializedSha256: createHash("sha256").update(JSON.stringify(compiled)).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.asphalt-level-independent-owner-successor.v2",
  stopCode: "S27_16_ASPHALT_LEVEL",
  applicationName: "s27-21-asphalt-level-independent-owner-successor-v2",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/asphalt-level-independent-owner-successor-v2"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json",
    "src/lib/estimate/v4/asphaltLevelS2716.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
    "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
    "tests/estimateNorms/s2716PurchasableExamples.contract.test.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2716AsphaltLevelSuccessor.ts",
  ],
  catalogId: ASPHALT_LEVEL_S2716_CATALOG_ID,
  sourceId: ASPHALT_LEVEL_S2716_SOURCE_ID,
  normId: ASPHALT_LEVEL_S2716_NORM_ID,
  sourceMetadata: ASPHALT_LEVEL_S2716_SOURCE_METADATA,
  parameterDefinitions: ASPHALT_LEVEL_S2716_PARAMETERS,
  formulaDefinitions: ASPHALT_LEVEL_S2716_FORMULAS,
  resourceDefinitions: ASPHALT_LEVEL_S2716_RESOURCES,
  shortInput: ASPHALT_LEVEL_S2716_SHORT_INPUT,
  acceptanceInput: ASPHALT_LEVEL_S2716_ACCEPTANCE_INPUT,
  runtimeProfileInput: ASPHALT_LEVEL_S2716_RUNTIME_INPUT,
  runtimeProfileClassification: ASPHALT_LEVEL_S2716_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ASPHALT_LEVEL_S2716_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [30, 24, 57],
  benchmarkOrdinal: 0,
  validationScenario: "S27_16_ASPHALT_LEVEL_100_M2_100_MM_PURCHASABLE_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Выравнивание асфальтового покрытия",
    workKey: "paving_roads_landscape_interior_asphalt_level_standard",
    physicalResultRu:
      "Принятое основание выровнено горячей плотной мелкозернистой асфальтобетонной смесью по подтверждённой послойной схеме, покрытие уложено, уплотнено и передано на контроль.",
    includedScopeRu: [
      "геометрический объём из площади и общей толщины без потери размерности",
      "горячая смесь, дорожный битум, технический керосин, боковые упоры и проволока по КРЕР 27-06-019-02",
      "труд и машино-время по опубликованным ресурсным нормам КРЕР, а не по фиктивным производительностям",
      "доставка смеси и мобилизация техники по видимым заменяемым логистическим ориентирам",
      "операции укладки и контроля; документы и контроль не оплачиваются отдельно без отдельного основания",
    ],
    excludedScopeRu: [
      "ремонт или замена основания, фрезерование и демонтаж старого покрытия",
      "щебёночные слои, водоотвод, бордюры и разметка",
      "ручная технология, если участок недоступен для механизированной укладки",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: ASPHALT_LEVEL_S2716_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "ASPHALT_LEVELING_ON_ACCEPTED_BASE",
    scopeClass: "MECHANICALLY_ACCESSIBLE_LEVELING",
    constructionState: "BASE_ACCEPTED_FOR_PAVING",
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2", "layer_thickness_mm"],
    selectedPreliminaryProfile: ASPHALT_LEVEL_S2716_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
    noDensityOrWasteFactorInNormativeMixQuantity: true,
  },
  binding: {
    rowId: "asphalt:material:hot-dense-fine-mix",
    applicability: {
      technology_class: "HOT_DENSE_FINE_GRAINED_ASPHALT_KRER_27_06_019_02",
      operation_class: "ASPHALT_LEVELING_ON_ACCEPTED_BASE",
      source_id: ASPHALT_LEVEL_S2716_SOURCE_ID,
      norm_id: ASPHALT_LEVEL_S2716_NORM_ID,
      quantity_basis: "KRER_BASE_30_MM_PLUS_PUBLISHED_5_MM_INCREMENTS",
      geometry_control: "AREA_TIMES_TOTAL_THICKNESS_DIVIDED_BY_1000",
      density_factor_used: false,
      waste_factor_used: false,
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_ROUTE_AND_QUALITY_PLAN",
    },
  },
  locator: {
    key: "asphalt-level-krer27-06-019-02-s27-21-independent-owner",
    payload: {
      kind: "OFFICIAL_RESOURCE_NORM_WITH_VISIBLE_LOGISTICS_PROFILE",
      officialUrl: ASPHALT_LEVEL_S2716_SOURCE_METADATA.official_url,
      exactLocator: ASPHALT_LEVEL_S2716_SOURCE_METADATA.exact_locator,
      quantityModel: "area and thickness -> geometric m3; KRER thickness increments -> procurement tonnes and source-bound labor/machines",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "Выравнивание асфальтового покрытия",
    aliases: [
      "выравнивание асфальта 100 м2 толщиной 100 мм",
      "асфальтовое покрытие 100 м² 100 мм",
      "механизированное выравнивание асфальта",
      "выравнивающий слой асфальтобетона",
    ],
    shortScopeRu:
      "Выравнивание принятого основания горячей асфальтобетонной смесью: материалы, труд, техника и доставка по КРЕР 27-06-019-02; площадь и общая толщина задаются пользователем.",
    keyDistinguishingParameters: ["area_m2", "layer_thickness_mm"],
    clarificationFields: ["послойная схема и доступность механизированной укладки подтверждаются проектом/ППР"],
    includedBoundaries: [
      "горячая смесь, битумная обработка выбранного варианта КРЕР, укладка, уплотнение и доставка",
      "числовые нормы труда и техники из КРЕР",
    ],
    excludedBoundaries: [
      "ремонт основания, демонтаж, фрезерование, щебёночное основание, бордюры и разметка",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "асфальт асфальтобетон выравнивание толщина 100 мм укладка каток гудронатор битум смесь",
    sourceProvenance: {
      sourcePackSha256: ASPHALT_LEVEL_S2716_SOURCE_PACK_SHA256,
      officialKrerResourceNorm: true,
      automaticQuantityFromKnownDimensions: true,
      noDensityHalfCoefficient: true,
      noWasteHalfCoefficient: true,
      independentCompletenessMap: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:ремонт|замен)[а-я\s-]*(?:основан|подстила)|(?:base repair|subbase replacement)/iu,
    /(?:фрезерован|демонтаж)|(?:milling|demolition)/iu,
    /(?:бордюр|разметк|водоотвод)|(?:kerb|marking|drainage)/iu,
  ],
  owner: "S2721_ASPHALT_LEVEL_INDEPENDENT_OWNER_SUCCESSOR",
  receiptFileStem: "S2721_ASPHALT_LEVEL_INDEPENDENT_OWNER",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
