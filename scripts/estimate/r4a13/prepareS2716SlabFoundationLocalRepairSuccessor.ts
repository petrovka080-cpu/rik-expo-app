import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_FORMULAS,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_PARAMETERS,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RESOURCES,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_CLASSIFICATION,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_SOURCE_IDS,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_ID,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_METADATA,
  compileSlabFoundationLocalRepairS2716,
  slabRepairMissingRequiredRows,
} from "../../../src/lib/estimate/v4/slabFoundationLocalRepairS2716";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, unknown>;

const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};

async function verifyCore(): Promise<Json> {
  const short = await compileSlabFoundationLocalRepairS2716(
    SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT,
  );
  const compiled = await compileSlabFoundationLocalRepairS2716(
    SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
  );
  const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
  const rowIds = new Set(rows.keys());
  const missing = slabRepairMissingRequiredRows(rowIds);
  const shortNeedIds = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  const assertions = {
    shortResultKeepsRepairMortarVisible: shortNeedIds.has("slab-repair:material:repair-mortar-bags"),
    shortResultKeepsRepairWaterVisible: shortNeedIds.has("slab-repair:material:mixing-water"),
    shortResultKeepsRemovalVisible: shortNeedIds.has("slab-repair:work:remove-unsound-base"),
    noPreliminaryNeedsAfterObjectFacts: compiled.preliminaryNeeds.length === 0,
    readyMixM3: rows.get("slab-repair:material:ready-mix")?.quantity === "31.2",
    repairNetKg: rows.get("slab-repair:control:repair-mortar-net-mass")?.quantity === "228",
    repairBags: rows.get("slab-repair:material:repair-mortar-bags")?.quantity === "10",
    repairDryRemainderKg:
      rows.get("slab-repair:control:repair-mortar-dry-remainder")?.quantity === "22",
    repairMixingWaterL: rows.get("slab-repair:material:mixing-water")?.quantity === "35.568",
    removedVolumeM3: rows.get("slab-repair:waste:removed-base")?.quantity === "0.12",
    liquidCuringPackages: rows.get("slab-repair:material:liquid-curing-packages")?.quantity === "2",
    deliveryM3Km: rows.get("slab-repair:delivery:ready-mix")?.quantity === "468",
    completeIndependentMap: missing.length === 0,
    noInventedHours: !compiled.rows.some((row) =>
      row.unit_id === "man_hour" || row.unit_id === "machine_hour"),
    noWholeSlabRebarOrFormwork: !compiled.rows.some((row) =>
      /(?:арматур|опалуб)|(?:reinforc|formwork)/iu.test(`${row.row_id} ${row.title_ru}`)),
    controlNotSeparatelyPayable:
      rows.get("slab-repair:document:quality-set")?.included_in_estimate === false,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) throw new Error(`STOP_S27_16_SLAB_REPAIR_CORE:${failed.join(",")}`);

  for (const entry of SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP.entries
    .filter((candidate) => [
      "always",
      "local repair selected",
      "separate delivery",
      "LIQUID_COMPOUND",
    ].includes(candidate.condition))) {
    const mutated = new Set(rowIds);
    mutated.delete(entry.resolution.rowId);
    if (!slabRepairMissingRequiredRows(mutated).includes(entry.resolution.rowId)) {
      throw new Error(`STOP_S27_16_SLAB_REPAIR_REMOVAL_MUTATION:${entry.resolution.rowId}`);
    }
  }
  return {
    status: "GREEN_S27_17_SLAB_FOUNDATION_LOCAL_REPAIR_WATER_AND_REMAINDER_CORE",
    assertions,
    shortPreliminaryNeedCount: short.preliminaryNeeds.length,
    completeRowCount: compiled.rows.length,
    procurementRowCount: compiled.rows.filter((row) => row.included_in_procurement).length,
    serializedSha256: createHash("sha256").update(JSON.stringify({ short, compiled })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-17.slab-foundation-local-repair-water-remainder-successor.v2",
  stopCode: "S27_17_SLAB_FOUNDATION_LOCAL_REPAIR_WATER_REMAINDER",
  applicationName: "s27-17-slab-foundation-local-repair-water-remainder-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (57).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "7c1b62dbe371ac72f9ffd0d884b7ff5a87c3b5c68bf53818a4e0fde98d654ca6",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-17/slab-foundation-local-repair-water-remainder-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/slab-foundation-local-repair-s27-16.json",
    "src/lib/estimate/v4/slabFoundationLocalRepairS2716.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
    "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
    "tests/estimateNorms/s2716PurchasableExamples.contract.test.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2716SlabFoundationLocalRepairSuccessor.ts",
  ],
  catalogId: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID,
  sourceId: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_ID,
  normId: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
  sourceMetadata: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_METADATA,
  parameterDefinitions: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_PARAMETERS,
  formulaDefinitions: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_FORMULAS,
  resourceDefinitions: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RESOURCES,
  shortInput: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT,
  acceptanceInput: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
  runtimeProfileInput: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT,
  runtimeProfileClassification: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [23, 17, 27],
  benchmarkOrdinal: 0,
  validationScenario: "S27_17_SLAB_FOUNDATION_150_M2_REPAIR_WATER_FROM_NET_MASS_WITH_DRY_REMAINDER",
  passport: {
    canonicalRuName: "Бетонирование плитного фундамента с локальным ремонтом основания",
    workKey: "concrete_foundation_interior_slab_foundation_pour_repair",
    physicalResultRu:
      "Измеренные локальные дефекты основания восстановлены системой Sika MonoTop-4012, после чего плитный фундамент забетонирован товарной смесью, отделан и выдержан выбранным способом ухода.",
    includedScopeRu: [
      "товарный бетон по геометрии плиты и видимому резерву заказа NRMCA CIP 31",
      "удаление дефектного материала, механическая подготовка основания, MonoTop-4012 в мешках, вода затворения, укладка ремонта и вывоз отходов",
      "укладка, виброуплотнение и отделка бетона без выдуманных человеко- и машино-часов",
      "раздельные ветки ухода: готовый Sika Antisol A без разбавления, плёнка ASTM C171 не менее 0,10 мм или вода по ППР",
      "доставка товарного бетона по видимому маршруту; документы контроля без самостоятельной оплаты по умолчанию",
      "насос, кран, зимний прогрев и гидрошпонка только по выбранной условной ветке",
    ],
    excludedScopeRu: [
      "армирование и опалубка всей плиты",
      "земляные работы и замена основания за пределами измеренных ремонтных карт",
      "отдельный грунтующий слой для выбранной системы MonoTop-4012, где PDS его не требует",
      "зимний прогрев, насос, кран или гидрошпонка без фактического выбора",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "SLAB_FOUNDATION_CONCRETE_PLACEMENT_WITH_LOCAL_BASE_REPAIR",
    scopeClass: "MEASURED_LOCAL_REPAIR_PATCHES",
    constructionState: "REINFORCEMENT_AND_FORMWORK_BY_ADJACENT_SCOPE",
    primaryMeasureParameterId: "slab_area_m2",
    geometryParameters: [
      "slab_area_m2",
      "slab_thickness_mm",
      "local_repair_area_m2",
      "local_repair_depth_mm",
    ],
    selectedPreliminaryProfile: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
    repairDepthRangeMm: [6, 120],
  },
  binding: {
    rowId: "slab-repair:material:repair-mortar-bags",
    applicability: {
      technology_class: "SIKA_MONOTOP_4012_R4_LOCAL_HORIZONTAL_REPAIR",
      operation_class: "SLAB_FOUNDATION_CONCRETE_PLACEMENT_WITH_LOCAL_BASE_REPAIR",
      source_id: "sika_monotop_4012_pds_2026_03",
      norm_id: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
      quantity_basis: "REPAIR_AREA_TIMES_DEPTH_TIMES_1_9_KG_PER_M2_MM_ROUNDED_TO_25_KG_BAGS",
      primer_required_for_selected_system: false,
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_ROUTE_PRODUCT_AND_SITE_DATA",
    },
  },
  locator: {
    key: "slab-foundation-local-repair-monotop4012-antisol-a-s27-17",
    payload: {
      kind: "COMPOSITE_PRODUCT_AND_TECHNOLOGY_PROFILE",
      exactLocator: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_METADATA.exact_locator,
      quantityModel:
        "slab geometry -> concrete order; repair area/depth -> net mortar, whole bags, dry remainder, mixing water and waste; slab area -> selected curing branch",
      defaultCuringBranch: "LIQUID_COMPOUND_SIKA_ANTISOL_A_READY_TO_USE",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "Бетонирование плитного фундамента с локальным ремонтом основания",
    aliases: [
      "плита 150 м2 с локальным ремонтом основания",
      "бетонирование фундаментной плиты с ремонтом дефектов",
      "заливка плиты и ремонт основания",
      "локальный ремонт основания перед бетонированием плиты",
    ],
    shortScopeRu:
      "Локальный ремонт измеренных дефектов системой MonoTop-4012 и бетонирование плитного фундамента с доставкой и раздельно выбранным уходом; без повторной закупки арматуры и опалубки.",
    keyDistinguishingParameters: [
      "slab_area_m2",
      "slab_thickness_mm",
      "concrete_mixture_designation",
      "local_repair_area_m2",
      "local_repair_depth_mm",
    ],
    clarificationFields: [
      "толщина плиты, обозначение бетонной смеси, площадь и глубина локального ремонта",
    ],
    includedBoundaries: [
      "бетон, локальная ремонтная система, работы, включённый инструмент, уход и доставка",
      "автоматические нормы выбранных продуктов с единицами и источниками",
    ],
    excludedBoundaries: [
      "армирование и опалубка всей плиты",
      "неизмеренная замена основания и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "плита плитный фундамент бетонирование локальный ремонт основание MonoTop 4012 Antisol жидкий уход плёнка вода",
    sourceProvenance: {
      nrmcaConcreteOrderGuidance: true,
      manufacturerRepairConsumption: true,
      distinctCuringBranches: true,
      automaticQuantityFromKnownDimensions: true,
      noInventedLaborOrMachineHours: true,
      independentCompletenessMap: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:арматур|армировани(?:е|я))|(?:reinforc)/iu,
    /(?:опалуб)|(?:formwork)/iu,
    /(?:котлован|транше|землян)|(?:excavation|earthwork)/iu,
  ],
  owner: "S27_16_SLAB_FOUNDATION_LOCAL_REPAIR_SUCCESSOR",
  receiptFileStem: "S27_16_SLAB_FOUNDATION_LOCAL_REPAIR",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
