import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1,
  resolveAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Variant,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const replaceExisting = process.argv.includes("--replace-existing");
if (replaceExisting && (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID)) {
  throw new Error("STOP_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_CORRECTION_PARENT_REQUIRED");
}
const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as AggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46VariantKey;
const variant = resolveAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:demolition_aggressive_environment_polyvinyl_chloride_sheet_roll_floor";
const groupNameRu = "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде";
const rowPrefix = "f09:aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition";
const profileParameterId =
  "existing_aggressive_environment_polyvinyl_chloride_sheet_roll_floor_profile";
const confirmedParameterId =
  "existing_polyvinyl_chloride_sheet_roll_floor_aggressive_environment_confirmed";
const publicationMode = replaceExisting ? "correction" : "append";

async function verifyCore(): Promise<Json> {
  const short = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = ["100", "33"];
  const expectedAcceptance = ["35.5", "11.715"];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 2)) {
    throw new Error(`STOP_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-011-14",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 2 },
    machineResourcesIncluded: false,
    salvageableTileOrBrickCleaningApplicable: false,
    thicknessAdjustmentRateIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-aggressive-environment-polyvinyl-chloride-sheet-roll-floor-demolition-krer46-${variantKey}-${publicationMode}-successor.v1`,
  stopCode: `S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}`,
  applicationName: `s27-3-f09-polyvinyl-chloride-sheet-roll-floor-demolition-krer46-14-${variantKey}-${publicationMode}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "fd03e851-7d06-5c2c-84b3-cd81181b6bcd",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e56a9c35-77ce-50aa-ac94-5821d1b825b7",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/polyvinyl-chloride-sheet-roll-floor-demolition-krer46-14-${variantKey}-${publicationMode}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1.ts",
    "tests/estimateNorms/aggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: replaceExisting ? [3, 2, 2] : [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition_krer_46_04_011_14_${variantKey}`,
    physicalResultRu: `Подтверждённая площадь существующего покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде (${variantContextRu}) разобрана по КРЕР 46-04-011-14`,
    includedScopeRu: [
      "разборка существующего покрытия пола из поливинилхлоридных листовых рулонных материалов",
      "труд рабочих среднего разряда 2,0 по норме 33,00 чел.-ч на 100 м²",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта",
    ],
    excludedScopeRu: [
      "очистка годных плиток или кирпича — неприменима к листовым рулонным материалам",
      "труд машинистов и машины — отсутствуют в колонке 46-04-011-14",
      "основание и новая конструкция пола",
      "другие материалы покрытия и обычная среда",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_COVERING_IN_AGGRESSIVE_ENVIRONMENT",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingCoveringMaterial: "POLYVINYL_CHLORIDE_SHEET_ROLL",
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-011-14",
    machineResourcesIncluded: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_covering_material: "POLYVINYL_CHLORIDE_SHEET_ROLL",
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_46_04_011_14_RATE_PER_100_M2",
      machine_resources_included: false,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-14-aggressive-environment-polyvinyl-chloride-sheet-roll-floor-demolition-${variantKey}-${replaceExisting ? "correction-v1" : "v1"}`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: "46-04-011-14",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPages: [58, 59],
      resourceRatePrintedAndPdfPage: 60,
      exactLocator: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["floor_covering_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade2_0ManHours: 33,
      },
      machineResourcesIncluded: false,
      salvageableTileOrBrickCleaningApplicable: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж пола из поливинилхлоридных листовых рулонных материалов — ${variantContextRu}`,
      `разборка покрытия пола из ПВХ листовых и рулонных материалов в агрессивной среде — ${variantContextRu}`,
      `КРЕР 46-04-011-14 — ${variantContextRu}`,
      `${variantKey} aggressive-environment polyvinyl chloride sheet roll floor demolition`,
    ],
    shortScopeRu: `Разборка подтверждённого покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде (${variantContextRu}) по точным ресурсам КРЕР 46-04-011-14.`,
    keyDistinguishingParameters: ["floor_covering_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "разборка покрытия из поливинилхлоридных листовых рулонных материалов",
      "точный труд рабочих разряда 2,0 по КРЕР 46-04-011-14 без машин",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "очистка годных плиток или кирпича",
      "основание и новая конструкция пола",
      "другие материалы покрытия",
      "внеобъектовый вывоз и полигон",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `разборка демонтаж поливинилхлоридное листовое рулонное покрытие пола агрессивная среда ${variantContextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401114: true,
      exactOfficialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborRateAppliedAndAbsentMachinesPreserved: true,
      salvageableTileOrBrickCleaningRejectedAsInapplicable: true,
      otherCoveringsAndColumnsRejected: true,
      ordinaryEnvironmentRejected: true,
      classificationFactorRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  ...(replaceExisting ? {} : { catalogAppend: {
    identity: {
      namespace: "global",
      domain: "demolition",
      sourceIdentity: variant.sourceIdentity,
      workKey: `aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition_krer_46_04_011_14_${variantKey}`,
      titleRu: variant.canonicalNameRu,
      denominatorEligible: true,
    },
    searchPlacement: {
      groupMode: variantKey === "standard" ? "create" : "join",
      groupId,
      groupNameRu,
      domainId: "demolition",
      systemId: "demolition",
      subsystemId: groupId,
      assemblyId: groupId,
      workFamilyId: "demolition",
      breadcrumb: [groupNameRu],
      groupOracleDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        disposition: "EXACT_PHYSICAL_WORK_GROUP",
        exactRateFamily: "KRER_46_04_011_14",
      },
      membershipOrdinal: variantOrdinal,
      independentDisposition: {
        contract: "rik-expo-app.s27-3.catalog-append.v1",
        classification: "CANONICAL_VISIBLE",
        exactPhysicalIdentity: true,
        appendedWithoutReplacingExistingIdentity: true,
      },
      elementType: "WORK",
      operationKind: "DEMOLITION",
      technologyVariant: "КРЕР 46-04-011-14; покрытие пола из поливинилхлоридных листовых рулонных материалов; агрессивная среда",
      constructionState: "EXISTING",
      normativeClassifiers: ["КРЕР 46-04-011-14"],
      applicabilityTags: ["AGGRESSIVE_ENVIRONMENT", "POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  } }),
  forbiddenAdjacentMatchers: [
    /new_floor|floor_install|screed_install|нов.*покрыт|устройств.*стяж/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /parquet|asphalt|wood_block|metal_plate|паркет|асфальт|деревян|металл/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_${publicationMode.toUpperCase()}_SUCCESSOR`,
  receiptFileStem: `S273_F09_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_14_${variantToken}_${publicationMode.toUpperCase()}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
