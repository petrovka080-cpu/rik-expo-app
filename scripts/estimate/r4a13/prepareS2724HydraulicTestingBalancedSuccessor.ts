import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  HYDRAULIC_TESTING_ACCEPTANCE_INPUT, HYDRAULIC_TESTING_CATALOG_ID,
  HYDRAULIC_TESTING_FORMULAS, HYDRAULIC_TESTING_NORM_ID,
  HYDRAULIC_TESTING_PARAMETERS, HYDRAULIC_TESTING_RESOURCES,
  HYDRAULIC_TESTING_RUNTIME_CLASSIFICATION, HYDRAULIC_TESTING_RUNTIME_INPUT,
  HYDRAULIC_TESTING_RUNTIME_SOURCE_IDS, HYDRAULIC_TESTING_SHORT_INPUT,
  HYDRAULIC_TESTING_SOURCE_ID, HYDRAULIC_TESTING_SOURCE_METADATA,
  compileHydraulicTestingR1,
} from "../../../src/lib/estimate/v4/hydraulicTestingR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileHydraulicTestingR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = ["hyd_tested_length_m", "hyd_pipe_material", "hyd_pipe_sdr",
  "hyd_pipe_outside_diameter_mm", "hyd_pressure_class", "hyd_test_section_count",
  "hyd_temporary_closure_installed_piece", "hyd_closure_designation",
  "hyd_test_pressure_mpa", "hyd_hold_duration_min", "hyd_procedure_designation"];
const CONDITIONAL_INPUT = Object.freeze({
  hyd_imported_water_mode: "REQUIRED", hyd_imported_water_designation: "TANKER-POTABLE",
  hyd_imported_water_volume_m3: 75,
  hyd_water_treatment_mode: "REQUIRED", hyd_water_treatment_designation: "NEUTRALIZATION-PACK",
  hyd_water_treatment_volume_m3: 75,
  hyd_offsite_disposal_mode: "REQUIRED", hyd_offsite_disposal_designation: "LICENSED-WATER-FACILITY",
  hyd_offsite_disposal_volume_m3: 75,
});

async function verifyCore(): Promise<Json> {
  const first = await compileHydraulicTestingR1({ ...HYDRAULIC_TESTING_SHORT_INPUT });
  const complete = await compileHydraulicTestingR1({ ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT });
  const balanced = await compileHydraulicTestingR1({ ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT,
    hyd_closure_retained_spare_piece: 2, hyd_closure_supplier_package_quantity_piece: 4 });
  const conditional = await compileHydraulicTestingR1({
    ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 23
    && quantity(first, "rc09:hyd_acceptance") === "1200"
    && quantity(first, "rc09:hyd_closures") === "8")) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 28 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:hyd_pressure_gauges") === "8"
    && quantity(complete, "rc09:hyd_recorder") === "4"
    && quantity(complete, "rc09:hyd_hose_manifold") === "4"
    && quantity(complete, "rc09:hyd_fill_water") === "75"
    && quantity(complete, "rc09:labor:hyd-filling-pressurizing") === "120"
    && quantity(complete, "rc09:equipment:hyd-pressure-test-pump") === "80"
    && quantity(complete, "rc09:logistics:hyd-water") === "8")) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:hyd-closure-balance:installed-net") === "8"
    && quantity(balanced, "rc09:hyd-closure-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:hyd-closure-balance:total-need") === "10"
    && quantity(balanced, "rc09:hyd-closure-balance:package-count") === "3"
    && quantity(balanced, "rc09:hyd_closures") === "12"
    && quantity(balanced, "rc09:hyd-closure-balance:remainder") === "4"
    && quantity(balanced, "rc09:hyd-closure-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 31 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:hyd_acceptance", "rc09:hyd_leak_checks",
    "rc09:hyd_pressure_records", "rc09:hyd_acceptance_documents"]) {
    const graph = HYDRAULIC_TESTING_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_HYDRAULIC_TESTING_DOUBLE_COST:${rowId}`);
    }
  }
  if (/tested_length_m\s*\*|route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu
    .test(JSON.stringify(HYDRAULIC_TESTING_FORMULAS))) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe_lm|inspection_manhole|rc09:pbb_|rc09:mnh_/iu
    .test(JSON.stringify(HYDRAULIC_TESTING_RESOURCES))) {
    throw new Error("STOP_S27_24_HYDRAULIC_TESTING_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_HYDRAULIC_TESTING_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: HYDRAULIC_TESTING_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:hyd-closure-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:hyd-closure-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:hyd-closure-balance:total-need"),
      packageCount: quantity(balanced, "rc09:hyd-closure-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:hyd_closures"),
      remainderPiece: quantity(balanced, "rc09:hyd-closure-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:hyd-closure-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.hydraulic-testing-balanced-successor.v1",
  stopCode: "S27_24_HYDRAULIC_TESTING_BALANCED",
  applicationName: "s27-24-hydraulic-testing-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e46e2781-7273-57cc-ae8e-434126787af9",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "616e61d7-7fca-555f-b673-9ead4cd90930",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/hydraulic-testing-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/hydraulic-testing-balanced-s27-24.json",
    "src/lib/estimate/v4/hydraulicTestingR1.ts",
    "tests/estimateNorms/hydraulicTestingR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724HydraulicTestingBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724HydraulicTestingBalancedIndependent.ts"],
  catalogId: HYDRAULIC_TESTING_CATALOG_ID, sourceId: HYDRAULIC_TESTING_SOURCE_ID,
  normId: HYDRAULIC_TESTING_NORM_ID, sourceMetadata: HYDRAULIC_TESTING_SOURCE_METADATA,
  parameterDefinitions: HYDRAULIC_TESTING_PARAMETERS,
  formulaDefinitions: HYDRAULIC_TESTING_FORMULAS,
  resourceDefinitions: HYDRAULIC_TESTING_RESOURCES,
  shortInput: HYDRAULIC_TESTING_SHORT_INPUT,
  acceptanceInput: HYDRAULIC_TESTING_ACCEPTANCE_INPUT,
  runtimeProfileInput: HYDRAULIC_TESTING_RUNTIME_INPUT,
  runtimeProfileClassification: HYDRAULIC_TESTING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: HYDRAULIC_TESTING_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 45,
  validationScenario: "Q5_HYDRAULIC_TESTING_BALANCED_S27_24",
  passport: { canonicalRuName: "Гидравлическое испытание трубопровода на давление и герметичность",
    workKey: "hydraulic_testing",
    physicalResultRu: "1200 м трубопровода PE100 SDR17 OD 250 PN10 по четырём изолированным участкам испытаны при 1,0 МПа с выдержкой 120 мин и оформлены",
    includedScopeRu: ["изоляция четырёх участков и восемь временных заглушек PE250-PN10-TEST-CAP",
      "поверенные манометры, регистраторы, рукава, коллекторы, заполнение и контролируемый сброс воды",
      "проверки герметичности, записи давления, акты, труд, механизмы, QA, логистика и баланс заглушек",
      "привозная вода, обработка и вывоз воды только по условным ветвям"],
    excludedScopeRu: ["поставка и укладка трубы, траншея, постель, засыпка и колодцы",
      "пусконаладка за пределами выбранного испытания", "автоматические объёмы по длине или диаметру",
      "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "PIPELINE_HYDRAULIC_PRESSURE_LEAK_TEST",
    testProcedure: "HT_PE250_PN10_4S_1_0MPA_120MIN_EXPLICIT",
    primaryMeasureParameterId: "hyd_tested_length_m", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleTemporaryClosureProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalWaterScopeFailClosed: true, testedLengthDerivedQuantitiesForbidden: true,
    pipeTrenchBeddingBackfillManholesAndLaterCommissioningExcluded: true },
  binding: { rowId: "rc09:hyd_acceptance", applicability: {
    technology_class: "PIPELINE_PRESSURE_TEST", operation_class: "HYDRAULIC_PRESSURE_LEAK_TEST",
    test_procedure: "HT_PE250_PN10_4S_1_0MPA_120MIN_EXPLICIT",
    scope_mode: "KNOWN_TEST_IDENTITY_PLUS_VISIBLE_CLOSURE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: HYDRAULIC_TESTING_SOURCE_ID, norm_id: HYDRAULIC_TESTING_NORM_ID,
    exact_locator: HYDRAULIC_TESTING_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_TEST_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "hydraulic-testing-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: HYDRAULIC_TESTING_SOURCE_METADATA.exact_locator,
    sourcePackSha256: HYDRAULIC_TESTING_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(HYDRAULIC_TESTING_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(HYDRAULIC_TESTING_RUNTIME_INPUT),
    directProjectInputs: HYDRAULIC_TESTING_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(HYDRAULIC_TESTING_SHORT_INPUT, id)
        && !id.startsWith("hyd_imported_water_")
        && !id.startsWith("hyd_water_treatment_") && !id.startsWith("hyd_offsite_disposal_")),
    conditionalInputs: ["hyd_imported_water_mode", "hyd_imported_water_designation",
      "hyd_imported_water_volume_m3", "hyd_water_treatment_mode",
      "hyd_water_treatment_designation", "hyd_water_treatment_volume_m3",
      "hyd_offsite_disposal_mode", "hyd_offsite_disposal_designation",
      "hyd_offsite_disposal_volume_m3"] } },
  search: { primaryUom: "m", canonicalNameRu: "Гидравлическое испытание трубопровода",
    aliases: ["опрессовка напорного трубопровода", "испытание трубопровода на герметичность",
      "гидроиспытание PE100 OD250 PN10", "pipeline hydraulic pressure test"],
    shortScopeRu: "Гидравлическое испытание 1200 м PE100 SDR17 OD 250 PN10: 4 участка, 8 временных заглушек, 1,0 МПа, выдержка 120 мин; ресурсы по утверждённой программе.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: HYDRAULIC_TESTING_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(HYDRAULIC_TESTING_SHORT_INPUT, id)),
    includedBoundaries: ["изоляция участков, временные заглушки, манометры, регистраторы, рукава и коллектор",
      "вода, контролируемый сброс, проверки, записи, акты, труд, механизмы, QA, логистика и баланс заглушек",
      "условные привозная вода, обработка и вывоз только по проекту"],
    excludedBoundaries: ["труба, траншея, постель, засыпка и колодцы",
      "пусконаладка за пределами испытания", "автоматические объёмы по длине или диаметру",
      "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "гидравлическое испытание опрессовка герметичность давление PE100 SDR17 OD250 PN10 манометр регистратор",
    sourceProvenance: { exactExpandedHydraulicTestingOwner: true,
      knownSelectedTestIdentitySectionsPressureAndHoldDuration: true,
      visibleIndependentTemporaryClosureProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/sewer.pipe|канализац.*труб/iu,
    /inspection.manhole|смотров.*колод/iu, /pipe.bedding|постел.*обсып|обратн.*засып/iu],
  owner: "S27_24_HYDRAULIC_TESTING_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_HYDRAULIC_TESTING_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
