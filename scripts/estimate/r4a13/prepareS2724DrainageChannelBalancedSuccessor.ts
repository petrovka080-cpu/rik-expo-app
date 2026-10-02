import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  DRAINAGE_CHANNEL_ACCEPTANCE_INPUT, DRAINAGE_CHANNEL_CATALOG_ID,
  DRAINAGE_CHANNEL_FORMULAS, DRAINAGE_CHANNEL_NORM_ID, DRAINAGE_CHANNEL_PARAMETERS,
  DRAINAGE_CHANNEL_RESOURCES, DRAINAGE_CHANNEL_RUNTIME_CLASSIFICATION,
  DRAINAGE_CHANNEL_RUNTIME_INPUT, DRAINAGE_CHANNEL_RUNTIME_SOURCE_IDS,
  DRAINAGE_CHANNEL_SHORT_INPUT, DRAINAGE_CHANNEL_SOURCE_ID,
  DRAINAGE_CHANNEL_SOURCE_METADATA, compileDrainageChannelR1,
} from "../../../src/lib/estimate/v4/drainageChannelR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileDrainageChannelR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  dch_dewatering_mode: "REQUIRED", dch_dewatering_designation: "Насосная установка по ППР",
  dch_dewatering_machine_h: 120, dch_shoring_mode: "REQUIRED",
  dch_shoring_designation: "Инвентарное крепление выемки по ППР", dch_shoring_area_m2: 900,
  dch_road_restoration_mode: "REQUIRED",
  dch_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  dch_road_restoration_area_m2: 540,
});
async function verifyCore(): Promise<Json> {
  const first = await compileDrainageChannelR1({ ...DRAINAGE_CHANNEL_SHORT_INPUT });
  const complete = await compileDrainageChannelR1({ ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT });
  const balanced = await compileDrainageChannelR1({ ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
    dch_channel_retained_spare_m: 3, dch_channel_supplier_element_length_m: 2 });
  const conditional = await compileDrainageChannelR1({
    ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 27
    && quantity(first, "rc09:dch_channel_install_acceptance") === "1"
    && quantity(first, "rc09:dch_channel_elements") === "450")) {
    throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 32 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:dch_excavation") === "720"
    && quantity(complete, "rc09:dch_subbase") === "90"
    && quantity(complete, "rc09:dch_geotextile") === "1080"
    && quantity(complete, "rc09:dch_joint_seal") === "224"
    && quantity(complete, "rc09:dch_inlet_transition") === "12"
    && quantity(complete, "rc09:dch_erosion_protection") === "180"
    && quantity(complete, "rc09:labor:dch-channel-install") === "520"
    && quantity(complete, "rc09:equipment:dch-crane") === "118"
    && quantity(complete, "rc09:logistics:dch-delivery") === "30")) {
    throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:dch-channel-balance:installed-net") === "450"
    && quantity(balanced, "rc09:dch-channel-balance:retained-spare") === "3"
    && quantity(balanced, "rc09:dch-channel-balance:total-need") === "453"
    && quantity(balanced, "rc09:dch-channel-balance:element-count") === "227"
    && quantity(balanced, "rc09:dch_channel_elements") === "454"
    && quantity(balanced, "rc09:dch-channel-balance:remainder") === "4"
    && quantity(balanced, "rc09:dch-channel-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 35 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:dch_channel_install_acceptance", "rc09:dch_flow_test",
    "rc09:dch_asbuilt_documents"]) {
    const graph = DRAINAGE_CHANNEL_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_DRAINAGE_CHANNEL_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(DRAINAGE_CHANNEL_FORMULAS);
  if (/length_m\s*\*\s*(?:0\.006666|0\.04|0\.85|1\.02|1\.4)|length_m\s*\/\s*(?:60|200)|ceil\(5\s*\/\s*4\)/iu
    .test(formulaText)) throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_LEGACY_COEFFICIENT");
  if (/stormwater_pipe|rain_inlets|stormwater_manholes|silt_traps/iu
    .test(JSON.stringify(DRAINAGE_CHANNEL_RESOURCES))) {
    throw new Error("STOP_S27_24_DRAINAGE_CHANNEL_STORMWATER_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_DRAINAGE_CHANNEL_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: DRAINAGE_CHANNEL_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM: quantity(balanced, "rc09:dch-channel-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:dch-channel-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:dch-channel-balance:total-need"),
      elementCount: quantity(balanced, "rc09:dch-channel-balance:element-count"),
      orderedM: quantity(balanced, "rc09:dch_channel_elements"),
      remainderM: quantity(balanced, "rc09:dch-channel-balance:remainder"),
      surplusM: quantity(balanced, "rc09:dch-channel-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.drainage-channel-balanced-successor.v1",
  stopCode: "S27_24_DRAINAGE_CHANNEL_BALANCED",
  applicationName: "s27-24-drainage-channel-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "ec601028-5bac-50d3-b8ff-264814f93be6",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "ceb28f30-b2bb-5c36-90d7-86c5a39945a9",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/drainage-channel-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drainage-channel-balanced-s27-24.json",
    "src/lib/estimate/v4/drainageChannelR1.ts",
    "tests/estimateNorms/drainageChannelR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724DrainageChannelBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724DrainageChannelBalancedIndependent.ts",
  ],
  catalogId: DRAINAGE_CHANNEL_CATALOG_ID,
  sourceId: DRAINAGE_CHANNEL_SOURCE_ID, normId: DRAINAGE_CHANNEL_NORM_ID,
  sourceMetadata: DRAINAGE_CHANNEL_SOURCE_METADATA,
  parameterDefinitions: DRAINAGE_CHANNEL_PARAMETERS,
  formulaDefinitions: DRAINAGE_CHANNEL_FORMULAS,
  resourceDefinitions: DRAINAGE_CHANNEL_RESOURCES,
  shortInput: DRAINAGE_CHANNEL_SHORT_INPUT,
  acceptanceInput: DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
  runtimeProfileInput: DRAINAGE_CHANNEL_RUNTIME_INPUT,
  runtimeProfileClassification: DRAINAGE_CHANNEL_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: DRAINAGE_CHANNEL_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 40,
  validationScenario: "Q5_DRAINAGE_CHANNEL_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка открытого водоотводного канала",
    workKey: "drainage_channel",
    physicalResultRu: "Открытый сборный железобетонный канал U600x600-C35/45 длиной 450 м построен, проверен и принят",
    includedScopeRu: ["выбранные сборные элементы канала и герметизация стыков",
      "проектные выемка, подстилающий слой, основание, геотекстиль, бетон и обратная засыпка",
      "входные и выходные переходы, решётки и противоэрозионная защита",
      "труд, механизмы, проверка проливом, документы, логистика и баланс элементов",
      "водоотлив, крепление выемки и восстановление дороги только по условным ветвям"],
    excludedScopeRu: ["трубная ливневая сеть, дождеприёмники, колодцы и пескоуловители",
      "автоматические коэффициенты по длине и шаг узлов", "полное выпускное сооружение",
      "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "OPEN_DRAINAGE_CHANNEL_CONSTRUCTION_AND_ACCEPTANCE",
    drainageChannelSystem: "PRECAST_RC_U_CHANNEL_EXPLICIT_GEOMETRY_SLOPE_FLOW_SCHEDULE",
    primaryMeasureParameterId: "dch_channel_count",
    knownScopeParameters: ["dch_route_length_m", "dch_channel_type", "dch_channel_material",
      "dch_internal_width_mm", "dch_internal_depth_mm", "dch_slope_m_per_m",
      "dch_design_flow_lps", "dch_channel_designation"], visibleProcurementBalance: true,
    directProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, genericLengthCoefficientsForbidden: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:dch_channel_install_acceptance", applicability: {
    technology_class: "OPEN_DRAINAGE_CHANNEL",
    operation_class: "OPEN_DRAINAGE_CHANNEL_CONSTRUCTION_AND_ACCEPTANCE",
    drainage_channel_system: "PRECAST_RC_U_CHANNEL_EXPLICIT_GEOMETRY_SLOPE_FLOW_SCHEDULE",
    scope_mode: "KNOWN_CHANNEL_GEOMETRY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: DRAINAGE_CHANNEL_SOURCE_ID, norm_id: DRAINAGE_CHANNEL_NORM_ID,
    exact_locator: DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_DRAINAGE_CHANNEL_GEOMETRY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "drainage-channel-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
    sourcePackSha256: DRAINAGE_CHANNEL_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(DRAINAGE_CHANNEL_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(DRAINAGE_CHANNEL_RUNTIME_INPUT),
    directProjectInputs: DRAINAGE_CHANNEL_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(DRAINAGE_CHANNEL_SHORT_INPUT, id)
        && !id.startsWith("dch_dewatering_") && !id.startsWith("dch_shoring_")
        && !id.startsWith("dch_road_restoration_")),
    conditionalInputs: ["dch_dewatering_mode", "dch_dewatering_designation",
      "dch_dewatering_machine_h", "dch_shoring_mode", "dch_shoring_designation",
      "dch_shoring_area_m2", "dch_road_restoration_mode",
      "dch_road_restoration_designation", "dch_road_restoration_area_m2"] } },
  search: { primaryUom: "system",
    canonicalNameRu: "Строительство открытого водоотводного канала",
    aliases: ["открытый дренажный канал", "сборный железобетонный лоток",
      "водоотводный U-канал", "open drainage channel construction"],
    shortScopeRu: "Один канал: 450 м сборных U600x600-C35/45, уклон 0,003, расход 250 л/с; земляные объёмы, переходы, защита, труд и механизмы уточняются по проекту.",
    keyDistinguishingParameters: ["dch_channel_count", "dch_route_length_m",
      "dch_channel_type", "dch_channel_material", "dch_internal_width_mm",
      "dch_internal_depth_mm", "dch_slope_m_per_m", "dch_design_flow_lps",
      "dch_channel_designation"],
    clarificationFields: DRAINAGE_CHANNEL_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(DRAINAGE_CHANNEL_SHORT_INPUT, id)),
    includedBoundaries: ["элементы открытого канала, основание, стыки, переходы и защита по проекту",
      "труд, механизмы, проверка проливом, документы, логистика и баланс элементов",
      "условные водоотлив, крепление и восстановление дороги только по проекту"],
    excludedBoundaries: ["трубная ливневая сеть, дождеприёмники, колодцы и пескоуловители",
      "автоматические коэффициенты по длине, шаг переходов или стыков",
      "полное выпускное сооружение, неподтверждённые материалы и цены"],
    extraSearchTermsRu: "открытый водоотвод дренажный канал железобетонный лоток U канал уклон расход переход геотекстиль",
    sourceProvenance: { exactExpandedDrainageChannelOwner: true,
      knownRouteGeometrySlopeFlowAndSelectedChannelIdentity: true,
      visibleIndependentChannelElementProcurementBalance: true,
      exactProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/stormwater.drainage|ливнев.*сет/iu,
    /rainwater.inlet|дождепри[её]мн/iu, /inspection.chamber|смотров.*колод/iu,
    /silt.trap|пескоулов/iu, /outfall.structure|выпускн.*сооруж/iu],
  owner: "S27_24_DRAINAGE_CHANNEL_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_DRAINAGE_CHANNEL_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
