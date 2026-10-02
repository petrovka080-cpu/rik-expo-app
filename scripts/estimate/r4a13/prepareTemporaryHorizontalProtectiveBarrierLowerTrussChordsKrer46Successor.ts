import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_FORMULAS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PARAMETERS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_RESOURCES,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SHORT_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA,
  type TemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46VariantKey,
  compileTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1,
  resolveTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46VariantKey;
const variant = resolveTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_horizontal_protective_barrier_lower_truss_chords";
const groupNameRu = "Временное горизонтальное защитное ограждение с настилом по нижним поясам ферм";
const rowPrefix = "f09:temporary_horizontal_protective_barrier_lower_truss_chords";
const profileParameterId =
  "temporary_protective_barrier_profile";
const confirmedParameterId =
  "horizontal_barrier_lower_truss_chords_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1(
    { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1(
    { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1(
    { barrier_horizontal_projection_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "100", "85.23", "0.44", "0.44", "1.31", "0.65", "0.015", "0.003",
    "0.98", "0.14", "1.4", "230", "0.073",
  ];
  const expectedAcceptance = [
    "35.5", "30.25665", "0.1562", "0.1562", "0.46505", "0.23075",
    "0.005325", "0.001065", "0.3479", "0.0497", "0.497", "81.65", "0.025915",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 13)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-001-01",
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
  contract: `rik-expo-app.s27-3.f09-temporary-horizontal-protective-barrier-lower-truss-chords-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}`,
  applicationName: `s27-3-f09-temporary-horizontal-protective-barrier-lower-truss-chords-krer46-01-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "2f15fbbe-6329-50ae-ac31-395c1df899ff",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "0b48668b-17b2-5d85-b360-9dde93307c38",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-horizontal-protective-barrier-lower-truss-chords-krer46-01-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1.ts",
    "tests/estimateNorms/temporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryHorizontalProtectiveBarrierLowerTrussChordsKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
  normId: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_RESOURCES,
  shortInput: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 13, 13] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_horizontal_protective_barrier_lower_truss_chords_krer_46_05_001_01_${variantKey}`,
    physicalResultRu: `Временное горизонтальное защитное ограждение с непрерывным дощатым настилом по нижним поясам ферм (${variantContextRu}) устроено и разобрано по КРЕР 46-05-001-01`,
    includedScopeRu: [
      "устройство каркаса из брёвен и досок и непрерывного дощатого настила по нижним поясам ферм",
      "покрытие настила толем в два слоя",
      "разборка временного защитного ограждения после окончания работ",
      "труд рабочих среднего разряда 2,6 по норме 85,23 чел.-ч на 100 м² горизонтальной проекции",
      "точные машина-часы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные нормы строительных и толевых гвоздей, брёвен, двух сортаментов досок, толя ТК-350 и катанки",
      "справочный труд машинистов 0,44 чел.-ч на 100 м² без повторной оплаты",
    ],
    excludedScopeRu: [
      "горизонтальное ограждение на балках по стойкам из брёвен по колонке 46-05-001-02",
      "вертикальное ограждение с обшивкой по каркасу из досок по колонке 46-05-001-03",
      "постоянный забор, дорожное ограждение и иная постоянная конструкция",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "проектирование, расчёт и освидетельствование временной конструкции вне состава ресурсной нормы",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_DISMANTLE_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "barrier_horizontal_projection_area_m2",
    geometryParameters: ["barrier_horizontal_projection_area_m2"],
    temporaryBarrierOrientation: "HORIZONTAL",
    supportLocation: "LOWER_TRUSS_CHORDS",
    deckingType: "CONTINUOUS_BOARD_DECKING",
    roofingFeltLayers: 2,
    officialUnitRateSource: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-001-01",
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
      technology_class: "TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS",
      operation_class: "INSTALL_AND_DISMANTLE_TEMPORARY_PROTECTIVE_BARRIER",
      catalog_variant: variant.catalogVariant,
      temporary_barrier_orientation: "HORIZONTAL",
      support_location: "LOWER_TRUSS_CHORDS",
      decking_type: "CONTINUOUS_BOARD_DECKING",
      roofing_felt_layers: 2,
      source_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_NORM_ID,
      exact_locator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_HORIZONTAL_PROJECTION_AREA_TIMES_EXACT_KRER_46_05_001_01_RATES_PER_100_M2",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      dismantling_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-001-01-temporary-horizontal-protective-barrier-lower-truss-chords-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-001",
      rate: "46-05-001-01",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [62, 63],
      resourceRatePrintedAndPdfPage: 63,
      exactLocator: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["barrier_horizontal_projection_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade2_6ManHours: 85.23,
        machinistLaborManHours: 0.44,
        truckCrane10tMachineHours: 0.44,
        electricWinch19_62knMachineHours: 1.31,
        truck5tMachineHours: 0.65,
        constructionNailsTonnes: 0.015,
        roofingNailsTonnes: 0.003,
        softwoodLogsCubicMetres: 0.98,
        softwoodUnedgedBoards32_40mmGrade4CubicMetres: 0.14,
        softwoodUnedgedBoards44mmPlusGrade3CubicMetres: 1.4,
        roofingFeltTk350SquareMetres: 230,
        wireRod6_3To6_5mmTonnes: 0.073,
      },
      temporaryBarrierOrientation: "HORIZONTAL",
      supportLocation: "LOWER_TRUSS_CHORDS",
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
      `временное защитное ограждение с настилом по нижним поясам ферм — ${variantContextRu}`,
      `горизонтальное временное ограждение с дощатым настилом и толем — ${variantContextRu}`,
      `КРЕР 46-05-001-01 — ${variantContextRu}`,
      `${variantKey} temporary horizontal protective barrier lower truss chords`,
    ],
    shortScopeRu: `Устройство и последующая разборка подтверждённого временного горизонтального защитного ограждения с непрерывным дощатым настилом по нижним поясам ферм (${variantContextRu}) по точным ресурсам КРЕР 46-05-001-01.`,
    keyDistinguishingParameters: ["barrier_horizontal_projection_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "каркас, непрерывный дощатый настил и покрытие толем в два слоя",
      "последующая разборка временного защитного ограждения",
      "точный труд рабочих разряда 2,6, машины и материалы по КРЕР 46-05-001-01",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "ограждение на балках по стойкам из брёвен по колонке 02",
      "вертикальное ограждение с обшивкой по каркасу по колонке 03",
      "постоянный забор и дорожное ограждение",
      "неподтверждённый возврат материалов и проектирование временной конструкции",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `устройство разборка временное защитное ограждение горизонтальное непрерывный дощатый настил нижние пояса ферм толь каркас ${variantContextRu} КРЕР 46 временные работы`,
    sourceProvenance: {
      officialKrer462015Rate460500101: true,
      exactOfficialArtifactSha256: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      dismantlingPreservedInsideOfficialRate: true,
      adjacentColumns02And03Rejected: true,
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
      workKey: `temporary_horizontal_protective_barrier_lower_truss_chords_krer_46_05_001_01_${variantKey}`,
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
        exactRateFamily: "KRER_46_05_001_01",
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
      technologyVariant: "КРЕР 46-05-001-01; горизонтальное временное ограждение; непрерывный настил по нижним поясам ферм",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-001-01"],
      applicabilityTags: ["TEMPORARY_BARRIER", "HORIZONTAL", "LOWER_TRUSS_CHORDS", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /beam_on_log_posts|vertical_barrier|46_05_001_0[23]|по стойкам|вертикальн.*огражд/iu,
    /permanent_fence|road_guardrail|постоянн.*забор|дорожн.*огражд/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_LOWER_TRUSS_CHORDS_KRER46_01_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
