import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  type TemporaryLowerBeamChordStrengtheningDevicesKrer46VariantKey,
  compileTemporaryLowerBeamChordStrengtheningDevicesKrer46R1,
  resolveTemporaryLowerBeamChordStrengtheningDevicesKrer46Variant,
} from "../../../src/lib/estimate/v4/temporaryLowerBeamChordStrengtheningDevicesKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID))
  throw new Error("STOP_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_CORRECTION_PARENT_REQUIRED");
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument))
  throw new Error(`STOP_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_VARIANT:${variantArgument}`);
const variantKey = variantArgument as TemporaryLowerBeamChordStrengtheningDevicesKrer46VariantKey;
const variant = resolveTemporaryLowerBeamChordStrengtheningDevicesKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = { standard: "стандартный вариант", large_area: "большая длина", small_area: "локальный объём", wet_zone: "влажная зона" }[variantKey];
const groupId = "wg:master:temporary_lower_beam_chord_strengthening_devices";
const groupNameRu = "Устройства при усилении нижних поясов балок";
const rowPrefix = "f09:temporary_lower_beam_chord_strengthening_devices";
const profileParameterId = "lower_beam_chord_strengthening_devices_profile";
const confirmedParameterId = "lower_beam_chord_strengthening_devices_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileTemporaryLowerBeamChordStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT }, { catalogId: variant.catalogId },
  );
  const acceptance = await compileTemporaryLowerBeamChordStrengtheningDevicesKrer46R1(
    { ...TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT }, { catalogId: variant.catalogId },
  );
  const incomplete = await compileTemporaryLowerBeamChordStrengtheningDevicesKrer46R1(
    { lower_beam_chord_length_m: 35.5 }, { catalogId: variant.catalogId },
  );
  const expectedShort = ["1", "13.52", "0.07", "0.07", "1.36", "0.1", "0.00002", "0.00001", "0.01", "0.00004", "0.6"];
  const expectedAcceptance = ["35.5", "479.96", "2.485", "2.485", "48.28", "3.55", "0.00071", "0.000355", "0.355", "0.00142", "21.3"];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0 && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort)))
    throw new Error(`STOP_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_SHORT_FIXTURE`);
  if (!(acceptance.preliminaryNeeds.length === 0 && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance)))
    throw new Error(`STOP_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_ACCEPTANCE_FIXTURE`);
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 11))
    throw new Error(`STOP_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_FAIL_CLOSED`);
  return { status: `GREEN_S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_CORE`,
    variantKey, catalogId: variant.catalogId, exactRate: "46-05-005-02",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { lowerBeamChordLengthM: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 11 }, upperChordColumnRejected: true,
    machineResourcesIncluded: true, machinistLaborPricedSeparately: false, devicesRemovalIncluded: true,
    classificationFactorClaimed: false, offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256").update(JSON.stringify({ short, acceptance, incomplete })).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-temporary-lower-beam-chord-strengthening-devices-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}`,
  applicationName: `s27-3-f09-temporary-lower-beam-chord-strengthening-devices-krer46-05-02-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256 ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID ?? "0b348a0e-63ab-5655-ab6c-39de9ebea6e9",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID ?? "7cb60c95-2058-5ced-acc0-f2e326f6b4c7",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/temporary-lower-beam-chord-strengthening-devices-krer46-05-02-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/temporaryLowerBeamChordStrengtheningDevicesKrer46R1.ts",
    "tests/estimateNorms/temporaryLowerBeamChordStrengtheningDevicesKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts", "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareTemporaryLowerBeamChordStrengtheningDevicesKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId, sourceId: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
  normId: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_NORM_ID,
  sourceMetadata: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  parameterDefinitions: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  formulaDefinitions: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  resourceDefinitions: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  shortInput: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  acceptanceInput: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  verifyCore, expectedParentShape: replaceExisting ? [3, 11, 11] : [0, 0, 0], benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `temporary_lower_beam_chord_strengthening_devices_krer_46_05_005_02_${variantKey}`,
    physicalResultRu: `Временные устройства доступа, такелажа и безопасности при усилении нижних поясов балок (${variantContextRu}) установлены, переставлены и сняты по КРЕР 46-05-005-02`,
    includedScopeRu: ["установка и снятие лебёдок и такелажной оснастки", "установка, перестановка и снятие приставных инвентарных лестниц", "подъём, навеска, перестановка и снятие лестниц, люлек, подмостей и страховочного каната", "труд рабочих среднего разряда 3,0 — 13,52 чел.-ч на метр нижнего пояса балки", "точные нормы машин и материалов по колонке 46-05-005-02", "справочный труд машинистов 0,07 чел.-ч без повторной оплаты"],
    excludedScopeRu: ["устройства при усилении верхних поясов балок по колонке 46-05-005-01", "устройства при усилении ферм по таблицам 46-05-002–46-05-004", "собственно усиление металлоконструкций нижнего пояса балки", "неподтверждённый коэффициент повторного использования или возвратная стоимость", "неподтверждённые цены"],
    independentCompletenessMap: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: { country: "KG", operationClass: "INSTALL_REARRANGE_AND_REMOVE_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES",
    catalogVariant: variant.catalogVariant, primaryMeasureParameterId: "lower_beam_chord_length_m",
    geometryParameters: ["lower_beam_chord_length_m"], strengthenedBeamElement: "LOWER_CHORD", officialMeasure: "METRE_OF_BEAM",
    officialUnitRateSource: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
    officialArtifactSha256: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    exactRate: "46-05-005-02", machineResourcesIncluded: true, materialResourcesIncluded: true,
    machinistLaborPricedSeparately: false, removalIncluded: true, upperChordColumnRejected: true,
    classificationFactorClaimed: false, offsiteWasteHaulIncluded: false },
  binding: { rowId: `${rowPrefix}:labor`, applicability: {
    technology_class: "TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES",
    operation_class: "INSTALL_REARRANGE_AND_REMOVE_BEAM_STRENGTHENING_DEVICES", catalog_variant: variant.catalogVariant,
    strengthened_beam_element: "LOWER_CHORD", official_measure: "METRE_OF_BEAM",
    source_id: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_ID,
    norm_id: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_NORM_ID,
    exact_locator: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
    official_artifact_sha256: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
    quantity_basis: "OFFICIAL_RATE_PER_METRE_TIMES_CONFIRMED_LOWER_BEAM_CHORD_LENGTH",
    machine_resources_included: true, material_resources_included: true,
    machinist_labor_priced_separately: false, removal_included: true } },
  locator: { key: `kg-krer-46-05-005-02-temporary-lower-beam-chord-strengthening-devices-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: { kind: "OFFICIAL_KG_UNIT_RATE", collection: "KRER_46_2015", table: "46-05-005",
      rateColumns: ["46-05-005-02"], catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5, workScopePrintedAndPdfPages: [65], resourceRatePrintedAndPdfPages: [65],
      exactLocator: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["lower_beam_chord_length_m", profileParameterId, confirmedParameterId],
      resourceRatesPerMetre: { constructionLaborGrade3_0ManHours: 13.52, machinistLaborManHours: 0.07,
        truckCrane10tMachineHours: 0.07, electricWinch19_62knMachineHours: 1.36, truck5tMachineHours: 0.1,
        impregnatedHempRopeTonnes: 0.00002, threeStrandKapronRopeTonnes: 0.00001,
        separateStructuralElementsTonnes: 0.01, hotRolledWireRodTonnes: 0.00004, deckingShieldsSquareMetres: 0.6 },
      strengthenedBeamElement: "LOWER_CHORD", upperChordColumnRejected: true, removalIncluded: true,
      machinistLaborPricedSeparately: false } },
  search: { primaryUom: "m", canonicalNameRu: variant.canonicalNameRu,
    aliases: [`устройства при усилении нижнего пояса балки — ${variantContextRu}`, `лебёдки лестницы люльки подмости и страховочный канат для нижнего пояса балки — ${variantContextRu}`, `КРЕР 46-05-005-02 нижний пояс балки — ${variantContextRu}`, `${variantKey} lower beam chord access and rigging devices`],
    shortScopeRu: `Установка, перестановка и снятие временных устройств при усилении нижних поясов балок (${variantContextRu}) по точным ресурсам КРЕР 46-05-005-02.`,
    keyDistinguishingParameters: ["lower_beam_chord_length_m", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: ["лебёдки, такелажная оснастка, лестницы, люльки, подмости и страховочный канат", "установка, перестановка и снятие временных устройств", "точный труд, машины и материалы колонки 46-05-005-02", "справочный труд машинистов без повторной оплаты"],
    excludedBoundaries: ["верхний пояс балки по колонке 46-05-005-01", "устройства для ферм по таблицам 46-05-002–46-05-004", "собственно усиление металлоконструкций балки", "неподтверждённые возврат материалов и цены"],
    extraSearchTermsRu: `установка снятие перестановка лебёдки такелаж лестницы люльки подмости страховочный канат нижний пояс балки ${variantContextRu} КРЕР 46`,
    sourceProvenance: { officialKrer462015Table460500502: true,
      exactOfficialArtifactSha256: TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
      exactLaborMachineAndMaterialRatesApplied: true, machinistLaborNoDoubleCount: true,
      removalPreservedInsideOfficialRate: true, upperChordColumnRejected: true, adjacentTrussTablesRejected: true,
      structuralStrengtheningItselfRejected: true, unverifiedReuseFactorRejected: true } },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: { namespace: "global", domain: "temporary_works", sourceIdentity: variant.sourceIdentity,
      workKey: `temporary_lower_beam_chord_strengthening_devices_krer_46_05_005_02_${variantKey}`,
      titleRu: variant.canonicalNameRu, denominatorEligible: true },
    searchPlacement: { groupMode: variantKey === "standard" ? "create" : "join", groupId, groupNameRu,
      domainId: "temporary_works", systemId: "structural_reconstruction", subsystemId: groupId, assemblyId: groupId,
      workFamilyId: "lower_beam_chord_strengthening_temporary_devices", breadcrumb: [groupNameRu],
      groupOracleDisposition: { contract: "rik-expo-app.s27-3.catalog-append.v1", disposition: "EXACT_PHYSICAL_WORK_GROUP", exactRateFamily: "KRER_46_05_005_02" },
      membershipOrdinal: variantOrdinal, independentDisposition: { contract: "rik-expo-app.s27-3.catalog-append.v1",
        classification: "CANONICAL_VISIBLE", exactPhysicalIdentity: true, appendedWithoutReplacingExistingIdentity: true },
      elementType: "WORK", operationKind: "NEW_INSTALLATION",
      technologyVariant: "КРЕР 46-05-005-02; устройства при усилении нижних поясов балок",
      constructionState: "TEMPORARY", normativeClassifiers: ["КРЕР 46-05-005-02"],
      applicabilityTags: ["BEAM_STRENGTHENING", "LOWER_CHORD", "TEMPORARY_ACCESS_AND_RIGGING", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND", catalogOrigin: "GLOBAL", adjudicationClass: "EFFECTIVE_WORK", selectable: true },
  } }),
  forbiddenAdjacentMatchers: [
    /temporary_upper_beam_chord_strengthening_devices|46_05_005_01|верхн.*пояс.*бал/iu,
    /temporary_truss_(?:chord|lattice|node)|46_05_00[234]|узл.*ферм|реш[её]тк.*ферм/iu,
    /temporary.*barrier|protective_barrier|46_05_001|защитн.*огражд/iu,
    /structural_strengthening|metal_strengthening|усилен.*металлоконструкц/iu,
    /reuse_factor|recovery_credit|возвратн.*стоим/iu,
    /area_factor|minimum_area|mobilization_surcharge|коэффициент.*площад/iu,
  ],
  owner: `S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_TEMPORARY_LOWER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_05_02_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
