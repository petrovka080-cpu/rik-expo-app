import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_FORMULAS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_NORM_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PARAMETERS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA,
  type TemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46VariantKey,
  compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1,
  resolveTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46VariantKey;
const variant = resolveTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_horizontal_protective_barrier_beams_on_log_posts";
const groupNameRu = "Временное горизонтальное защитное ограждение с настилом по балкам на стойках из брёвен";
const rowPrefix = "f09:temporary_horizontal_protective_barrier_beams_on_log_posts";
const profileParameterId =
  "temporary_protective_barrier_profile";
const confirmedParameterId =
  "horizontal_barrier_beams_on_log_posts_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1(
    { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1(
    { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1(
    { barrier_horizontal_projection_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "100", "105.46", "0.49", "0.49", "1.47", "0.73", "0.016", "0.003",
    "1.5", "0.8", "1.43", "230", "0.0171",
  ];
  const expectedAcceptance = [
    "35.5", "37.4383", "0.17395", "0.17395", "0.52185", "0.25915",
    "0.00568", "0.001065", "0.5325", "0.284", "0.50765", "81.65", "0.0060705",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 13)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-001-02",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 13 },
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    temporaryBarrierDismantlingIncluded: true,
    adjacentRateColumnIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-temporary-horizontal-protective-barrier-beams-on-log-posts-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}`,
  applicationName: `s27-3-f09-temporary-horizontal-protective-barrier-beams-on-log-posts-krer46-02-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c0fe9b62-02b4-5eee-9bcb-e3ad382fe0ab",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "ba22677f-0534-5179-bcf3-ee1c7b8d953d",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-horizontal-protective-barrier-beams-on-log-posts-krer46-02-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1.ts",
    "tests/estimateNorms/temporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_ID,
  normId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES,
  shortInput: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 13, 13] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_horizontal_protective_barrier_beams_on_log_posts_krer_46_05_001_02_${variantKey}`,
    physicalResultRu: `Временное горизонтальное защитное ограждение с дощатым настилом по балкам на стойках из брёвен (${variantContextRu}) устроено и разобрано по КРЕР 46-05-001-02`,
    includedScopeRu: [
      "устройство каркаса из брёвен и досок и дощатого настила по балкам на стойках из брёвен",
      "покрытие настила толем в два слоя",
      "разборка временного защитного ограждения после окончания работ",
      "труд рабочих среднего разряда 2,6 по норме 105,46 чел.-ч на 100 м² горизонтальной проекции",
      "точные машина-часы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные нормы строительных и толевых гвоздей, брёвен, двух сортаментов досок, толя ТК-350 и поковок из квадратных заготовок",
      "справочный труд машинистов 0,49 чел.-ч на 100 м² без повторной оплаты",
    ],
    excludedScopeRu: [
      "горизонтальное ограждение с настилом по нижним поясам ферм по колонке 46-05-001-01",
      "вертикальное ограждение с обшивкой по каркасу из досок по колонке 46-05-001-03",
      "постоянный забор, дорожное ограждение и иная постоянная конструкция",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "проектирование, расчёт и освидетельствование временной конструкции вне состава ресурсной нормы",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_DISMANTLE_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "barrier_horizontal_projection_area_m2",
    geometryParameters: ["barrier_horizontal_projection_area_m2"],
    temporaryBarrierOrientation: "HORIZONTAL",
    supportLocation: "BEAMS_ON_LOG_POSTS",
    deckingType: "CONTINUOUS_BOARD_DECKING",
    roofingFeltLayers: 2,
    officialUnitRateSource: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-001-02",
    machineResourcesIncluded: true,
    materialResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    dismantlingIncluded: true,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS",
      operation_class: "INSTALL_AND_DISMANTLE_TEMPORARY_PROTECTIVE_BARRIER",
      catalog_variant: variant.catalogVariant,
      temporary_barrier_orientation: "HORIZONTAL",
      support_location: "BEAMS_ON_LOG_POSTS",
      decking_type: "CONTINUOUS_BOARD_DECKING",
      roofing_felt_layers: 2,
      source_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_NORM_ID,
      exact_locator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_HORIZONTAL_PROJECTION_AREA_TIMES_EXACT_KRER_46_05_001_02_RATES_PER_100_M2",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      dismantling_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-001-02-temporary-horizontal-protective-barrier-beams-on-log-posts-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-001",
      rate: "46-05-001-02",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [62, 63],
      resourceRatePrintedAndPdfPage: 63,
      exactLocator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["barrier_horizontal_projection_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade2_6ManHours: 105.46,
        machinistLaborManHours: 0.49,
        truckCrane10tMachineHours: 0.49,
        electricWinch19_62knMachineHours: 1.47,
        truck5tMachineHours: 0.73,
        constructionNailsTonnes: 0.016,
        roofingNailsTonnes: 0.003,
        softwoodLogsCubicMetres: 1.5,
        softwoodUnedgedBoards32_40mmGrade4CubicMetres: 0.8,
        softwoodUnedgedBoards44mmPlusGrade3CubicMetres: 1.43,
        roofingFeltTk350SquareMetres: 230,
        squareTimberPieces1_8kgTonnes: 0.0171,
      },
      temporaryBarrierOrientation: "HORIZONTAL",
      supportLocation: "BEAMS_ON_LOG_POSTS",
      dismantlingIncluded: true,
      machineResourcesIncluded: true,
      materialResourcesIncluded: true,
      machinistLaborPricedSeparately: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `временное защитное ограждение с настилом по балкам на стойках из брёвен — ${variantContextRu}`,
      `горизонтальное временное ограждение на бревенчатых стойках с дощатым настилом и толем — ${variantContextRu}`,
      `КРЕР 46-05-001-02 — ${variantContextRu}`,
      `${variantKey} temporary horizontal protective barrier beams on log posts`,
    ],
    shortScopeRu: `Устройство и последующая разборка подтверждённого временного горизонтального защитного ограждения с дощатым настилом по балкам на стойках из брёвен (${variantContextRu}) по точным ресурсам КРЕР 46-05-001-02.`,
    keyDistinguishingParameters: ["barrier_horizontal_projection_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "каркас, балки на стойках из брёвен, дощатый настил и покрытие толем в два слоя",
      "последующая разборка временного защитного ограждения",
      "точный труд рабочих разряда 2,6, машины и материалы по КРЕР 46-05-001-02",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "ограждение с настилом по нижним поясам ферм по колонке 01",
      "вертикальное ограждение с обшивкой по каркасу по колонке 03",
      "постоянный забор и дорожное ограждение",
      "неподтверждённый возврат материалов и проектирование временной конструкции",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `устройство разборка временное защитное ограждение горизонтальное дощатый настил балки стойки брёвна толь каркас ${variantContextRu} КРЕР 46 временные работы`,
    sourceProvenance: {
      officialKrer462015Rate460500102: true,
      exactOfficialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      dismantlingPreservedInsideOfficialRate: true,
      adjacentColumns01And03Rejected: true,
      permanentFenceAndRoadGuardrailRejected: true,
      unverifiedReuseFactorRejected: true,
      classificationFactorRejected: true,
    },
  },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: {
      namespace: "global",
      domain: "temporary_works",
      sourceIdentity: variant.sourceIdentity,
      workKey: `temporary_horizontal_protective_barrier_beams_on_log_posts_krer_46_05_001_02_${variantKey}`,
      titleRu: variant.canonicalNameRu,
      denominatorEligible: true,
    },
    searchPlacement: {
      groupMode: variantKey === "standard" ? "create" : "join",
      groupId,
      groupNameRu,
      domainId: "temporary_works",
      systemId: "temporary_safety_barriers",
      subsystemId: groupId,
      assemblyId: groupId,
      workFamilyId: "temporary_protective_barriers",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_05_001_02",
      },
      membershipOrdinal: variantOrdinal,
      independentDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        classification: "CANONICAL_VISIBLE",
        exactPhysicalIdentity: true,
        appendedWithoutReplacingExistingIdentity: true,
      },
      elementType: "WORK",
      operationKind: "NEW_INSTALLATION",
      technologyVariant: "КРЕР 46-05-001-02; горизонтальное временное ограждение; настил по балкам на стойках из брёвен",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-001-02"],
      applicabilityTags: ["TEMPORARY_BARRIER", "HORIZONTAL", "BEAMS_ON_LOG_POSTS", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /lower_truss_chords|vertical_barrier|46_05_001_0[13]|нижн.*пояс.*ферм|вертикальн.*огражд/iu,
    /permanent_fence|road_guardrail|постоянн.*забор|дорожн.*огражд/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
