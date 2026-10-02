import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  STORMWATER_DRAINAGE_ACCEPTANCE_INPUT, STORMWATER_DRAINAGE_CATALOG_ID,
  STORMWATER_DRAINAGE_FORMULAS, STORMWATER_DRAINAGE_NORM_ID,
  STORMWATER_DRAINAGE_PARAMETERS, STORMWATER_DRAINAGE_RESOURCES,
  STORMWATER_DRAINAGE_RUNTIME_CLASSIFICATION, STORMWATER_DRAINAGE_RUNTIME_INPUT,
  STORMWATER_DRAINAGE_RUNTIME_SOURCE_IDS, STORMWATER_DRAINAGE_SHORT_INPUT,
  STORMWATER_DRAINAGE_SOURCE_ID, STORMWATER_DRAINAGE_SOURCE_METADATA,
  compileStormwaterDrainageR1,
} from "../../../src/lib/estimate/v4/stormwaterDrainageR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileStormwaterDrainageR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  swd_dewatering_mode: "REQUIRED",
  swd_dewatering_designation: "Иглофильтровая установка по ППР",
  swd_dewatering_machine_h: 280,
  swd_shoring_mode: "REQUIRED",
  swd_shoring_designation: "Инвентарное крепление траншеи по ППР",
  swd_shoring_area_m2: 2520,
  swd_road_restoration_mode: "REQUIRED",
  swd_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  swd_road_restoration_area_m2: 1080,
});

async function verifyCore(): Promise<Json> {
  const first = await compileStormwaterDrainageR1({ ...STORMWATER_DRAINAGE_SHORT_INPUT });
  const complete = await compileStormwaterDrainageR1({ ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT });
  const balanced = await compileStormwaterDrainageR1({
    ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
    swd_pipe_retained_spare_m: 10, swd_pipe_supplier_segment_length_m: 6,
  });
  const conditional = await compileStormwaterDrainageR1({
    ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 29
    && quantity(first, "rc09:swd_network_install_acceptance") === "1"
    && quantity(first, "rc09:swd_pipe") === "900")) {
    throw new Error("STOP_S27_24_STORMWATER_DRAINAGE_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:swd_trench_excavation") === "2160"
    && quantity(complete, "rc09:swd_bedding") === "180"
    && quantity(complete, "rc09:swd_inlet") === "30"
    && quantity(complete, "rc09:swd_manhole") === "16"
    && quantity(complete, "rc09:swd_silt_trap") === "4"
    && quantity(complete, "rc09:labor:swd-pipe-structure-install") === "760"
    && quantity(complete, "rc09:equipment:swd-pipe-laser") === "110"
    && quantity(complete, "rc09:logistics:swd-delivery") === "24")) {
    throw new Error("STOP_S27_24_STORMWATER_DRAINAGE_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:swd-pipe-balance:installed-net") === "900"
    && quantity(balanced, "rc09:swd-pipe-balance:retained-spare") === "10"
    && quantity(balanced, "rc09:swd-pipe-balance:total-need") === "910"
    && quantity(balanced, "rc09:swd-pipe-balance:segment-count") === "152"
    && quantity(balanced, "rc09:swd_pipe") === "912"
    && quantity(balanced, "rc09:swd-pipe-balance:remainder") === "12"
    && quantity(balanced, "rc09:swd-pipe-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_STORMWATER_DRAINAGE_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 37 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_STORMWATER_DRAINAGE_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:swd_network_install_acceptance", "rc09:swd_leak_test",
    "rc09:swd_cctv_inspection", "rc09:swd_asbuilt_documents"]) {
    const graph = STORMWATER_DRAINAGE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_STORMWATER_DRAINAGE_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(STORMWATER_DRAINAGE_FORMULAS);
  if (/length_m\s*\*\s*(?:0\.0066667|0\.85|1\.02|1\.4)|length_m\s*\/\s*(?:60|200)|ceil\(5\/4\)/iu
    .test(formulaText)) throw new Error("STOP_S27_24_STORMWATER_DRAINAGE_LEGACY_COEFFICIENT");
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_STORMWATER_DRAINAGE_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: STORMWATER_DRAINAGE_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM: quantity(balanced, "rc09:swd-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:swd-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:swd-pipe-balance:total-need"),
      segmentCount: quantity(balanced, "rc09:swd-pipe-balance:segment-count"),
      orderedM: quantity(balanced, "rc09:swd_pipe"),
      remainderM: quantity(balanced, "rc09:swd-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:swd-pipe-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.stormwater-drainage-balanced-successor.v1",
  stopCode: "S27_24_STORMWATER_DRAINAGE_BALANCED",
  applicationName: "s27-24-stormwater-drainage-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b2a817aa-5e16-5dba-8759-b10969a1f51e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d931c9fc-498c-5436-9868-7e6e7033adbb",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/stormwater-drainage-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stormwater-drainage-balanced-s27-24.json",
    "src/lib/estimate/v4/stormwaterDrainageR1.ts",
    "tests/estimateNorms/stormwaterDrainageR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724StormwaterDrainageBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724StormwaterDrainageBalancedIndependent.ts",
  ],
  catalogId: STORMWATER_DRAINAGE_CATALOG_ID,
  sourceId: STORMWATER_DRAINAGE_SOURCE_ID, normId: STORMWATER_DRAINAGE_NORM_ID,
  sourceMetadata: STORMWATER_DRAINAGE_SOURCE_METADATA,
  parameterDefinitions: STORMWATER_DRAINAGE_PARAMETERS,
  formulaDefinitions: STORMWATER_DRAINAGE_FORMULAS,
  resourceDefinitions: STORMWATER_DRAINAGE_RESOURCES,
  shortInput: STORMWATER_DRAINAGE_SHORT_INPUT,
  acceptanceInput: STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
  runtimeProfileInput: STORMWATER_DRAINAGE_RUNTIME_INPUT,
  runtimeProfileClassification: STORMWATER_DRAINAGE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: STORMWATER_DRAINAGE_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 39,
  validationScenario: "Q5_STORMWATER_DRAINAGE_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка ливневой канализации",
    workKey: "stormwater_drainage",
    physicalResultRu: "Ливневая сеть из 900 м PVC-U SN8 OD 315 построена, проверена и принята",
    includedScopeRu: ["выбранная труба, уплотнения и фасонные части",
      "проектные траншея, основание, обсыпка, засыпка и вывоз грунта",
      "дождеприёмники, колодцы, люки, пескоуловители и интерфейс выпуска",
      "труд, механизмы, испытания, CCTV-инспекция, документы, логистика и баланс трубы",
      "водоотлив, крепление траншеи и восстановление дороги только по условным ветвям"],
    excludedScopeRu: ["автоматические коэффициенты по длине и шаг сооружений",
      "санитарная и напорная канализация, полное выпускное или очистное сооружение",
      "неподтверждённые цены"],
  },
  applicability: { country: "KG",
    operationClass: "STORMWATER_DRAINAGE_CONSTRUCTION_AND_ACCEPTANCE",
    stormwaterSystem: "PVC_U_SN8_EXPLICIT_ROUTE_SLOPE_FLOW_STRUCTURE_SCHEDULE",
    primaryMeasureParameterId: "swd_network_count",
    knownScopeParameters: ["swd_route_length_m", "swd_pipe_material",
      "swd_ring_stiffness_class", "swd_pipe_outside_diameter_mm", "swd_slope_m_per_m",
      "swd_design_flow_lps", "swd_pipe_designation"], visibleProcurementBalance: true,
    directProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, genericLengthCoefficientsForbidden: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:swd_network_install_acceptance", applicability: {
    technology_class: "STORMWATER_DRAINAGE",
    operation_class: "STORMWATER_DRAINAGE_CONSTRUCTION_AND_ACCEPTANCE",
    stormwater_system: "PVC_U_SN8_EXPLICIT_ROUTE_SLOPE_FLOW_STRUCTURE_SCHEDULE",
    scope_mode: "KNOWN_ROUTE_PIPE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: STORMWATER_DRAINAGE_SOURCE_ID, norm_id: STORMWATER_DRAINAGE_NORM_ID,
    exact_locator: STORMWATER_DRAINAGE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_STORMWATER_ROUTE_PIPE_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "stormwater-drainage-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: STORMWATER_DRAINAGE_SOURCE_METADATA.exact_locator,
    sourcePackSha256: STORMWATER_DRAINAGE_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(STORMWATER_DRAINAGE_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(STORMWATER_DRAINAGE_RUNTIME_INPUT),
    directProjectInputs: STORMWATER_DRAINAGE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(STORMWATER_DRAINAGE_SHORT_INPUT, id)
        && !id.startsWith("swd_dewatering_") && !id.startsWith("swd_shoring_")
        && !id.startsWith("swd_road_restoration_")),
    conditionalInputs: ["swd_dewatering_mode", "swd_dewatering_designation",
      "swd_dewatering_machine_h", "swd_shoring_mode", "swd_shoring_designation",
      "swd_shoring_area_m2", "swd_road_restoration_mode",
      "swd_road_restoration_designation", "swd_road_restoration_area_m2"] } },
  search: { primaryUom: "system",
    canonicalNameRu: "Строительство ливневой канализации",
    aliases: ["ливневая сеть", "ливневое водоотведение PVC-U",
      "дождевая канализация SN8", "stormwater drainage construction"],
    shortScopeRu: "Одна сеть: 900 м PVC-U SN8 OD 315, уклон 0,005, расход 80 л/с; земляные объёмы, сооружения, труд, механизмы и контроль уточняются по проекту.",
    keyDistinguishingParameters: ["swd_network_count", "swd_route_length_m",
      "swd_pipe_material", "swd_ring_stiffness_class", "swd_pipe_outside_diameter_mm",
      "swd_slope_m_per_m", "swd_design_flow_lps", "swd_pipe_designation"],
    clarificationFields: STORMWATER_DRAINAGE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(STORMWATER_DRAINAGE_SHORT_INPUT, id)),
    includedBoundaries: ["ливневая труба, траншея, дождеприёмники, колодцы и пескоуловители по проекту",
      "труд, механизмы, испытание, CCTV, документы, логистика и баланс трубы",
      "условные водоотлив, крепление и восстановление дороги только по проекту"],
    excludedBoundaries: ["санитарная и напорная канализация, полное очистное или выпускное сооружение",
      "автоматические коэффициенты по длине и шаг дождеприёмников, колодцев или пескоуловителей",
      "неподтверждённые материалы, условные работы и цены"],
    extraSearchTermsRu: "ливневая дождевая канализация PVC-U SN8 труба уклон расход дождеприёмник колодец пескоуловитель CCTV",
    sourceProvenance: { exactExpandedStormwaterDrainageOwner: true,
      knownRouteSlopeFlowAndSelectedPipeIdentity: true,
      visibleIndependentPipeProcurementBalance: true,
      exactProjectEarthworkStructureMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/pressure.sewer|напорн.*канализац/iu,
    /gravity.sewer|самотечн.*коллектор/iu, /building.drainage|внутридомов.*канализац/iu,
    /water.treatment|очистн.*сооружен/iu],
  owner: "S27_24_STORMWATER_DRAINAGE_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_STORMWATER_DRAINAGE_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
