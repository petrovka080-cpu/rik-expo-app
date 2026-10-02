import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
  PRESSURE_PIPELINE_CATALOG_ID,
  PRESSURE_PIPELINE_FORMULAS,
  PRESSURE_PIPELINE_KNOWN_SCOPE_PARAMETERS,
  PRESSURE_PIPELINE_NORM_ID,
  PRESSURE_PIPELINE_PARAMETERS,
  PRESSURE_PIPELINE_RESOURCES,
  PRESSURE_PIPELINE_RUNTIME_CLASSIFICATION,
  PRESSURE_PIPELINE_RUNTIME_INPUT,
  PRESSURE_PIPELINE_RUNTIME_SOURCE_IDS,
  PRESSURE_PIPELINE_SHORT_INPUT,
  PRESSURE_PIPELINE_SOURCE_ID,
  PRESSURE_PIPELINE_SOURCE_METADATA,
  compilePressurePipelineR1,
} from "../../../src/lib/estimate/v4/pressurePipelineR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compilePressurePipelineR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  ppl_shoring_mode: "REQUIRED",
  ppl_shoring_designation: "TRENCH-BOX-STEEL-H2M",
  ppl_shored_length_m: 120,
  ppl_dewatering_mode: "REQUIRED",
  ppl_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
  ppl_dewatering_duration_h: 40,
  ppl_dewatering_flow_m3_h: 12,
});

async function verifyCore(): Promise<Json> {
  const first = await compilePressurePipelineR1({ ...PRESSURE_PIPELINE_SHORT_INPUT });
  const changedGeometry = await compilePressurePipelineR1({
    ...PRESSURE_PIPELINE_SHORT_INPUT,
    ppl_route_length_m: 2000,
    ppl_pipe_outside_diameter_mm: 225,
    ppl_average_trench_depth_m: 2,
  });
  const changedProcurement = await compilePressurePipelineR1({
    ...PRESSURE_PIPELINE_SHORT_INPUT,
    ppl_pipe_available_stock_m: 100,
    ppl_pipe_retained_spare_m: 24,
    ppl_pipe_supplier_segment_length_m: 12,
  });
  const conditional = await compilePressurePipelineR1({
    ...PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 48 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc13:ppl_trench_width") === "0.66"
    && quantity(first, "rc13:ppl_excavation") === "1056"
    && quantity(first, "rc13:ppl_bedding_installed") === "66"
    && quantity(first, "rc13:ppl_surround_installed") === "283.493807027"
    && quantity(first, "rc13:ppl_native_backfill") === "686.4"
    && quantity(first, "rc13:ppl_excess_soil") === "369.6"
    && quantity(first, "rc13:ppl_pipe_order") === "1032"
    && quantity(first, "rc13:ppl_fusion_joints") === "82")) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(quantity(changedGeometry, "rc13:ppl_excavation") === "2900"
    && quantity(changedGeometry, "rc13:ppl_bedding_installed") === "145"
    && quantity(changedGeometry, "rc13:ppl_surround_installed") === "681.728435996"
    && quantity(changedGeometry, "rc13:ppl_pipe_order") === "2052"
    && quantity(changedGeometry, "rc13:ppl_fusion_joints") === "165")) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc13:ppl_pipe_installed") === "1000"
    && quantity(changedProcurement, "rc13:ppl_pipe_loss") === "20"
    && quantity(changedProcurement, "rc13:ppl_pipe_retained_spare") === "24"
    && quantity(changedProcurement, "rc13:ppl_pipe_stock") === "100"
    && quantity(changedProcurement, "rc13:ppl_pipe_total_need") === "1044"
    && quantity(changedProcurement, "rc13:ppl_pipe_net_need") === "944"
    && quantity(changedProcurement, "rc13:ppl_pipe_segment_count") === "79"
    && quantity(changedProcurement, "rc13:ppl_pipe_order") === "948"
    && quantity(changedProcurement, "rc13:ppl_pipe_remainder") === "28"
    && quantity(changedProcurement, "rc13:ppl_pipe_surplus") === "4")) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 53 && conditional.preliminaryNeeds.length === 0
    && quantity(conditional, "rc13:ppl_shoring") === "384"
    && quantity(conditional, "rc13:ppl_dewatering_volume") === "480")) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc13:ppl_excavation", "rc13:ppl_pipe_order", "rc13:ppl_bedding_order",
    "rc13:ppl_surround_order", "rc13:ppl_native_backfill",
    "rc13:ppl_imported_backfill", "rc13:ppl_warning_tape",
    "rc13:ppl_detectable_wire", "rc13:ppl_fusion_joints",
    "rc13:ppl_fusion_consumables", "rc13:ppl_connection_kits",
    "rc13:labor:ppl-survey", "rc13:labor:ppl-excavation",
    "rc13:labor:ppl-bedding", "rc13:labor:ppl-fusion",
    "rc13:labor:ppl-laying", "rc13:labor:ppl-backfill",
    "rc13:equipment:ppl-excavator", "rc13:equipment:ppl-loader",
    "rc13:equipment:ppl-compactor", "rc13:equipment:ppl-fusion",
    "rc13:logistics:ppl-soil-removal", "rc13:logistics:ppl-pipe-delivery",
    "rc13:ppl_hidden_works", "rc13:ppl_asbuilt",
  ]) {
    if (!PRESSURE_PIPELINE_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_PRESSURE_PIPELINE_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/villageWaterSupplyCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(PRESSURE_PIPELINE_FORMULAS))) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_LEGACY_COEFFICIENT");
  }
  if (/valve|hydrant|chamber|manhole|pressure.test|hydro.test|disinfection/iu
    .test(JSON.stringify(PRESSURE_PIPELINE_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_PRESSURE_PIPELINE_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, changedGeometry, changedProcurement, conditional });
  return {
    status: "GREEN_S27_26_PRESSURE_PIPELINE_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(PRESSURE_PIPELINE_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(PRESSURE_PIPELINE_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: 0 },
    automaticGeometry: {
      baselineExcavationM3: quantity(first, "rc13:ppl_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc13:ppl_excavation"),
      baselineBeddingM3: quantity(first, "rc13:ppl_bedding_installed"),
      changedBeddingM3: quantity(changedGeometry, "rc13:ppl_bedding_installed"),
      baselineSurroundM3: quantity(first, "rc13:ppl_surround_installed"),
      changedSurroundM3: quantity(changedGeometry, "rc13:ppl_surround_installed"),
      baselineJointCount: quantity(first, "rc13:ppl_fusion_joints"),
      changedJointCount: quantity(changedGeometry, "rc13:ppl_fusion_joints"),
    },
    procurement: {
      installedM: quantity(changedProcurement, "rc13:ppl_pipe_installed"),
      expectedLossM: quantity(changedProcurement, "rc13:ppl_pipe_loss"),
      retainedSpareM: quantity(changedProcurement, "rc13:ppl_pipe_retained_spare"),
      availableStockM: quantity(changedProcurement, "rc13:ppl_pipe_stock"),
      netOrderNeedM: quantity(changedProcurement, "rc13:ppl_pipe_net_need"),
      segmentCount: quantity(changedProcurement, "rc13:ppl_pipe_segment_count"),
      orderedM: quantity(changedProcurement, "rc13:ppl_pipe_order"),
      surplusM: quantity(changedProcurement, "rc13:ppl_pipe_surplus"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.pressure-pipeline-automatic-successor.v1",
  stopCode: "S27_26_PRESSURE_PIPELINE_AUTOMATIC",
  applicationName: "s27-26-pressure-pipeline-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b0a9a8a0-1f72-552b-aa72-79b65650b279",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "6c1b5e72-0ceb-5099-973d-49505172ad8e",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/pressure-pipeline-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pressure-pipeline-hdpe-open-trench-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/pressurePipelineR1.ts",
    "tests/estimateNorms/pressurePipelineR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.test.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726PressurePipelineAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726PressurePipelineAutomaticIndependent.ts",
  ],
  catalogId: PRESSURE_PIPELINE_CATALOG_ID,
  sourceId: PRESSURE_PIPELINE_SOURCE_ID,
  normId: PRESSURE_PIPELINE_NORM_ID,
  sourceMetadata: PRESSURE_PIPELINE_SOURCE_METADATA,
  parameterDefinitions: PRESSURE_PIPELINE_PARAMETERS,
  formulaDefinitions: PRESSURE_PIPELINE_FORMULAS,
  resourceDefinitions: PRESSURE_PIPELINE_RESOURCES,
  shortInput: PRESSURE_PIPELINE_SHORT_INPUT,
  acceptanceInput: PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
  runtimeProfileInput: PRESSURE_PIPELINE_RUNTIME_INPUT,
  runtimeProfileClassification: PRESSURE_PIPELINE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: PRESSURE_PIPELINE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 70,
  validationScenario: "Q5_PRESSURE_PIPELINE_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Прокладка напорного ПНД-трубопровода открытым способом",
    workKey: "pressure_pipeline",
    physicalResultRu: "Напорный ПНД-трубопровод уложен на подготовленное основание, сварен, защищён обсыпкой, засыпан, уплотнён, промаркирован и оформлен исполнительной документацией",
    includedScopeRu: [
      "разбивка трассы, ограждение, разработка траншеи и обращение с грунтом",
      "основание, поставка трубы, стыковая сварка, укладка и узлы подключения",
      "защитная обсыпка, обратная засыпка, уплотнение, лента, трассировочный провод и столбики",
      "расходники, труд, механизмы, логистика, входной контроль и исполнительные документы",
      "крепление траншеи и водоотлив только по выбранным условным ветвям",
    ],
    excludedScopeRu: [
      "постоянная арматура, гидранты, камеры и колодцы",
      "гидравлическая опрессовка, устранение утечек, промывка, дезинфекция и лабораторный допуск",
      "переходы дорог и железных дорог, бестраншейная прокладка, скальные грунты и восстановление покрытий",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "PRESSURE_HDPE_PIPELINE_CONSTRUCTION",
    executionAssembly: "OPEN_TRENCH_BUTT_FUSION_UNPAVED_ROUTE",
    primaryMeasureParameterId: "ppl_route_length_m",
    knownScopeParameters: [...PRESSURE_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(PRESSURE_PIPELINE_SHORT_INPUT).length,
    automaticGeometryMaterialsLaborEquipmentLogisticsAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visiblePipeProcurementBalance: true,
    conditionalShoringAndDewateringFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    valvesChambersTestingAndDisinfectionExcluded: true,
  },
  binding: {
    rowId: "rc13:ppl_acceptance",
    applicability: {
      technology_class: "HDPE_BUTT_FUSION_OPEN_TRENCH",
      operation_class: "PRESSURE_PIPELINE_CONSTRUCTION",
      execution_assembly: "OPEN_TRENCH_UNPAVED_ROUTE",
      scope_mode: "SEVEN_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: PRESSURE_PIPELINE_SOURCE_ID,
      norm_id: PRESSURE_PIPELINE_NORM_ID,
      exact_locator: PRESSURE_PIPELINE_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_ROUTE_PIPE_AND_TRENCH_GEOMETRY_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "pressure-pipeline-hdpe-open-trench-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: PRESSURE_PIPELINE_SOURCE_METADATA.exact_locator,
      sourcePackSha256: PRESSURE_PIPELINE_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(PRESSURE_PIPELINE_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(PRESSURE_PIPELINE_RUNTIME_INPUT),
      automaticFormulaIds: PRESSURE_PIPELINE_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: "Прокладка напорного ПНД-трубопровода открытым способом",
    aliases: [
      "строительство напорного водопровода ПНД",
      "прокладка полиэтиленовой напорной трубы в траншее",
      "HDPE pressure pipeline open trench construction",
    ],
    shortScopeRu: "Строительство 1000 м напорного ПНД-трубопровода OD160 открытой траншейной прокладкой со сваркой, основанием, обсыпкой, засыпкой, маркировкой, трудом, механизмами и закупочным балансом трубы.",
    keyDistinguishingParameters: [...PRESSURE_PIPELINE_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "разбивка, траншея, основание, труба, сварка и укладка",
      "обсыпка, обратная засыпка, уплотнение, маркировка и грунтовая логистика",
      "расходники, труд, механизмы, контроль и исполнительные документы",
    ],
    excludedBoundaries: [
      "постоянная арматура, гидранты, камеры и колодцы",
      "опрессовка, промывка, дезинфекция и лабораторный допуск",
      "переходы, бестраншейная прокладка, скальные грунты и восстановление покрытий",
    ],
    extraSearchTermsRu: "напорный водопровод ПНД полиэтиленовая труба траншея сварка основание обсыпка засыпка",
    sourceProvenance: {
      exactPressurePipelineConstructionOwner: true,
      sevenPrimaryFactIngress: true,
      automaticGeometryMaterialsLaborEquipmentLogisticsAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /valve|hydrant|chamber|manhole|арматур|гидрант|камер|колодц/iu,
    /pressure[_. -]?test|hydro[_. -]?test|опрессов|гидроиспыт/iu,
    /flushing|disinfection|промывк|дезинфекц/iu,
    /road[_. -]?crossing|railway|trenchless|переход\p{L}*\s+(?:дорог|желез)|бестраншей/iu,
  ],
  owner: "S27_26_PRESSURE_PIPELINE_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_PRESSURE_PIPELINE_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
