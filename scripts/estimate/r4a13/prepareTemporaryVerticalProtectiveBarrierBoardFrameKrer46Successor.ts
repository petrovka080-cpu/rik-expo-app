import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA,
  type TemporaryVerticalProtectiveBarrierBoardFrameKrer46VariantKey,
  compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1,
  resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryVerticalProtectiveBarrierBoardFrameKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryVerticalProtectiveBarrierBoardFrameKrer46VariantKey;
const variant = resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_vertical_protective_barrier_board_frame";
const groupNameRu = "Временное вертикальное защитное ограждение с обшивкой по каркасу из досок";
const rowPrefix = "f09:temporary_vertical_protective_barrier_board_frame";
const profileParameterId =
  "temporary_protective_barrier_profile";
const confirmedParameterId =
  "vertical_barrier_board_frame_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
    { ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
    { ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
    { barrier_vertical_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "100", "52.44", "0.19", "0.19", "0.56", "0.27", "0.0141", "0.003",
    "0.86", "0.25", "115",
  ];
  const expectedAcceptance = [
    "35.5", "18.6162", "0.06745", "0.06745", "0.1988", "0.09585",
    "0.0050055", "0.001065", "0.3053", "0.08875", "40.825",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-001-03",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 11 },
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
  contract: `rik-expo-app.s27-3.f09-temporary-vertical-protective-barrier-board-frame-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}`,
  applicationName: `s27-3-f09-temporary-vertical-protective-barrier-board-frame-krer46-03-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "3bcef9f7-acdb-595d-95aa-38cadce6b05a",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "56d36889-1753-5c43-8266-98fd4c27aefe",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-vertical-protective-barrier-board-frame-krer46-03-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryVerticalProtectiveBarrierBoardFrameKrer46R1.ts",
    "tests/estimateNorms/temporaryVerticalProtectiveBarrierBoardFrameKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryVerticalProtectiveBarrierBoardFrameKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
  normId: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES,
  shortInput: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 11, 11] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_vertical_protective_barrier_board_frame_krer_46_05_001_03_${variantKey}`,
    physicalResultRu: `Временное вертикальное защитное ограждение с обшивкой по каркасу из досок (${variantContextRu}) устроено и разобрано по КРЕР 46-05-001-03`,
    includedScopeRu: [
      "устройство каркаса из досок и вертикальная обшивка каркаса досками",
      "покрытие обшивки толем в один слой",
      "разборка временного защитного ограждения после окончания работ",
      "труд рабочих среднего разряда 2,2 по норме 52,44 чел.-ч на 100 м² вертикального ограждения",
      "точные машина-часы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные нормы строительных и толевых гвоздей, двух сортаментов досок и толя ТК-350",
      "справочный труд машинистов 0,19 чел.-ч на 100 м² без повторной оплаты",
    ],
    excludedScopeRu: [
      "горизонтальное ограждение с настилом по нижним поясам ферм по колонке 46-05-001-01",
      "горизонтальное ограждение с настилом по балкам на стойках из брёвен по колонке 46-05-001-02",
      "брёвна, поковки из квадратных заготовок и проволока, отсутствующие в колонке 03",
      "постоянный забор, дорожное ограждение и иная постоянная конструкция",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "проектирование, расчёт и освидетельствование временной конструкции вне состава ресурсной нормы",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_DISMANTLE_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "barrier_vertical_area_m2",
    geometryParameters: ["barrier_vertical_area_m2"],
    temporaryBarrierOrientation: "VERTICAL",
    supportLocation: "BOARD_FRAME",
    facingType: "BOARD_FACING",
    roofingFeltLayers: 1,
    officialUnitRateSource: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-001-03",
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
      technology_class: "TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME",
      operation_class: "INSTALL_AND_DISMANTLE_TEMPORARY_PROTECTIVE_BARRIER",
      catalog_variant: variant.catalogVariant,
      temporary_barrier_orientation: "VERTICAL",
      support_location: "BOARD_FRAME",
      facing_type: "BOARD_FACING",
      roofing_felt_layers: 1,
      source_id: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_NORM_ID,
      exact_locator: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_VERTICAL_AREA_TIMES_EXACT_KRER_46_05_001_03_RATES_PER_100_M2",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      dismantling_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-001-03-temporary-vertical-protective-barrier-board-frame-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-001",
      rate: "46-05-001-03",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [62, 63],
      resourceRatePrintedAndPdfPage: 63,
      exactLocator: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["barrier_vertical_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade2_2ManHours: 52.44,
        machinistLaborManHours: 0.19,
        truckCrane10tMachineHours: 0.19,
        electricWinch19_62knMachineHours: 0.56,
        truck5tMachineHours: 0.27,
        constructionNailsTonnes: 0.0141,
        roofingNailsTonnes: 0.003,
        softwoodUnedgedBoards32_40mmGrade4CubicMetres: 0.86,
        softwoodUnedgedBoards44mmPlusGrade3CubicMetres: 0.25,
        roofingFeltTk350SquareMetres: 115,
      },
      temporaryBarrierOrientation: "VERTICAL",
      supportLocation: "BOARD_FRAME",
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
      `временное вертикальное защитное ограждение с обшивкой по каркасу из досок — ${variantContextRu}`,
      `вертикальное временное ограждение с дощатой обшивкой и толем в один слой — ${variantContextRu}`,
      `КРЕР 46-05-001-03 — ${variantContextRu}`,
      `${variantKey} temporary vertical protective barrier board frame`,
    ],
    shortScopeRu: `Устройство и последующая разборка подтверждённого временного вертикального защитного ограждения с обшивкой по каркасу из досок (${variantContextRu}) по точным ресурсам КРЕР 46-05-001-03.`,
    keyDistinguishingParameters: ["barrier_vertical_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "каркас из досок, дощатая обшивка и покрытие толем в один слой",
      "последующая разборка временного защитного ограждения",
      "точный труд рабочих разряда 2,2, машины и материалы по КРЕР 46-05-001-03",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "ограждение с настилом по нижним поясам ферм по колонке 01",
      "горизонтальное ограждение с настилом по балкам и стойкам по колонке 02",
      "брёвна, квадратные поковки и проволока, отсутствующие в колонке 03",
      "постоянный забор и дорожное ограждение",
      "неподтверждённый возврат материалов и проектирование временной конструкции",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `устройство разборка временное защитное ограждение вертикальное обшивка доски толь каркас ${variantContextRu} КРЕР 46 временные работы`,
    sourceProvenance: {
      officialKrer462015Rate460500103: true,
      exactOfficialArtifactSha256: TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      dismantlingPreservedInsideOfficialRate: true,
      adjacentColumns01And02Rejected: true,
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
      workKey: `temporary_vertical_protective_barrier_board_frame_krer_46_05_001_03_${variantKey}`,
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
        exactRateFamily: "KRER_46_05_001_03",
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
      technologyVariant: "КРЕР 46-05-001-03; вертикальное временное ограждение; обшивка по каркасу из досок",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-001-03"],
      applicabilityTags: ["TEMPORARY_BARRIER", "VERTICAL", "BOARD_FRAME", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /lower_truss_chords|beams_on_log_posts|horizontal_barrier|46_05_001_0[12]|нижн.*пояс.*ферм|горизонтальн.*огражд/iu,
    /softwood_logs|square_timber|wire_rod|01-4201-0027|01-6901-0001|10-0105-0001/iu,
    /permanent_fence|road_guardrail|постоянн.*забор|дорожн.*огражд/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_03_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
