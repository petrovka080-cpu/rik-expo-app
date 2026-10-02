import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WATER_TOWER_ACCEPTANCE_INPUT, WATER_TOWER_CATALOG_ID, WATER_TOWER_FORMULAS,
  WATER_TOWER_NORM_ID, WATER_TOWER_PARAMETERS, WATER_TOWER_RESOURCES,
  WATER_TOWER_RUNTIME_CLASSIFICATION, WATER_TOWER_RUNTIME_INPUT,
  WATER_TOWER_RUNTIME_SOURCE_IDS, WATER_TOWER_SHORT_INPUT, WATER_TOWER_SOURCE_ID,
  WATER_TOWER_SOURCE_METADATA, compileWaterTowerR1,
} from "../../../src/lib/estimate/v4/waterTowerR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileWaterTowerR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wt_tower_count", "wt_tower_designation", "wt_tower_type",
  "wt_tank_capacity_m3", "wt_support_height_m",
  "wt_coating_installed_area_m2", "wt_coating_designation",
  "wt_riser_pipe_installed_m", "wt_riser_pipe_designation",
  "wt_overflow_pipe_installed_m", "wt_overflow_pipe_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wt_excavation_shoring_mode: "REQUIRED",
  wt_excavation_shoring_designation: "SHEET-PILE-LIGHT",
  wt_excavation_shoring_area_m2: 600,
  wt_groundwater_dewatering_mode: "REQUIRED",
  wt_groundwater_dewatering_designation: "WELLPOINT-60M3H",
  wt_groundwater_dewatering_machine_h: 120,
  wt_road_reinstatement_mode: "REQUIRED",
  wt_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
  wt_road_reinstatement_area_m2: 300,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWaterTowerR1({ ...WATER_TOWER_SHORT_INPUT });
  const complete = await compileWaterTowerR1({ ...WATER_TOWER_ACCEPTANCE_INPUT });
  const balanced = await compileWaterTowerR1({ ...WATER_TOWER_ACCEPTANCE_INPUT,
    wt_coating_retained_spare_area_m2: 20,
    wt_coating_supplier_package_coverage_m2: 25 });
  const conditional = await compileWaterTowerR1({
    ...WATER_TOWER_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 34
    && quantity(first, "rc09:wt_acceptance") === "1"
    && quantity(first, "rc09:wt_tower_assembly") === "1"
    && quantity(first, "rc09:wt_coating") === "620"
    && quantity(first, "rc09:wt_riser_pipe") === "38"
    && quantity(first, "rc09:wt_overflow_pipe") === "22")) {
    throw new Error("STOP_S27_24_WATER_TOWER_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wt_foundation_concrete") === "145"
    && quantity(complete, "rc09:wt_rebar") === "18500"
    && quantity(complete, "rc09:wt_anchor_bolts") === "24"
    && quantity(complete, "rc09:wt_level_controls") === "2"
    && quantity(complete, "rc09:labor:wt-civil") === "2400"
    && quantity(complete, "rc09:equipment:wt-crane") === "160"
    && quantity(complete, "rc09:logistics:wt-material-delivery") === "32")) {
    throw new Error("STOP_S27_24_WATER_TOWER_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wt-coating-balance:installed-net") === "620"
    && quantity(balanced, "rc09:wt-coating-balance:retained-spare") === "20"
    && quantity(balanced, "rc09:wt-coating-balance:total-need") === "640"
    && quantity(balanced, "rc09:wt-coating-balance:package-count") === "26"
    && quantity(balanced, "rc09:wt_coating") === "650"
    && quantity(balanced, "rc09:wt-coating-balance:remainder") === "30"
    && quantity(balanced, "rc09:wt-coating-balance:surplus-beyond-spare") === "10")) {
    throw new Error("STOP_S27_24_WATER_TOWER_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WATER_TOWER_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:wt_acceptance", "rc09:wt_hydrostatic_tests",
    "rc09:wt_disinfection_cycles", "rc09:wt_electrical_tests",
    "rc09:wt_water_quality_tests", "rc09:wt_asbuilt_documents"]) {
    const graph = WATER_TOWER_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WATER_TOWER_DOUBLE_COST:${rowId}`);
    }
  }
  if (/tank_capacity\w*\s*\*|support_height\w*\s*\*|length_m\s*\*\s*0\.|villageWaterSupply|golden_rate|normFactor/iu
    .test(JSON.stringify(WATER_TOWER_FORMULAS))) {
    throw new Error("STOP_S27_24_WATER_TOWER_LEGACY_COEFFICIENT");
  }
  if (/trench|hydrant|manhole|village_water|water_intake|treatment_plant|reservoir|sewer/iu
    .test(JSON.stringify(WATER_TOWER_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WATER_TOWER_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WATER_TOWER_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WATER_TOWER_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedAreaM2: quantity(balanced, "rc09:wt-coating-balance:installed-net"),
      retainedSpareAreaM2: quantity(balanced, "rc09:wt-coating-balance:retained-spare"),
      totalNeedAreaM2: quantity(balanced, "rc09:wt-coating-balance:total-need"),
      packageCount: quantity(balanced, "rc09:wt-coating-balance:package-count"),
      orderedAreaM2: quantity(balanced, "rc09:wt_coating"),
      remainderAreaM2: quantity(balanced, "rc09:wt-coating-balance:remainder"),
      surplusAreaM2: quantity(balanced, "rc09:wt-coating-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.water-tower-balanced-successor.v1",
  stopCode: "S27_24_WATER_TOWER_BALANCED",
  applicationName: "s27-24-water-tower-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "eed44846-3c85-5a7e-a6d7-430b179f4794",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "cee3dbaa-4f6d-5ec3-a3aa-22269d329982",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/water-tower-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-tower-rozhovsky-coating-balanced-s27-24.json",
    "src/lib/estimate/v4/waterTowerR1.ts",
    "tests/estimateNorms/waterTowerR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WaterTowerBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WaterTowerBalancedIndependent.ts",
  ],
  catalogId: WATER_TOWER_CATALOG_ID, sourceId: WATER_TOWER_SOURCE_ID,
  normId: WATER_TOWER_NORM_ID, sourceMetadata: WATER_TOWER_SOURCE_METADATA,
  parameterDefinitions: WATER_TOWER_PARAMETERS, formulaDefinitions: WATER_TOWER_FORMULAS,
  resourceDefinitions: WATER_TOWER_RESOURCES, shortInput: WATER_TOWER_SHORT_INPUT,
  acceptanceInput: WATER_TOWER_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_TOWER_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_TOWER_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_TOWER_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 58,
  validationScenario: "Q5_WATER_TOWER_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство стальной водонапорной башни Рожновского",
    workKey: "water_tower",
    physicalResultRu: "Стальная водонапорная башня Рожновского смонтирована, защищена, испытана и принята",
    includedScopeRu: [
      "фундамент, анкеры, стальная башня, лестницы, площадки и ограждение",
      "покрытие, стояк, перелив, дренаж, арматура, КИП, молниезащита и заземление",
      "дезинфекция, анализ воды, труд, механизмы, документация и логистика",
      "крепление, водопонижение и восстановление дороги только условно",
    ],
    excludedScopeRu: [
      "наружная сеть, траншея, колодцы и гидранты",
      "водозабор, водоподготовка, насосная, резервуар и канализация",
      "автоматические объёмы по ёмкости или высоте и неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "STEEL_ROZHNOVSKY_WATER_TOWER",
    packageAssembly: "WT_ROZHNOVSKY_VBR50_18_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wt_tower_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleCoatingProcurementBalance: true,
    directProjectCivilSteelPipingElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalExcavationAndRoadWorkFailClosed: true,
    capacityOrHeightDerivedQuantitiesForbidden: true, adjacentNetworkAndFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wt_acceptance",
    applicability: {
      tower_class: "STEEL_ROZHNOVSKY_WATER_TOWER",
      operation_class: "WATER_TOWER_CONSTRUCTION",
      package_assembly: "WT_ROZHNOVSKY_VBR50_18_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_TOWER_COATING_PIPE_SCOPE_PLUS_VISIBLE_COATING_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WATER_TOWER_SOURCE_ID, norm_id: WATER_TOWER_NORM_ID,
      exact_locator: WATER_TOWER_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_TOWER_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PACKAGE",
    },
  },
  locator: {
    key: "water-tower-rozhovsky-coating-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WATER_TOWER_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WATER_TOWER_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WATER_TOWER_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WATER_TOWER_RUNTIME_INPUT),
      directProjectInputs: WATER_TOWER_PARAMETERS.map((parameter) => parameter.parameter_id)
        .filter((id) => !Object.hasOwn(WATER_TOWER_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "road_reinstatement"]
            .some((branch) => id.startsWith(`wt_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство стальной водонапорной башни Рожновского",
    aliases: ["строительство водонапорной башни", "башня Рожновского ВБР 50 м3",
      "steel Rozhnovsky elevated water tower"],
    shortScopeRu: "Одна WT-ROZHNOVSKY-VBR50-18: бак 50 м³, опора 18 м, покрытие и башенные трубопроводы; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WATER_TOWER_PARAMETERS.map((parameter) => parameter.parameter_id)
      .filter((id) => !Object.hasOwn(WATER_TOWER_SHORT_INPUT, id)),
    includedBoundaries: [
      "фундамент, стальная башня, покрытие, лестницы, площадки и ограждение",
      "трубопроводы, арматура, КИП, молниезащита, заземление и испытания",
      "труд, механизмы, QA, логистика и условные котлованные работы",
    ],
    excludedBoundaries: [
      "наружная сеть, траншея, колодцы, гидранты и ПНД-сварка",
      "водозабор, водоподготовка, насосная станция, резервуар и канализация",
      "автоматические объёмы по ёмкости или высоте и неподтверждённые цены",
    ],
    extraSearchTermsRu: "водонапорная башня Рожновского ВБР стальная бак опора покрытие стояк молниезащита",
    sourceProvenance: {
      exactExpandedWaterTowerOwner: true, knownTowerCoatingAndPipeSchedule: true,
      visibleIndependentCoatingProcurementBalance: true,
      exactProjectCivilSteelPipingElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /trench|транше/iu, /hydrant|гидрант/iu, /manhole|колод/iu,
    /village water|наружн.*сеть/iu, /water intake|водозабор/iu,
    /treatment plant|водоподготов/iu, /reservoir|резервуар/iu, /sewer|канализац/iu,
  ],
  owner: "S27_24_WATER_TOWER_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WATER_TOWER_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
