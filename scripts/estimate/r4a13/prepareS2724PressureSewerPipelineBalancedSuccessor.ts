import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT, PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  PRESSURE_SEWER_PIPELINE_FORMULAS, PRESSURE_SEWER_PIPELINE_NORM_ID,
  PRESSURE_SEWER_PIPELINE_PARAMETERS, PRESSURE_SEWER_PIPELINE_RESOURCES,
  PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION, PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
  PRESSURE_SEWER_PIPELINE_RUNTIME_SOURCE_IDS, PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  PRESSURE_SEWER_PIPELINE_SOURCE_ID, PRESSURE_SEWER_PIPELINE_SOURCE_METADATA,
  compilePressureSewerPipelineR1,
} from "../../../src/lib/estimate/v4/pressureSewerPipelineR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compilePressureSewerPipelineR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  psp_crossing_casing_mode: "REQUIRED",
  psp_crossing_casing_designation: "Стальной футляр по узлу пересечения",
  psp_crossing_casing_length_m: 36,
  psp_dewatering_mode: "REQUIRED",
  psp_dewatering_designation: "Иглофильтровая установка по ППР",
  psp_dewatering_machine_h: 220,
  psp_road_restoration_mode: "REQUIRED",
  psp_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  psp_road_restoration_area_m2: 960,
});
async function verifyCore(): Promise<Json> {
  const first = await compilePressureSewerPipelineR1({ ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT });
  const complete = await compilePressureSewerPipelineR1({ ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT });
  const balanced = await compilePressureSewerPipelineR1({
    ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
    psp_pipe_retained_spare_m: 15, psp_pipe_supplier_segment_length_m: 12,
  });
  const conditional = await compilePressureSewerPipelineR1({
    ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 29
    && quantity(first, "rc09:psp_pipeline_install_acceptance") === "1"
    && quantity(first, "rc09:psp_pipe") === "800")) {
    throw new Error("STOP_S27_24_PRESSURE_SEWER_PIPELINE_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:psp_trench_excavation") === "1760"
    && quantity(complete, "rc09:psp_bedding") === "144"
    && quantity(complete, "rc09:psp_isolation_valve") === "6"
    && quantity(complete, "rc09:psp_air_valve") === "4"
    && quantity(complete, "rc09:psp_washout") === "3"
    && quantity(complete, "rc09:labor:psp-pipe-appurtenance-install") === "680"
    && quantity(complete, "rc09:equipment:psp-jointing") === "96"
    && quantity(complete, "rc09:logistics:psp-delivery") === "20")) {
    throw new Error("STOP_S27_24_PRESSURE_SEWER_PIPELINE_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:psp-pipe-balance:installed-net") === "800"
    && quantity(balanced, "rc09:psp-pipe-balance:retained-spare") === "15"
    && quantity(balanced, "rc09:psp-pipe-balance:total-need") === "815"
    && quantity(balanced, "rc09:psp-pipe-balance:segment-count") === "68"
    && quantity(balanced, "rc09:psp_pipe") === "816"
    && quantity(balanced, "rc09:psp-pipe-balance:remainder") === "16"
    && quantity(balanced, "rc09:psp-pipe-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_PRESSURE_SEWER_PIPELINE_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 37 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_PRESSURE_SEWER_PIPELINE_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:psp_pipeline_install_acceptance", "rc09:psp_pressure_test",
    "rc09:psp_flushing", "rc09:psp_asbuilt_documents"]) {
    const graph = PRESSURE_SEWER_PIPELINE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_PRESSURE_SEWER_PIPELINE_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(PRESSURE_SEWER_PIPELINE_FORMULAS);
  if (/length_m\s*\*\s*(?:1\.107|0\.005|0\.70|1\.02)|length_m\s*\/\s*(?:50|200)|0\.75\s*\*\s*(?:0\.22|1\.8)/iu
    .test(formulaText)) throw new Error("STOP_S27_24_PRESSURE_SEWER_PIPELINE_LEGACY_COEFFICIENT");
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_PRESSURE_SEWER_PIPELINE_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: PRESSURE_SEWER_PIPELINE_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM: quantity(balanced, "rc09:psp-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:psp-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:psp-pipe-balance:total-need"),
      segmentCount: quantity(balanced, "rc09:psp-pipe-balance:segment-count"),
      orderedM: quantity(balanced, "rc09:psp_pipe"),
      remainderM: quantity(balanced, "rc09:psp-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:psp-pipe-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.pressure-sewer-pipeline-balanced-successor.v1",
  stopCode: "S27_24_PRESSURE_SEWER_PIPELINE_BALANCED",
  applicationName: "s27-24-pressure-sewer-pipeline-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "832413d6-637b-58cb-9bec-721968b6cf75",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "819b2a53-db8a-57e1-abf7-9629b2a4738e",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/pressure-sewer-pipeline-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pressure-sewer-pipeline-balanced-s27-24.json",
    "src/lib/estimate/v4/pressureSewerPipelineR1.ts",
    "tests/estimateNorms/pressureSewerPipelineR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724PressureSewerPipelineBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724PressureSewerPipelineBalancedIndependent.ts",
  ],
  catalogId: PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  sourceId: PRESSURE_SEWER_PIPELINE_SOURCE_ID, normId: PRESSURE_SEWER_PIPELINE_NORM_ID,
  sourceMetadata: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA,
  parameterDefinitions: PRESSURE_SEWER_PIPELINE_PARAMETERS,
  formulaDefinitions: PRESSURE_SEWER_PIPELINE_FORMULAS,
  resourceDefinitions: PRESSURE_SEWER_PIPELINE_RESOURCES,
  shortInput: PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  acceptanceInput: PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
  runtimeProfileInput: PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
  runtimeProfileClassification: PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: PRESSURE_SEWER_PIPELINE_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 38,
  validationScenario: "Q5_PRESSURE_SEWER_PIPELINE_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка напорного канализационного трубопровода",
    workKey: "pressure_sewer_pipeline",
    physicalResultRu: "Напорная канализационная линия из 800 м HDPE PE100-RC SDR17 OD 110 PN10 построена, испытана и принята",
    includedScopeRu: ["выбранная труба, соединения и фасонные части",
      "проектные траншея, основание, обсыпка, засыпка и вывоз грунта",
      "запорная арматура, воздушные клапаны, промывные узлы, камеры и люки",
      "труд, механизмы, испытание, промывка, документы, логистика и баланс трубы",
      "футляры, водоотлив и восстановление дороги только по условным ветвям"],
    excludedScopeRu: ["автоматические коэффициенты по длине и шаг узлов",
      "КНС, самотечный коллектор и внутридомовая канализация", "неподтверждённые цены"],
  },
  applicability: { country: "KG",
    operationClass: "PRESSURE_SEWER_PIPELINE_CONSTRUCTION_AND_ACCEPTANCE",
    pressureSewerSystem: "HDPE_PE100_RC_EXPLICIT_ROUTE_TRENCH_APPURTENANCE_SCHEDULE",
    primaryMeasureParameterId: "psp_pipeline_count",
    knownScopeParameters: ["psp_route_length_m", "psp_pipe_material", "psp_pipe_grade",
      "psp_sdr_class", "psp_pipe_outside_diameter_mm", "psp_pressure_class",
      "psp_pipe_designation"], visibleProcurementBalance: true,
    directProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, genericLengthCoefficientsForbidden: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:psp_pipeline_install_acceptance", applicability: {
    technology_class: "PRESSURE_SEWER", operation_class: "PRESSURE_SEWER_PIPELINE_CONSTRUCTION_AND_ACCEPTANCE",
    pressure_sewer_system: "HDPE_PE100_RC_EXPLICIT_ROUTE_TRENCH_APPURTENANCE_SCHEDULE",
    scope_mode: "KNOWN_ROUTE_PIPE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: PRESSURE_SEWER_PIPELINE_SOURCE_ID, norm_id: PRESSURE_SEWER_PIPELINE_NORM_ID,
    exact_locator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_PRESSURE_SEWER_ROUTE_PIPE_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "pressure-sewer-pipeline-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
    sourcePackSha256: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT),
    directProjectInputs: PRESSURE_SEWER_PIPELINE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(PRESSURE_SEWER_PIPELINE_SHORT_INPUT, id)
        && !id.startsWith("psp_crossing_casing_") && !id.startsWith("psp_dewatering_")
        && !id.startsWith("psp_road_restoration_")),
    conditionalInputs: ["psp_crossing_casing_mode", "psp_crossing_casing_designation",
      "psp_crossing_casing_length_m", "psp_dewatering_mode", "psp_dewatering_designation",
      "psp_dewatering_machine_h", "psp_road_restoration_mode",
      "psp_road_restoration_designation", "psp_road_restoration_area_m2"] } },
  search: { primaryUom: "system",
    canonicalNameRu: "Строительство напорного канализационного трубопровода",
    aliases: ["напорная канализация", "напорный коллектор HDPE",
      "трубопровод сточных вод PE100-RC", "pressure sewer pipeline construction"],
    shortScopeRu: "Одна линия: 800 м HDPE PE100-RC SDR17 OD 110 PN10; траншея, арматура, узлы, камеры, труд, механизмы и контроль уточняются по проекту.",
    keyDistinguishingParameters: ["psp_pipeline_count", "psp_route_length_m",
      "psp_pipe_material", "psp_pipe_grade", "psp_sdr_class",
      "psp_pipe_outside_diameter_mm", "psp_pressure_class", "psp_pipe_designation"],
    clarificationFields: PRESSURE_SEWER_PIPELINE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(PRESSURE_SEWER_PIPELINE_SHORT_INPUT, id)),
    includedBoundaries: ["напорная труба, траншея, арматура, воздушные и промывные узлы по проекту",
      "труд, механизмы, испытание, документы, логистика и баланс трубы",
      "условные футляры, водоотлив и восстановление дороги только по проекту"],
    excludedBoundaries: ["КНС, самотечный коллектор и внутридомовая канализация",
      "автоматические коэффициенты по длине, колодцы через 50 м или узлы через 200 м",
      "неподтверждённые материалы, условные работы и цены"],
    extraSearchTermsRu: "напорная канализация HDPE PE100-RC SDR PN труба траншея задвижка воздушный клапан промывной узел камера испытание",
    sourceProvenance: { exactExpandedPressureSewerPipelineOwner: true,
      knownRouteAndSelectedPressurePipeIdentity: true,
      visibleIndependentPipeProcurementBalance: true,
      exactProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/pumping.station|канализационн.*насосн.*станц/iu,
    /gravity.sewer|самотечн.*коллектор/iu, /building.drainage|внутридомов.*канализац/iu,
    /stormwater|ливнев/iu],
  owner: "S27_24_PRESSURE_SEWER_PIPELINE_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_PRESSURE_SEWER_PIPELINE_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
