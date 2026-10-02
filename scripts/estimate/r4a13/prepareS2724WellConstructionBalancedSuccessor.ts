import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
  WELL_CONSTRUCTION_CATALOG_ID,
  WELL_CONSTRUCTION_FORMULAS,
  WELL_CONSTRUCTION_NORM_ID,
  WELL_CONSTRUCTION_PARAMETERS,
  WELL_CONSTRUCTION_RESOURCES,
  WELL_CONSTRUCTION_RUNTIME_CLASSIFICATION,
  WELL_CONSTRUCTION_RUNTIME_INPUT,
  WELL_CONSTRUCTION_RUNTIME_SOURCE_IDS,
  WELL_CONSTRUCTION_SHORT_INPUT,
  WELL_CONSTRUCTION_SOURCE_ID,
  WELL_CONSTRUCTION_SOURCE_METADATA,
  compileWellConstructionR1,
} from "../../../src/lib/estimate/v4/wellConstructionR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileWellConstructionR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wiw_well_count", "wiw_well_designation", "wiw_well_type", "wiw_purpose",
  "wiw_shaft_depth_m", "wiw_internal_diameter_mm",
  "wiw_lining_ring_installed_piece", "wiw_lining_ring_designation",
  "wiw_joint_seal_installed_m", "wiw_joint_seal_designation",
  "wiw_pump_installed_piece", "wiw_pump_designation",
  "wiw_discharge_pipe_installed_m", "wiw_discharge_pipe_designation",
  "wiw_cover_slab_installed_piece", "wiw_cover_slab_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wiw_excavation_shoring_mode: "REQUIRED",
  wiw_excavation_shoring_designation: "HYDRAULIC-SHAFT-SHORING",
  wiw_excavation_shoring_area_m2: 140,
  wiw_groundwater_dewatering_mode: "REQUIRED",
  wiw_groundwater_dewatering_designation: "WELLPOINT-80M3H",
  wiw_groundwater_dewatering_machine_h: 240,
  wiw_temporary_access_mode: "REQUIRED",
  wiw_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
  wiw_temporary_access_area_m2: 600,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWellConstructionR1({ ...WELL_CONSTRUCTION_SHORT_INPUT });
  const complete = await compileWellConstructionR1({ ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT });
  const balanced = await compileWellConstructionR1({
    ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
    wiw_joint_seal_retained_spare_m: 5,
    wiw_joint_seal_supplier_roll_length_m: 20,
  });
  const conditional = await compileWellConstructionR1({
    ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 13 && first.preliminaryNeeds.length === 32
    && quantity(first, "rc09:wiw_acceptance") === "1"
    && quantity(first, "rc09:wiw_shaft_excavation") === "18"
    && quantity(first, "rc09:wiw_lining_rings") === "20"
    && quantity(first, "rc09:wiw_joint_seal") === "65"
    && quantity(first, "rc09:wiw_pumps") === "2")) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wiw_base_filter_gravel") === "12"
    && quantity(complete, "rc09:wiw_base_filter_geotextile") === "55"
    && quantity(complete, "rc09:wiw_sanitary_clay_seal") === "22"
    && quantity(complete, "rc09:wiw_external_backfill") === "145"
    && quantity(complete, "rc09:labor:wiw-excavation-lining") === "960"
    && quantity(complete, "rc09:equipment:wiw-excavator-crane") === "240"
    && quantity(complete, "rc09:logistics:wiw-material-delivery") === "24")) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wiw-seal-balance:installed-net") === "65"
    && quantity(balanced, "rc09:wiw-seal-balance:retained-spare") === "5"
    && quantity(balanced, "rc09:wiw-seal-balance:total-need") === "70"
    && quantity(balanced, "rc09:wiw-seal-balance:roll-count") === "4"
    && quantity(balanced, "rc09:wiw_joint_seal") === "80"
    && quantity(balanced, "rc09:wiw-seal-balance:remainder") === "15"
    && quantity(balanced, "rc09:wiw-seal-balance:surplus-beyond-spare") === "10")) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wiw_acceptance", "rc09:wiw_shaft_excavation", "rc09:wiw_cleaning",
    "rc09:wiw_pumping_test", "rc09:wiw_water_analysis", "rc09:wiw_disinfection",
    "rc09:wiw_electrical_tests", "rc09:wiw_asbuilt_documents",
  ]) {
    const graph = WELL_CONSTRUCTION_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WELL_CONSTRUCTION_DOUBLE_COST:${rowId}`);
    }
  }
  if (/80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(WELL_CONSTRUCTION_FORMULAS))) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_LEGACY_COEFFICIENT");
  }
  if (/borehole|distribution|reservoir|treatment_plant|sewer/iu
    .test(JSON.stringify(WELL_CONSTRUCTION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WELL_CONSTRUCTION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WELL_CONSTRUCTION_BALANCED_CORE",
    first: {
      rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WELL_CONSTRUCTION_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:wiw-seal-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:wiw-seal-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:wiw-seal-balance:total-need"),
      rollCount: quantity(balanced, "rc09:wiw-seal-balance:roll-count"),
      orderedM: quantity(balanced, "rc09:wiw_joint_seal"),
      remainderM: quantity(balanced, "rc09:wiw-seal-balance:remainder"),
      surplusM: quantity(balanced, "rc09:wiw-seal-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.well-construction-balanced-successor.v1",
  stopCode: "S27_24_WELL_CONSTRUCTION_BALANCED",
  applicationName: "s27-24-well-construction-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e3eaef43-4048-577e-9cec-a46bb8c97070",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "51daa26c-2134-59e8-9adf-af922fee8837",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/well-construction-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/well-construction-shaft-well-joint-seal-balanced-s27-24.json",
    "src/lib/estimate/v4/wellConstructionR1.ts",
    "tests/estimateNorms/wellConstructionR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WellConstructionBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WellConstructionBalancedIndependent.ts",
  ],
  catalogId: WELL_CONSTRUCTION_CATALOG_ID,
  sourceId: WELL_CONSTRUCTION_SOURCE_ID,
  normId: WELL_CONSTRUCTION_NORM_ID,
  sourceMetadata: WELL_CONSTRUCTION_SOURCE_METADATA,
  parameterDefinitions: WELL_CONSTRUCTION_PARAMETERS,
  formulaDefinitions: WELL_CONSTRUCTION_FORMULAS,
  resourceDefinitions: WELL_CONSTRUCTION_RESOURCES,
  shortInput: WELL_CONSTRUCTION_SHORT_INPUT,
  acceptanceInput: WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
  runtimeProfileInput: WELL_CONSTRUCTION_RUNTIME_INPUT,
  runtimeProfileClassification: WELL_CONSTRUCTION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WELL_CONSTRUCTION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 61,
  validationScenario: "Q5_WELL_CONSTRUCTION_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство шахтного водозаборного колодца",
    workKey: "well_construction",
    physicalResultRu: "Шахтный колодец WIW-RC-DN2000-18M построен, оборудован, испытан и принят",
    includedScopeRu: [
      "разработка шахты, основание, железобетонная обделка и донный фильтр по проекту",
      "санитарный замок, покрытие, люк, лестница, насосы, труба, арматура и КИП",
      "материалы, расходники, труд, механизмы, испытания, анализы и логистика",
      "крепление, дополнительное водопонижение и подъезд только по условным ветвям",
    ],
    excludedScopeRu: [
      "глубокая буровая скважина, наружная сеть, резервуар, водоподготовка и канализация",
      "автоматические объёмы по глубине или диаметру колодца",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "SHALLOW_SHAFT_WATER_INTAKE_WELL",
    wellAssembly: "WIW_RC_DN2000_18M_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wiw_well_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleJointSealProcurementBalance: true,
    directProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryWorksFailClosed: true,
    depthOrDiameterDerivedQuantitiesForbidden: true,
    deepBoreholeAndAdjacentFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wiw_acceptance",
    applicability: {
      technology_class: "SHALLOW_RC_SHAFT_INFILTRATION_WELL",
      operation_class: "SHAFT_WATER_INTAKE_WELL_CONSTRUCTION",
      well_assembly: "WIW_RC_DN2000_18M_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_SHAFT_WELL_SCOPE_PLUS_VISIBLE_SEAL_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WELL_CONSTRUCTION_SOURCE_ID, norm_id: WELL_CONSTRUCTION_NORM_ID,
      exact_locator: WELL_CONSTRUCTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_SHAFT_WELL_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_ROLL",
    },
  },
  locator: {
    key: "well-construction-shaft-well-joint-seal-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WELL_CONSTRUCTION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WELL_CONSTRUCTION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WELL_CONSTRUCTION_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WELL_CONSTRUCTION_RUNTIME_INPUT),
      directProjectInputs: WELL_CONSTRUCTION_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(WELL_CONSTRUCTION_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "temporary_access"]
            .some((branch) => id.startsWith(`wiw_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство шахтного водозаборного колодца",
    aliases: [
      "устройство мелкого шахтного колодца из железобетонных колец",
      "водозаборный колодец 18 м с насосами",
      "shallow reinforced concrete shaft water intake well",
    ],
    shortScopeRu: "Один WIW-RC-DN2000-18M: шахта 18 м, 20 колец KS20.9, уплотнение стыков, два насоса, напорная труба и плита покрытия; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WELL_CONSTRUCTION_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(WELL_CONSTRUCTION_SHORT_INPUT, id)),
    includedBoundaries: [
      "шахта, ЖБ-обделка, донный фильтр, санитарная защита, насосы и комплектующие",
      "труд, механизмы, испытания, анализы, документация и логистика",
      "условные крепление, дополнительное водопонижение и подъезд только по проекту",
    ],
    excludedBoundaries: [
      "глубокая буровая скважина, наружная сеть, резервуар, водоподготовка и канализация",
      "автоматические объёмы по глубине или диаметру колодца",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "шахтный водозаборный колодец железобетонные кольца донный фильтр насос санитарный замок",
    sourceProvenance: {
      exactExpandedWellConstructionOwner: true,
      knownSelectedShaftWellLiningSealPumpsPipeAndCoverIdentity: true,
      visibleIndependentJointSealProcurementBalance: true,
      exactProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /borehole|буров.*скважин/iu, /distribution|наружн.*сет/iu,
    /reservoir|резервуар/iu, /treatment.plant|водоочистн/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_WELL_CONSTRUCTION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WELL_CONSTRUCTION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
