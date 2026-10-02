import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { SLUDGE_DEWATERING_ACCEPTANCE_INPUT, SLUDGE_DEWATERING_CATALOG_ID,
  SLUDGE_DEWATERING_FORMULAS, SLUDGE_DEWATERING_NORM_ID, SLUDGE_DEWATERING_PARAMETERS,
  SLUDGE_DEWATERING_RESOURCES, SLUDGE_DEWATERING_RUNTIME_CLASSIFICATION,
  SLUDGE_DEWATERING_RUNTIME_INPUT, SLUDGE_DEWATERING_RUNTIME_SOURCE_IDS,
  SLUDGE_DEWATERING_SHORT_INPUT, SLUDGE_DEWATERING_SOURCE_ID,
  SLUDGE_DEWATERING_SOURCE_METADATA, compileSludgeDewateringR1,
} from "../../../src/lib/estimate/v4/sludgeDewateringR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileSludgeDewateringR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = ["sdw_system_count", "sdw_system_designation",
  "sdw_dewatering_technology", "sdw_sludge_feed_flow_m3_h", "sdw_inlet_dry_solids_percent",
  "sdw_cake_dry_solids_percent", "sdw_operating_hours_day",
  "sdw_press_unit_installed_piece", "sdw_press_unit_designation"];
const CONDITIONAL_INPUT = Object.freeze({
  sdw_odor_control_mode: "REQUIRED", sdw_odor_control_designation: "CARBON-FILTER-5000",
  sdw_odor_control_quantity_set: 1,
  sdw_cake_storage_mode: "INCLUDED", sdw_cake_storage_designation: "CAKE-BIN-20M3",
  sdw_cake_storage_quantity_set: 2,
  sdw_standby_power_mode: "REQUIRED", sdw_standby_power_designation: "GENSET-250KVA",
  sdw_standby_power_quantity_set: 1,
});
async function verifyCore(): Promise<Json> {
  const first = await compileSludgeDewateringR1({ ...SLUDGE_DEWATERING_SHORT_INPUT });
  const complete = await compileSludgeDewateringR1({ ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT });
  const balanced = await compileSludgeDewateringR1({ ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT,
    sdw_press_unit_retained_spare_piece: 1, sdw_press_unit_supplier_package_quantity_piece: 2 });
  const conditional = await compileSludgeDewateringR1({
    ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 33
    && quantity(first, "rc09:sdw_acceptance") === "1"
    && quantity(first, "rc09:sdw_press_units") === "2")) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 38 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:sdw_feed_pumps") === "3"
    && quantity(complete, "rc09:sdw_process_piping") === "190"
    && quantity(complete, "rc09:sdw_base_concrete") === "18"
    && quantity(complete, "rc09:sdw_commissioning_polymer") === "280"
    && quantity(complete, "rc09:labor:sdw-mechanical-installation") === "420"
    && quantity(complete, "rc09:equipment:sdw-crane") === "56"
    && quantity(complete, "rc09:logistics:sdw-material-delivery") === "28")) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:sdw-press-balance:installed-net") === "2"
    && quantity(balanced, "rc09:sdw-press-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:sdw-press-balance:total-need") === "3"
    && quantity(balanced, "rc09:sdw-press-balance:package-count") === "2"
    && quantity(balanced, "rc09:sdw_press_units") === "4"
    && quantity(balanced, "rc09:sdw-press-balance:remainder") === "2"
    && quantity(balanced, "rc09:sdw-press-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 41 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:sdw_acceptance", "rc09:sdw_cake_samples",
    "rc09:sdw_functional_tests", "rc09:sdw_asbuilt_documents"]) {
    const graph = SLUDGE_DEWATERING_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SLUDGE_DEWATERING_DOUBLE_COST:${rowId}`);
    }
  }
  if (/sludge_feed_flow\w*\s*\*|dry_solids\w*\s*\*|operating_hours\w*\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(SLUDGE_DEWATERING_FORMULAS))) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_LEGACY_COEFFICIENT");
  }
  if (/wtp_membrane|aer_diffuser|sludge_digestion|drying_bed|incineration/iu
    .test(JSON.stringify(SLUDGE_DEWATERING_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_SLUDGE_DEWATERING_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_SLUDGE_DEWATERING_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: SLUDGE_DEWATERING_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:sdw-press-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:sdw-press-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:sdw-press-balance:total-need"),
      packageCount: quantity(balanced, "rc09:sdw-press-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:sdw_press_units"),
      remainderPiece: quantity(balanced, "rc09:sdw-press-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:sdw-press-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.sludge-dewatering-balanced-successor.v1",
  stopCode: "S27_24_SLUDGE_DEWATERING_BALANCED",
  applicationName: "s27-24-sludge-dewatering-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "36bd15e9-db12-5688-975b-d386d022877b",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "6661d192-995a-5cf5-97c5-6218b62b7624",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/sludge-dewatering-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/sludge-dewatering-screw-press-balanced-s27-24.json",
    "src/lib/estimate/v4/sludgeDewateringR1.ts",
    "tests/estimateNorms/sludgeDewateringR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724SludgeDewateringBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724SludgeDewateringBalancedIndependent.ts"],
  catalogId: SLUDGE_DEWATERING_CATALOG_ID, sourceId: SLUDGE_DEWATERING_SOURCE_ID,
  normId: SLUDGE_DEWATERING_NORM_ID, sourceMetadata: SLUDGE_DEWATERING_SOURCE_METADATA,
  parameterDefinitions: SLUDGE_DEWATERING_PARAMETERS,
  formulaDefinitions: SLUDGE_DEWATERING_FORMULAS, resourceDefinitions: SLUDGE_DEWATERING_RESOURCES,
  shortInput: SLUDGE_DEWATERING_SHORT_INPUT, acceptanceInput: SLUDGE_DEWATERING_ACCEPTANCE_INPUT,
  runtimeProfileInput: SLUDGE_DEWATERING_RUNTIME_INPUT,
  runtimeProfileClassification: SLUDGE_DEWATERING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SLUDGE_DEWATERING_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [4, 45, 45], benchmarkOrdinal: 50,
  validationScenario: "Q5_SLUDGE_DEWATERING_BALANCED_S27_24",
  passport: { canonicalRuName: "Монтаж комплекса шнекового обезвоживания осадка",
    workKey: "sludge_dewatering",
    physicalResultRu: "Один комплекс SD-MDSP-2X10-D20 с двумя прессами MDSP-10M3H смонтирован, запущен и принят",
    includedScopeRu: ["два мультидисковых шнековых пресса, насосы подачи, полимерная станция и флокуляция",
      "транспортёры кека, фильтрат, внутренние трубопроводы, арматура, КИП, шкаф управления и площадки",
      "основания, раствор, пусконаладочные расходники, труд, механизмы, QA, логистика и баланс прессов",
      "удаление запахов, накопление кека и резервное питание только по условным ветвям"],
    excludedScopeRu: ["полные КОС, аэротенки и сбраживание осадка",
      "иловые площадки, сжигание и наружные сети",
      "автоматические объёмы по расходу, сухому веществу или времени работы", "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "MULTI_DISC_SCREW_PRESS_SLUDGE_DEWATERING",
    packageAssembly: "SD_MDSP_2X10_D20_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "sdw_system_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visiblePressUnitProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalAdjacentScopeFailClosed: true,
    flowSolidsOrHoursDerivedQuantitiesForbidden: true,
    completePlantAerationDigestionDryingIncinerationAndNetworksExcluded: true },
  binding: { rowId: "rc09:sdw_acceptance", applicability: {
    technology_class: "MULTI_DISC_SCREW_PRESS", operation_class: "SLUDGE_DEWATERING_PACKAGE",
    package_assembly: "SD_MDSP_2X10_D20_EXPLICIT_PROJECT",
    scope_mode: "KNOWN_PACKAGE_IDENTITY_PLUS_VISIBLE_PRESS_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: SLUDGE_DEWATERING_SOURCE_ID, norm_id: SLUDGE_DEWATERING_NORM_ID,
    exact_locator: SLUDGE_DEWATERING_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_PACKAGE_IDENTITY_PLUS_APPROVED_PROJECT_AND_MANUFACTURER_PACKAGE" } },
  locator: { key: "sludge-dewatering-screw-press-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: SLUDGE_DEWATERING_SOURCE_METADATA.exact_locator,
    sourcePackSha256: SLUDGE_DEWATERING_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(SLUDGE_DEWATERING_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(SLUDGE_DEWATERING_RUNTIME_INPUT),
    directProjectInputs: SLUDGE_DEWATERING_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SLUDGE_DEWATERING_SHORT_INPUT, id)
        && !["odor_control", "cake_storage", "standby_power"]
          .some((branch) => id.startsWith(`sdw_${branch}_`))),
    conditionalInputs: Object.keys(CONDITIONAL_INPUT) } },
  search: { primaryUom: "piece",
    canonicalNameRu: "Монтаж комплекса шнекового обезвоживания осадка",
    aliases: ["обезвоживание осадка на мультидисковом шнековом прессе",
      "комплекс MDSP с полимерной станцией", "multi-disc screw press sludge dewatering package"],
    shortScopeRu: "Один комплекс SD-MDSP-2X10-D20: 10 м3/ч, 2% вход, 20% кек, 8 ч/сут и два пресса MDSP-10M3H; ресурсы по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: SLUDGE_DEWATERING_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SLUDGE_DEWATERING_SHORT_INPUT, id)),
    includedBoundaries: ["прессы, подача осадка, полимер, флокуляция, транспорт кека и фильтрат",
      "трубопроводы, арматура, КИП, управление, площадки, основания, расходники, труд, механизмы, QA и логистика",
      "условные удаление запахов, накопление кека и резервное питание"],
    excludedBoundaries: ["полные КОС, аэротенки, сбраживание, иловые площадки и сжигание",
      "наружные сети и автоматические объёмы по расходу или сухому веществу",
      "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "обезвоживание осадка шнековый пресс мультидисковый полимер флокуляция кек фильтрат",
    sourceProvenance: { exactExpandedSludgeDewateringOwner: true,
      knownSelectedTechnologyFlowSolidsHoursAndPressIdentity: true,
      visibleIndependentPressUnitProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/wastewater.treatment.plant|полные.*очистн.*сооруж/iu,
    /aeration.tank|аэротенк/iu, /digestion|сбражив/iu, /drying.bed|илов.*площад/iu,
    /incineration|сжиган/iu, /sewer.pipe|канализац.*труб/iu],
  owner: "S27_24_SLUDGE_DEWATERING_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SLUDGE_DEWATERING_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
