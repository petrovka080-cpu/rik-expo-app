import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  AERATION_TANKS_ACCEPTANCE_INPUT, AERATION_TANKS_CATALOG_ID,
  AERATION_TANKS_FORMULAS, AERATION_TANKS_NORM_ID, AERATION_TANKS_PARAMETERS,
  AERATION_TANKS_RESOURCES, AERATION_TANKS_RUNTIME_CLASSIFICATION,
  AERATION_TANKS_RUNTIME_INPUT, AERATION_TANKS_RUNTIME_SOURCE_IDS,
  AERATION_TANKS_SHORT_INPUT, AERATION_TANKS_SOURCE_ID, AERATION_TANKS_SOURCE_METADATA,
  compileAerationTanksR1,
} from "../../../src/lib/estimate/v4/aerationTanksR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileAerationTanksR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "aer_tank_count", "aer_tank_designation", "aer_tank_type", "aer_process_duty",
  "aer_process_train_count", "aer_tank_length_m", "aer_tank_width_m",
  "aer_operating_water_depth_m", "aer_design_air_flow_nm3_h",
  "aer_diffuser_installed_piece", "aer_diffuser_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  aer_blower_mode: "INCLUDED", aer_blower_designation: "BLOWER-75KW-VFD",
  aer_blower_quantity_piece: 3,
  aer_mixer_mode: "INCLUDED", aer_mixer_designation: "MIXER-7.5KW",
  aer_mixer_quantity_piece: 4,
  aer_recycle_pump_mode: "INCLUDED", aer_recycle_pump_designation: "RECYCLE-Q80-H8",
  aer_recycle_pump_quantity_piece: 3,
  aer_draining_bypass_mode: "REQUIRED", aer_draining_bypass_designation: "BYPASS-Q100",
  aer_draining_bypass_machine_h: 96,
  aer_odor_control_mode: "REQUIRED", aer_odor_control_designation: "BIOFILTER-8000M3H",
  aer_odor_control_quantity_set: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileAerationTanksR1({ ...AERATION_TANKS_SHORT_INPUT });
  const complete = await compileAerationTanksR1({ ...AERATION_TANKS_ACCEPTANCE_INPUT });
  const balanced = await compileAerationTanksR1({ ...AERATION_TANKS_ACCEPTANCE_INPUT,
    aer_diffuser_retained_spare_piece: 10, aer_diffuser_supplier_package_quantity_piece: 20 });
  const conditional = await compileAerationTanksR1({
    ...AERATION_TANKS_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 31
    && quantity(first, "rc09:aer_acceptance") === "2"
    && quantity(first, "rc09:aer_diffusers") === "240")) {
    throw new Error("STOP_S27_24_AERATION_TANKS_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 34 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:aer_structural_concrete") === "980"
    && quantity(complete, "rc09:aer_air_headers") === "520"
    && quantity(complete, "rc09:aer_header_supports") === "180"
    && quantity(complete, "rc09:aer_internal_cable") === "460"
    && quantity(complete, "rc09:labor:aer-diffuser-grid") === "1280"
    && quantity(complete, "rc09:equipment:aer-crane") === "180"
    && quantity(complete, "rc09:logistics:aer-material-delivery") === "72")) {
    throw new Error("STOP_S27_24_AERATION_TANKS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:aer-diffuser-balance:installed-net") === "240"
    && quantity(balanced, "rc09:aer-diffuser-balance:retained-spare") === "10"
    && quantity(balanced, "rc09:aer-diffuser-balance:total-need") === "250"
    && quantity(balanced, "rc09:aer-diffuser-balance:package-count") === "13"
    && quantity(balanced, "rc09:aer_diffusers") === "260"
    && quantity(balanced, "rc09:aer-diffuser-balance:remainder") === "20"
    && quantity(balanced, "rc09:aer-diffuser-balance:surplus-beyond-spare") === "10")) {
    throw new Error("STOP_S27_24_AERATION_TANKS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 39 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_AERATION_TANKS_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:aer_acceptance", "rc09:aer_leak_tests",
    "rc09:aer_air_distribution_tests", "rc09:aer_asbuilt_documents"]) {
    const graph = AERATION_TANKS_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_AERATION_TANKS_DOUBLE_COST:${rowId}`);
    }
  }
  if (/tank_(?:length|width)\w*\s*\*|process_train_count\s*\*|design_air_flow\w*\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(AERATION_TANKS_FORMULAS))) {
    throw new Error("STOP_S27_24_AERATION_TANKS_LEGACY_COEFFICIENT");
  }
  if (/wtp_membrane|wtp_uv|sludge_dewatering|sewer_pipe_lm|rc09:wtp_/iu
    .test(JSON.stringify(AERATION_TANKS_RESOURCES))) {
    throw new Error("STOP_S27_24_AERATION_TANKS_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_AERATION_TANKS_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: AERATION_TANKS_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:aer-diffuser-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:aer-diffuser-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:aer-diffuser-balance:total-need"),
      packageCount: quantity(balanced, "rc09:aer-diffuser-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:aer_diffusers"),
      remainderPiece: quantity(balanced, "rc09:aer-diffuser-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:aer-diffuser-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.aeration-tanks-balanced-successor.v1",
  stopCode: "S27_24_AERATION_TANKS_BALANCED",
  applicationName: "s27-24-aeration-tanks-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f3ac1eab-57b7-5522-9c28-2e12329c72af",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "4d03a20b-eb3d-58d1-9856-863231e3bba0",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/aeration-tanks-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/aeration-tanks-fine-bubble-balanced-s27-24.json",
    "src/lib/estimate/v4/aerationTanksR1.ts",
    "tests/estimateNorms/aerationTanksR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724AerationTanksBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724AerationTanksBalancedIndependent.ts"],
  catalogId: AERATION_TANKS_CATALOG_ID, sourceId: AERATION_TANKS_SOURCE_ID,
  normId: AERATION_TANKS_NORM_ID, sourceMetadata: AERATION_TANKS_SOURCE_METADATA,
  parameterDefinitions: AERATION_TANKS_PARAMETERS,
  formulaDefinitions: AERATION_TANKS_FORMULAS, resourceDefinitions: AERATION_TANKS_RESOURCES,
  shortInput: AERATION_TANKS_SHORT_INPUT, acceptanceInput: AERATION_TANKS_ACCEPTANCE_INPUT,
  runtimeProfileInput: AERATION_TANKS_RUNTIME_INPUT,
  runtimeProfileClassification: AERATION_TANKS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: AERATION_TANKS_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [4, 45, 45], benchmarkOrdinal: 49,
  validationScenario: "Q5_AERATION_TANKS_BALANCED_S27_24",
  passport: { canonicalRuName: "Строительство аэротенков с мелкопузырчатой аэрацией",
    workKey: "aeration_tanks",
    physicalResultRu: "Два монолитных аэротенка AT-RC-2X30X8X5-FB с 240 диффузорами EPDM-FB-9IN построены, смонтированы и испытаны",
    includedScopeRu: ["два монолитных прямоугольных бассейна 30x8 м с рабочей глубиной 5 м",
      "аэрационная решётка, воздушные коллекторы и опоры, КИП, внутренний кабель и доступ",
      "строительные материалы, расходники, труд, механизмы, QA, логистика и баланс диффузоров",
      "воздуходувки, мешалки, насосы рецикла, дренирование или байпас и удаление запахов только по условным ветвям"],
    excludedScopeRu: ["полные очистные сооружения, входные сооружения, MBR и УФ",
      "обезвоживание осадка и наружные сети",
      "автоматические объёмы по размерам, линиям или расходу воздуха", "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "CAST_IN_PLACE_RC_FINE_BUBBLE_AERATION_TANKS",
    tankAssembly: "AT_RC_2X30X8X5_FB_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "aer_tank_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleDiffuserProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalAdjacentEquipmentFailClosed: true,
    dimensionTrainOrAirFlowDerivedQuantitiesForbidden: true,
    completeTreatmentPlantSludgeAndExternalNetworksExcluded: true },
  binding: { rowId: "rc09:aer_acceptance", applicability: {
    technology_class: "FINE_BUBBLE_ACTIVATED_SLUDGE_AERATION_TANK",
    operation_class: "CAST_IN_PLACE_RC_FINE_BUBBLE_AERATION_TANKS",
    tank_assembly: "AT_RC_2X30X8X5_FB_EXPLICIT_PROJECT",
    scope_mode: "KNOWN_TANK_IDENTITY_PLUS_VISIBLE_DIFFUSER_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: AERATION_TANKS_SOURCE_ID, norm_id: AERATION_TANKS_NORM_ID,
    exact_locator: AERATION_TANKS_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_TANK_IDENTITY_PLUS_APPROVED_PROJECT_AND_MANUFACTURER_PACKAGE" } },
  locator: { key: "aeration-tanks-fine-bubble-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: AERATION_TANKS_SOURCE_METADATA.exact_locator,
    sourcePackSha256: AERATION_TANKS_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(AERATION_TANKS_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(AERATION_TANKS_RUNTIME_INPUT),
    directProjectInputs: AERATION_TANKS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(AERATION_TANKS_SHORT_INPUT, id)
        && !["blower", "mixer", "recycle_pump", "draining_bypass", "odor_control"]
          .some((branch) => id.startsWith(`aer_${branch}_`))),
    conditionalInputs: Object.keys(CONDITIONAL_INPUT) } },
  search: { primaryUom: "piece",
    canonicalNameRu: "Строительство аэротенков с мелкопузырчатой аэрацией",
    aliases: ["монолитные железобетонные аэротенки", "аэротенки с дисковыми диффузорами",
      "fine bubble activated sludge aeration tanks"],
    shortScopeRu: "Два монолитных аэротенка AT-RC-2X30X8X5-FB 30x8x5 м, две линии, 9000 Нм3/ч и 240 диффузоров EPDM-FB-9IN; ресурсы по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: AERATION_TANKS_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(AERATION_TANKS_SHORT_INPUT, id)),
    includedBoundaries: ["монолитные бассейны, гидроизоляция, аэрационная решётка, коллекторы и опоры",
      "КИП, кабель, доступ, расходники, труд, механизмы, испытания, логистика и баланс диффузоров",
      "условные воздуходувки, мешалки, насосы рецикла, дренирование или байпас и удаление запахов"],
    excludedBoundaries: ["полные КОС, входные сооружения, MBR, УФ и обезвоживание осадка",
      "наружные сети и автоматические объёмы по геометрии или расходу воздуха",
      "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "аэротенк активный ил мелкопузырчатая аэрация диффузор EPDM воздушный коллектор",
    sourceProvenance: { exactExpandedAerationTanksOwner: true,
      knownSelectedTankGeometryProcessDutyAirFlowAndDiffuserIdentity: true,
      visibleIndependentDiffuserProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/wastewater.treatment.plant|полные.*очистн.*сооруж/iu,
    /membrane|MBR|мембран/iu, /sludge.dewatering|обезвожив.*осад/iu,
    /sewer.pipe|канализац.*труб/iu],
  owner: "S27_24_AERATION_TANKS_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_AERATION_TANKS_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
