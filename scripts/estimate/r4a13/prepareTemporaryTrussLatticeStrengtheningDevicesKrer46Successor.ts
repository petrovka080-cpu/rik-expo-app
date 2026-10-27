import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  type TemporaryTrussLatticeStrengtheningDevicesKrer46VariantKey,
  compileTemporaryTrussLatticeStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussLatticeStrengtheningDevicesKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryTrussLatticeStrengtheningDevicesKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryTrussLatticeStrengtheningDevicesKrer46VariantKey;
const variant = resolveTemporaryTrussLatticeStrengtheningDevicesKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_truss_lattice_strengthening_devices";
const groupNameRu = "Устройства при усилении решётки ферм";
const rowPrefix = "f09:temporary_truss_lattice_strengthening_devices";
const profileParameterId =
  "truss_strengthening_devices_profile";
const confirmedParameterId =
  "truss_lattice_strengthening_devices_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryTrussLatticeStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryTrussLatticeStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryTrussLatticeStrengtheningDevicesKrer46R1(
    { truss_length_m: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "1", "10.09", "0.01", "0.01", "1.16", "0.02", "0.00273", "0.00001",
    "0.00006", "0.00018", "0.5",
  ];
  const expectedAcceptance = [
    "35.5", "358.195", "0.355", "0.355", "41.18", "0.71", "0.096915",
    "0.000355", "0.00213", "0.00639", "17.75",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-002-02",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { trussLengthM: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 11 },
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    devicesRemovalIncluded: true,
    adjacentRateColumnIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-temporary-truss-lattice-strengthening-devices-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}`,
  applicationName: `s27-3-f09-temporary-truss-lattice-strengthening-devices-krer46-02-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "7d8bdd69-e541-503a-b437-058124ab2e4e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "fbe4b57e-b3c7-5d50-b3da-61597382bec3",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-truss-lattice-strengthening-devices-krer46-02-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryTrussLatticeStrengtheningDevicesKrer46R1.ts",
    "tests/estimateNorms/temporaryTrussLatticeStrengtheningDevicesKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryTrussLatticeStrengtheningDevicesKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  normId: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  shortInput: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 11, 11] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_truss_lattice_strengthening_devices_krer_46_05_002_02_${variantKey}`,
    physicalResultRu: `Временные устройства доступа, такелажа и безопасности при усилении решётки ферм (${variantContextRu}) установлены, переставлены и сняты по КРЕР 46-05-002-02`,
    includedScopeRu: [
      "установка и снятие лебёдок и такелажной оснастки",
      "установка, перестановка и снятие приставных инвентарных лестниц",
      "подъём, навеска, перенавеска и снятие навесных лестниц и полок, индивидуальных сборно-разборных подмостей и страховочного каната",
      "труд рабочих среднего разряда 2,9 по норме 6,34 чел.-ч на 1 м фермы",
      "точные машина-часы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные нормы поковок, пенькового и капронового канатов, катанки и щитов настила",
      "справочный труд машинистов 0,01 чел.-ч на 1 м фермы без повторной оплаты",
    ],
    excludedScopeRu: [
      "устройства при усилении поясов ферм по колонке 46-05-002-01",
      "собственно усиление металлоконструкций решётки ферм",
      "временные защитные ограждения по таблице 46-05-001",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "проектирование и расчёт усиления вне состава ресурсной нормы",
      "скрытый коэффициент длины и неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_LATTICE_STRENGTHENING_DEVICES",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "truss_length_m",
    geometryParameters: ["truss_length_m"],
    strengthenedTrussElement: "LATTICE_MEMBERS",
    officialMeasure: "M_OF_TRUSS",
    officialUnitRateSource: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-002-02",
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
      technology_class: "TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES",
      operation_class: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_STRENGTHENING_DEVICES",
      catalog_variant: variant.catalogVariant,
      strengthened_truss_element: "LATTICE_MEMBERS",
      official_measure: "M_OF_TRUSS",
      source_id: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
      exact_locator: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_TRUSS_LENGTH_TIMES_EXACT_KRER_46_05_002_02_RATES_PER_M",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      removal_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-002-02-temporary-truss-lattice-strengthening-devices-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-002",
      rate: "46-05-002-02",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [63, 64],
      resourceRatePrintedAndPdfPages: [63, 64],
      exactLocator: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["truss_length_m", profileParameterId, confirmedParameterId],
      resourceRatesPerM: {
        constructionLaborGrade2_9ManHours: 10.09,
        machinistLaborManHours: 0.01,
        truckCrane10tMachineHours: 0.01,
        electricWinch19_62knMachineHours: 1.16,
        truck5tMachineHours: 0.02,
        squareTimberPieces1_8kgTonnes: 0.00273,
        impregnatedHempRopeTonnes: 0.00001,
        threeStrandKapronRopeTonnes: 0.00006,
        hotRolledWireRodTonnes: 0.00018,
        deckingShieldsSquareMetres: 0.5,
      },
      strengthenedTrussElement: "LATTICE_MEMBERS",
      removalIncluded: true,
      machineResourcesIncluded: true,
      materialResourcesIncluded: true,
      machinistLaborPricedSeparately: false,
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `устройства при усилении решётки ферм — ${variantContextRu}`,
      `лебёдки лестницы полки подмости и страховочный канат для усиления решётки ферм — ${variantContextRu}`,
      `КРЕР 46-05-002-02 — ${variantContextRu}`,
      `${variantKey} truss lattice strengthening access and rigging devices`,
    ],
    shortScopeRu: `Установка, перестановка и снятие подтверждённых временных устройств при усилении решётки ферм (${variantContextRu}) по точным ресурсам КРЕР 46-05-002-02.`,
    keyDistinguishingParameters: ["truss_length_m", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "лебёдки, такелажная оснастка, лестницы, полки, подмости и страховочный канат",
      "установка, перестановка и снятие временных устройств",
      "точный труд рабочих разряда 2,9, машины и материалы по КРЕР 46-05-002-02",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "устройства при усилении поясов ферм по колонке 01",
      "собственно усиление решётки и прочие металлоконструкции",
      "временные защитные ограждения по таблице 46-05-001",
      "неподтверждённый возврат материалов и проектирование усиления",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `установка снятие перестановка лебёдки такелаж лестницы полки подмости страховочный канат усиление решётки ферм ${variantContextRu} КРЕР 46`,
    sourceProvenance: {
      officialKrer462015Rate460500202: true,
      exactOfficialArtifactSha256: TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      removalPreservedInsideOfficialRate: true,
      adjacentColumn01Rejected: true,
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
      workKey: `temporary_truss_lattice_strengthening_devices_krer_46_05_002_02_${variantKey}`,
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
      workFamilyId: "truss_strengthening_temporary_devices",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_05_002_02",
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
      technologyVariant: "КРЕР 46-05-002-02; временные устройства при усилении решётки ферм",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-002-02"],
      applicabilityTags: ["TRUSS_STRENGTHENING", "LATTICE_MEMBERS", "TEMPORARY_ACCESS_AND_RIGGING", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /truss_chord|46_05_002_01|пояс.*ферм/iu,
    /temporary.*barrier|protective_barrier|46_05_001|защитн.*огражд/iu,
    /structural_strengthening|metal_strengthening|усилен.*металлоконструкц/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_TRUSS_LATTICE_STRENGTHENING_DEVICES_KRER46_02_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
