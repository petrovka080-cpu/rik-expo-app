import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS,
  DRYWALL_CEILING_PREPARE_DEFAULT_REQUIRED_ROW_IDS,
  DRYWALL_CEILING_PREPARE_INDEPENDENT_COMPLETENESS_MAP,
  DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
  DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
  DRYWALL_CEILING_PREPARE_PROFILE_NORM_ID,
  DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID,
  DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA,
  DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
  drywallCeilingPrepareMissingRequiredRows,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingPreparePreliminaryScenarioR1";
import {
  buildBatch003R56CanonicalSuccessorDefinition,
  compileBatch003R56ThroughSharedCore,
  projectBatch003R56DefinitionToCanonicalRows,
} from "../r5/batch003R56SharedCoreProjection";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const definition = buildBatch003R56CanonicalSuccessorDefinition(
  DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
);
const projection = projectBatch003R56DefinitionToCanonicalRows(definition, {
  includeRuntimePriceInputs: false,
  normalizePublisherCategories: true,
});
const runtimeProfileInput = { ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1 };
const runtimeProfileClassification = { ...DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1 };
const runtimeProfileSourceIds = Object.fromEntries(Object.keys(runtimeProfileInput).map((parameterId) => [
  parameterId,
  [DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID],
]));

const parameterDefinitions = projection.parameterDefinitions.map((parameter) => {
  const parameterId = String(parameter.parameter_id);
  const isRuntimeProfileValue = Object.hasOwn(runtimeProfileInput, parameterId);
  const guideShortRu = parameterId === "area_m2"
    ? "Введите площадь существующего потолка по обмеру, чертежу или ведомости объёмов."
    : isRuntimeProfileValue
      ? String(DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1[
        parameterId as keyof typeof DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1
      ])
      : `${String(parameter.title_ru)}: заполните только при выборе соответствующей условной ветви ремонта, грунтования или отдельной защиты от падения.`;
  return {
    ...parameter,
    truth_metadata: {
      ...parameter.truth_metadata,
      contract: "rik-expo-app.s27-21.drywall-ceiling-preparation-profile.v3",
      semantic_parameter_key: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameterId === "area_m2"
        ? "USER_MEASURED"
        : isRuntimeProfileValue
          ? "USER_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_CONDITIONAL_INPUT",
      input_origin_class: parameterId === "area_m2"
        ? "KNOWN_WORK_SCOPE"
        : isRuntimeProfileValue
          ? "SELECTED_VISIBLE_PRELIMINARY_PROFILE"
          : "OPTIONAL_PROJECT_DOCUMENTATION",
      preliminary_compilation_allowed: parameterId !== "area_m2",
      source_confirmation_required: false,
      guide: {
        guide_kind: parameterId === "area_m2"
          ? "MEASUREMENT_RULE"
          : runtimeProfileClassification[parameterId as keyof typeof runtimeProfileClassification] === "NORMATIVE"
            ? "MANDATORY_NORM_VALUE"
            : isRuntimeProfileValue ? "PRACTICE_REFERENCE" : "PROJECT_DEFINED",
        guide_short_ru: guideShortRu,
        source_role: runtimeProfileClassification[parameterId as keyof typeof runtimeProfileClassification]
          === "NORMATIVE"
          ? "PRIMARY_MANUFACTURER_SOURCE"
          : isRuntimeProfileValue
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "PROJECT_CONDITIONAL_INPUT",
        source_document: isRuntimeProfileValue
          ? runtimeProfileSourceIds[parameterId]?.[0]
          : DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID,
        source_locator: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA.exact_locator,
        guide_version: "drywall-ceiling-preparation-preliminary-profile-r2-v2",
        source_snapshot_hash: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
        applicability: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA.use_restriction,
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_PROJECT_DATA",
      },
      hidden_default_forbidden: parameterId === "area_m2",
      runtime_profile_value: isRuntimeProfileValue,
      runtime_profile_classification: runtimeProfileClassification[
        parameterId as keyof typeof runtimeProfileClassification
      ] ?? null,
      synthetic: false,
    },
  };
});

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileBatch003R56ThroughSharedCore({
    definition,
    values: { ...runtimeProfileInput, area_m2: 500 },
  });
  const completeRows = new Set(firstEstimate.rows.map((row) => row.row_id));
  const conditionalNeedRows = firstEstimate.preliminaryNeeds.map((need) => need.row_id).sort();
  if (!(JSON.stringify(conditionalNeedRows)
      === JSON.stringify([...DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS].sort())
    && firstEstimate.rows.length === DRYWALL_CEILING_PREPARE_DEFAULT_REQUIRED_ROW_IDS.length
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0)
    && drywallCeilingPrepareMissingRequiredRows(completeRows).length === 0)) {
    throw new Error("STOP_MASTER_DRYWALL_CEILING_PREPARE_FIRST_ESTIMATE");
  }
  for (const rowId of DRYWALL_CEILING_PREPARE_DEFAULT_REQUIRED_ROW_IDS) {
    const mutated = new Set(completeRows);
    mutated.delete(rowId);
    if (!drywallCeilingPrepareMissingRequiredRows(mutated).includes(rowId)) {
      throw new Error(`STOP_MASTER_DRYWALL_CEILING_PREPARE_REMOVAL_MUTATION:${rowId}`);
    }
  }
  const finishPaste = firstEstimate.rows.find((row) => row.row_id.endsWith(":finish_paste"));
  const refined = await compileBatch003R56ThroughSharedCore({
    definition,
    operation: "recalculate",
    values: { ...runtimeProfileInput, area_m2: 500, finish_paste_order_reserve_percent: 10 },
  });
  const refinedFinishPaste = refined.rows.find((row) => row.row_id.endsWith(":finish_paste"));
  if (!(finishPaste?.quantity === "14" && finishPaste.unit_id === "item"
    && finishPaste.unit_price == null && finishPaste.amount == null
    && refinedFinishPaste?.quantity === "15" && refinedFinishPaste.unit_id === "item")) {
    throw new Error("STOP_MASTER_DRYWALL_CEILING_PREPARE_PACKAGE_ARITHMETIC");
  }
  if (firstEstimate.rows.some((row) =>
    /:(?:primer|primer_application|joint_compound|joint_tape|fall_protection)$/u.test(row.row_id))) {
    throw new Error("STOP_MASTER_DRYWALL_CEILING_PREPARE_ADJACENT_SCOPE");
  }
  const confirmedRepair = await compileBatch003R56ThroughSharedCore({
    definition,
    operation: "recalculate",
    values: {
      ...runtimeProfileInput,
      area_m2: 500,
      repair_requirement_state: "REQUIRED",
      repair_area_share_percent: 8,
      repair_compound_kg_per_repair_m2: 1.2,
      repair_joint_length_m: 65,
      abrasive_productivity_m2_per_item: 8,
    },
  });
  if (!(confirmedRepair.preliminaryNeeds.length === 0
    && confirmedRepair.rows.length === firstEstimate.rows.length
      + DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS.length
    && confirmedRepair.rows.find((row) => row.row_id.endsWith(":joint_compound"))?.quantity === "48"
    && confirmedRepair.rows.find((row) => row.row_id.endsWith(":joint_tape"))?.quantity === "65")) {
    throw new Error("STOP_MASTER_DRYWALL_CEILING_PREPARE_CONDITIONAL_REPAIR");
  }
  return {
    status: "GREEN_S2721_DRYWALL_CEILING_PREPARATION_PROFILE_CORE",
    firstEstimate: {
      rowCount: firstEstimate.rows.length,
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      conditionalNeedRowIds: conditionalNeedRows,
      rowCountsByCategory: Object.fromEntries(
        ["material", "labor", "equipment", "transport"].map((category) => [
          category,
          firstEstimate.rows.filter((row) => row.category === category).length,
        ]),
      ),
      procurementRowCount: firstEstimate.rows.filter((row) => row.procurement_eligible).length,
      pricedRowCount: firstEstimate.totals.pricedRowCount,
      unpricedRowCount: firstEstimate.totals.unpricedRowCount,
      finishPastePackages: Number(finishPaste.quantity),
    },
    refinement: { reservePercent: 10, finishPastePackages: Number(refinedFinishPaste.quantity) },
    confirmedRepair: {
      rowCount: confirmedRepair.rows.length,
      repairAreaSharePercent: 8,
      damagedJointLengthM: 65,
      compoundKg: 48,
    },
    sourcePackSha256: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
    compiledSha256: createHash("sha256").update(JSON.stringify({ firstEstimate, refined })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.master-drywall-ceiling-preparation-conditional-repair-successor.v1",
  stopCode: "MASTER_DRYWALL_CEILING_PREPARE_PROFILE",
  applicationName: "s26-5-master-drywall-ceiling-preparation-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "bc49c487-b413-5bc0-a0ed-de3e32d6ebcd",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "4ac67e58-0e46-5e1f-a5ad-4f82e2a77006",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/drywall-ceiling-preparation-conditional-repair-successor-v1"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drywall-ceiling-preparation-preliminary-profile-r2.json",
    "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingPreparePreliminaryScenarioR1.ts",
    "scripts/estimate/r5/batch003R56SharedCoreProjection.ts",
    "tests/aiEstimateV4/batch003R56Reconciliation.contract.test.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterDrywallCeilingPreparationProfileSuccessor.ts",
  ],
  catalogId: DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
  sourceId: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID,
  normId: DRYWALL_CEILING_PREPARE_PROFILE_NORM_ID,
  sourceMetadata: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA,
  parameterDefinitions,
  formulaDefinitions: projection.formulaDefinitions,
  resourceDefinitions: projection.resourceDefinitions,
  shortInput: { area_m2: 500 },
  acceptanceInput: { ...runtimeProfileInput, area_m2: 500 },
  runtimeProfileInput,
  runtimeProfileClassification,
  runtimeProfileSourceIds,
  verifyCore,
  expectedParentShape: [49, 34, 34],
  benchmarkOrdinal: 5,
  validationScenario: "S27_21_EXISTING_DRYWALL_CEILING_500_M2_CONDITIONAL_REPAIR_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Подготовка существующего потолка из ГКЛ под финишную отделку",
    workKey: DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
    physicalResultRu: "Существующий потолок из ГКЛ обследован и очищен; базовая финишная подготовка рассчитана, а ремонт дефектов и швов локализован до получения обмера",
    includedScopeRu: [
      "укрытие пола и оборудования, малярная лента и мешки для отходов",
      "финишная паста в заводских упаковках, абразив P240 и средства защиты работников",
      "осмотр, очистка, укрытие, нанесение пасты, шлифование, обеспыливание, контроль и уборка",
      "пылесос, шлифовальная машина, вышка-тура, рабочее освещение и операции доступа",
      "доставка материалов, доставка и возврат вышки, вывоз отходов",
      "условная ремонтная смесь, армирующая лента, локальное шлифование и работы ремонта с количеством только после обмера дефектов",
    ],
    excludedScopeRu: [
      "новые листы ГКЛ и новый каркас",
      "безусловная закупка ремонтных материалов до обследования и обмера дефектов",
      "грунтование, не требуемое выбранной системой по подготовленному основанию",
      "окраска и отдельная система защиты от падения, включённая в ограждённую вышку",
    ],
    independentCompletenessMap: DRYWALL_CEILING_PREPARE_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "EXISTING_DRYWALL_CEILING_PREPARATION",
    scopeClass: "LARGE_AREA_500_M2_SCENARIO",
    constructionState: "EXISTING_DRYWALL_CEILING_CONDITION_PENDING_SURVEY",
    primaryMeasureParameterId: "area_m2",
    selectedPreliminaryProfile: DRYWALL_CEILING_PREPARE_PROFILE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
  },
  binding: {
    rowId: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:row:finish_paste`,
    applicability: {
      technology_class: "KNAUF_ROTBAND_PASTA_PROFI_THIN_FINISH_PASTE",
      operation_class: "EXISTING_DRYWALL_CEILING_PREPARATION",
      source_id: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID,
      norm_id: DRYWALL_CEILING_PREPARE_PROFILE_NORM_ID,
      quantity_basis: "AREA_TIMES_PRODUCT_CONSUMPTION_AND_VISIBLE_RESERVE_ROUNDED_TO_SELECTED_PACKAGE",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_PRODUCT_AND_SITE_DATA",
    },
  },
  locator: {
    key: "drywall-ceiling-preparation-thin-finish-paste-profile-r2-runtime-v3",
    payload: {
      kind: "COMPOSITE_TECHNOLOGY_PROFILE",
      sourcePackSha256: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
      officialUrl: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA.official_url,
      exactLocator: DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA.exact_locator,
      quantityModel: "area -> protection, packaged finish paste, P240 abrasives, work, equipment and logistics",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "подготовка существующего потолка из ГКЛ под финишную отделку",
    aliases: [
      "подготовить потолок из гипсокартона под покраску",
      "шпаклевание и шлифование потолка из ГКЛ",
      "подготовка потолка из ГКЛ 500 м²",
    ],
    shortScopeRu: "Полная подготовка устойчивого существующего потолка: защита, паста, P240, работы, механизмы, доступ и логистика; без нового каркаса и листов.",
    keyDistinguishingParameters: ["area_m2"],
    clarificationFields: ["repair_area_share_percent", "repair_joint_length_m"],
    includedBoundaries: ["25 рассчитанных ресурсов базовой подготовки и 6 локальных потребностей условной ремонтной ветви"],
    excludedBoundaries: ["новый потолок, окраска и безусловная закупка ремонта до обследования"],
    extraSearchTermsRu: "потолок гкл гипсокартон шпаклёвка паста p240 шлифование обеспыливание вышка тура",
    sourceProvenance: {
      contract: "rik-expo-app.s27-21.master-drywall-ceiling-preparation-conditional-repair-successor.v1",
      sourcePackSha256: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
    },
  },
  forbiddenAdjacentMatchers: [
    /нов(?:ый|ые).*лист.*гкл/iu,
    /монтаж.*каркас/iu,
    /окраск.*потол/iu,
  ],
  owner: "S2721_DRYWALL_CEILING_PREPARATION_CONDITIONAL_REPAIR_SUCCESSOR",
  receiptFileStem: "S2721_DRYWALL_CEILING_PREPARATION_CONDITIONAL_REPAIR_SUCCESSOR",
});
