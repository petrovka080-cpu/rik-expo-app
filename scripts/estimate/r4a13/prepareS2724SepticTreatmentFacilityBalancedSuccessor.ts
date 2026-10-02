import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT, SEPTIC_TREATMENT_FACILITY_CATALOG_ID,
  SEPTIC_TREATMENT_FACILITY_FORMULAS, SEPTIC_TREATMENT_FACILITY_NORM_ID,
  SEPTIC_TREATMENT_FACILITY_PARAMETERS, SEPTIC_TREATMENT_FACILITY_RESOURCES,
  SEPTIC_TREATMENT_FACILITY_RUNTIME_CLASSIFICATION,
  SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT, SEPTIC_TREATMENT_FACILITY_RUNTIME_SOURCE_IDS,
  SEPTIC_TREATMENT_FACILITY_SHORT_INPUT, SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
  SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA, compileSepticTreatmentFacilityR1,
} from "../../../src/lib/estimate/v4/septicTreatmentFacilityR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileSepticTreatmentFacilityR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "stf_facility_count", "stf_facility_designation", "stf_treatment_technology",
  "stf_design_flow_m3_day", "stf_working_volume_m3", "stf_chamber_count",
  "stf_ring_installed_piece", "stf_ring_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  stf_excavation_shoring_mode: "REQUIRED",
  stf_excavation_shoring_designation: "SHEET-PILE-LIGHT",
  stf_excavation_shoring_area_m2: 320,
  stf_groundwater_dewatering_mode: "REQUIRED",
  stf_groundwater_dewatering_designation: "WELLPOINT-60M3H",
  stf_groundwater_dewatering_machine_h: 120,
  stf_effluent_dispersal_mode: "INCLUDED",
  stf_effluent_dispersal_designation: "INFILTRATION-MODULE-240",
  stf_effluent_dispersal_area_m2: 240,
});

async function verifyCore(): Promise<Json> {
  const first = await compileSepticTreatmentFacilityR1({
    ...SEPTIC_TREATMENT_FACILITY_SHORT_INPUT,
  });
  const complete = await compileSepticTreatmentFacilityR1({
    ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
  });
  const balanced = await compileSepticTreatmentFacilityR1({
    ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
    stf_ring_retained_spare_piece: 1, stf_ring_supplier_package_quantity_piece: 4,
  });
  const conditional = await compileSepticTreatmentFacilityR1({
    ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 34
    && quantity(first, "rc09:stf_acceptance") === "1"
    && quantity(first, "rc09:stf_rings") === "18")) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:stf_excavation") === "850"
    && quantity(complete, "rc09:stf_base_slab_concrete") === "45"
    && quantity(complete, "rc09:stf_cover_slabs") === "3"
    && quantity(complete, "rc09:stf_internal_piping") === "85"
    && quantity(complete, "rc09:labor:stf-precast-installation") === "680"
    && quantity(complete, "rc09:equipment:stf-crane") === "72"
    && quantity(complete, "rc09:logistics:stf-material-delivery") === "22")) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:stf-ring-balance:installed-net") === "18"
    && quantity(balanced, "rc09:stf-ring-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:stf-ring-balance:total-need") === "19"
    && quantity(balanced, "rc09:stf-ring-balance:package-count") === "5"
    && quantity(balanced, "rc09:stf_rings") === "20"
    && quantity(balanced, "rc09:stf-ring-balance:remainder") === "2"
    && quantity(balanced, "rc09:stf-ring-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 42 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:stf_acceptance", "rc09:stf_concrete_tests",
    "rc09:stf_watertightness_tests", "rc09:stf_internal_piping_tests",
    "rc09:stf_asbuilt_documents"]) {
    const graph = SEPTIC_TREATMENT_FACILITY_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SEPTIC_TREATMENT_FACILITY_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_flow\w*\s*\*|working_volume\w*\s*\*|chamber_count\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(SEPTIC_TREATMENT_FACILITY_FORMULAS))) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_LEGACY_COEFFICIENT");
  }
  if (/wtp_membrane|aer_diffuser|sdw_press|sewer_pipe_lm|stt_waterstop/iu
    .test(JSON.stringify(SEPTIC_TREATMENT_FACILITY_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_SEPTIC_TREATMENT_FACILITY_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_SEPTIC_TREATMENT_FACILITY_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: SEPTIC_TREATMENT_FACILITY_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:stf-ring-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:stf-ring-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:stf-ring-balance:total-need"),
      packageCount: quantity(balanced, "rc09:stf-ring-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:stf_rings"),
      remainderPiece: quantity(balanced, "rc09:stf-ring-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:stf-ring-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.septic-treatment-facility-balanced-successor.v1",
  stopCode: "S27_24_SEPTIC_TREATMENT_FACILITY_BALANCED",
  applicationName: "s27-24-septic-treatment-facility-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "8fe1d2a3-009f-576a-809b-125741c68d09",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "b77225e1-9198-530b-b414-87ff2c9ef040",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/septic-treatment-facility-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/septic-treatment-facility-precast-ring-balanced-s27-24.json",
    "src/lib/estimate/v4/septicTreatmentFacilityR1.ts",
    "tests/estimateNorms/septicTreatmentFacilityR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724SepticTreatmentFacilityBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724SepticTreatmentFacilityBalancedIndependent.ts",
  ],
  catalogId: SEPTIC_TREATMENT_FACILITY_CATALOG_ID,
  sourceId: SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
  normId: SEPTIC_TREATMENT_FACILITY_NORM_ID,
  sourceMetadata: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA,
  parameterDefinitions: SEPTIC_TREATMENT_FACILITY_PARAMETERS,
  formulaDefinitions: SEPTIC_TREATMENT_FACILITY_FORMULAS,
  resourceDefinitions: SEPTIC_TREATMENT_FACILITY_RESOURCES,
  shortInput: SEPTIC_TREATMENT_FACILITY_SHORT_INPUT,
  acceptanceInput: SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
  runtimeProfileInput: SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT,
  runtimeProfileClassification: SEPTIC_TREATMENT_FACILITY_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SEPTIC_TREATMENT_FACILITY_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [4, 45, 45], benchmarkOrdinal: 52,
  validationScenario: "Q5_SEPTIC_TREATMENT_FACILITY_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство трёхкамерного септического очистного сооружения",
    workKey: "septic_treatment_facility",
    physicalResultRu: "Одно сооружение STF-RC-3C-30M3-KS20 построено, испытано и принято",
    includedScopeRu: [
      "котлован, основание, сборные кольца, плиты перекрытия и люки",
      "стыки, гидроизоляция, защитное покрытие, внутренние трубы, перегородки и вентиляция",
      "обратная засыпка, расходники, труд, механизмы, QA, логистика и баланс колец",
      "крепление котлована, водопонижение и поле рассеивания только по условным ветвям",
    ],
    excludedScopeRu: [
      "полные муниципальные КОС, аэротенки и обезвоживание осадка",
      "наружная канализационная сеть и невыбранные поля рассеивания",
      "автоматические объёмы по расходу, объёму или числу камер", "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "THREE_CHAMBER_PRECAST_RC_SEPTIC_FACILITY",
    packageAssembly: "STF_RC_3C_30M3_KS20_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "stf_facility_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visiblePrecastRingProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryAndEffluentScopeFailClosed: true,
    flowVolumeOrChamberDerivedQuantitiesForbidden: true,
    municipalTreatmentAerationSludgeAndExternalNetworksExcluded: true,
  },
  binding: {
    rowId: "rc09:stf_acceptance",
    applicability: {
      technology_class: "THREE_CHAMBER_ANAEROBIC_SETTLING",
      operation_class: "SEPTIC_TREATMENT_FACILITY_CONSTRUCTION",
      package_assembly: "STF_RC_3C_30M3_KS20_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_FACILITY_IDENTITY_PLUS_VISIBLE_RING_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
      norm_id: SEPTIC_TREATMENT_FACILITY_NORM_ID,
      exact_locator: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_FACILITY_IDENTITY_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PACKAGE",
    },
  },
  locator: {
    key: "septic-treatment-facility-precast-ring-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.exact_locator,
      sourcePackSha256: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(SEPTIC_TREATMENT_FACILITY_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT),
      directProjectInputs: SEPTIC_TREATMENT_FACILITY_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(SEPTIC_TREATMENT_FACILITY_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "effluent_dispersal"]
            .some((branch) => id.startsWith(`stf_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство трёхкамерного септического очистного сооружения",
    aliases: [
      "строительство септика из сборных железобетонных колец",
      "трёхкамерное анаэробное септическое сооружение",
      "three-chamber precast reinforced concrete septic treatment facility",
    ],
    shortScopeRu: "Одно STF-RC-3C-30M3-KS20: 12 м3/сут, 30 м3, 3 камеры и 18 колец KS20.9; ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: SEPTIC_TREATMENT_FACILITY_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SEPTIC_TREATMENT_FACILITY_SHORT_INPUT, id)),
    includedBoundaries: [
      "котлован, основание, сборный железобетон, стыки, гидроизоляция и защита",
      "внутренние трубы, перегородки, вентиляция, засыпка, расходники, труд, механизмы, QA и логистика",
      "условные крепление котлована, водопонижение и поле рассеивания",
    ],
    excludedBoundaries: [
      "полные муниципальные КОС, аэротенки, обезвоживание осадка и наружная сеть",
      "автоматические объёмы по расходу, объёму или числу камер",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "септик очистное сооружение три камеры анаэробное отстаивание железобетонные кольца KS20.9",
    sourceProvenance: {
      exactExpandedSepticTreatmentFacilityOwner: true,
      knownSelectedTechnologyFlowVolumeChambersAndRingIdentity: true,
      visibleIndependentPrecastRingProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /municipal treatment plant|муниципальн.*КОС/iu,
    /aeration tank|аэротенк/iu,
    /sludge dewatering|обезвоживан.*осад/iu,
    /external sewer network|наружн.*канализационн.*сет/iu,
  ],
  owner: "S27_24_SEPTIC_TREATMENT_FACILITY_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SEPTIC_TREATMENT_FACILITY_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
