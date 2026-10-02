import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  BOREHOLE_WATER_SUPPLY_CATALOG_ID,
  BOREHOLE_WATER_SUPPLY_FORMULAS,
  BOREHOLE_WATER_SUPPLY_NORM_ID,
  BOREHOLE_WATER_SUPPLY_PARAMETERS,
  BOREHOLE_WATER_SUPPLY_RESOURCES,
  BOREHOLE_WATER_SUPPLY_RUNTIME_CLASSIFICATION,
  BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT,
  BOREHOLE_WATER_SUPPLY_RUNTIME_SOURCE_IDS,
  BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
  BOREHOLE_WATER_SUPPLY_SOURCE_ID,
  BOREHOLE_WATER_SUPPLY_SOURCE_METADATA,
  compileBoreholeWaterSupplyR1,
} from "../../../src/lib/estimate/v4/boreholeWaterSupplyR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileBoreholeWaterSupplyR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "bh_borehole_count", "bh_borehole_designation", "bh_purpose",
  "bh_drilled_depth_m", "bh_final_bore_diameter_mm",
  "bh_casing_installed_m", "bh_casing_designation",
  "bh_screen_installed_m", "bh_screen_designation",
  "bh_pump_installed_piece", "bh_pump_designation",
  "bh_rising_main_installed_m", "bh_rising_main_designation",
  "bh_wellhead_installed_set", "bh_wellhead_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  bh_temporary_access_mode: "REQUIRED",
  bh_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
  bh_temporary_access_area_m2: 1200,
  bh_drilling_fluid_disposal_mode: "REQUIRED",
  bh_drilling_fluid_disposal_designation: "LICENSED-DRILLING-SLURRY-DISPOSAL",
  bh_drilling_fluid_disposal_trip_count: 60,
  bh_standby_power_mode: "REQUIRED",
  bh_standby_power_designation: "GENSET-250KVA",
  bh_standby_power_machine_h: 240,
});

async function verifyCore(): Promise<Json> {
  const first = await compileBoreholeWaterSupplyR1({
    ...BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
  });
  const complete = await compileBoreholeWaterSupplyR1({
    ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  });
  const balanced = await compileBoreholeWaterSupplyR1({
    ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
    bh_casing_retained_spare_m: 12,
    bh_casing_supplier_joint_length_m: 6,
  });
  const conditional = await compileBoreholeWaterSupplyR1({
    ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 13 && first.preliminaryNeeds.length === 32
    && quantity(first, "rc09:bh_acceptance") === "1"
    && quantity(first, "rc09:bh_drilling") === "180"
    && quantity(first, "rc09:bh_casing") === "180"
    && quantity(first, "rc09:bh_screen") === "36"
    && quantity(first, "rc09:bh_submersible_pump") === "1")) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:bh_gravel_pack") === "28"
    && quantity(complete, "rc09:bh_annular_grout") === "42"
    && quantity(complete, "rc09:bh_power_cable") === "180"
    && quantity(complete, "rc09:bh_geophysical_logging") === "180"
    && quantity(complete, "rc09:labor:bh-drilling") === "1600"
    && quantity(complete, "rc09:equipment:bh-drilling-rig") === "720"
    && quantity(complete, "rc09:logistics:bh-material-delivery") === "32")) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:bh-casing-balance:installed-net") === "180"
    && quantity(balanced, "rc09:bh-casing-balance:retained-spare") === "12"
    && quantity(balanced, "rc09:bh-casing-balance:total-need") === "192"
    && quantity(balanced, "rc09:bh-casing-balance:joint-count") === "32"
    && quantity(balanced, "rc09:bh_casing") === "192"
    && quantity(balanced, "rc09:bh-casing-balance:remainder") === "12"
    && quantity(balanced, "rc09:bh-casing-balance:surplus-beyond-spare") === "0")) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:bh_acceptance", "rc09:bh_drilling", "rc09:bh_development",
    "rc09:bh_test_pumping", "rc09:bh_water_analysis", "rc09:bh_disinfection",
    "rc09:bh_electrical_tests", "rc09:bh_asbuilt_documents",
  ]) {
    const graph = BOREHOLE_WATER_SUPPLY_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_BOREHOLE_WATER_SUPPLY_DOUBLE_COST:${rowId}`);
    }
  }
  if (/80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(BOREHOLE_WATER_SUPPLY_FORMULAS))) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_LEGACY_COEFFICIENT");
  }
  if (/village_water|distribution|reservoir|treatment_plant|sewer/iu
    .test(JSON.stringify(BOREHOLE_WATER_SUPPLY_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_BOREHOLE_WATER_SUPPLY_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_BOREHOLE_WATER_SUPPLY_BALANCED_CORE",
    first: {
      rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:bh-casing-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:bh-casing-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:bh-casing-balance:total-need"),
      jointCount: quantity(balanced, "rc09:bh-casing-balance:joint-count"),
      orderedM: quantity(balanced, "rc09:bh_casing"),
      remainderM: quantity(balanced, "rc09:bh-casing-balance:remainder"),
      surplusM: quantity(balanced, "rc09:bh-casing-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.borehole-water-supply-balanced-successor.v1",
  stopCode: "S27_24_BOREHOLE_WATER_SUPPLY_BALANCED",
  applicationName: "s27-24-borehole-water-supply-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "62ec3492-00d3-56c7-b75c-3281c662d60f",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "87ec7b4d-ed96-5c67-8fc9-9eb2c0ae34a2",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(
    ".release-runtime/r568/s27-24/borehole-water-supply-balanced-successor",
  ),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/borehole-water-supply-casing-balanced-s27-24.json",
    "src/lib/estimate/v4/boreholeWaterSupplyR1.ts",
    "tests/estimateNorms/boreholeWaterSupplyR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724BoreholeWaterSupplyBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724BoreholeWaterSupplyBalancedIndependent.ts",
  ],
  catalogId: BOREHOLE_WATER_SUPPLY_CATALOG_ID,
  sourceId: BOREHOLE_WATER_SUPPLY_SOURCE_ID,
  normId: BOREHOLE_WATER_SUPPLY_NORM_ID,
  sourceMetadata: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA,
  parameterDefinitions: BOREHOLE_WATER_SUPPLY_PARAMETERS,
  formulaDefinitions: BOREHOLE_WATER_SUPPLY_FORMULAS,
  resourceDefinitions: BOREHOLE_WATER_SUPPLY_RESOURCES,
  shortInput: BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
  acceptanceInput: BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  runtimeProfileInput: BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT,
  runtimeProfileClassification: BOREHOLE_WATER_SUPPLY_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: BOREHOLE_WATER_SUPPLY_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 60,
  validationScenario: "Q5_BOREHOLE_WATER_SUPPLY_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Устройство эксплуатационной скважины питьевого водоснабжения",
    workKey: "borehole_water_supply",
    physicalResultRu: "Скважина BH-PW-180-DN250 пробурена, оборудована, испытана и принята",
    includedScopeRu: [
      "бурение, обсадная и фильтровая колонны, обсыпка и цементаж по проекту",
      "погружной насос, водоподъёмная колонна, оголовок, камера, КИП и управление",
      "материалы, расходники, труд, механизмы, испытания, анализы и логистика",
      "подъезд, вывоз бурового шлама и резервное питание только по условным ветвям",
    ],
    excludedScopeRu: [
      "наружная сеть, резервуар, водоподготовка, канализация и соседние сооружения",
      "автоматические объёмы по глубине скважины",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_PRODUCTION_BOREHOLE",
    boreholeAssembly: "BH_PW_180_DN250_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "bh_borehole_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleCasingProcurementBalance: true,
    directProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalSiteAndDisposalWorkFailClosed: true,
    depthDerivedQuantitiesForbidden: true,
    adjacentWaterAndSewerFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:bh_acceptance",
    applicability: {
      technology_class: "POTABLE_WATER_PRODUCTION_BOREHOLE",
      operation_class: "BOREHOLE_CONSTRUCTION_AND_COMMISSIONING",
      borehole_assembly: "BH_PW_180_DN250_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_BOREHOLE_SCOPE_PLUS_VISIBLE_CASING_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: BOREHOLE_WATER_SUPPLY_SOURCE_ID,
      norm_id: BOREHOLE_WATER_SUPPLY_NORM_ID,
      exact_locator: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_BOREHOLE_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_JOINT",
    },
  },
  locator: {
    key: "borehole-water-supply-casing-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
      sourcePackSha256: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(BOREHOLE_WATER_SUPPLY_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT),
      directProjectInputs: BOREHOLE_WATER_SUPPLY_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(BOREHOLE_WATER_SUPPLY_SHORT_INPUT, id)
          && !["temporary_access", "drilling_fluid_disposal", "standby_power"]
            .some((branch) => id.startsWith(`bh_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Устройство эксплуатационной скважины питьевого водоснабжения",
    aliases: [
      "бурение и обустройство питьевой эксплуатационной скважины",
      "скважина питьевого водоснабжения 180 м",
      "potable water production borehole drilling casing pump",
    ],
    shortScopeRu: "Одна BH-PW-180-DN250: 180 м, ствол 311 мм, обсадка, фильтр, насос, водоподъёмная колонна и санитарный оголовок; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: BOREHOLE_WATER_SUPPLY_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(BOREHOLE_WATER_SUPPLY_SHORT_INPUT, id)),
    includedBoundaries: [
      "бурение, обсадка, фильтр, насос, оголовок, материалы и комплектующие",
      "труд, механизмы, испытания, анализы, документация и логистика",
      "условные подъезд, вывоз шлама и резервное питание только по проекту",
    ],
    excludedBoundaries: [
      "наружная сеть, резервуар, водоподготовка, канализация и соседние сооружения",
      "автоматические объёмы по глубине скважины",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "эксплуатационная скважина бурение обсадная колонна фильтр погружной насос оголовок опытная откачка",
    sourceProvenance: {
      exactExpandedBoreholeWaterSupplyOwner: true,
      knownSelectedBoreholeCasingScreenPumpAndWellheadIdentity: true,
      visibleIndependentCasingProcurementBalance: true,
      exactProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /village.water|наружн.*сет/iu,
    /distribution|распределительн.*сет/iu,
    /reservoir|резервуар/iu,
    /treatment.plant|водоочистн/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_BOREHOLE_WATER_SUPPLY_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_BOREHOLE_WATER_SUPPLY_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
