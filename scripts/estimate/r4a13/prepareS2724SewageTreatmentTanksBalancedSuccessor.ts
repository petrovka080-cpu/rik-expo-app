import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT, SEWAGE_TREATMENT_TANKS_CATALOG_ID,
  SEWAGE_TREATMENT_TANKS_FORMULAS, SEWAGE_TREATMENT_TANKS_NORM_ID,
  SEWAGE_TREATMENT_TANKS_PARAMETERS, SEWAGE_TREATMENT_TANKS_RESOURCES,
  SEWAGE_TREATMENT_TANKS_RUNTIME_CLASSIFICATION, SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT,
  SEWAGE_TREATMENT_TANKS_RUNTIME_SOURCE_IDS, SEWAGE_TREATMENT_TANKS_SHORT_INPUT,
  SEWAGE_TREATMENT_TANKS_SOURCE_ID, SEWAGE_TREATMENT_TANKS_SOURCE_METADATA,
  compileSewageTreatmentTanksR1,
} from "../../../src/lib/estimate/v4/sewageTreatmentTanksR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileSewageTreatmentTanksR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "stt_tank_count", "stt_tank_designation", "stt_tank_type", "stt_process_duty",
  "stt_tank_length_m", "stt_tank_width_m", "stt_operating_liquid_depth_m",
  "stt_waterstop_installed_m", "stt_waterstop_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  stt_excavation_shoring_mode: "REQUIRED",
  stt_excavation_shoring_designation: "SHEET-PILE-AZ18",
  stt_excavation_shoring_area_m2: 850,
  stt_groundwater_dewatering_mode: "REQUIRED",
  stt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
  stt_groundwater_dewatering_machine_h: 220,
  stt_odor_cover_mode: "INCLUDED", stt_odor_cover_designation: "FRP-ODOR-COVER",
  stt_odor_cover_area_m2: 288,
});

async function verifyCore(): Promise<Json> {
  const first = await compileSewageTreatmentTanksR1({ ...SEWAGE_TREATMENT_TANKS_SHORT_INPUT });
  const complete = await compileSewageTreatmentTanksR1({
    ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
  });
  const balanced = await compileSewageTreatmentTanksR1({
    ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
    stt_waterstop_retained_spare_m: 10,
    stt_waterstop_supplier_coil_length_m: 25,
  });
  const conditional = await compileSewageTreatmentTanksR1({
    ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 33
    && quantity(first, "rc09:stt_acceptance") === "2"
    && quantity(first, "rc09:stt_waterstop") === "260")) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 38 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:stt_excavation") === "2200"
    && quantity(complete, "rc09:stt_structural_concrete") === "760"
    && quantity(complete, "rc09:stt_reinforcement") === "112000"
    && quantity(complete, "rc09:stt_internal_coating") === "1900"
    && quantity(complete, "rc09:labor:stt-reinforcement-formwork") === "4600"
    && quantity(complete, "rc09:equipment:stt-crane") === "140"
    && quantity(complete, "rc09:logistics:stt-material-delivery") === "64")) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:stt-waterstop-balance:installed-net") === "260"
    && quantity(balanced, "rc09:stt-waterstop-balance:retained-spare") === "10"
    && quantity(balanced, "rc09:stt-waterstop-balance:total-need") === "270"
    && quantity(balanced, "rc09:stt-waterstop-balance:package-count") === "11"
    && quantity(balanced, "rc09:stt_waterstop") === "275"
    && quantity(balanced, "rc09:stt-waterstop-balance:remainder") === "15"
    && quantity(balanced, "rc09:stt-waterstop-balance:surplus-beyond-spare") === "5")) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 41 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:stt_acceptance", "rc09:stt_concrete_tests",
    "rc09:stt_watertightness_tests", "rc09:stt_coating_inspections",
    "rc09:stt_asbuilt_documents"]) {
    const graph = SEWAGE_TREATMENT_TANKS_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SEWAGE_TREATMENT_TANKS_DOUBLE_COST:${rowId}`);
    }
  }
  if (/tank_(?:length|width)\w*\s*\*|operating_liquid_depth\w*\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(SEWAGE_TREATMENT_TANKS_FORMULAS))) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_LEGACY_COEFFICIENT");
  }
  if (/wtp_membrane|aer_diffuser|sdw_press|septic|sewer_pipe_lm/iu
    .test(JSON.stringify(SEWAGE_TREATMENT_TANKS_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_SEWAGE_TREATMENT_TANKS_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_SEWAGE_TREATMENT_TANKS_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: SEWAGE_TREATMENT_TANKS_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:stt-waterstop-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:stt-waterstop-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:stt-waterstop-balance:total-need"),
      coilCount: quantity(balanced, "rc09:stt-waterstop-balance:package-count"),
      orderedM: quantity(balanced, "rc09:stt_waterstop"),
      remainderM: quantity(balanced, "rc09:stt-waterstop-balance:remainder"),
      surplusM: quantity(balanced, "rc09:stt-waterstop-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.sewage-treatment-tanks-balanced-successor.v1",
  stopCode: "S27_24_SEWAGE_TREATMENT_TANKS_BALANCED",
  applicationName: "s27-24-sewage-treatment-tanks-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e611b7b9-f1ed-5c03-8756-619c5cec6be0",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "24686866-fb2b-57ad-a0f0-6ca037fbc715",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/sewage-treatment-tanks-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/sewage-treatment-tanks-rc-waterstop-balanced-s27-24.json",
    "src/lib/estimate/v4/sewageTreatmentTanksR1.ts",
    "tests/estimateNorms/sewageTreatmentTanksR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724SewageTreatmentTanksBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724SewageTreatmentTanksBalancedIndependent.ts",
  ],
  catalogId: SEWAGE_TREATMENT_TANKS_CATALOG_ID,
  sourceId: SEWAGE_TREATMENT_TANKS_SOURCE_ID, normId: SEWAGE_TREATMENT_TANKS_NORM_ID,
  sourceMetadata: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA,
  parameterDefinitions: SEWAGE_TREATMENT_TANKS_PARAMETERS,
  formulaDefinitions: SEWAGE_TREATMENT_TANKS_FORMULAS,
  resourceDefinitions: SEWAGE_TREATMENT_TANKS_RESOURCES,
  shortInput: SEWAGE_TREATMENT_TANKS_SHORT_INPUT,
  acceptanceInput: SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
  runtimeProfileInput: SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT,
  runtimeProfileClassification: SEWAGE_TREATMENT_TANKS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SEWAGE_TREATMENT_TANKS_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [4, 45, 45], benchmarkOrdinal: 51,
  validationScenario: "Q5_SEWAGE_TREATMENT_TANKS_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство монолитных резервуаров очистных сооружений",
    workKey: "sewage_treatment_tanks",
    physicalResultRu: "Два резервуара STT-RC-2X18X8X5-WT построены, защищены, испытаны и приняты",
    includedScopeRu: [
      "котлован, подготовка, монолитный железобетон, опалубка, швы и гидрошпонка",
      "гидроизоляция, защитное покрытие, закладные, проходки, доступ, дренаж и расходники",
      "труд, механизмы, QA, документация, логистика и баланс закупки гидрошпонки",
      "крепление котлована, водопонижение и покрытие от запахов только по условным ветвям",
    ],
    excludedScopeRu: [
      "полные очистные сооружения и технологическое оборудование",
      "аэротенки как технологический пакет, обезвоживание осадка, септик и наружные сети",
      "автоматические объёмы по числу или размерам резервуаров", "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "CAST_IN_PLACE_RC_SEWAGE_TREATMENT_TANKS",
    packageAssembly: "STT_RC_2X18X8X5_WT_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "stt_tank_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleWaterstopProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryAndOdorScopeFailClosed: true,
    tankCountOrDimensionsDerivedQuantitiesForbidden: true,
    treatmentEquipmentSepticAndExternalNetworksExcluded: true,
  },
  binding: {
    rowId: "rc09:stt_acceptance",
    applicability: {
      tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
      operation_class: "SEWAGE_TREATMENT_TANK_CONSTRUCTION",
      package_assembly: "STT_RC_2X18X8X5_WT_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_TANK_IDENTITY_PLUS_VISIBLE_WATERSTOP_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: SEWAGE_TREATMENT_TANKS_SOURCE_ID,
      norm_id: SEWAGE_TREATMENT_TANKS_NORM_ID,
      exact_locator: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_TANK_IDENTITY_PLUS_APPROVED_PROJECT_AND_SUPPLIER_COIL",
    },
  },
  locator: {
    key: "sewage-treatment-tanks-rc-waterstop-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.exact_locator,
      sourcePackSha256: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(SEWAGE_TREATMENT_TANKS_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT),
      directProjectInputs: SEWAGE_TREATMENT_TANKS_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(SEWAGE_TREATMENT_TANKS_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "odor_cover"]
            .some((branch) => id.startsWith(`stt_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство монолитных резервуаров очистных сооружений",
    aliases: [
      "строительство железобетонных резервуаров очистных сооружений",
      "монолитные резервуары усреднения и первичного отстаивания",
      "cast-in-place reinforced concrete wastewater treatment tanks",
    ],
    shortScopeRu: "Два резервуара STT-RC-2X18X8X5-WT 18x8x5 м и 260 м гидрошпонки PVC-P-320; ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: SEWAGE_TREATMENT_TANKS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SEWAGE_TREATMENT_TANKS_SHORT_INPUT, id)),
    includedBoundaries: [
      "котлован, основание, бетон, арматура, опалубка, швы, гидрошпонка и защита",
      "закладные, проходки, доступ, дренаж, расходники, труд, механизмы, QA и логистика",
      "условные крепление котлована, водопонижение и покрытие от запахов",
    ],
    excludedBoundaries: [
      "полные КОС, технологическое оборудование, септик и наружные сети",
      "автоматические объёмы по числу или размерам резервуаров",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "резервуары очистных сооружений железобетонные монолитные усреднение отстаивание гидрошпонка гидроизоляция",
    sourceProvenance: {
      exactExpandedSewageTreatmentTanksOwner: true,
      knownSelectedTankIdentityGeometryAndWaterstop: true,
      visibleIndependentWaterstopProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /complete treatment plant|полные.*очистн.*сооруж/iu,
    /aeration equipment|аэрационн.*оборудован/iu,
    /sludge dewatering|обезвоживан.*осад/iu,
    /septic facility|септич.*сооруж/iu,
    /external network|наружн.*сет/iu,
  ],
  owner: "S27_24_SEWAGE_TREATMENT_TANKS_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SEWAGE_TREATMENT_TANKS_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
