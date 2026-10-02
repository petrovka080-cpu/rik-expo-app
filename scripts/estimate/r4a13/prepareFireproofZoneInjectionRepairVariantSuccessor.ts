import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
  FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS,
  FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID,
  FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS,
  FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE,
  FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES,
  FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_CLASSIFICATION,
  FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_SOURCE_IDS,
  FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
  FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
  FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA,
  compileFireproofZoneInjectionRepairVariantR1,
  fireproofZoneInjectionRepairCompletenessMap,
  resolveFireproofZoneInjectionRepairVariant,
  type FireproofZoneInjectionRepairVariantKey,
} from "../../../src/lib/estimate/v4/fireproofZoneInjectionRepairVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown;
  searchReleaseId?: unknown;
};
const variantKey = String(
  process.env.S278_F09_FIREPROOF_INJECT_VARIANT ?? "small_area",
) as FireproofZoneInjectionRepairVariantKey;
const variant = resolveFireproofZoneInjectionRepairVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S278_F09_FIREPROOF_ZONE_INJECTION_REPAIR_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

function artifactSha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

async function verifyCore(): Promise<Json> {
  const sourceRoot = ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/"
    + "official-snapshots/";
  const sikaPath = `${sourceRoot}sika_injection_201_ce_pds_2023_02_01.pdf`;
  const ac20Path = `${sourceRoot}sika_injection_ac20_pds_2020_01_02.pdf`;
  const methodPath = `${sourceRoot}sika_injection_201_ce_method_statement_2019_01.pdf`;
  const partASdsPath = `${sourceRoot}sika_injection_201_ce_part_a_sds_2025_10_0.pdf`;
  const partBSdsPath = `${sourceRoot}sika_injection_201_ce_part_b_sds_2025_4_1.pdf`;
  if (artifactSha256(sikaPath) !== FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256
    || artifactSha256(ac20Path) !== FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256
    || artifactSha256(methodPath) !== FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256
    || artifactSha256(partASdsPath)
      !== FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256
    || artifactSha256(partBSdsPath)
      !== FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256) {
    throw new Error(`STOP_${stopCode}_SOURCE_ARTIFACT_HASH`);
  }
  const short = await compileFireproofZoneInjectionRepairVariantR1(variantKey, {
    ...FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
  });
  const complete = await compileFireproofZoneInjectionRepairVariantR1(variantKey, {
    ...FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 35
    && short.rows[0]?.row_id === "f09:fireproof_zone_injection_repair_area"
    && short.rows[0]?.quantity === "12"
    && short.rows[4]?.row_id === "f09:fireproof_zone_injection_material_volume"
    && short.rows[4]?.quantity === "2.16"
    && short.rows.some((row) => row.row_id === "f09:fireproof_zone_injection_201_ce_kit"
      && row.quantity === "1")
    && short.preliminaryNeeds.length === 6)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0
    && complete.rows[4]?.quantity === "2.16"
    && complete.rows.some((row) => row.row_id === "f09:fireproof_zone_injection_packers"
      && row.quantity === "335")
    && complete.rows.some((row) => row.row_id === "f09:fireproof_zone_injection_reaction_time"
      && row.quantity === "135"))) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(
    FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })),
  );
  if (/paint_evrika|coating_application|fireproof_coating|surface_cleaning|strengthening/iu
    .test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      quantities: complete.rows.map((row) => row.quantity),
    },
    sourceArtifacts: {
      sikaInjection201Sha256: FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
      sikaInjectionAc20Sha256: FIREPROOF_ZONE_INJECTION_REPAIR_AC20_ARTIFACT_SHA256,
      sikaInjection201MethodSha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
      sikaInjection201PartASdsSha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_PART_A_SDS_ARTIFACT_SHA256,
      sikaInjection201PartBSdsSha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_PART_B_SDS_ARTIFACT_SHA256,
      bundleSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
    },
    classificationFactorApplied: false,
    automaticFirstEstimateApplied: true,
    userSuppliedProfessionalNormsRequired: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-9.f09-fireproof-zone-injection-repair-${outputStem}-engineering-completion-successor.v7`,
  stopCode,
  applicationName:
    `s27-8-f09-fireproof-zone-injection-repair-${outputStem}-automatic-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (49).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "08b45e6be8274efb8470f7fe9b47474a6e088589794084811110f8769cded777",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? requiredPointer(currentRelease.definitionReleaseId, "DEFINITION_RELEASE_ID"),
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? requiredPointer(currentRelease.searchReleaseId, "SEARCH_RELEASE_ID"),
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/`
      + `fireproof-zone-injection-repair-${outputStem}-engineering-successor-v7`),
  sourcePaths: [
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts",
    "src/lib/estimate/v4/fireproofZoneInjectionRepairVariantsR1.ts",
    "tests/estimateNorms/fireproofZoneInjectionRepairVariantsR1.contract.test.ts",
    "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    "supabase/functions/canonical-estimate-worker/index.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireproofZoneInjectionRepairVariantSuccessor.ts",
    ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/"
      + "sika_injection_201_ce_pds_2023_02_01.pdf",
    ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/"
      + "sika_injection_ac20_pds_2020_01_02.pdf",
    ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/"
      + "sika_injection_201_ce_method_statement_2019_01.pdf",
    ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/"
      + "sika_injection_201_ce_part_a_sds_2025_10_0.pdf",
    ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/official-snapshots/"
      + "sika_injection_201_ce_part_b_sds_2025_4_1.pdf",
  ],
  catalogId: variant.catalogId,
  sourceId: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
  normId: FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID,
  sourceMetadata: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA,
  parameterDefinitions: FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS,
  formulaDefinitions: FIREPROOF_ZONE_INJECTION_REPAIR_FORMULAS,
  resourceDefinitions: FIREPROOF_ZONE_INJECTION_REPAIR_RESOURCES,
  shortInput: FIREPROOF_ZONE_INJECTION_REPAIR_SHORT_INPUT,
  acceptanceInput: FIREPROOF_ZONE_INJECTION_REPAIR_ACCEPTANCE_INPUT,
  runtimeProfileInput: FIREPROOF_ZONE_INJECTION_REPAIR_PRELIMINARY_PROFILE,
  runtimeProfileClassification:
    FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: FIREPROOF_ZONE_INJECTION_REPAIR_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [35, 46, 46],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIREPROOF_ZONE_INJECTION_REPAIR_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `special_repair_interior_fireproof_inject_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: трещина бетонного основания заполнена совместимой гибкой PUR-системой, отверстия заделаны, водонепроницаемость проверена, отходы учтены; огнезащитная система этим этапом не восстановлена и выполняется отдельной совместимой операцией`,
    includedScopeRu: [
      "отдельный подготовительный этап ремонта бетонного основания до восстановления огнезащитной системы",
      "известная площадь зоны, длина, раскрытие, глубина трещины и толщина бетонного элемента",
      "Sika Injection-201 CE для постоянной гибкой герметизации без гидростатического напора",
      "автоматический геометрический объём и массы компонентов A/B по отношению 1:1 и плотностям PDS",
      "закупка целыми совместными комплектами A/B 10/10,6 кг или 20/21,2 кг с явным остатком без двойной цены компонентов",
      "условный ускоритель Sika Injection-AC20 в упаковках 1 кг по точной выбранной дозировке и табличному времени реакции",
      "контроль температуры воздуха, основания и материала, жизнеспособности смеси, прочности бетона и предела давления",
      "механические пакеры и отверстия с шагом d/2, подготовка, бурение, установка и повторная инъекция",
      "насос, захват ниппелей, безмасляный компрессор, ударная и аккумуляторная дрели, ручной инструмент, ёмкости, салфетки и PPE",
      "очистка оборудования, снятие пакеров, заделка отверстий, контроль, протокол и передача отходов",
    ],
    excludedScopeRu: [
      "неподтверждённые человеко-часы или машино-часы",
      "структурное склеивание эпоксидной системой, пустоты, кладка или природный камень",
      "предварительная пенная инъекция при гидростатическом напоре",
      "коэффициент для standard или small_area",
      "очистка, нанесение, ремонт или контроль огнезащитного покрытия/облицовки и подтверждение предела огнестойкости",
      "усиление конструкции вне явно утверждённой цели инъекционного ремонта",
      "неподтверждённые нормы и цены",
      "интерполяция времени реакции между табличными температурами/дозировками без подтверждения",
    ],
    independentCompletenessMap:
      fireproofZoneInjectionRepairCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass:
      "CONCRETE_SUBSTRATE_CRACK_WATERTIGHT_SEALING_BEFORE_FIREPROOF_RESTORATION",
    workflowRole:
      "SUBSTRATE_REPAIR_PREREQUISITE_NOT_FIREPROOF_SYSTEM_RESTORATION",
    sourceClaimsFireproofing: false,
    fireproofingRestoredByThisDefinition: false,
    separateFireproofRestorationRequired: true,
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "repair_zone_area_m2",
    confirmedSurveyAndDesignParameters: [
      "repair_zone_area_m2",
      "defect_length_m",
      "defect_mean_opening_mm",
      "defect_mean_depth_mm",
      "component_thickness_mm",
      "ambient_air_temperature_c",
      "substrate_temperature_c",
      "injection_material_temperature_c",
      "concrete_compressive_strength_n_mm2",
      "planned_injection_pressure_bar",
    ],
    suppliedProfessionalProfileParameters: FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "repair_zone_area_m2",
        "defect_length_m",
        "defect_mean_opening_mm",
        "defect_mean_depth_mm",
        "component_thickness_mm",
      ].includes(parameterId)),
    technicalMethodBoundarySource: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
    sourceBundleSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
    approvedRepairDesignRequiredBeforeExecution: true,
    compatibleInjectionSystemDocumentationEmbedded: true,
    universalClassificationFactorClaimed: false,
    universalProductivityClaimed: false,
    automaticGeometryBasedConsumptionClaimed: true,
    coatingApplicationExcluded: true,
    fireproofSurfaceCleaningExcluded: true,
    unapprovedStrengtheningExcluded: true,
  },
  binding: {
    rowId: "f09:fireproof_zone_injection_repair_area",
    applicability: {
      technology_class: "SIKA_INJECTION_201_CE_FLEXIBLE_CRACK_SEALING",
      operation_class:
        "CONCRETE_SUBSTRATE_CRACK_WATERTIGHT_SEALING_BEFORE_FIREPROOF_RESTORATION",
      workflow_role:
        "SUBSTRATE_REPAIR_PREREQUISITE_NOT_FIREPROOF_SYSTEM_RESTORATION",
      source_claims_fireproofing: false,
      fireproofing_restored_by_this_definition: false,
      separate_fireproof_restoration_required: true,
      catalog_variant: variant.catalogVariant,
      scope_mode:
        "KNOWN_GEOMETRY_PLUS_VISIBLE_MANUFACTURER_NORMS_AND_PRELIMINARY_WORKFRONT_MODEL",
      source_id: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_ID,
      norm_id: FIREPROOF_ZONE_INJECTION_REPAIR_NORM_ID,
      exact_locator: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.exact_locator,
      source_bundle_sha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
      sika_artifact_sha256: FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
      sika_method_artifact_sha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      automatic_geometry_consumption_claimed: true,
      quantity_basis:
        "KNOWN_GEOMETRY_TIMES_VISIBLE_SOURCE_BACKED_OR_EXPLICIT_PRELIMINARY_PROFILE_VALUES",
    },
  },
  locator: {
    key: `sika-injection-201-ce-substrate-crack-sealing-before-fireproof-restoration-${outputStem}-v6`,
    payload: {
      kind:
        "MANUFACTURER_PDS_METHOD_PLUS_TRANSPARENT_PRELIMINARY_GEOMETRY_MODEL",
      catalogVariant: variant.catalogVariant,
      exactLocator: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_METADATA.exact_locator,
      sourceBundleSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SOURCE_BUNDLE_SHA256,
      sikaArtifactSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
      sikaMethodArtifactSha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
      universalClassificationFactorClaimed: false,
      universalProductivityClaimed: false,
      automaticGeometryConsumptionClaimed: true,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `Sika Injection-201 CE flexible crack sealing in fireproof zone ${outputStem}`,
    ],
    shortScopeRu:
      "Гибкая герметизация трещин шириной более 0,2 мм в бетоне системой Sika Injection-201 CE без гидростатического напора.",
    keyDistinguishingParameters: [
      "repair_zone_area_m2",
      "defect_length_m",
      "defect_mean_opening_mm",
      "defect_mean_depth_mm",
      "component_thickness_mm",
    ],
    clarificationFields: FIREPROOF_ZONE_INJECTION_REPAIR_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "repair_zone_area_m2",
        "defect_length_m",
        "defect_mean_opening_mm",
        "defect_mean_depth_mm",
        "component_thickness_mm",
      ].includes(parameterId)),
    includedBoundaries: [
      "известная геометрия трещины и бетонного элемента",
      "автоматические компоненты A/B, пакеры и все операции Sika method statement",
      "целые совместные комплекты A/B, остатки и условные целые упаковки AC-20",
      "температурные границы, табличное время реакции и контроль предельного/рабочего давления",
      "видимые редактируемые отношения смешивания, плотности, шаг d/2 и модель одного фронта",
      "насос, компрессор, дрель, инструмент, расходники, PPE и cleaning system",
      "заделка отверстий, контроль, протокол и ответственная передача отходов",
    ],
    excludedBoundaries: [
      "неподтверждённые человеко-часы и машино-часы",
      "structural-bond, пустоты, кладка, камень и гидростатический напор",
      "автоматический коэффициент standard или small_area",
      "нанесение и очистка огнезащитного покрытия",
      "неутверждённое усиление конструкции",
      "неподтверждённые цены",
      "неподтверждённая интерполяция времени реакции или произвольное давление",
    ],
    extraSearchTermsRu:
      `инъектирование трещина пустота основание бетон кладка камень порт пакер насос выдерживание контроль отходы огнезащита ${variantKey}`,
    sourceProvenance: {
      compatibleSystemProductBoundary: true,
      exactSikaArtifactSha256: FIREPROOF_ZONE_INJECTION_REPAIR_SIKA_ARTIFACT_SHA256,
      exactSikaMethodArtifactSha256:
        FIREPROOF_ZONE_INJECTION_REPAIR_METHOD_ARTIFACT_SHA256,
      userSuppliedProfessionalNormsRequired: false,
      automaticFirstEstimate: true,
      universalClassificationFactorRejected: true,
      unsupportedProductivityHoursRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /paint_evrika|нанесен.*краск/iu,
    /coating_application|fireproof_coating|нанесен.*огнезащ/iu,
    /surface_cleaning|очистк.*огнезащ/iu,
    /strengthening|усилен.*конструкц/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
