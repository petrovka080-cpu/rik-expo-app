import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
  GRAVITY_SEWER_COLLECTOR_CATALOG_ID,
  GRAVITY_SEWER_COLLECTOR_FORMULAS,
  GRAVITY_SEWER_COLLECTOR_NORM_ID,
  GRAVITY_SEWER_COLLECTOR_PARAMETERS,
  GRAVITY_SEWER_COLLECTOR_RESOURCES,
  GRAVITY_SEWER_COLLECTOR_RUNTIME_CLASSIFICATION,
  GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT,
  GRAVITY_SEWER_COLLECTOR_RUNTIME_SOURCE_IDS,
  GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
  GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
  GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA,
  compileGravitySewerCollectorR1,
} from "../../../src/lib/estimate/v4/gravitySewerCollectorR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileGravitySewerCollectorR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  gsc_dewatering_mode: "REQUIRED",
  gsc_dewatering_designation: "Иглофильтровая установка по ППР",
  gsc_dewatering_machine_h: 240,
  gsc_shoring_mode: "REQUIRED",
  gsc_shoring_designation: "Инвентарное крепление траншеи",
  gsc_shoring_area_m2: 1800,
  gsc_road_restoration_mode: "REQUIRED",
  gsc_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
  gsc_road_restoration_area_m2: 720,
});

async function verifyCore(): Promise<Json> {
  const first = await compileGravitySewerCollectorR1({
    ...GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
  });
  const complete = await compileGravitySewerCollectorR1({
    ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
  });
  const balanced = await compileGravitySewerCollectorR1({
    ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
    gsc_pipe_retained_spare_m: 10,
    gsc_pipe_supplier_stick_length_m: 6,
  });
  const conditional = await compileGravitySewerCollectorR1({
    ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 26
    && quantity(first, "rc09:gsc_collector_install_acceptance") === "1"
    && quantity(first, "rc09:gsc_pipe") === "600"
    && quantity(first, "rc09:gsc-pipe-balance:installed-net") === "600")) {
    throw new Error("STOP_S27_24_GRAVITY_SEWER_COLLECTOR_FIRST_ESTIMATE");
  }
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:gsc_trench_excavation", "rc09:gsc_bedding", "rc09:gsc_surround",
    "rc09:gsc_backfill", "rc09:gsc_excess_soil_removal", "rc09:gsc_manhole",
    "rc09:gsc_manhole_cover", "rc09:gsc_fitting", "rc09:gsc_socket_seal",
    "rc09:gsc_assembly_lubricant", "rc09:gsc_warning_tape", "rc09:gsc_leak_test",
    "rc09:gsc_cctv_inspection", "rc09:gsc_asbuilt_documents",
    "rc09:gsc_dewatering", "rc09:gsc_shoring", "rc09:gsc_road_restoration",
    "rc09:labor:gsc-survey", "rc09:labor:gsc-earthworks",
    "rc09:labor:gsc-pipe-manhole-install", "rc09:labor:gsc-qa-documentation",
    "rc09:equipment:gsc-excavator", "rc09:equipment:gsc-compactor",
    "rc09:equipment:gsc-pipe-laser", "rc09:logistics:gsc-delivery",
    "rc09:logistics:gsc-removal",
  ]) if (!needs.has(rowId)) {
    throw new Error(`STOP_S27_24_GRAVITY_SEWER_COLLECTOR_NEED:${rowId}`);
  }
  if (!(complete.rows.length === 31 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:gsc_trench_excavation") === "1260"
    && quantity(complete, "rc09:gsc_bedding") === "108"
    && quantity(complete, "rc09:gsc_manhole") === "13"
    && quantity(complete, "rc09:gsc_fitting") === "18"
    && quantity(complete, "rc09:gsc_cctv_inspection") === "600"
    && quantity(complete, "rc09:labor:gsc-pipe-manhole-install") === "560"
    && quantity(complete, "rc09:equipment:gsc-excavator") === "140"
    && quantity(complete, "rc09:logistics:gsc-delivery") === "18")) {
    throw new Error("STOP_S27_24_GRAVITY_SEWER_COLLECTOR_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:gsc-pipe-balance:installed-net") === "600"
    && quantity(balanced, "rc09:gsc-pipe-balance:retained-spare") === "10"
    && quantity(balanced, "rc09:gsc-pipe-balance:total-need") === "610"
    && quantity(balanced, "rc09:gsc-pipe-balance:stick-count") === "102"
    && quantity(balanced, "rc09:gsc_pipe") === "612"
    && quantity(balanced, "rc09:gsc-pipe-balance:remainder") === "12"
    && quantity(balanced, "rc09:gsc-pipe-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_GRAVITY_SEWER_COLLECTOR_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 34 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_GRAVITY_SEWER_COLLECTOR_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:gsc_collector_install_acceptance", "rc09:gsc_leak_test",
    "rc09:gsc_cctv_inspection", "rc09:gsc_asbuilt_documents",
  ]) {
    const graph = GRAVITY_SEWER_COLLECTOR_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_GRAVITY_SEWER_COLLECTOR_DOUBLE_COST:${rowId}`);
    }
  }
  const formulaText = JSON.stringify(GRAVITY_SEWER_COLLECTOR_FORMULAS);
  if (/length_m\s*\*\s*(?:1\.107|0\.75|0\.70)|ceil\(length_m\/(?:50|200)\)|\b432\b/iu
    .test(formulaText)) {
    throw new Error("STOP_S27_24_GRAVITY_SEWER_COLLECTOR_LEGACY_COEFFICIENT");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_GRAVITY_SEWER_COLLECTOR_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: GRAVITY_SEWER_COLLECTOR_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:gsc-pipe-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:gsc-pipe-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:gsc-pipe-balance:total-need"),
      stickCount: quantity(balanced, "rc09:gsc-pipe-balance:stick-count"),
      orderedM: quantity(balanced, "rc09:gsc_pipe"),
      remainderM: quantity(balanced, "rc09:gsc-pipe-balance:remainder"),
      surplusM: quantity(balanced, "rc09:gsc-pipe-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.gravity-sewer-collector-balanced-successor.v1",
  stopCode: "S27_24_GRAVITY_SEWER_COLLECTOR_BALANCED",
  applicationName: "s27-24-gravity-sewer-collector-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "6cf70371-8291-5342-9f70-34f4704dc788",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e87e126b-3955-5a48-bdc8-028d1c2a1e69",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/gravity-sewer-collector-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/gravity-sewer-collector-balanced-s27-24.json",
    "src/lib/estimate/v4/gravitySewerCollectorR1.ts",
    "tests/estimateNorms/gravitySewerCollectorR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724GravitySewerCollectorBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724GravitySewerCollectorBalancedIndependent.ts",
  ],
  catalogId: GRAVITY_SEWER_COLLECTOR_CATALOG_ID,
  sourceId: GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
  normId: GRAVITY_SEWER_COLLECTOR_NORM_ID,
  sourceMetadata: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA,
  parameterDefinitions: GRAVITY_SEWER_COLLECTOR_PARAMETERS,
  formulaDefinitions: GRAVITY_SEWER_COLLECTOR_FORMULAS,
  resourceDefinitions: GRAVITY_SEWER_COLLECTOR_RESOURCES,
  shortInput: GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
  acceptanceInput: GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
  runtimeProfileInput: GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT,
  runtimeProfileClassification: GRAVITY_SEWER_COLLECTOR_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: GRAVITY_SEWER_COLLECTOR_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 36,
  validationScenario: "Q5_GRAVITY_SEWER_COLLECTOR_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка самотечного канализационного коллектора",
    workKey: "gravity_sewer_collector",
    physicalResultRu: "Самотечный коллектор из 600 м трубы PVC-U SN8 OD 200 с уклоном 0,007 построен, испытан и принят",
    includedScopeRu: [
      "выбранная трубная система, уплотнения, фасонные части и расходники",
      "проектные земляные объёмы, основание, обсыпка, засыпка и вывоз грунта",
      "колодцы, люки, сигнальная лента, испытания, телеинспекция и документы",
      "труд, экскаватор, уплотнение, контроль уклона и логистика",
      "водоотлив, крепление траншеи и восстановление дороги только по условным ветвям",
    ],
    excludedScopeRu: [
      "автоматическое определение траншеи, колодцев, фасонных частей или труда по длине",
      "КНС, внутридомовая канализация и смежные сети",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "GRAVITY_SEWER_COLLECTOR_CONSTRUCTION_AND_ACCEPTANCE",
    gravitySewerSystem: "PVC_U_SN8_EXPLICIT_ROUTE_TRENCH_MANHOLE_SCHEDULE",
    primaryMeasureParameterId: "gsc_collector_count",
    knownScopeParameters: ["gsc_route_length_m", "gsc_pipe_material_grade",
      "gsc_ring_stiffness_class", "gsc_pipe_outside_diameter_mm",
      "gsc_slope_m_per_m", "gsc_pipe_designation"],
    visibleProcurementBalance: true,
    directProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    genericLengthCoefficientsForbidden: true,
    adjacentSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:gsc_collector_install_acceptance",
    applicability: {
      technology_class: "GRAVITY_SEWER",
      operation_class: "GRAVITY_SEWER_COLLECTOR_CONSTRUCTION_AND_ACCEPTANCE",
      gravity_sewer_system: "PVC_U_SN8_EXPLICIT_ROUTE_TRENCH_MANHOLE_SCHEDULE",
      scope_mode: "KNOWN_ROUTE_PIPE_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
      norm_id: GRAVITY_SEWER_COLLECTOR_NORM_ID,
      exact_locator: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_COLLECTOR_ROUTE_PIPE_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "gravity-sewer-collector-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.exact_locator,
      sourcePackSha256: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(GRAVITY_SEWER_COLLECTOR_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT),
      directProjectInputs: GRAVITY_SEWER_COLLECTOR_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(GRAVITY_SEWER_COLLECTOR_SHORT_INPUT, id)
          && !id.startsWith("gsc_dewatering_") && !id.startsWith("gsc_shoring_")
          && !id.startsWith("gsc_road_restoration_")),
      conditionalInputs: [
        "gsc_dewatering_mode", "gsc_dewatering_designation", "gsc_dewatering_machine_h",
        "gsc_shoring_mode", "gsc_shoring_designation", "gsc_shoring_area_m2",
        "gsc_road_restoration_mode", "gsc_road_restoration_designation",
        "gsc_road_restoration_area_m2",
      ],
    },
  },
  search: {
    primaryUom: "system",
    canonicalNameRu: "Строительство самотечного канализационного коллектора",
    aliases: ["самотечный коллектор", "наружная самотечная канализация",
      "коллектор PVC-U SN8", "gravity sewer collector construction"],
    shortScopeRu: "Один коллектор: 600 м PVC-U SN8 OD 200, уклон 0,007; траншея, колодцы, материалы, труд, механизмы и контроль уточняются по проекту.",
    keyDistinguishingParameters: ["gsc_collector_count", "gsc_route_length_m",
      "gsc_pipe_material_grade", "gsc_ring_stiffness_class",
      "gsc_pipe_outside_diameter_mm", "gsc_slope_m_per_m", "gsc_pipe_designation"],
    clarificationFields: GRAVITY_SEWER_COLLECTOR_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(GRAVITY_SEWER_COLLECTOR_SHORT_INPUT, id)),
    includedBoundaries: [
      "труба, траншея, основание, обсыпка, колодцы и комплектующие по проекту",
      "труд, механизмы, испытания, исполнительные документы, логистика и баланс трубы",
      "условные водоотлив, крепление траншеи и восстановление дороги только по проекту",
    ],
    excludedBoundaries: [
      "КНС, внутридомовая канализация и смежные сети",
      "автоматические коэффициенты по длине, шаг колодцев 50 м или узлов 200 м",
      "неподтверждённые материалы, условные работы и цены",
    ],
    extraSearchTermsRu: "самотечная канализация коллектор PVC-U SN8 OD DN уклон траншея основание обсыпка колодец герметичность телеинспекция",
    sourceProvenance: {
      exactExpandedGravitySewerCollectorOwner: true,
      knownRouteAndSelectedPipeIdentity: true,
      visibleIndependentPipeProcurementBalance: true,
      exactProjectEarthworkMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /pumping.station|канализационн.*насосн/iu,
    /building.drainage|внутридомов.*канализац/iu,
    /water.supply.network|водопроводн.*сет/iu,
    /stormwater.collector|ливнев.*коллектор/iu,
  ],
  owner: "S27_24_GRAVITY_SEWER_COLLECTOR_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_GRAVITY_SEWER_COLLECTOR_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
