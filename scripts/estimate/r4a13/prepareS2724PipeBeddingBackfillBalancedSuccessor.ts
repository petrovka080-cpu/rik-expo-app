import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT, PIPE_BEDDING_BACKFILL_CATALOG_ID,
  PIPE_BEDDING_BACKFILL_FORMULAS, PIPE_BEDDING_BACKFILL_NORM_ID,
  PIPE_BEDDING_BACKFILL_PARAMETERS, PIPE_BEDDING_BACKFILL_RESOURCES,
  PIPE_BEDDING_BACKFILL_RUNTIME_CLASSIFICATION, PIPE_BEDDING_BACKFILL_RUNTIME_INPUT,
  PIPE_BEDDING_BACKFILL_RUNTIME_SOURCE_IDS, PIPE_BEDDING_BACKFILL_SHORT_INPUT,
  PIPE_BEDDING_BACKFILL_SOURCE_ID, PIPE_BEDDING_BACKFILL_SOURCE_METADATA,
  compilePipeBeddingBackfillR1,
} from "../../../src/lib/estimate/v4/pipeBeddingBackfillR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compilePipeBeddingBackfillR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = ["pbb_route_length_m", "pbb_pipe_outside_diameter_mm",
  "pbb_assembly_designation", "pbb_geotextile_designation", "pbb_bedding_material",
  "pbb_bedding_thickness_mm", "pbb_surround_cover_above_pipe_mm", "pbb_backfill_material",
  "pbb_compaction_coefficient", "pbb_bedding_surround_installed_volume_m3"];
const CONDITIONAL_INPUT = Object.freeze({
  pbb_unsuitable_soil_replacement_mode: "REQUIRED",
  pbb_unsuitable_soil_replacement_designation: "Щебень 20-40 по геологии",
  pbb_unsuitable_soil_replacement_volume_m3: 140,
  pbb_dewatering_mode: "REQUIRED", pbb_dewatering_designation: "Дренажный насос по ППР",
  pbb_dewatering_machine_h: 96, pbb_shoring_mode: "REQUIRED",
  pbb_shoring_designation: "Инвентарное крепление траншеи", pbb_shoring_area_m2: 2100,
});
async function verifyCore(): Promise<Json> {
  const first = await compilePipeBeddingBackfillR1({ ...PIPE_BEDDING_BACKFILL_SHORT_INPUT });
  const complete = await compilePipeBeddingBackfillR1({ ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT });
  const balanced = await compilePipeBeddingBackfillR1({ ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT,
    pbb_bedding_retained_reserve_m3: 12, pbb_bedding_supplier_load_m3: 25 });
  const conditional = await compilePipeBeddingBackfillR1({
    ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 22
    && quantity(first, "rc09:pbb_acceptance") === "850"
    && quantity(first, "rc09:pbb_bedding_surround") === "180")) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 27 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:pbb_geotextile") === "1100"
    && quantity(complete, "rc09:pbb_foundation_aggregate") === "95"
    && quantity(complete, "rc09:pbb_selected_backfill") === "620"
    && quantity(complete, "rc09:pbb_warning_tape") === "880"
    && quantity(complete, "rc09:labor:pbb-material-placing") === "520"
    && quantity(complete, "rc09:equipment:pbb-compactor") === "120"
    && quantity(complete, "rc09:logistics:pbb-delivery") === "58")) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:pbb-bedding-balance:installed-net") === "180"
    && quantity(balanced, "rc09:pbb-bedding-balance:retained-reserve") === "12"
    && quantity(balanced, "rc09:pbb-bedding-balance:total-need") === "192"
    && quantity(balanced, "rc09:pbb-bedding-balance:load-count") === "8"
    && quantity(balanced, "rc09:pbb_bedding_surround") === "200"
    && quantity(balanced, "rc09:pbb-bedding-balance:remainder") === "20"
    && quantity(balanced, "rc09:pbb-bedding-balance:surplus-beyond-reserve") === "8")) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 30 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:pbb_acceptance", "rc09:pbb_compaction_tests",
    "rc09:pbb_asbuilt_documents"]) {
    const graph = PIPE_BEDDING_BACKFILL_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_PIPE_BEDDING_BACKFILL_DOUBLE_COST:${rowId}`);
    }
  }
  if (/route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu
    .test(JSON.stringify(PIPE_BEDDING_BACKFILL_FORMULAS))) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm/iu
    .test(JSON.stringify(PIPE_BEDDING_BACKFILL_RESOURCES))) {
    throw new Error("STOP_S27_24_PIPE_BEDDING_BACKFILL_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_PIPE_BEDDING_BACKFILL_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: PIPE_BEDDING_BACKFILL_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM3: quantity(balanced, "rc09:pbb-bedding-balance:installed-net"),
      retainedReserveM3: quantity(balanced, "rc09:pbb-bedding-balance:retained-reserve"),
      totalNeedM3: quantity(balanced, "rc09:pbb-bedding-balance:total-need"),
      loadCount: quantity(balanced, "rc09:pbb-bedding-balance:load-count"),
      orderedM3: quantity(balanced, "rc09:pbb_bedding_surround"),
      remainderM3: quantity(balanced, "rc09:pbb-bedding-balance:remainder"),
      surplusM3: quantity(balanced, "rc09:pbb-bedding-balance:surplus-beyond-reserve") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.pipe-bedding-backfill-balanced-successor.v1",
  stopCode: "S27_24_PIPE_BEDDING_BACKFILL_BALANCED",
  applicationName: "s27-24-pipe-bedding-backfill-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "9c021ff0-8d2f-58f8-97a1-784c6f2d26a4",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d31d581c-258f-51cf-9ceb-b9e4eae29b7a",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/pipe-bedding-backfill-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/pipe-bedding-backfill-balanced-s27-24.json",
    "src/lib/estimate/v4/pipeBeddingBackfillR1.ts",
    "tests/estimateNorms/pipeBeddingBackfillR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724PipeBeddingBackfillBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724PipeBeddingBackfillBalancedIndependent.ts"],
  catalogId: PIPE_BEDDING_BACKFILL_CATALOG_ID, sourceId: PIPE_BEDDING_BACKFILL_SOURCE_ID,
  normId: PIPE_BEDDING_BACKFILL_NORM_ID, sourceMetadata: PIPE_BEDDING_BACKFILL_SOURCE_METADATA,
  parameterDefinitions: PIPE_BEDDING_BACKFILL_PARAMETERS,
  formulaDefinitions: PIPE_BEDDING_BACKFILL_FORMULAS,
  resourceDefinitions: PIPE_BEDDING_BACKFILL_RESOURCES,
  shortInput: PIPE_BEDDING_BACKFILL_SHORT_INPUT,
  acceptanceInput: PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT,
  runtimeProfileInput: PIPE_BEDDING_BACKFILL_RUNTIME_INPUT,
  runtimeProfileClassification: PIPE_BEDDING_BACKFILL_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: PIPE_BEDDING_BACKFILL_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 44,
  validationScenario: "Q5_PIPE_BEDDING_BACKFILL_BALANCED_S27_24",
  passport: { canonicalRuName: "Устройство зоны опирания, постели, обсыпки и обратной засыпки",
    workKey: "pipe_bedding_backfill",
    physicalResultRu: "850 м зоны опирания и засыпки BDF-315-GTX300-SAND-PGS-K095 устроены, уплотнены и приняты",
    includedScopeRu: ["геотекстиль, нижнее основание, постель, обсыпка и выбранная обратная засыпка",
      "подготовка дна, сигнальная лента, вывоз вытесненного грунта, уплотнение и контроль",
      "труд, механизмы, документы, логистика и баланс материала постели/обсыпки",
      "замена непригодного грунта, водоотлив и крепление только по условным ветвям"],
    excludedScopeRu: ["поставка и укладка трубы, соединения, колодцы и испытание сети",
      "автоматические объёмы по длине или диаметру", "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "PIPE_SUPPORT_ZONE_BEDDING_BACKFILL",
    supportZoneAssembly: "BDF_315_GTX300_SAND_PGS_K095_EXPLICIT_SCHEDULE",
    primaryMeasureParameterId: "pbb_route_length_m", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleBulkMaterialProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, routeDerivedQuantitiesForbidden: true,
    pipeManholesConnectionsAndNetworkTestingExcluded: true },
  binding: { rowId: "rc09:pbb_acceptance", applicability: {
    technology_class: "PIPE_SUPPORT_ZONE", operation_class: "PIPE_SUPPORT_ZONE_BEDDING_BACKFILL",
    support_zone_assembly: "BDF_315_GTX300_SAND_PGS_K095_EXPLICIT_SCHEDULE",
    scope_mode: "KNOWN_SUPPORT_ZONE_PLUS_VISIBLE_BULK_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: PIPE_BEDDING_BACKFILL_SOURCE_ID, norm_id: PIPE_BEDDING_BACKFILL_NORM_ID,
    exact_locator: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_SUPPORT_ZONE_IDENTITY_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "pipe-bedding-backfill-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.exact_locator,
    sourcePackSha256: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(PIPE_BEDDING_BACKFILL_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(PIPE_BEDDING_BACKFILL_RUNTIME_INPUT),
    directProjectInputs: PIPE_BEDDING_BACKFILL_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(PIPE_BEDDING_BACKFILL_SHORT_INPUT, id)
        && !id.startsWith("pbb_unsuitable_soil_replacement_")
        && !id.startsWith("pbb_dewatering_") && !id.startsWith("pbb_shoring_")),
    conditionalInputs: ["pbb_unsuitable_soil_replacement_mode",
      "pbb_unsuitable_soil_replacement_designation", "pbb_unsuitable_soil_replacement_volume_m3",
      "pbb_dewatering_mode", "pbb_dewatering_designation", "pbb_dewatering_machine_h",
      "pbb_shoring_mode", "pbb_shoring_designation", "pbb_shoring_area_m2"] } },
  search: { primaryUom: "m", canonicalNameRu: "Устройство основания и обратной засыпки трубопровода",
    aliases: ["песчаная постель и обсыпка трубы", "зона опирания трубы OD315",
      "послойная обратная засыпка трубопровода", "pipe bedding and backfill"],
    shortScopeRu: "850 м зоны опирания трубы OD 315: геотекстиль 300 г/м2, песчаная постель 150 мм, обсыпка 300 мм, ПГС и уплотнение 0,95; объёмы, труд и механизмы по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: PIPE_BEDDING_BACKFILL_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(PIPE_BEDDING_BACKFILL_SHORT_INPUT, id)),
    includedBoundaries: ["геотекстиль, основание, постель, обсыпка, выбранная засыпка и лента по проекту",
      "подготовка, уплотнение, контроль, труд, механизмы, QA, логистика и баланс материала",
      "условные замена грунта, водоотлив и крепление только по проекту"],
    excludedBoundaries: ["труба, соединения, колодцы и испытание сети",
      "автоматические объёмы по длине или диаметру", "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "основание трубы песчаная постель обсыпка геотекстиль обратная засыпка уплотнение траншея OD315",
    sourceProvenance: { exactExpandedPipeBeddingBackfillOwner: true,
      knownSelectedSupportZoneIdentityAndInstalledBeddingVolume: true,
      visibleIndependentBulkMaterialProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/sewer.pipe|канализац.*труб/iu,
    /inspection.manhole|смотров.*колод/iu, /hydraulic.test|гидравлическ.*испыт/iu],
  owner: "S27_24_PIPE_BEDDING_BACKFILL_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_PIPE_BEDDING_BACKFILL_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
