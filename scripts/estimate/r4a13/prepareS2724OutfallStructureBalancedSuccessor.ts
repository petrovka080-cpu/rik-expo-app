import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  OUTFALL_STRUCTURE_ACCEPTANCE_INPUT, OUTFALL_STRUCTURE_CATALOG_ID,
  OUTFALL_STRUCTURE_FORMULAS, OUTFALL_STRUCTURE_NORM_ID,
  OUTFALL_STRUCTURE_PARAMETERS, OUTFALL_STRUCTURE_RESOURCES,
  OUTFALL_STRUCTURE_RUNTIME_CLASSIFICATION, OUTFALL_STRUCTURE_RUNTIME_INPUT,
  OUTFALL_STRUCTURE_RUNTIME_SOURCE_IDS, OUTFALL_STRUCTURE_SHORT_INPUT,
  OUTFALL_STRUCTURE_SOURCE_ID, OUTFALL_STRUCTURE_SOURCE_METADATA,
  compileOutfallStructureR1,
} from "../../../src/lib/estimate/v4/outfallStructureR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileOutfallStructureR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = ["out_structure_count", "out_structure_type",
  "out_structure_designation", "out_receiving_environment", "out_outlet_pipe_diameter_mm",
  "out_design_discharge_lps", "out_structure_length_m", "out_structure_width_m",
  "out_structure_height_m", "out_concrete_class", "out_watertightness_class",
  "out_frost_resistance_class", "out_structural_concrete_installed_volume_m3"];
const CONDITIONAL_INPUT = Object.freeze({
  out_dewatering_mode: "REQUIRED", out_dewatering_designation: "SUMP-PUMP-80",
  out_dewatering_machine_h: 96,
  out_bank_protection_mode: "REQUIRED", out_bank_protection_designation: "GABION-MAT-300",
  out_bank_protection_area_m2: 180,
  out_live_tie_in_mode: "REQUIRED", out_live_tie_in_designation: "LIVE-TIE-IN-DN600",
  out_live_tie_in_count: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileOutfallStructureR1({ ...OUTFALL_STRUCTURE_SHORT_INPUT });
  const complete = await compileOutfallStructureR1({ ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT });
  const balanced = await compileOutfallStructureR1({ ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT,
    out_concrete_process_allowance_m3: 1.5, out_concrete_supplier_batch_m3: 8 });
  const conditional = await compileOutfallStructureR1({
    ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 28
    && quantity(first, "rc09:out_acceptance") === "1"
    && quantity(first, "rc09:out_structural_concrete") === "28")) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 33 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:out_rebar") === "3800"
    && quantity(complete, "rc09:out_formwork") === "220"
    && quantity(complete, "rc09:out_waterproofing") === "95"
    && quantity(complete, "rc09:out_apron_material") === "65"
    && quantity(complete, "rc09:labor:out-formwork-rebar") === "256"
    && quantity(complete, "rc09:equipment:out-crane") === "72"
    && quantity(complete, "rc09:logistics:out-material-delivery") === "18")) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:out-concrete-balance:installed-net") === "28"
    && quantity(balanced, "rc09:out-concrete-balance:process-allowance") === "1.5"
    && quantity(balanced, "rc09:out-concrete-balance:total-need") === "29.5"
    && quantity(balanced, "rc09:out-concrete-balance:batch-count") === "4"
    && quantity(balanced, "rc09:out_structural_concrete") === "32"
    && quantity(balanced, "rc09:out-concrete-balance:remainder") === "4"
    && quantity(balanced, "rc09:out-concrete-balance:surplus-beyond-allowance") === "2.5")) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:out_acceptance", "rc09:out_concrete_tests",
    "rc09:out_survey_control", "rc09:out_asbuilt_documents"]) {
    const graph = OUTFALL_STRUCTURE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_OUTFALL_STRUCTURE_DOUBLE_COST:${rowId}`);
    }
  }
  if (/structure_count\s*\*|structure_(?:length|width|height)_m\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(OUTFALL_STRUCTURE_FORMULAS))) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu
    .test(JSON.stringify(OUTFALL_STRUCTURE_RESOURCES))) {
    throw new Error("STOP_S27_24_OUTFALL_STRUCTURE_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_OUTFALL_STRUCTURE_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: OUTFALL_STRUCTURE_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM3: quantity(balanced, "rc09:out-concrete-balance:installed-net"),
      processAllowanceM3: quantity(balanced, "rc09:out-concrete-balance:process-allowance"),
      totalNeedM3: quantity(balanced, "rc09:out-concrete-balance:total-need"),
      batchCount: quantity(balanced, "rc09:out-concrete-balance:batch-count"),
      orderedM3: quantity(balanced, "rc09:out_structural_concrete"),
      remainderM3: quantity(balanced, "rc09:out-concrete-balance:remainder"),
      surplusM3: quantity(balanced, "rc09:out-concrete-balance:surplus-beyond-allowance") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.outfall-structure-balanced-successor.v1",
  stopCode: "S27_24_OUTFALL_STRUCTURE_BALANCED",
  applicationName: "s27-24-outfall-structure-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e33057c2-8d52-5038-b31b-6283431df8f4",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "951dfe95-2349-59fe-9b90-540311bb17cb",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/outfall-structure-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/outfall-structure-balanced-s27-24.json",
    "src/lib/estimate/v4/outfallStructureR1.ts",
    "tests/estimateNorms/outfallStructureR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724OutfallStructureBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724OutfallStructureBalancedIndependent.ts"],
  catalogId: OUTFALL_STRUCTURE_CATALOG_ID, sourceId: OUTFALL_STRUCTURE_SOURCE_ID,
  normId: OUTFALL_STRUCTURE_NORM_ID, sourceMetadata: OUTFALL_STRUCTURE_SOURCE_METADATA,
  parameterDefinitions: OUTFALL_STRUCTURE_PARAMETERS,
  formulaDefinitions: OUTFALL_STRUCTURE_FORMULAS,
  resourceDefinitions: OUTFALL_STRUCTURE_RESOURCES,
  shortInput: OUTFALL_STRUCTURE_SHORT_INPUT,
  acceptanceInput: OUTFALL_STRUCTURE_ACCEPTANCE_INPUT,
  runtimeProfileInput: OUTFALL_STRUCTURE_RUNTIME_INPUT,
  runtimeProfileClassification: OUTFALL_STRUCTURE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: OUTFALL_STRUCTURE_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 46,
  validationScenario: "Q5_OUTFALL_STRUCTURE_BALANCED_S27_24",
  passport: { canonicalRuName: "Строительство монолитного железобетонного выпускного сооружения",
    workKey: "outfall_structure",
    physicalResultRu: "Один выпускной оголовок OF-RC-DN600-Q450-C3037 на берегу реки построен для DN 600 и 450 л/с, проконтролирован и принят",
    includedScopeRu: ["монолитная железобетонная конструкция 4,5x3,2x2,4 м из C30/37 W8 F200",
      "арматура, опалубка, закладные, гидроизоляция, швы, выпускной фартук и гасители энергии",
      "котлован, проектная засыпка, вывоз грунта, труд, механизмы, QA, документы, логистика и баланс бетона",
      "водоотлив, укрепление берега и врезка только по условным ветвям"],
    excludedScopeRu: ["подводящий трубопровод, колодцы и испытание сети",
      "невыбранное технологическое оборудование очистки", "автоматические объёмы по количеству или габаритам",
      "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "RC_RIVER_OUTFALL_STRUCTURE",
    outfallAssembly: "OF_RC_DN600_Q450_C3037_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "out_structure_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleStructuralConcreteProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalSiteScopeFailClosed: true, countOrGeometryDerivedQuantitiesForbidden: true,
    upstreamNetworkTestingAndUnselectedTreatmentEquipmentExcluded: true },
  binding: { rowId: "rc09:out_acceptance", applicability: {
    technology_class: "RC_OUTFALL_HEADWALL", operation_class: "RC_RIVER_OUTFALL_STRUCTURE",
    outfall_assembly: "OF_RC_DN600_Q450_C3037_EXPLICIT_PROJECT",
    scope_mode: "KNOWN_OUTFALL_IDENTITY_PLUS_VISIBLE_CONCRETE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: OUTFALL_STRUCTURE_SOURCE_ID, norm_id: OUTFALL_STRUCTURE_NORM_ID,
    exact_locator: OUTFALL_STRUCTURE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_OUTFALL_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "outfall-structure-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: OUTFALL_STRUCTURE_SOURCE_METADATA.exact_locator,
    sourcePackSha256: OUTFALL_STRUCTURE_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(OUTFALL_STRUCTURE_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(OUTFALL_STRUCTURE_RUNTIME_INPUT),
    directProjectInputs: OUTFALL_STRUCTURE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(OUTFALL_STRUCTURE_SHORT_INPUT, id)
        && !id.startsWith("out_dewatering_") && !id.startsWith("out_bank_protection_")
        && !id.startsWith("out_live_tie_in_")),
    conditionalInputs: ["out_dewatering_mode", "out_dewatering_designation",
      "out_dewatering_machine_h", "out_bank_protection_mode", "out_bank_protection_designation",
      "out_bank_protection_area_m2", "out_live_tie_in_mode", "out_live_tie_in_designation",
      "out_live_tie_in_count"] } },
  search: { primaryUom: "piece", canonicalNameRu: "Строительство выпускного сооружения",
    aliases: ["монолитный железобетонный выпускной оголовок", "речной выпуск DN600",
      "водовыпуск с гасителем энергии", "reinforced concrete river outfall headwall"],
    shortScopeRu: "Один монолитный ж/б оголовок OF-RC-DN600-Q450-C3037 на берегу реки: DN 600, 450 л/с, 4,5x3,2x2,4 м, C30/37 W8 F200 и 28 м3 бетона; ресурсы по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: OUTFALL_STRUCTURE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(OUTFALL_STRUCTURE_SHORT_INPUT, id)),
    includedBoundaries: ["железобетон, армирование, опалубка, закладные, гидроизоляция, швы, фартук и гасители",
      "земляные работы, труд, механизмы, контроль, документы, логистика и баланс бетона",
      "условные водоотлив, укрепление берега и врезка только по проекту"],
    excludedBoundaries: ["подводящий трубопровод, колодцы и испытание сети",
      "невыбранное оборудование очистки", "автоматические объёмы по количеству или габаритам",
      "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "выпускное сооружение оголовок водовыпуск берег реки DN600 гаситель энергии монолитный железобетон",
    sourceProvenance: { exactExpandedOutfallStructureOwner: true,
      knownSelectedOutfallIdentityGeometryHydraulicAndConcreteScope: true,
      visibleIndependentStructuralConcreteProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/sewer.pipe|канализац.*труб/iu,
    /inspection.manhole|смотров.*колод/iu, /hydraulic.test|гидравлическ.*испыт/iu],
  owner: "S27_24_OUTFALL_STRUCTURE_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_OUTFALL_STRUCTURE_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
