import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA,
  type AggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46VariantKey,
  compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1,
  resolveAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Variant,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as AggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46VariantKey;
const variant = resolveAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const groupId = "wg:master:demolition_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm";
const groupNameRu = "Разборка полимерцементного или эпоксидного покрытия пола толщиной 5 мм в агрессивной среде";
const rowPrefix = "f09:aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_demolition";
const profileParameterId =
  "existing_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_profile";
const confirmedParameterId =
  "existing_polymer_cement_or_epoxy_composition_floor_5mm_aggressive_environment_confirmed";

async function verifyCore(): Promise<Json> {
  const short = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1(
    { ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const expectedShort = ["100", "5.27", "1.1", "1.1", "2.2"];
  const expectedAcceptance = ["35.5", "1.87085", "0.3905", "0.3905", "0.781"];
  const shortQuantities = short.rows.map((row) => row.quantity);
  const acceptanceQuantities = acceptance.rows.map((row) => row.quantity);
  if (!(short.preliminaryNeeds.length === 0
    && JSON.stringify(shortQuantities) === JSON.stringify(expectedShort))) {
    throw new Error(`STOP_S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}_SHORT_FIXTURE`);
  }
  if (!(acceptance.preliminaryNeeds.length === 0
    && JSON.stringify(acceptanceQuantities) === JSON.stringify(expectedAcceptance))) {
    throw new Error(`STOP_S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error(`STOP_S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRate: "46-04-011-11",
    short: { rowCount: short.rows.length, quantities: shortQuantities },
    acceptance: { areaM2: "35.5", quantities: acceptanceQuantities },
    incomplete: { rowCount: 0, preliminaryNeedCount: 5 },
    machineResourcesIncluded: true,
    salvageableTileOrBrickCleaningApplicable: false,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-aggressive-environment-polymer-cement-or-epoxy-composition-floor-5mm-demolition-krer46-${variantKey}-append-successor.v1`,
  stopCode: `S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}`,
  applicationName: `s27-3-f09-composition-floor-demolition-krer46-11-${variantKey}-append-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "99ef0883-46a4-5b36-86fe-7e7986aa01d6",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "b3a2b5dc-79dd-5319-8875-3181de7f04dd",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/composition-floor-demolition-krer46-11-${variantKey}-append-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1.ts",
    "tests/estimateNorms/aggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [0, 0, 0],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_11_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `aggressive_environment_composition_floor_5mm_demolition_krer_46_04_011_11_${variantKey}`,
    physicalResultRu: `Подтверждённая площадь существующего покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде (${variantContextRu}) разобрана по КРЕР 46-04-011-11`,
    includedScopeRu: [
      "разборка существующего покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм",
      "труд рабочих среднего разряда 3,1 по норме 5,27 чел.-ч на 100 м²",
      "справочный труд машинистов 1,10 чел.-ч на 100 м² без повторной оплаты",
      "компрессор 1,10 маш.-ч и пневматические отбойные молотки 2,20 маш.-ч на 100 м²",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта",
    ],
    excludedScopeRu: [
      "очистка годных плиток или кирпича — неприменима к сплошному композиционному покрытию",
      "основание и новая конструкция пола",
      "другие материалы покрытия, другая толщина и обычная среда",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_COMPOSITION_FLOOR_COVERING_IN_AGGRESSIVE_ENVIRONMENT",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    existingCoveringMaterial: "POLYMER_CEMENT_OR_EPOXY_COMPOSITION",
    existingThicknessMm: 5,
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRate: "46-04-011-11",
    machineResourcesIncluded: true,
    classificationFactorClaimed: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_COMPOSITION_FLOOR_5MM_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      existing_covering_material: "POLYMER_CEMENT_OR_EPOXY_COMPOSITION",
      existing_thickness_mm: 5,
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_ID,
      norm_id: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_EXACT_KRER_46_04_011_11_RATE_PER_100_M2",
      machine_resources_included: true,
      offsite_waste_haul_included: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-11-aggressive-environment-composition-floor-5mm-demolition-${variantKey}-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE",
      collection: "KRER_46_2015",
      table: "46-04-011",
      rate: "46-04-011-11",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPages: [59, 60],
      exactLocator: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["floor_covering_area_m2", profileParameterId, confirmedParameterId],
      resourceRatesPer100M2: {
        constructionLaborGrade3_1ManHours: 5.27,
        machinistLaborManHoursInformational: 1.1,
        compressorMachineHours: 1.1,
        pneumaticBreakerMachineHours: 2.2,
      },
      salvageableTileOrBrickCleaningApplicable: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж полимерцементного или эпоксидного пола 5 мм — ${variantContextRu}`,
      `разборка композиционного покрытия пола 5 мм в агрессивной среде — ${variantContextRu}`,
      `КРЕР 46-04-011-11 — ${variantContextRu}`,
      `${variantKey} aggressive-environment polymer cement epoxy composition floor demolition`,
    ],
    shortScopeRu: `Разборка подтверждённого покрытия пола из полимерцементной или эпоксидной композиции толщиной 5 мм в агрессивной среде (${variantContextRu}) по точным ресурсам КРЕР 46-04-011-11.`,
    keyDistinguishingParameters: ["floor_covering_area_m2", profileParameterId, confirmedParameterId],
    clarificationFields: [profileParameterId, confirmedParameterId],
    includedBoundaries: [
      "разборка композиционного покрытия толщиной 5 мм",
      "точные трудовые и машинные ресурсы КРЕР 46-04-011-11",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "очистка годных плиток или кирпича",
      "основание и новая конструкция пола",
      "другие материалы и толщины покрытия",
      "внеобъектовый вывоз и полигон",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `разборка демонтаж полимерцемент эпоксидная композиция пол 5 мм агрессивная среда ${variantContextRu} КРЕР 46 реконструкция`,
    sourceProvenance: {
      officialKrer462015Rate460401111: true,
      exactOfficialArtifactSha256: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      exactLaborAndMachineRatesApplied: true,
      salvageableTileOrBrickCleaningRejectedAsInapplicable: true,
      otherCoveringsAndColumnsRejected: true,
      ordinaryEnvironmentRejected: true,
      classificationFactorRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  catalogAppend: {
    identity: {
      namespace: "global",
      domain: "demolition",
      sourceIdentity: variant.sourceIdentity,
      workKey: `aggressive_environment_composition_floor_5mm_demolition_krer_46_04_011_11_${variantKey}`,
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
        exactRateFamily: "KRER_46_04_011_11",
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
      technologyVariant: "КРЕР 46-04-011-11; полимерцементная или эпоксидная композиция; 5 мм; агрессивная среда",
      constructionState: "EXISTING",
      normativeClassifiers: ["КРЕР 46-04-011-11"],
      applicabilityTags: ["AGGRESSIVE_ENVIRONMENT", "COMPOSITION_FLOOR", "THICKNESS_5_MM", variantKey.toUpperCase()],
      publicationState: "ADMITTED_BACKEND",
      catalogOrigin: "GLOBAL",
      adjudicationClass: "EFFECTIVE_WORK",
      selectable: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_floor|floor_install|screed_install|нов.*покрыт|устройств.*стяж/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /parquet|asphalt|wood_block|metal_plate|паркет|асфальт|деревян|металл/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}_APPEND_SUCCESSOR`,
  receiptFileStem: `S273_F09_COMPOSITION_FLOOR_DEMOLITION_KRER46_11_${variantToken}`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
