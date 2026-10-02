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
  psp_dewatering_duration_h: 40,
  psp_dewatering_flow_m3_h: 12,
  psp_road_restoration_mode: "REQUIRED",
  psp_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  psp_road_restoration_area_m2: 96,
});
async function verifyCore(): Promise<Json> {
  const first = await compilePressureSewerPipelineR1({ ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT });
  const changedGeometry = await compilePressureSewerPipelineR1({
    ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
    psp_route_length_m: 100,
    psp_pipe_outside_diameter_mm: 160,
    psp_average_trench_depth_m: 2,
  });
  const changedProcurement = await compilePressureSewerPipelineR1({
    ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
    psp_pipe_available_stock_m: 100,
    psp_pipe_retained_spare_m: 24,
    psp_pipe_supplier_segment_length_m: 12,
  });
  const conditional = await compilePressureSewerPipelineR1({
    ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 43 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc09:psp_pipeline_install_acceptance") === "800"
    && quantity(first, "rc09:psp_trench_width") === "0.61"
    && quantity(first, "rc09:psp_trench_excavation") === "878.4"
    && quantity(first, "rc09:psp_bedding") === "56.12"
    && quantity(first, "rc09:psp_surround") === "221.348947649"
    && quantity(first, "rc09:psp_joint") === "66"
    && quantity(first, "rc09:psp_chamber") === "13"
    && quantity(first, "rc09:labor:psp-pipe-appurtenance-install") === "523.2")) {
    throw new Error("STOP_S27_27_PRESSURE_SEWER_PIPELINE_FIRST_ESTIMATE");
  }
  if (!(quantity(changedGeometry, "rc09:psp_pipeline_install_acceptance") === "100"
    && quantity(changedGeometry, "rc09:psp_joint") === "8"
    && quantity(changedGeometry, "rc09:psp_warning_tape") === "105"
    && quantity(changedGeometry, "rc09:psp_pressure_test") === "100"
    && quantity(changedGeometry, "rc09:psp_flushing") === "100")) {
    throw new Error("STOP_S27_27_PRESSURE_SEWER_PIPELINE_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc09:psp-pipe-balance:installed-net") === "800"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:loss") === "16"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:retained-spare") === "24"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:total-need") === "840"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:net-need") === "740"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:segment-count") === "62"
    && quantity(changedProcurement, "rc09:psp_pipe") === "744"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:remainder") === "28"
    && quantity(changedProcurement, "rc09:psp-pipe-balance:surplus-beyond-spare") === "4")) {
    throw new Error("STOP_S27_27_PRESSURE_SEWER_PIPELINE_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 47 && conditional.preliminaryNeeds.length === 0
    && quantity(conditional, "rc09:psp_crossing_casing") === "36"
    && quantity(conditional, "rc09:psp_dewatering_volume") === "480"
    && quantity(conditional, "rc09:psp_road_restoration") === "96")) {
    throw new Error("STOP_S27_27_PRESSURE_SEWER_PIPELINE_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:psp_pipeline_install_acceptance", "rc09:psp_pressure_test",
    "rc09:psp_flushing", "rc09:psp_asbuilt_documents"]) {
    const graph = PRESSURE_SEWER_PIPELINE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_27_PRESSURE_SEWER_PIPELINE_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(PRESSURE_SEWER_PIPELINE_FORMULAS);
  if (/"psp_(?:trench_excavation_volume_m3|survey_labor_h|excavator_machine_h|delivery_trip_count)"/iu
    .test(formulaText)) throw new Error("STOP_S27_27_PRESSURE_SEWER_PIPELINE_FINAL_QUANTITY_INPUT");
  const serialized = JSON.stringify({ first, changedGeometry, changedProcurement, conditional });
  return { status: "GREEN_S27_27_PRESSURE_SEWER_PIPELINE_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length },
    changedGeometry: { routeM: quantity(changedGeometry, "rc09:psp_pipeline_install_acceptance"),
      jointCount: quantity(changedGeometry, "rc09:psp_joint") },
    procurement: { installedM: quantity(changedProcurement, "rc09:psp-pipe-balance:installed-net"),
      retainedSpareM: quantity(changedProcurement, "rc09:psp-pipe-balance:retained-spare"),
      totalNeedM: quantity(changedProcurement, "rc09:psp-pipe-balance:total-need"),
      segmentCount: quantity(changedProcurement, "rc09:psp-pipe-balance:segment-count"),
      orderedM: quantity(changedProcurement, "rc09:psp_pipe"),
      remainderM: quantity(changedProcurement, "rc09:psp-pipe-balance:remainder"),
      surplusM: quantity(changedProcurement, "rc09:psp-pipe-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-27.pressure-sewer-pipeline-automatic-successor.v1",
  stopCode: "S27_27_PRESSURE_SEWER_PIPELINE_AUTOMATIC",
  applicationName: "s27-27-pressure-sewer-pipeline-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (67).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "cc054d385411a08b0c0ba72197acfdb9f69306e0c7e81ff87697a8340a943ee8",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f2bfdfe7-f8ff-580b-bf8b-ef998f2e5769",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "57a9a909-1f84-54ac-9d4a-c49902fa8085",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-27/pressure-sewer-pipeline-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pressure-sewer-pipeline-balanced-s27-24.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/pressureSewerPipelineR1.ts",
    "tests/estimateNorms/pressureSewerPipelineR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
    "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.r3.test.tsx",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2727PressureSewerPipelineAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2727PressureSewerPipelineAutomaticIndependent.ts",
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
  verifyCore, expectedParentShape: [56, 37, 37], benchmarkOrdinal: 38,
  validationScenario: "Q5_PRESSURE_SEWER_PIPELINE_AUTOMATIC_S27_27",
  passport: {
    canonicalRuName: "Строительство и приёмка напорного канализационного трубопровода",
    workKey: "pressure_sewer_pipeline",
    physicalResultRu: "Напорная канализационная линия построена из выбранной трубы, испытана, промыта и оформлена исполнительной документацией",
    includedScopeRu: ["выбранная труба, вычисляемые соединения и проектные фасонные части",
      "вычисляемые траншея, основание, обсыпка, засыпка и вывоз грунта",
      "запорная арматура, воздушные клапаны, промывные узлы, камеры и люки",
      "труд, механизмы, испытание, промывка, документы, логистика и баланс трубы",
      "футляры, водоотлив и восстановление дороги только по условным ветвям"],
    excludedScopeRu: ["гидравлический подбор диаметра и автоматический шаг арматуры",
      "КНС, самотечный коллектор и внутридомовая канализация", "неподтверждённые цены"],
  },
  applicability: { country: "KG",
    operationClass: "PRESSURE_SEWER_PIPELINE_CONSTRUCTION_AND_ACCEPTANCE",
    pressureSewerSystem: "OPEN_TRENCH_SELECTED_PIPE_AND_PROJECT_APPURTENANCE_SCHEDULE",
    primaryMeasureParameterId: "psp_route_length_m",
    knownScopeParameters: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT),
    ordinaryUserInputCount: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT).length,
    automaticGeometryMaterialsLaborEquipmentQaAndLogistics: true,
    visibleEditablePreliminaryProfile: true, visibleProcurementBalance: true,
    derivedFinalQuantitiesAsQuestionsForbidden: true,
    conditionalScopeFailClosed: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:psp_pipeline_install_acceptance", applicability: {
    technology_class: "PRESSURE_SEWER", operation_class: "PRESSURE_SEWER_PIPELINE_CONSTRUCTION_AND_ACCEPTANCE",
    pressure_sewer_system: "OPEN_TRENCH_SELECTED_PIPE_AND_PROJECT_APPURTENANCE_SCHEDULE",
    scope_mode: "EIGHT_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
    source_id: PRESSURE_SEWER_PIPELINE_SOURCE_ID, norm_id: PRESSURE_SEWER_PIPELINE_NORM_ID,
    exact_locator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "PRIMARY_ROUTE_PIPE_TRENCH_AND_APPURTENANCE_FACTS_PLUS_VISIBLE_EDITABLE_PROFILE" } },
  locator: { key: "pressure-sewer-pipeline-automatic-s27-27-v2", payload: {
    kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
    exactLocator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
    sourcePackSha256: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.artifact_sha256,
    ordinaryKnownInputs: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT),
    visibleEditableProfileInputs: Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT),
    automaticFormulaIds: PRESSURE_SEWER_PIPELINE_FORMULAS.map((formula) => formula.formula_id),
    conditionalInputs: Object.keys(CONDITIONAL_INPUT) } },
  search: { primaryUom: "m",
    canonicalNameRu: "Строительство напорного канализационного трубопровода",
    aliases: ["напорная канализация", "напорный коллектор HDPE",
      "трубопровод сточных вод PE100-RC", "pressure sewer pipeline construction"],
    shortScopeRu: "Напорная канализация открытой прокладки: пользователь задаёт длину, выбранную трубу, глубину и проектную арматуру; геометрия, материалы, труд, механизмы и рейсы рассчитываются автоматически.",
    keyDistinguishingParameters: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT),
    clarificationFields: Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT),
    includedBoundaries: ["напорная труба, траншея, арматура, воздушные и промывные узлы по проекту",
      "труд, механизмы, испытание, документы, логистика и баланс трубы",
      "условные футляры, водоотлив и восстановление дороги только по проекту"],
    excludedBoundaries: ["КНС, самотечный коллектор и внутридомовая канализация",
      "гидравлический подбор диаметра и автоматический шаг фасонных частей или арматуры",
      "неподтверждённые материалы, условные работы и цены"],
    extraSearchTermsRu: "напорная канализация HDPE PE100-RC SDR PN труба траншея задвижка воздушный клапан промывной узел камера испытание",
    sourceProvenance: { exactExpandedPressureSewerPipelineOwner: true,
      knownRouteAndSelectedPressurePipeIdentity: true,
      visibleIndependentPipeProcurementBalance: true,
      automaticEarthworkMaterialLaborEquipmentQaAndLogistics: true } },
  forbiddenAdjacentMatchers: [/pumping.station|канализационн.*насосн.*станц/iu,
    /gravity.sewer|самотечн.*коллектор/iu, /building.drainage|внутридомов.*канализац/iu,
    /stormwater|ливнев/iu],
  owner: "S27_27_PRESSURE_SEWER_PIPELINE_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_27_PRESSURE_SEWER_PIPELINE_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
