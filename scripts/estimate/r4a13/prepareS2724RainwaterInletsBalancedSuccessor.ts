import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  RAINWATER_INLETS_ACCEPTANCE_INPUT, RAINWATER_INLETS_CATALOG_ID,
  RAINWATER_INLETS_FORMULAS, RAINWATER_INLETS_NORM_ID, RAINWATER_INLETS_PARAMETERS,
  RAINWATER_INLETS_RESOURCES, RAINWATER_INLETS_RUNTIME_CLASSIFICATION,
  RAINWATER_INLETS_RUNTIME_INPUT, RAINWATER_INLETS_RUNTIME_SOURCE_IDS,
  RAINWATER_INLETS_SHORT_INPUT, RAINWATER_INLETS_SOURCE_ID,
  RAINWATER_INLETS_SOURCE_METADATA, compileRainwaterInletsR1,
} from "../../../src/lib/estimate/v4/rainwaterInletsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileRainwaterInletsR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  rwi_dewatering_mode: "REQUIRED", rwi_dewatering_designation: "Дренажный насос по ППР",
  rwi_dewatering_machine_h: 48, rwi_shoring_mode: "REQUIRED",
  rwi_shoring_designation: "Инвентарное крепление котлованов", rwi_shoring_area_m2: 112,
  rwi_pavement_restoration_mode: "REQUIRED",
  rwi_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
  rwi_pavement_restoration_area_m2: 84,
});
async function verifyCore(): Promise<Json> {
  const first = await compileRainwaterInletsR1({ ...RAINWATER_INLETS_SHORT_INPUT });
  const complete = await compileRainwaterInletsR1({ ...RAINWATER_INLETS_ACCEPTANCE_INPUT });
  const balanced = await compileRainwaterInletsR1({ ...RAINWATER_INLETS_ACCEPTANCE_INPUT,
    rwi_body_retained_spare_piece: 3, rwi_body_supplier_package_quantity_piece: 4 });
  const conditional = await compileRainwaterInletsR1({
    ...RAINWATER_INLETS_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 23
    && quantity(first, "rc09:rwi_install_acceptance") === "28"
    && quantity(first, "rc09:rwi_body") === "28")) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 28 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:rwi_grating") === "28"
    && quantity(complete, "rc09:rwi_silt_basket") === "28"
    && quantity(complete, "rc09:rwi_bedding") === "8.4"
    && quantity(complete, "rc09:rwi_setting_mortar") === "420"
    && quantity(complete, "rc09:rwi_excavation") === "56"
    && quantity(complete, "rc09:labor:rwi-install") === "168"
    && quantity(complete, "rc09:equipment:rwi-crane") === "28"
    && quantity(complete, "rc09:logistics:rwi-delivery") === "4")) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:rwi-body-balance:installed-net") === "28"
    && quantity(balanced, "rc09:rwi-body-balance:retained-spare") === "3"
    && quantity(balanced, "rc09:rwi-body-balance:total-need") === "31"
    && quantity(balanced, "rc09:rwi-body-balance:package-count") === "8"
    && quantity(balanced, "rc09:rwi_body") === "32"
    && quantity(balanced, "rc09:rwi-body-balance:remainder") === "4"
    && quantity(balanced, "rc09:rwi-body-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 31 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:rwi_install_acceptance", "rc09:rwi_flow_test",
    "rc09:rwi_asbuilt_documents"]) {
    const graph = RAINWATER_INLETS_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_RAINWATER_INLETS_DOUBLE_COST:${rowId}`);
    }
  }
  if (/length_m|ceil\(5\s*\/\s*4\)/iu.test(JSON.stringify(RAINWATER_INLETS_FORMULAS))) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_LEGACY_COEFFICIENT");
  }
  if (/stormwater_pipe|stormwater_manholes|silt_traps|outlet_structure/iu
    .test(JSON.stringify(RAINWATER_INLETS_RESOURCES))) {
    throw new Error("STOP_S27_24_RAINWATER_INLETS_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_RAINWATER_INLETS_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: RAINWATER_INLETS_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:rwi-body-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:rwi-body-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:rwi-body-balance:total-need"),
      packageCount: quantity(balanced, "rc09:rwi-body-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:rwi_body"),
      remainderPiece: quantity(balanced, "rc09:rwi-body-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:rwi-body-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.rainwater-inlets-balanced-successor.v1",
  stopCode: "S27_24_RAINWATER_INLETS_BALANCED",
  applicationName: "s27-24-rainwater-inlets-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "0dd9584f-86b5-5191-86b3-fc27fdc121b7",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "5f511bbd-d48f-5f9a-a34e-999ead6b6e6f",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/rainwater-inlets-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/rainwater-inlets-balanced-s27-24.json",
    "src/lib/estimate/v4/rainwaterInletsR1.ts",
    "tests/estimateNorms/rainwaterInletsR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724RainwaterInletsBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724RainwaterInletsBalancedIndependent.ts",
  ],
  catalogId: RAINWATER_INLETS_CATALOG_ID,
  sourceId: RAINWATER_INLETS_SOURCE_ID, normId: RAINWATER_INLETS_NORM_ID,
  sourceMetadata: RAINWATER_INLETS_SOURCE_METADATA,
  parameterDefinitions: RAINWATER_INLETS_PARAMETERS,
  formulaDefinitions: RAINWATER_INLETS_FORMULAS,
  resourceDefinitions: RAINWATER_INLETS_RESOURCES,
  shortInput: RAINWATER_INLETS_SHORT_INPUT,
  acceptanceInput: RAINWATER_INLETS_ACCEPTANCE_INPUT,
  runtimeProfileInput: RAINWATER_INLETS_RUNTIME_INPUT,
  runtimeProfileClassification: RAINWATER_INLETS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: RAINWATER_INLETS_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 41,
  validationScenario: "Q5_RAINWATER_INLETS_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и приёмка дождеприёмников",
    workKey: "rainwater_inlets",
    physicalResultRu: "28 дождеприёмников DB2-RC-D400-DN200 смонтированы, проверены и приняты",
    includedScopeRu: ["выбранные корпуса, решётки, рамы, выпускные соединители и уплотнения",
      "корзины для наносов, основание, монтажный раствор, котлованы и обратная засыпка",
      "труд, механизмы, проверка проливом, документы, логистика и баланс корпусов",
      "водоотлив, крепление котлованов и восстановление покрытия только по условным ветвям"],
    excludedScopeRu: ["трубная ливневая сеть, колодцы, пескоуловители и полное выпускное сооружение",
      "автоматический шаг или количество по длине", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "RAINWATER_INLET_INSTALLATION_AND_ACCEPTANCE",
    rainwaterInletAssembly: "DB2_PRECAST_RC_D400_DN200_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "rwi_inlet_count",
    knownScopeParameters: ["rwi_body_designation", "rwi_body_material",
      "rwi_grating_material", "rwi_grating_load_class", "rwi_outlet_diameter_mm",
      "rwi_assembly_designation"], visibleProcurementBalance: true,
    directProjectMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, routeDerivedQuantitiesForbidden: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:rwi_install_acceptance", applicability: {
    technology_class: "RAINWATER_INLET_ASSEMBLY",
    operation_class: "RAINWATER_INLET_INSTALLATION_AND_ACCEPTANCE",
    inlet_assembly: "DB2_PRECAST_RC_D400_DN200_EXPLICIT_SCHEDULE",
    scope_mode: "KNOWN_INLET_ASSEMBLY_PLUS_VISIBLE_BODY_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: RAINWATER_INLETS_SOURCE_ID, norm_id: RAINWATER_INLETS_NORM_ID,
    exact_locator: RAINWATER_INLETS_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_RAINWATER_INLET_ASSEMBLY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "rainwater-inlets-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: RAINWATER_INLETS_SOURCE_METADATA.exact_locator,
    sourcePackSha256: RAINWATER_INLETS_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(RAINWATER_INLETS_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(RAINWATER_INLETS_RUNTIME_INPUT),
    directProjectInputs: RAINWATER_INLETS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(RAINWATER_INLETS_SHORT_INPUT, id)
        && !id.startsWith("rwi_dewatering_") && !id.startsWith("rwi_shoring_")
        && !id.startsWith("rwi_pavement_restoration_")),
    conditionalInputs: ["rwi_dewatering_mode", "rwi_dewatering_designation",
      "rwi_dewatering_machine_h", "rwi_shoring_mode", "rwi_shoring_designation",
      "rwi_shoring_area_m2", "rwi_pavement_restoration_mode",
      "rwi_pavement_restoration_designation", "rwi_pavement_restoration_area_m2"] } },
  search: { primaryUom: "pcs",
    canonicalNameRu: "Монтаж дождеприёмников",
    aliases: ["установка дождеприёмника", "дождеприёмник DB2 D400",
      "ливнеприёмный колодец", "rainwater inlet installation"],
    shortScopeRu: "28 узлов DB2 из сборного железобетона с чугунной решёткой D400 и выпуском DN 200; земляные объёмы, комплектующие, труд и механизмы уточняются по проекту.",
    keyDistinguishingParameters: ["rwi_inlet_count", "rwi_body_designation",
      "rwi_body_material", "rwi_grating_material", "rwi_grating_load_class",
      "rwi_outlet_diameter_mm", "rwi_assembly_designation"],
    clarificationFields: RAINWATER_INLETS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(RAINWATER_INLETS_SHORT_INPUT, id)),
    includedBoundaries: ["корпуса, решётки, рамы, соединители, уплотнения и корзины по проекту",
      "основание, котлованы, засыпка, труд, механизмы, QA, логистика и баланс корпусов",
      "условные водоотлив, крепление и восстановление покрытия только по проекту"],
    excludedBoundaries: ["трубная ливневая сеть, смотровые колодцы, пескоуловители и выпуск",
      "автоматическое количество по длине или универсальные нормы",
      "неподтверждённые материалы, условные работы и цены"],
    extraSearchTermsRu: "дождеприёмник ливнеприёмник DB2 чугунная решётка D400 рама выпуск DN200 корзина",
    sourceProvenance: { exactExpandedRainwaterInletsOwner: true,
      knownSelectedInletBodyGratingAndOutletIdentity: true,
      visibleIndependentInletBodyProcurementBalance: true,
      exactProjectMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/stormwater.pipe|ливнев.*труб/iu,
    /stormwater.manhole|смотров.*колод/iu, /silt.trap|пескоулов/iu,
    /outlet.structure|выпускн.*сооруж/iu],
  owner: "S27_24_RAINWATER_INLETS_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_RAINWATER_INLETS_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
