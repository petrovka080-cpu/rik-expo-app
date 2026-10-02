import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
  INSPECTION_CHAMBERS_CATALOG_ID,
  INSPECTION_CHAMBERS_FORMULAS,
  INSPECTION_CHAMBERS_NORM_ID,
  INSPECTION_CHAMBERS_PARAMETERS,
  INSPECTION_CHAMBERS_RESOURCES,
  INSPECTION_CHAMBERS_RUNTIME_CLASSIFICATION,
  INSPECTION_CHAMBERS_RUNTIME_INPUT,
  INSPECTION_CHAMBERS_RUNTIME_SOURCE_IDS,
  INSPECTION_CHAMBERS_SHORT_INPUT,
  INSPECTION_CHAMBERS_SOURCE_ID,
  INSPECTION_CHAMBERS_SOURCE_METADATA,
  compileInspectionChambersR1,
} from "../../../src/lib/estimate/v4/inspectionChambersR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileInspectionChambersR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "ich_chamber_count", "ich_chamber_type", "ich_chamber_material",
  "ich_internal_diameter_mm", "ich_depth_m", "ich_cover_load_class",
  "ich_connector_diameter_mm", "ich_chamber_designation",
];

const CONDITIONAL_INPUT = Object.freeze({
  ich_dewatering_mode: "REQUIRED",
  ich_dewatering_designation: "Дренажный насос по ППР",
  ich_dewatering_machine_h: 96,
  ich_shoring_mode: "REQUIRED",
  ich_shoring_designation: "Инвентарное крепление котлованов",
  ich_shoring_area_m2: 480,
  ich_pavement_restoration_mode: "REQUIRED",
  ich_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
  ich_pavement_restoration_area_m2: 144,
});

async function verifyCore(): Promise<Json> {
  const first = await compileInspectionChambersR1({
    ...INSPECTION_CHAMBERS_SHORT_INPUT,
  });
  const complete = await compileInspectionChambersR1({
    ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
  });
  const balanced = await compileInspectionChambersR1({
    ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
    ich_body_retained_spare_piece: 1,
    ich_body_supplier_package_quantity_piece: 2,
  });
  const conditional = await compileInspectionChambersR1({
    ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 28
    && quantity(first, "rc09:ich_install_acceptance") === "12"
    && quantity(first, "rc09:ich_body") === "12")) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 33 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:ich_base_slab") === "12"
    && quantity(complete, "rc09:ich_steps") === "72"
    && quantity(complete, "rc09:ich_benching_concrete") === "9.6"
    && quantity(complete, "rc09:ich_waterproofing") === "216"
    && quantity(complete, "rc09:ich_excavation") === "360"
    && quantity(complete, "rc09:labor:ich-install") === "360"
    && quantity(complete, "rc09:equipment:ich-crane") === "84"
    && quantity(complete, "rc09:logistics:ich-delivery") === "18")) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:ich-body-balance:installed-net") === "12"
    && quantity(balanced, "rc09:ich-body-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:ich-body-balance:total-need") === "13"
    && quantity(balanced, "rc09:ich-body-balance:package-count") === "7"
    && quantity(balanced, "rc09:ich_body") === "14"
    && quantity(balanced, "rc09:ich-body-balance:remainder") === "2"
    && quantity(balanced, "rc09:ich-body-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:ich_install_acceptance", "rc09:ich_test", "rc09:ich_asbuilt_documents",
  ]) {
    const graph = INSPECTION_CHAMBERS_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_INSPECTION_CHAMBERS_DOUBLE_COST:${rowId}`);
    }
  }
  if (/length_m|ceil\(length|golden_rate|normFactor/iu
    .test(JSON.stringify(INSPECTION_CHAMBERS_FORMULAS))) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe|sanitary_sewer_route|manhole_spacing/iu
    .test(JSON.stringify(INSPECTION_CHAMBERS_RESOURCES))) {
    throw new Error("STOP_S27_24_INSPECTION_CHAMBERS_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_INSPECTION_CHAMBERS_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: INSPECTION_CHAMBERS_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:ich-body-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:ich-body-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:ich-body-balance:total-need"),
      packageCount: quantity(balanced, "rc09:ich-body-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:ich_body"),
      remainderPiece: quantity(balanced, "rc09:ich-body-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:ich-body-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.inspection-chambers-balanced-successor.v1",
  stopCode: "S27_24_INSPECTION_CHAMBERS_BALANCED",
  applicationName: "s27-24-inspection-chambers-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "0d2138a7-6ee1-5ecd-8da7-34e7b6acf495",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "1bc4da09-6399-58cd-ae5b-4f1b521a1acb",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/inspection-chambers-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/inspection-chambers-balanced-s27-24.json",
    "src/lib/estimate/v4/inspectionChambersR1.ts",
    "tests/estimateNorms/inspectionChambersR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724InspectionChambersBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724InspectionChambersBalancedIndependent.ts",
  ],
  catalogId: INSPECTION_CHAMBERS_CATALOG_ID,
  sourceId: INSPECTION_CHAMBERS_SOURCE_ID,
  normId: INSPECTION_CHAMBERS_NORM_ID,
  sourceMetadata: INSPECTION_CHAMBERS_SOURCE_METADATA,
  parameterDefinitions: INSPECTION_CHAMBERS_PARAMETERS,
  formulaDefinitions: INSPECTION_CHAMBERS_FORMULAS,
  resourceDefinitions: INSPECTION_CHAMBERS_RESOURCES,
  shortInput: INSPECTION_CHAMBERS_SHORT_INPUT,
  acceptanceInput: INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
  runtimeProfileInput: INSPECTION_CHAMBERS_RUNTIME_INPUT,
  runtimeProfileClassification: INSPECTION_CHAMBERS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: INSPECTION_CHAMBERS_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 42,
  validationScenario: "Q5_INSPECTION_CHAMBERS_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и приёмка смотровых камер",
    workKey: "inspection_chambers",
    physicalResultRu: "12 камер KS-15-RC-H2.5-D400-DN200 смонтированы, испытаны и приняты",
    includedScopeRu: [
      "выбранные комплекты корпуса, плиты днища и перекрытия, люки, рамы, ступени, уплотнения и соединители",
      "лотковая часть, гидроизоляция, основание, котлованы и обратная засыпка",
      "труд, механизмы, испытания, документы, логистика и баланс комплектов корпуса",
      "водоотлив, крепление котлованов и восстановление покрытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "трубопроводная канализационная сеть и смежные сооружения",
      "автоматический шаг или количество камер по длине трассы",
      "неподтверждённые цены и универсальные нормы расхода или производительности",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSPECTION_CHAMBER_INSTALLATION_AND_ACCEPTANCE",
    chamberAssembly: "KS_15_PRECAST_RC_H2_5_D400_DN200_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "ich_chamber_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleProcurementBalance: true,
    directProjectMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true,
    routeDerivedQuantitiesForbidden: true,
    adjacentSystemsExcluded: true,
  },
  binding: {
    rowId: "rc09:ich_install_acceptance",
    applicability: {
      technology_class: "INSPECTION_CHAMBER_ASSEMBLY",
      operation_class: "INSPECTION_CHAMBER_INSTALLATION_AND_ACCEPTANCE",
      chamber_assembly: "KS_15_PRECAST_RC_H2_5_D400_DN200_EXPLICIT_SCHEDULE",
      scope_mode: "KNOWN_CHAMBER_ASSEMBLY_PLUS_VISIBLE_BODY_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: INSPECTION_CHAMBERS_SOURCE_ID,
      norm_id: INSPECTION_CHAMBERS_NORM_ID,
      exact_locator: INSPECTION_CHAMBERS_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_INSPECTION_CHAMBER_ASSEMBLY_PLUS_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "inspection-chambers-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: INSPECTION_CHAMBERS_SOURCE_METADATA.exact_locator,
      sourcePackSha256: INSPECTION_CHAMBERS_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(INSPECTION_CHAMBERS_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(INSPECTION_CHAMBERS_RUNTIME_INPUT),
      directProjectInputs: INSPECTION_CHAMBERS_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(INSPECTION_CHAMBERS_SHORT_INPUT, id)
          && !id.startsWith("ich_dewatering_") && !id.startsWith("ich_shoring_")
          && !id.startsWith("ich_pavement_restoration_")),
      conditionalInputs: [
        "ich_dewatering_mode", "ich_dewatering_designation", "ich_dewatering_machine_h",
        "ich_shoring_mode", "ich_shoring_designation", "ich_shoring_area_m2",
        "ich_pavement_restoration_mode", "ich_pavement_restoration_designation",
        "ich_pavement_restoration_area_m2",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж смотровых камер",
    aliases: [
      "установка смотровой камеры", "смотровой колодец KS-15 D400",
      "канализационная смотровая камера", "inspection chamber installation",
    ],
    shortScopeRu: "12 круглых сборных железобетонных камер KS-15 диаметром 1500 мм, глубиной 2,5 м, с люком D400 и присоединениями DN 200; состав, объёмы, труд и механизмы уточняются по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: INSPECTION_CHAMBERS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(INSPECTION_CHAMBERS_SHORT_INPUT, id)),
    includedBoundaries: [
      "корпуса, плиты, люки, рамы, ступени, уплотнения и соединители по проекту",
      "лотковая часть, гидроизоляция, основание, земляные работы, труд, механизмы, QA и логистика",
      "условные водоотлив, крепление и восстановление покрытия только по проекту",
    ],
    excludedBoundaries: [
      "трубопроводная канализационная сеть и смежные сооружения",
      "автоматическое количество или шаг камер по длине трассы",
      "неподтверждённые материалы, условные работы и цены",
    ],
    extraSearchTermsRu: "смотровая камера канализационный колодец KS-15 железобетон D400 DN200 люк кольца плита днища перекрытия",
    sourceProvenance: {
      exactExpandedInspectionChambersOwner: true,
      knownSelectedChamberDiameterDepthCoverAndConnectorIdentity: true,
      visibleIndependentChamberBodyProcurementBalance: true,
      exactProjectMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /sewer.pipe|канализац.*труб/iu,
    /rainwater.inlet|дождепри[её]мн/iu,
    /drainage.channel|водоотводн.*канал/iu,
  ],
  owner: "S27_24_INSPECTION_CHAMBERS_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_INSPECTION_CHAMBERS_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
