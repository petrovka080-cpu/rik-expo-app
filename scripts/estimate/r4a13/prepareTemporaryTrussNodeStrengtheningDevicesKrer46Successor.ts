import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  type TemporaryTrussNodeStrengtheningDevicesKrer46VariantKey,
  compileTemporaryTrussNodeStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryTrussNodeStrengtheningDevicesKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as TemporaryTrussNodeStrengtheningDevicesKrer46VariantKey;
const variant = resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:temporary_truss_node_strengthening_devices";
const groupNameRu = "Устройства при усилении узлов ферм";
const rowPrefix = "f09:temporary_truss_node_strengthening_devices";
const profileParameterId = "truss_node_strengthening_devices_profile";
const confirmedParameterId = "truss_node_strengthening_devices_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
    { truss_node_count: 3 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = [
    "1", "35.64", "0.04", "0.04", "3.48", "0.07", "0.00515", "0.00006",
    "0.00004", "0.00012", "0.49",
  ];
  const expectedAcceptance = [
    "3", "106.92", "0.12", "0.12", "10.44", "0.21", "0.01545", "0.00018",
    "0.00012", "0.00036", "1.47",
  ];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-05-004-01",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { trussNodeCount: "3", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 11 },
    exactSingleColumnRatePerNode: true,
    machineResourcesIncluded: true,
    machinistLaborPricedSeparately: false,
    devicesRemovalIncluded: true,
    adjacentLengthAndElementRatesRejected: true,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-temporary-truss-node-strengthening-devices-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}`,
  applicationName: `s27-3-f09-temporary-truss-node-strengthening-devices-krer46-04-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "29570e92-8663-599d-995f-2c4c2d3cfaf8",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "dd69d924-a56a-551d-ba21-b9a7e401a0b0",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-truss-node-strengthening-devices-krer46-04-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryTrussNodeStrengtheningDevicesKrer46R1.ts",
    "tests/estimateNorms/temporaryTrussNodeStrengtheningDevicesKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryTrussNodeStrengtheningDevicesKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  normId: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  shortInput: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 11, 11] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_truss_node_strengthening_devices_krer_46_05_004_01_${variantKey}`,
    physicalResultRu: `Временные устройства доступа, такелажа и безопасности при усилении узлов ферм (${variantContextRu}) установлены, переставлены и сняты по КРЕР 46-05-004-01`,
    includedScopeRu: [
      "установка и снятие лебёдок и такелажной оснастки",
      "установка, перестановка и снятие приставных инвентарных лестниц",
      "подъём, навеска, перенавеска и снятие навесных лестниц и полок, индивидуальных сборно-разборных подмостей и страховочного каната",
      "труд рабочих среднего разряда 3,0 — 35,64 чел.-ч на узел фермы",
      "точные нормы автокрана 10 т, электрической лебёдки 19,62 кН и бортового автомобиля до 5 т",
      "точные нормы поковок, пенькового и капронового канатов, катанки и щитов настила",
      "справочный труд машинистов 0,04 чел.-ч без повторной оплаты",
    ],
    excludedScopeRu: [
      "устройства по длине ферм для поясов или решётки по таблице 46-05-002",
      "устройства при усилении отдельных элементов решётки по таблице 46-05-003",
      "устройства при усилении верхних или нижних поясов балок по таблице 46-05-005",
      "собственно усиление металлоконструкций узлов ферм",
      "неподтверждённый коэффициент повторного использования или возвратная стоимость материалов",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_NODE_STRENGTHENING_DEVICES",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "truss_node_count",
    geometryParameters: ["truss_node_count"],
    strengthenedTrussElement: "TRUSS_NODE",
    officialMeasure: "TRUSS_NODE",
    officialUnitRateSource: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-004-01",
    exactSingleColumnRatePerNode: true,
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
      technology_class: "TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES",
      operation_class: "INSTALL_REARRANGE_AND_REMOVE_TRUSS_STRENGTHENING_DEVICES",
      catalog_variant: variant.catalogVariant,
      strengthened_truss_element: "TRUSS_NODE",
      official_measure: "TRUSS_NODE",
      source_id: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
      norm_id: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_NORM_ID,
      exact_locator: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      quantity_basis: "OFFICIAL_RATE_PER_TRUSS_NODE_TIMES_INTEGER_NODE_COUNT",
      machine_resources_included: true,
      material_resources_included: true,
      machinist_labor_priced_separately: false,
      removal_included: true,
    },
  },
  locator: {
    key: `kg-krer-46-05-004-01-temporary-truss-node-strengthening-devices-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-05-004",
      rateColumns: ["46-05-004-01"],
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [64],
      resourceRatePrintedAndPdfPages: [65],
      exactLocator: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["truss_node_count", profileParameterId, confirmedParameterId],
      resourceRatesPerTrussNode: {
        constructionLaborGrade3_0ManHours: 35.64,
        machinistLaborManHours: 0.04,
        truckCrane10tMachineHours: 0.04,
        electricWinch19_62knMachineHours: 3.48,
        truck5tMachineHours: 0.07,
        squareTimberPieces1_8kgTonnes: 0.00515,
        impregnatedHempRopeTonnes: 0.00006,
        threeStrandKapronRopeTonnes: 0.00004,
        hotRolledWireRodTonnes: 0.00012,
        deckingShieldsSquareMetres: 0.49,
      },
      strengthenedTrussElement: "TRUSS_NODE",
      exactSingleColumnRatePerNode: true,
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
      `устройства при усилении узлов ферм — ${variantContextRu}`,
      `лебёдки лестницы полки подмости и страховочный канат для узлов ферм — ${variantContextRu}`,
      `КРЕР 46-05-004-01 узел фермы — ${variantContextRu}`,
      `${variantKey} truss node access and rigging devices`,
    ],
    shortScopeRu: `Установка, перестановка и снятие временных устройств при усилении узлов ферм (${variantContextRu}) по точным ресурсам КРЕР 46-05-004-01.`,
    keyDistinguishingParameters: ["truss_node_count", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "лебёдки, такелажная оснастка, лестницы, полки, подмости и страховочный канат",
      "установка, перестановка и снятие временных устройств",
      "точный труд рабочих разряда 3,0, машины и материалы по КРЕР 46-05-004-01",
      "справочный труд машинистов без повторной оплаты",
    ],
    excludedBoundaries: [
      "устройства по длине ферм по таблице 46-05-002",
      "устройства для отдельных элементов решётки по таблице 46-05-003",
      "устройства для поясов балок по таблице 46-05-005",
      "собственно усиление узлов и прочих металлоконструкций",
      "неподтверждённые возврат материалов и цены",
    ],
    extraSearchTermsRu: `установка снятие перестановка лебёдки такелаж лестницы полки подмости страховочный канат узел узлы фермы ${variantContextRu} КРЕР 46`,
    sourceProvenance: {
      officialKrer462015Table460500401: true,
      exactOfficialArtifactSha256: TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true,
      machinistLaborNoDoubleCount: true,
      removalPreservedInsideOfficialRate: true,
      adjacentLengthElementAndBeamChordTablesRejected: true,
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
      workKey: `temporary_truss_node_strengthening_devices_krer_46_05_004_01_${variantKey}`,
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
      workFamilyId: "truss_node_strengthening_temporary_devices",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_05_004_01",
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
      technologyVariant: "КРЕР 46-05-004-01; устройства при усилении узлов ферм",
      constructionState: "TEMPORARY",
      normativeClassifiers: ["КРЕР 46-05-004-01"],
      applicabilityTags: ["TRUSS_STRENGTHENING", "TRUSS_NODE", "TEMPORARY_ACCESS_AND_RIGGING", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /temporary_truss_(?:chord|lattice)_strengthening_devices|46_05_002|по.*длин.*ферм/iu,
    /temporary_truss_lattice_element_strengthening_devices|46_05_003|отдельн.*элемент.*реш[её]тк/iu,
    /beam_chord|46_05_005|пояс.*бал/iu,
    /temporary.*barrier|protective_barrier|46_05_001|защитн.*огражд/iu,
    /structural_strengthening|metal_strengthening|усилен.*металлоконструкц/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_04_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
