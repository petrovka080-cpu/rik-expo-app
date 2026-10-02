import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  MANHOLES_ACCEPTANCE_INPUT, MANHOLES_CATALOG_ID, MANHOLES_FORMULAS,
  MANHOLES_NORM_ID, MANHOLES_PARAMETERS, MANHOLES_RESOURCES,
  MANHOLES_RUNTIME_CLASSIFICATION, MANHOLES_RUNTIME_INPUT,
  MANHOLES_RUNTIME_SOURCE_IDS, MANHOLES_SHORT_INPUT, MANHOLES_SOURCE_ID,
  MANHOLES_SOURCE_METADATA, compileManholesR1,
} from "../../../src/lib/estimate/v4/manholesR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileManholesR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "mnh_manhole_count", "mnh_manhole_type", "mnh_manhole_material",
  "mnh_internal_length_mm", "mnh_internal_width_mm", "mnh_depth_m",
  "mnh_concrete_class", "mnh_cover_frame_designation", "mnh_cover_load_class",
  "mnh_connector_diameter_mm", "mnh_manhole_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  mnh_dewatering_mode: "REQUIRED", mnh_dewatering_designation: "Дренажный насос по ППР",
  mnh_dewatering_machine_h: 120, mnh_shoring_mode: "REQUIRED",
  mnh_shoring_designation: "Инвентарное крепление котлованов", mnh_shoring_area_m2: 360,
  mnh_pavement_restoration_mode: "REQUIRED",
  mnh_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
  mnh_pavement_restoration_area_m2: 108,
});

async function verifyCore(): Promise<Json> {
  const first = await compileManholesR1({ ...MANHOLES_SHORT_INPUT });
  const complete = await compileManholesR1({ ...MANHOLES_ACCEPTANCE_INPUT });
  const balanced = await compileManholesR1({ ...MANHOLES_ACCEPTANCE_INPUT,
    mnh_cover_retained_spare_piece: 2, mnh_cover_supplier_package_quantity_piece: 4 });
  const conditional = await compileManholesR1({
    ...MANHOLES_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 31
    && quantity(first, "rc09:mnh_install_acceptance") === "6"
    && quantity(first, "rc09:mnh_cover_frame") === "6")) {
    throw new Error("STOP_S27_24_MANHOLES_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 36 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:mnh_structural_concrete") === "72"
    && quantity(complete, "rc09:mnh_reinforcement") === "8640"
    && quantity(complete, "rc09:mnh_formwork") === "540"
    && quantity(complete, "rc09:mnh_waterstop") === "144"
    && quantity(complete, "rc09:mnh_excavation") === "540"
    && quantity(complete, "rc09:labor:mnh-rebar-formwork") === "720"
    && quantity(complete, "rc09:equipment:mnh-concrete-pump") === "72"
    && quantity(complete, "rc09:logistics:mnh-delivery") === "24")) {
    throw new Error("STOP_S27_24_MANHOLES_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:mnh-cover-balance:installed-net") === "6"
    && quantity(balanced, "rc09:mnh-cover-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:mnh-cover-balance:total-need") === "8"
    && quantity(balanced, "rc09:mnh-cover-balance:package-count") === "2"
    && quantity(balanced, "rc09:mnh_cover_frame") === "8"
    && quantity(balanced, "rc09:mnh-cover-balance:remainder") === "2"
    && quantity(balanced, "rc09:mnh-cover-balance:surplus-beyond-spare") === "0")) {
    throw new Error("STOP_S27_24_MANHOLES_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 39 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_MANHOLES_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:mnh_install_acceptance", "rc09:mnh_test",
    "rc09:mnh_asbuilt_documents"]) {
    const graph = MANHOLES_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_MANHOLES_DOUBLE_COST:${rowId}`);
    }
  }
  if (/\blength_m\b|ceil\(length|golden_rate|normFactor/iu.test(JSON.stringify(MANHOLES_FORMULAS))) {
    throw new Error("STOP_S27_24_MANHOLES_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe|inspection_manhole_pcs|sanitary_sewer_route/iu
    .test(JSON.stringify(MANHOLES_RESOURCES))) {
    throw new Error("STOP_S27_24_MANHOLES_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_MANHOLES_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: MANHOLES_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:mnh-cover-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:mnh-cover-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:mnh-cover-balance:total-need"),
      packageCount: quantity(balanced, "rc09:mnh-cover-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:mnh_cover_frame"),
      remainderPiece: quantity(balanced, "rc09:mnh-cover-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:mnh-cover-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.manholes-balanced-successor.v1",
  stopCode: "S27_24_MANHOLES_BALANCED",
  applicationName: "s27-24-manholes-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "6fa78973-6a63-50eb-b11d-1661d5897452",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "06e06256-d67e-5b51-bf4c-0c44e96095fd",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/manholes-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/manholes-balanced-s27-24.json",
    "src/lib/estimate/v4/manholesR1.ts", "tests/estimateNorms/manholesR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724ManholesBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724ManholesBalancedIndependent.ts",
  ],
  catalogId: MANHOLES_CATALOG_ID, sourceId: MANHOLES_SOURCE_ID, normId: MANHOLES_NORM_ID,
  sourceMetadata: MANHOLES_SOURCE_METADATA, parameterDefinitions: MANHOLES_PARAMETERS,
  formulaDefinitions: MANHOLES_FORMULAS, resourceDefinitions: MANHOLES_RESOURCES,
  shortInput: MANHOLES_SHORT_INPUT, acceptanceInput: MANHOLES_ACCEPTANCE_INPUT,
  runtimeProfileInput: MANHOLES_RUNTIME_INPUT,
  runtimeProfileClassification: MANHOLES_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: MANHOLES_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 43,
  validationScenario: "Q5_MANHOLES_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство и приёмка монолитных канализационных колодцев",
    workKey: "manholes",
    physicalResultRu: "6 колодцев MH-RC-1800x1200-H3.0-C30/37-D400-DN300 построены, испытаны и приняты",
    includedScopeRu: [
      "конструкционный бетон, арматура, опалубка и гидрошпонки по КЖ",
      "люки и рамы, ступени, соединители, уплотнения, лотковая часть, гидроизоляция и основание",
      "котлованы, обратная засыпка, труд, механизмы, QA, документы, логистика и баланс люков",
      "водоотлив, крепление котлованов и восстановление покрытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "трубопроводная сеть и автоматический шаг колодцев",
      "круглые сборные смотровые камеры отдельного owner",
      "неподтверждённые цены и универсальные нормы расхода или производительности",
    ],
  },
  applicability: { country: "KG", operationClass: "CAST_IN_PLACE_RC_MANHOLE_CONSTRUCTION",
    manholeAssembly: "MH_RC_1800X1200_H3_C30_37_D400_DN300_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "mnh_manhole_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleCoverProcurementBalance: true,
    directProjectStructuralMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, routeDerivedQuantitiesForbidden: true,
    precastInspectionChamberOwnerExcluded: true, adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:mnh_install_acceptance", applicability: {
    technology_class: "CAST_IN_PLACE_RC_MANHOLE",
    operation_class: "CAST_IN_PLACE_RC_MANHOLE_CONSTRUCTION",
    manhole_assembly: "MH_RC_1800X1200_H3_C30_37_D400_DN300_EXPLICIT_SCHEDULE",
    scope_mode: "KNOWN_MANHOLE_IDENTITY_PLUS_VISIBLE_COVER_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: MANHOLES_SOURCE_ID, norm_id: MANHOLES_NORM_ID,
    exact_locator: MANHOLES_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_CAST_IN_PLACE_MANHOLE_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "manholes-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: MANHOLES_SOURCE_METADATA.exact_locator,
    sourcePackSha256: MANHOLES_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(MANHOLES_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(MANHOLES_RUNTIME_INPUT),
    directProjectInputs: MANHOLES_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(MANHOLES_SHORT_INPUT, id)
        && !id.startsWith("mnh_dewatering_") && !id.startsWith("mnh_shoring_")
        && !id.startsWith("mnh_pavement_restoration_")),
    conditionalInputs: ["mnh_dewatering_mode", "mnh_dewatering_designation",
      "mnh_dewatering_machine_h", "mnh_shoring_mode", "mnh_shoring_designation",
      "mnh_shoring_area_m2", "mnh_pavement_restoration_mode",
      "mnh_pavement_restoration_designation", "mnh_pavement_restoration_area_m2"] } },
  search: { primaryUom: "pcs", canonicalNameRu: "Строительство канализационных колодцев",
    aliases: ["монолитный канализационный колодец", "прямоугольный колодец C30/37 D400",
      "железобетонный колодец по КЖ", "cast in place sewer manhole"],
    shortScopeRu: "6 прямоугольных монолитных ЖБ колодцев 1800×1200 мм глубиной 3,0 м, бетон C30/37, люки D400 и присоединения DN 300; конструктивные объёмы, труд и механизмы уточняются по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: MANHOLES_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(MANHOLES_SHORT_INPUT, id)),
    includedBoundaries: ["бетон, арматура, опалубка, гидрошпонки, люки, ступени и соединения по проекту",
      "лотковая часть, гидроизоляция, основание, земляные работы, труд, механизмы, QA и логистика",
      "условные водоотлив, крепление и восстановление покрытия только по проекту"],
    excludedBoundaries: ["трубопроводная канализационная сеть и автоматический шаг колодцев",
      "круглые сборные смотровые камеры отдельного owner",
      "неподтверждённые материалы, условные работы и цены"],
    extraSearchTermsRu: "канализационный колодец монолитный прямоугольный железобетон C30/37 D400 DN300 опалубка арматура",
    sourceProvenance: { exactExpandedManholesOwner: true,
      knownSelectedCastInPlaceDimensionsDepthConcreteCoverAndConnectorIdentity: true,
      visibleIndependentCoverKitProcurementBalance: true,
      exactProjectStructuralMaterialEarthworkLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/sewer.pipe|канализац.*труб/iu,
    /inspection.chamber|смотров.*камер/iu, /precast.ring|сборн.*кольц/iu],
  owner: "S27_24_MANHOLES_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_MANHOLES_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
