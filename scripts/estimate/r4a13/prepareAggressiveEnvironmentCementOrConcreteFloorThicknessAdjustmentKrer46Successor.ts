import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID,
  compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2";
import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  type AggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46VariantKey,
  resolveAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Variant,
} from "../../../src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

if (!process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  || !process.env.R4A13_PARENT_SEARCH_RELEASE_ID) {
  throw new Error("STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_PARENT_REQUIRED");
}

const variantArgument = process.argv.find((argument) => argument.startsWith("--variant="))
  ?.slice("--variant=".length) ?? "standard";
if (!["standard", "large_area", "small_area", "wet_zone"].includes(variantArgument)) {
  throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_VARIANT:${variantArgument}`);
}
const variantKey = variantArgument as AggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46VariantKey;
const variant = resolveAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Variant(variantKey);
const variantOrdinal = { standard: 0, large_area: 1, small_area: 2, wet_zone: 3 }[variantKey];
const variantToken = variantKey.toUpperCase();
const variantContextRu = {
  standard: "стандартный вариант",
  large_area: "большая площадь",
  small_area: "малая площадь",
  wet_zone: "влажная зона",
}[variantKey];
const rowPrefix = "f09:aggressive_environment_cement_or_concrete_floor_25mm_demolition";
const profileParameterId = "existing_aggressive_environment_cement_or_concrete_floor_25mm_profile";
const confirmedParameterId = "existing_cement_or_concrete_floor_25mm_aggressive_environment_confirmed";

async function verifyCore(): Promise<Json> {
  const base = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
    { ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT },
    { catalogId: variant.catalogId },
  );
  const positive = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
    {
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: 1,
    },
    { catalogId: variant.catalogId },
  );
  const negative = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
    {
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: -1,
    },
    { catalogId: variant.catalogId },
  );
  const acceptance = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
    { ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT },
    { catalogId: variant.catalogId },
  );
  const incomplete = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
    { floor_covering_area_m2: 100 },
    { catalogId: variant.catalogId },
  );
  const quantities = (compiled: typeof base) => compiled.rows.map((row) => row.quantity);
  if (JSON.stringify(quantities(base)) !== JSON.stringify(["100", "28.54", "5.58", "5.58", "11.16"])) {
    throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_BASE_FIXTURE`);
  }
  if (JSON.stringify(quantities(positive)) !== JSON.stringify(["100", "32.04", "6.68", "6.68", "13.36"])) {
    throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_POSITIVE_FIXTURE`);
  }
  if (JSON.stringify(quantities(negative)) !== JSON.stringify(["100", "25.04", "4.48", "4.48", "8.96"])) {
    throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_NEGATIVE_FIXTURE`);
  }
  if (JSON.stringify(quantities(acceptance)) !== JSON.stringify(["35.5", "11.3742", "2.3714", "2.3714", "4.7428"])) {
    throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_ACCEPTANCE_FIXTURE`);
  }
  if (!(incomplete.rows.length === 0 && incomplete.preliminaryNeeds.length === 5)) {
    throw new Error(`STOP_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_FAIL_CLOSED`);
  }
  return {
    status: `GREEN_S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    exactRates: ["46-04-011-12", "46-04-011-13"],
    base: { thicknessMm: 25, quantities: quantities(base) },
    positive: { thicknessMm: 30, quantities: quantities(positive) },
    negative: { thicknessMm: 20, quantities: quantities(negative) },
    acceptance: { areaM2: "35.5", thicknessMm: 30, quantities: quantities(acceptance) },
    incomplete: { rowCount: 0, preliminaryNeedCount: 5 },
    standaloneRate13WorkCreated: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ base, positive, negative, acceptance, incomplete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-aggressive-environment-cement-or-concrete-floor-thickness-adjustment-krer46-${variantKey}-enhancement-successor.v1`,
  stopCode: `S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}`,
  applicationName: `s27-3-f09-cement-or-concrete-floor-thickness-adjustment-krer46-13-${variantKey}-enhancement-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID,
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-next-current-lineage/cement-or-concrete-floor-thickness-adjustment-krer46-13-${variantKey}-enhancement-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1.ts",
    "src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2.ts",
    "tests/estimateNorms/aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1.contract.test.ts",
    "tests/estimateNorms/aggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts",
    "scripts/estimate/r4a13/prepareAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46Successor.ts",
    ".release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
  normId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
  sourceMetadata: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA,
  parameterDefinitions: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS,
  formulaDefinitions: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS,
  resourceDefinitions: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES,
  shortInput: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
  acceptanceInput: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [3, 5, 5],
  benchmarkOrdinal: variantOrdinal,
  validationScenario: `F09_AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `aggressive_environment_cement_or_concrete_floor_demolition_krer_46_04_011_12_13_${variantKey}`,
    physicalResultRu: `Подтверждённая площадь существующего цементного или бетонного покрытия из кислото- или жароупорного бетона в агрессивной среде (${variantContextRu}) разобрана: базовые 25 мм по КРЕР 46-04-011-12, изменение толщины целыми шагами по 5 мм — по КРЕР 46-04-011-13`,
    includedScopeRu: [
      "разборка существующего цементного или бетонного покрытия из кислото- или жароупорного бетона",
      "базовые ресурсы толщины 25 мм по КРЕР 46-04-011-12",
      "знаковая поправка труда и машин по КРЕР 46-04-011-13 на каждый целый шаг 5 мм",
      "уборка, вертикальное перемещение и переноска отходов до 50 м внутри объекта",
    ],
    excludedScopeRu: [
      "самостоятельная строка или отдельная цена для поправки 46-04-011-13",
      "дробные шаги толщины и толщина менее 5 мм",
      "основание и новая конструкция пола",
      "очистка годных плиток или кирпича",
      "внеобъектовый вывоз и размещение отходов",
      "скрытый коэффициент площади и неподтверждённые цены",
    ],
    independentCompletenessMap: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "DISMANTLE_EXISTING_CEMENT_OR_CONCRETE_FLOOR_COVERING_IN_AGGRESSIVE_ENVIRONMENT",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "floor_covering_area_m2",
    geometryParameters: ["floor_covering_area_m2"],
    thicknessAdjustmentParameterId: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID,
    baseThicknessMm: 25,
    thicknessStepMm: 5,
    minimumThicknessMm: 5,
    environmentClass: "AGGRESSIVE",
    officialUnitRateSource: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
    officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
    exactRates: ["46-04-011-12", "46-04-011-13"],
    thicknessAdjustmentRateIncluded: true,
    standaloneRate13WorkCreated: false,
    offsiteWasteHaulIncluded: false,
  },
  binding: {
    rowId: `${rowPrefix}:labor`,
    applicability: {
      technology_class: "AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_DEMOLITION",
      operation_class: "DISMANTLE_EXISTING_FLOOR_COVERING",
      catalog_variant: variant.catalogVariant,
      environment_class: "AGGRESSIVE",
      source_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_ID,
      base_norm_id: "norm:kg:krer:46-04-011-12:2015",
      adjustment_norm_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_NORM_ID,
      exact_locator: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_AREA_TIMES_BASE_RATE_12_PLUS_SIGNED_RATE_13_PER_5_MM_STEP_PER_100_M2",
      standalone_rate_13_work_created: false,
    },
  },
  locator: {
    key: `kg-krer-46-04-011-12-13-aggressive-environment-cement-or-concrete-floor-thickness-adjustment-${variantKey}-enhancement-v1`,
    payload: {
      kind: "OFFICIAL_KG_UNIT_RATE_WITH_SIGNED_THICKNESS_MODIFIER",
      collection: "KRER_46_2015",
      table: "46-04-011",
      baseRate: "46-04-011-12",
      adjustmentRate: "46-04-011-13",
      catalogVariant: variant.catalogVariant,
      technicalPartPrintedAndPdfPage: 5,
      workScopePrintedAndPdfPage: 58,
      resourceRatePrintedAndPdfPages: [59, 60],
      exactLocator: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      knownScopeInputs: ["floor_covering_area_m2", profileParameterId, confirmedParameterId, AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID],
      baseResourceRatesPer100M2: { constructionLabor: 28.54, machinistLaborInformational: 5.58, compressor: 5.58, pneumaticBreaker: 11.16 },
      adjustmentResourceRatesPer5MmPer100M2: { constructionLabor: 3.5, machinistLaborInformational: 1.1, compressor: 1.1, pneumaticBreaker: 2.2 },
      standaloneRate13WorkCreated: false,
      offsiteWasteHaulIncluded: false,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `демонтаж цементного или бетонного пола с поправкой толщины — ${variantContextRu}`,
      `разборка цементного или бетонного покрытия пола в агрессивной среде — ${variantContextRu}`,
      `КРЕР 46-04-011-12 с поправкой 46-04-011-13 — ${variantContextRu}`,
      `${variantKey} aggressive-environment cement concrete floor thickness-adjusted demolition`,
    ],
    shortScopeRu: `Разборка подтверждённого цементного или бетонного покрытия из кислото- или жароупорного бетона в агрессивной среде (${variantContextRu}): база 25 мм по КРЕР 46-04-011-12, целые шаги по 5 мм — по 46-04-011-13.`,
    keyDistinguishingParameters: ["floor_covering_area_m2", profileParameterId, confirmedParameterId, AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID],
    clarificationFields: [profileParameterId, confirmedParameterId, AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID],
    includedBoundaries: [
      "базовая разборка покрытия толщиной 25 мм по КРЕР 46-04-011-12",
      "знаковая поправка ресурсов на полные шаги 5 мм по КРЕР 46-04-011-13",
      "внутриобъектовое перемещение отходов в границах нормы",
    ],
    excludedBoundaries: [
      "самостоятельная работа или отдельная цена расценки 46-04-011-13",
      "дробные шаги толщины и итоговая толщина менее 5 мм",
      "очистка годных плиток или кирпича",
      "основание и новая конструкция пола",
      "внеобъектовый вывоз и полигон",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: `разборка демонтаж цементное бетонное покрытие пол 25 мм изменение толщины шаг 5 мм кислотоупорный жароупорный бетон агрессивная среда ${variantContextRu} КРЕР 46-04-011-12 46-04-011-13`,
    sourceProvenance: {
      officialKrer462015Rates460401112And13: true,
      exactOfficialArtifactSha256: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
      signedThicknessAdjustmentApplied: true,
      standaloneRate13WorkRejected: true,
      otherCoveringsAndColumnsRejected: true,
      classificationFactorRejected: true,
      offsiteWasteHaulRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /new_floor|floor_install|screed_install|нов.*покрыт|устройств.*стяж/iu,
    /ordinary_environment|non_aggressive|обычн.*сред/iu,
    /parquet|asphalt|wood_block|metal_plate|паркет|асфальт|деревян|металл/iu,
    /truck|landfill|offsite|самосвал|полигон|вывоз/iu,
    /area_factor|minimum_area|mobilization_surcharge/iu,
  ],
  owner: `S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_ENHANCEMENT_SUCCESSOR`,
  receiptFileStem: `S273_F09_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_13_${variantToken}_ENHANCEMENT`,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
