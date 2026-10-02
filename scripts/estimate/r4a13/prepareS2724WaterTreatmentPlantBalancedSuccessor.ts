import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  WATER_TREATMENT_PLANT_CATALOG_ID,
  WATER_TREATMENT_PLANT_FORMULAS,
  WATER_TREATMENT_PLANT_NORM_ID,
  WATER_TREATMENT_PLANT_PARAMETERS,
  WATER_TREATMENT_PLANT_RESOURCES,
  WATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION,
  WATER_TREATMENT_PLANT_RUNTIME_INPUT,
  WATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS,
  WATER_TREATMENT_PLANT_SHORT_INPUT,
  WATER_TREATMENT_PLANT_SOURCE_ID,
  WATER_TREATMENT_PLANT_SOURCE_METADATA,
  compileWaterTreatmentPlantR1,
} from "../../../src/lib/estimate/v4/waterTreatmentPlantR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileWaterTreatmentPlantR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wtp_facility_count", "wtp_facility_designation", "wtp_process_type",
  "wtp_design_capacity_m3_day", "wtp_filter_train_count",
  "wtp_filter_media_installed_t", "wtp_filter_media_designation",
  "wtp_raw_water_pump_installed_piece", "wtp_raw_water_pump_designation",
  "wtp_treated_water_pump_installed_piece", "wtp_treated_water_pump_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wtp_excavation_shoring_mode: "REQUIRED",
  wtp_excavation_shoring_designation: "SHEET-PILE-AZ18",
  wtp_excavation_shoring_area_m2: 4000,
  wtp_groundwater_dewatering_mode: "REQUIRED",
  wtp_groundwater_dewatering_designation: "WELLPOINT-240M3H",
  wtp_groundwater_dewatering_machine_h: 1800,
  wtp_road_reinstatement_mode: "REQUIRED",
  wtp_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
  wtp_road_reinstatement_area_m2: 1800,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWaterTreatmentPlantR1({
    ...WATER_TREATMENT_PLANT_SHORT_INPUT,
  });
  const complete = await compileWaterTreatmentPlantR1({
    ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  });
  const balanced = await compileWaterTreatmentPlantR1({
    ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    wtp_filter_media_retained_spare_t: 4,
    wtp_filter_media_supplier_package_mass_t: 0.5,
  });
  const conditional = await compileWaterTreatmentPlantR1({
    ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 34
    && quantity(first, "rc09:wtp_acceptance") === "1"
    && quantity(first, "rc09:wtp_raw_water_pumps") === "4"
    && quantity(first, "rc09:wtp_treated_water_pumps") === "4"
    && quantity(first, "rc09:wtp_filter_media") === "80")) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wtp_coagulant_dosing") === "2"
    && quantity(complete, "rc09:wtp_chlorination") === "2"
    && quantity(complete, "rc09:wtp_backwash_pumps") === "3"
    && quantity(complete, "rc09:wtp_process_piping") === "620"
    && quantity(complete, "rc09:wtp_structural_concrete") === "3200"
    && quantity(complete, "rc09:wtp_rebar") === "430000"
    && quantity(complete, "rc09:labor:wtp-civil") === "21000"
    && quantity(complete, "rc09:equipment:wtp-crane") === "780"
    && quantity(complete, "rc09:logistics:wtp-material-delivery") === "320")) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wtp-media-balance:installed-net") === "80"
    && quantity(balanced, "rc09:wtp-media-balance:retained-spare") === "4"
    && quantity(balanced, "rc09:wtp-media-balance:total-need") === "84"
    && quantity(balanced, "rc09:wtp-media-balance:package-count") === "168"
    && quantity(balanced, "rc09:wtp_filter_media") === "84"
    && quantity(balanced, "rc09:wtp-media-balance:remainder") === "4"
    && quantity(balanced, "rc09:wtp-media-balance:surplus-beyond-spare") === "0")) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wtp_acceptance", "rc09:wtp_mechanical_commissioning_tests",
    "rc09:wtp_electrical_tests", "rc09:wtp_water_quality_tests",
    "rc09:wtp_asbuilt_documents",
  ]) {
    const graph = WATER_TREATMENT_PLANT_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WATER_TREATMENT_PLANT_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_capacity\w*\s*\*|capacity_m3_day\s*\*|waterTreatmentPlantCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(WATER_TREATMENT_PLANT_FORMULAS))) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_LEGACY_COEFFICIENT");
  }
  if (/water_intake|village_water|reservoir|water_tower|wastewater|sewer/iu
    .test(JSON.stringify(WATER_TREATMENT_PLANT_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WATER_TREATMENT_PLANT_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WATER_TREATMENT_PLANT_BALANCED_CORE",
    first: {
      rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WATER_TREATMENT_PLANT_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedT: quantity(balanced, "rc09:wtp-media-balance:installed-net"),
      retainedSpareT: quantity(balanced, "rc09:wtp-media-balance:retained-spare"),
      totalNeedT: quantity(balanced, "rc09:wtp-media-balance:total-need"),
      packageCount: quantity(balanced, "rc09:wtp-media-balance:package-count"),
      orderedT: quantity(balanced, "rc09:wtp_filter_media"),
      remainderT: quantity(balanced, "rc09:wtp-media-balance:remainder"),
      surplusT: quantity(balanced, "rc09:wtp-media-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.water-treatment-plant-balanced-successor.v1",
  stopCode: "S27_24_WATER_TREATMENT_PLANT_BALANCED",
  applicationName: "s27-24-water-treatment-plant-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "4889c046-57a8-501a-87bb-8b1047bf4e12",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "860a6bdd-4490-57b6-8a02-6db88eb4672c",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(
    ".release-runtime/r568/s27-24/water-treatment-plant-balanced-successor",
  ),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-treatment-plant-rapid-gravity-filter-media-balanced-s27-24.json",
    "src/lib/estimate/v4/waterTreatmentPlantR1.ts",
    "tests/estimateNorms/waterTreatmentPlantR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WaterTreatmentPlantBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WaterTreatmentPlantBalancedIndependent.ts",
  ],
  catalogId: WATER_TREATMENT_PLANT_CATALOG_ID,
  sourceId: WATER_TREATMENT_PLANT_SOURCE_ID,
  normId: WATER_TREATMENT_PLANT_NORM_ID,
  sourceMetadata: WATER_TREATMENT_PLANT_SOURCE_METADATA,
  parameterDefinitions: WATER_TREATMENT_PLANT_PARAMETERS,
  formulaDefinitions: WATER_TREATMENT_PLANT_FORMULAS,
  resourceDefinitions: WATER_TREATMENT_PLANT_RESOURCES,
  shortInput: WATER_TREATMENT_PLANT_SHORT_INPUT,
  acceptanceInput: WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_TREATMENT_PLANT_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [4, 45, 45],
  benchmarkOrdinal: 59,
  validationScenario: "Q5_WATER_TREATMENT_PLANT_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство водоочистной станции питьевой воды",
    workKey: "water_treatment_plant",
    physicalResultRu: "Водоочистная станция WTP-RGF-5000-4F смонтирована, испытана, запущена и принята",
    includedScopeRu: [
      "коагуляция, флокуляция, отстаивание, скорые фильтры и хлорирование",
      "насосы, загрузка, трубопроводы, арматура, КИП, MCC, ПЛК и SCADA",
      "строительные объёмы, расходники, труд, механизмы, испытания и логистика",
      "крепление, водопонижение и восстановление дороги только по условным ветвям",
    ],
    excludedScopeRu: [
      "водозабор, наружная сеть, резервуар, башня и очистка сточных вод",
      "автоматические объёмы по производительности или числу фильтров",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_TREATMENT_RAPID_GRAVITY_FILTRATION",
    plantAssembly: "WTP_RGF_5000_4F_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wtp_facility_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleFilterMediaProcurementBalance: true,
    directProjectProcessCivilElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalExcavationAndRoadWorkFailClosed: true,
    capacityOrFilterCountDerivedQuantitiesForbidden: true,
    adjacentWaterAndWastewaterFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wtp_acceptance",
    applicability: {
      technology_class: "POTABLE_WATER_RAPID_GRAVITY_FILTRATION",
      operation_class: "WATER_TREATMENT_PLANT_CONSTRUCTION",
      plant_assembly: "WTP_RGF_5000_4F_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_WTP_SCOPE_PLUS_VISIBLE_MEDIA_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WATER_TREATMENT_PLANT_SOURCE_ID,
      norm_id: WATER_TREATMENT_PLANT_NORM_ID,
      exact_locator: WATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_WTP_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PACKAGE",
    },
  },
  locator: {
    key: "water-treatment-plant-rapid-gravity-filter-media-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WATER_TREATMENT_PLANT_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WATER_TREATMENT_PLANT_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WATER_TREATMENT_PLANT_RUNTIME_INPUT),
      directProjectInputs: WATER_TREATMENT_PLANT_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(WATER_TREATMENT_PLANT_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "road_reinstatement"]
            .some((branch) => id.startsWith(`wtp_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство водоочистной станции питьевой воды",
    aliases: [
      "водоочистная станция со скорыми гравитационными фильтрами",
      "станция водоподготовки 5000 м3 в сутки",
      "potable water treatment plant rapid gravity filters",
    ],
    shortScopeRu: "Одна WTP-RGF-5000-4F: 5000 м³/сут, четыре скорых фильтра, насосы и 80 т антрацита; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WATER_TREATMENT_PLANT_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(WATER_TREATMENT_PLANT_SHORT_INPUT, id)),
    includedBoundaries: [
      "технологическое оборудование, фильтрующая загрузка, трубы, арматура, КИП и автоматизация",
      "строительные объёмы, расходники, труд, механизмы, QA и логистика",
      "условные крепление, водопонижение и дорожное восстановление только по проекту",
    ],
    excludedBoundaries: [
      "водозабор, наружная сеть, резервуар, башня, канализация и очистка сточных вод",
      "автоматические объёмы по производительности или числу фильтров",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "водоочистная станция водоподготовка коагуляция флокуляция отстойники скорые фильтры хлорирование",
    sourceProvenance: {
      exactExpandedWaterTreatmentPlantOwner: true,
      knownSelectedProcessCapacityFiltersMediaAndPumpIdentity: true,
      visibleIndependentFilterMediaProcurementBalance: true,
      exactProjectProcessCivilElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /water.intake|водозабор/iu,
    /village.water|наружн.*сет/iu,
    /reservoir|резервуар/iu,
    /water.tower|водонапорн.*башн/iu,
    /wastewater|сточн.*вод/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_WATER_TREATMENT_PLANT_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WATER_TREATMENT_PLANT_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
