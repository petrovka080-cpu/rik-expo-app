import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  type TemporaryTrussLatticeElementStrengtheningDevicesKrer46VariantKey,
  compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussLatticeElementStrengtheningDevicesKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryTrussLatticeElementStrengtheningDevicesKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryTrussLatticeElementStrengtheningDevicesKrer46VariantKey;
const variant = resolveTemporaryTrussLatticeElementStrengtheningDevicesKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большое количество элементов",
  small_area: "локальный объём",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_truss_lattice_element_strengthening_devices";
const groupNameRu = "Устройства при усилении отдельных элементов решётки ферм";
const rowPrefix = "f09:temporary_truss_lattice_element_strengthening_devices";
const profileParameterId =
  "truss_lattice_element_strengthening_devices_profile";
const confirmedParameterId =
  "truss_lattice_element_strengthening_devices_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1(
    { truss_lattice_element_count: 3 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "1", "31.72", "0.15", "0.15", "3.48", "0.23", "0.0109", "0.0001",
    "0.00006", "0.00019", "1.32",
  ];
  const expectedAcceptance = [
    "3", "73.58", "0.37", "0.37", "9.04", "0.55", "0.02852", "0.0003",
    "0.00018", "0.00057", "3.46",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-003-01+02",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { trussElementCount: "3", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 11 },
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    devicesRemovalIncluded: true,
    firstAndSubsequentColumnsCombined: true,
    firstColumnRepeated: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-temporary-truss-lattice-element-strengthening-devices-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}`,
  applicationName: `s27-3-f09-temporary-truss-lattice-element-strengthening-devices-krer46-03-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "ccb03e14-5e69-5a41-b30a-f441352cebd7",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d24bbfbf-8626-5634-a32e-966e5aa4a411",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-truss-lattice-element-strengthening-devices-krer46-03-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryTrussLatticeElementStrengtheningDevicesKrer46R1.ts",
    "tests/estimateNorms/temporaryTrussLatticeElementStrengtheningDevicesKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryTrussLatticeElementStrengtheningDevicesKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  normId: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  shortInput: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 11, 11] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_truss_lattice_element_strengthening_devices_krer_46_05_003_first_subsequent_${variantKey}`,
    physicalResultRu: `Временные устройства доступа, такелажа и безопасности при усилении отдельных элементов решётки ферм (${variantContextRu}) установлены, переставлены и сняты по КРЕР 46-05-003: колонка 01 один раз и колонка 02 для последующих элементов`,
    includedScopeRu: [
      "установка и снятие лебёдок и такелажной оснастки",
      "установка, перестановка и снятие приставных инвентарных лестниц",
      "подъём, навеска, перенавеска и снятие навесных лестниц и полок, индивидуальных сборно-разборных подмостей и страховочного каната",
      "колонка 46-05-003-01 один раз для первого элемента и колонка 46-05-003-02 для каждого последующего",
      "труд рабочих среднего разряда 3,1: 31,72 чел.-ч для первого и 20,93 чел.-ч для каждого последующего элемента",
      "точные парные нормы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные парные нормы поковок, пенькового и капронового канатов, катанки и щитов настила",
      "справочный труд машинистов 0,15/0,11 чел.-ч без повторной оплаты",
    ],
    excludedScopeRu: [
      "устройства по длине фермы для поясов или решётки по таблице 46-05-002",
      "устройства при усилении узлов ферм по таблице 46-05-004",
      "собственно усиление металлоконструкций решётки ферм",
      "временные защитные ограждения по таблице 46-05-001",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "проектирование и расчёт усиления вне состава ресурсной нормы",
      "скрытый коэффициент длины и неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "truss_lattice_element_count",
    geometryParameters: ["truss_lattice_element_count"],
    strengthenedTrussElement: "INDIVIDUAL_LATTICE_ELEMENTS",
    officialMeasure: "TRUSS_ELEMENT",
    officialUnitRateSource: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-003-01+02",
    firstElementRateAppliedOnce: true,
    subsequentElementRateAppliedToCountMinusOne: true,
    machineResourcesIncluded: true,
    materialResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    removalIncluded: true,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES",
      operation_class: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_STRENGTHENING_DEVICES",
      catalog_variant: variant.catalogVariant,
      strengthened_truss_element: "INDIVIDUAL_LATTICE_ELEMENTS",
      official_measure: "TRUSS_ELEMENT",
      source_id: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_NORM_ID,
      exact_locator: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      quantity_basis: "FIRST_ELEMENT_COLUMN_01_ONCE_PLUS_COLUMN_02_TIMES_COUNT_MINUS_ONE",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      removal_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-003-first-subsequent-temporary-truss-lattice-element-strengthening-devices-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-003",
      rateColumns: ["46-05-003-01", "46-05-003-02"],
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [64],
      resourceRatePrintedAndPdfPages: [64],
      exactLocator: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["truss_lattice_element_count", profileParameterId, confirmedParameterId],
      resourceRatesPerElement: {
        constructionLaborGrade3_1ManHours: { first: 31.72, subsequent: 20.93 },
        machinistLaborManHours: { first: 0.15, subsequent: 0.11 },
        truckCrane10tMachineHours: { first: 0.15, subsequent: 0.11 },
        electricWinch19_62knMachineHours: { first: 3.48, subsequent: 2.78 },
        truck5tMachineHours: { first: 0.23, subsequent: 0.16 },
        squareTimberPieces1_8kgTonnes: { first: 0.0109, subsequent: 0.00881 },
        impregnatedHempRopeTonnes: { first: 0.0001, subsequent: 0.0001 },
        threeStrandKapronRopeTonnes: { first: 0.00006, subsequent: 0.00006 },
        hotRolledWireRodTonnes: { first: 0.00019, subsequent: 0.00019 },
        deckingShieldsSquareMetres: { first: 1.32, subsequent: 1.07 },
      },
      strengthenedTrussElement: "INDIVIDUAL_LATTICE_ELEMENTS",
      firstElementRateAppliedOnce: true,
      subsequentElementRateAppliedToCountMinusOne: true,
      removalIncluded: true,
      machineResourcesIncluded: true,
      materialResourcesIncluded: true,
      machinistLaborPricedSeparately: false,
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `устройства при усилении отдельных элементов решётки ферм — ${variantContextRu}`,
      `лебёдки лестницы полки подмости и страховочный канат для отдельных элементов решётки — ${variantContextRu}`,
      `КРЕР 46-05-003 первый и последующие элементы — ${variantContextRu}`,
      `${variantKey} first and subsequent truss lattice element access and rigging devices`,
    ],
    shortScopeRu: `Установка, перестановка и снятие подтверждённых временных устройств при усилении отдельных элементов решётки ферм (${variantContextRu}) по точным ресурсам КРЕР 46-05-003-01+02.`,
    keyDistinguishingParameters: ["truss_lattice_element_count", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "лебёдки, такелажная оснастка, лестницы, полки, подмости и страховочный канат",
      "установка, перестановка и снятие временных устройств",
      "колонка 01 один раз и колонка 02 для каждого элемента после первого",
      "точный труд рабочих разряда 3,1, машины и материалы по КРЕР 46-05-003",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "устройства по длине фермы по таблице 46-05-002",
      "устройства при усилении узлов ферм по таблице 46-05-004",
      "собственно усиление решётки и прочие металлоконструкции",
      "временные защитные ограждения по таблице 46-05-001",
      "неподтверждённый возврат материалов и проектирование усиления",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `установка снятие перестановка лебёдки такелаж лестницы полки подмости страховочный канат первый последующий отдельный элемент решётки фермы ${variantContextRu} КРЕР 46`,
    sourceProvenance: {
      officialKrer462015Table4605003FirstAndSubsequent: true,
      exactOfficialArtifactSha256: TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      removalPreservedInsideOfficialRate: true,
      firstElementRateAppliedOnce: true,
      subsequentElementRateAppliedToCountMinusOne: true,
      adjacentLengthAndNodeTablesRejected: true,
      structuralStrengtheningItselfRejected: true,
      unverifiedReuseFactorRejected: true,
      classificationFactorRejected: true,
    },
  },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: {
      namespace: "global",
      domain: "temporary_works",
      sourceIdentity: variant.sourceIdentity,
      workKey: `temporary_truss_lattice_element_strengthening_devices_krer_46_05_003_first_subsequent_${variantKey}`,
      titleRu: variant.canonicalNameRu,
      denominatorEligible: true,
    },
    searchPlacement: {
      groupMode: variantKey === "standard" ? "create" : "join",
      groupId,
      groupNameRu,
      domainId: "temporary_works",
      systemId: "structural_reconstruction",
      subsystemId: groupId,
      assemblyId: groupId,
      workFamilyId: "truss_lattice_element_strengthening_temporary_devices",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_05_003_01_AND_02",
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
      technologyVariant: "КРЕР 46-05-003; первый и последующие отдельные элементы решётки ферм",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-003-01", "КРЕР 46-05-003-02"],
      applicabilityTags: ["TRUSS_STRENGTHENING", "INDIVIDUAL_LATTICE_ELEMENTS", "FIRST_AND_SUBSEQUENT", "TEMPORARY_ACCESS_AND_RIGGING", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /temporary_truss_(?:chord|lattice)_strengthening_devices|46_05_002|по.*длин.*ферм/iu,
    /truss_node|46_05_004|узл.*ферм/iu,
    /temporary.*barrier|protective_barrier|46_05_001|защитн.*огражд/iu,
    /structural_strengthening|metal_strengthening|усилен.*металлоконструкц/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_03_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
