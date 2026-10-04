import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
  ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS,
  ANCHOR_GROUP_HIGH_LOAD_INDEPENDENT_COMPLETENESS_MAP,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_CLASSIFICATION,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_INPUT,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_SOURCE_IDS,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_SHORT_INPUT,
  ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID,
  anchorGroupConcretePlacementAcceptanceInputR1,
  anchorGroupConcretePlacementMissingRequiredRowsR2,
  compileAnchorGroupConcretePlacementR1,
} from "../../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, unknown>;

const TARGET = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.find(
  (candidate) => candidate.contextKey === "high_load",
)!;
const ACCEPTANCE_INPUT = anchorGroupConcretePlacementAcceptanceInputR1("high_load");

const currentReleasePath = resolve(process.env.R4A13_CURRENT_RELEASE_PATH
  ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};

async function verifyCore(): Promise<Json> {
  const compiled = await compileAnchorGroupConcretePlacementR1({
    ...ANCHOR_GROUP_HIGH_LOAD_PROFILE_SHORT_INPUT,
  }, { catalogId: TARGET.catalogId });
  const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
  const rowIds = new Set(rows.keys());
  const missing = anchorGroupConcretePlacementMissingRequiredRowsR2(rowIds);
  const assertions = {
    noPreliminaryNeeds: compiled.preliminaryNeeds.length === 0,
    completeRowCount: compiled.rows.length === ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS.length,
    noMissingTechnologyRows: missing.length === 0,
    allQuantitiesPositive: compiled.rows.every((row) => Number(row.quantity) > 0),
    readyMixM3: rows.get("anchor-group-pour:material:ready-mix")?.quantity === "22",
    placedM3: rows.get("anchor-group-pour:work:place")?.quantity === "20",
    pumpMachineH: rows.get("anchor-group-pour:equipment:pump")?.quantity === "0.625",
    vibratorMachineH: rows.get("anchor-group-pour:equipment:vibrator")?.quantity === "5.32",
    mixerTrips: rows.get("anchor-group-pour:delivery:mixer-trips")?.quantity === "3",
    slumpChecks: rows.get("anchor-group-pour:quality:slump")?.quantity === "1",
    noOneHourPlaceholders: !compiled.rows.some((row) =>
      row.quantity === "1" && row.unit_id === "man_hour"),
    noWinterWithoutSelection: !compiled.rows.some((row) => /winter|прогрев/iu.test(row.row_id)),
    noWaterstopWithoutSelection: !compiled.rows.some((row) => /waterstop|гидрошпон/iu.test(row.row_id)),
    adjacentScopeExcluded: !compiled.rows.some((row) =>
      /excavation|reinforc(?:ement|ing)|formwork|котлован|арматур|опалуб/iu
        .test(`${row.row_id} ${row.title_ru}`)),
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_ANCHOR_GROUP_PROFILE_R2_CORE:${failed.join(",")}`);
  }
  for (const requiredRowId of ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS) {
    const mutated = new Set(rowIds);
    mutated.delete(requiredRowId);
    if (!anchorGroupConcretePlacementMissingRequiredRowsR2(mutated).includes(requiredRowId)) {
      throw new Error(`STOP_ANCHOR_GROUP_PROFILE_R2_MUTATION:${requiredRowId}`);
    }
  }
  return {
    status: "GREEN_ANCHOR_GROUP_CONCRETE_PLACEMENT_HIGH_LOAD_PROFILE_R2_CORE",
    assertions,
    rowCount: compiled.rows.length,
    calculatedPayableRowCount: compiled.rows.filter((row) => row.included_in_estimate).length,
    controlAndDocumentRowCount: compiled.rows.filter((row) => !row.included_in_estimate).length,
    missingTechnologyRows: missing,
    serializedSha256: createHash("sha256").update(JSON.stringify(compiled)).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-14.anchor-group-concrete-placement-profile-r2-successor.v1",
  stopCode: "S27_14_ANCHOR_GROUP_PROFILE_R2",
  applicationName: "s27-14-anchor-group-concrete-placement-profile-r2-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (71).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "783d0425e1f0f0f0ea8a262be454e39d13e94e1a2ad5d1c6cc4b1e1314e624f1",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-31/AnchorGroupConcretePlacementProfileR2Successor-ancillary-orders"),
  sourcePaths: [
    "scripts/estimate/r4a13/readbackS2731AncillaryMaterialOrdersIndependent.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1.ts",
    "data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1.ts",
    "src/lib/estimate/v4/anchorGroupConcretePlacementR1.ts",
    "tests/estimateNorms/anchorGroupConcretePlacementR1.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAnchorGroupConcretePlacementProfileR2Successor.ts",
  ],
  catalogId: TARGET.catalogId,
  sourceId: ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID,
  normId: ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID,
  sourceMetadata: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  parameterDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
  formulaDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS,
  resourceDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  shortInput: ANCHOR_GROUP_HIGH_LOAD_PROFILE_SHORT_INPUT,
  acceptanceInput: ACCEPTANCE_INPUT,
  runtimeProfileInput: ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_INPUT,
  runtimeProfileClassification: ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [25, 16, 38],
  benchmarkOrdinal: 0,
  validationScenario: "S27_14_ANCHOR_GROUP_HIGH_LOAD_20_M3_COMPLETE_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: TARGET.titleRu,
    workKey: "concrete_foundation_interior_anchor_group_pour_high_load",
    physicalResultRu:
      "Подготовленное основание анкерной группы забетонировано товарной смесью с приёмкой, подачей, укладкой, виброуплотнением, отделкой, уходом, контролем качества и исполнительными документами.",
    includedScopeRu: [
      "заказ товарного бетона по проектному объёму и видимому заменяемому резерву",
      "приём, подача, укладка, распределение и виброуплотнение бетонной смеси",
      "отделка открытой поверхности, укрытие и уход за бетоном",
      "насос, бетоновод, основной и резервный вибраторы без двойного счёта включённых компонентов",
      "рейсы миксеров, мобилизация техники, подготовка рабочей зоны и контролируемая промывка",
      "входной, операционный и лабораторный контроль, журналы, талоны и протоколы",
      "гидрошпонка только при явном выборе рабочего шва и подтверждённой длине",
    ],
    excludedScopeRu: [
      "земляные работы и обратная засыпка",
      "поставка и монтаж арматуры, анкерных деталей и закладных изделий",
      "поставка, монтаж и снятие опалубки",
      "зимний прогрев без явного выбора и отдельного подтверждённого ППР",
      "неподтверждённые цены",
    ],
    independentCompletenessMap: ANCHOR_GROUP_HIGH_LOAD_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "ANCHOR_GROUP_BASE_CONCRETE_PLACEMENT_ONLY",
    scopeClass: "HIGH_LOAD_ZONE",
    constructionState: "ANCHORS_REINFORCEMENT_AND_FORMWORK_READY_BY_ADJACENT_SCOPE",
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
    geometryParameters: ["plan_dimension_concrete_volume_m3"],
    selectedPreliminaryProfile: ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
    adjacentScopeExcluded: true,
  },
  binding: {
    rowId: "anchor-group-pour:material:ready-mix",
    applicability: {
      technology_class: "READY_MIX_PUMPED_ANCHOR_GROUP_BASE_POUR",
      operation_class: "ANCHOR_GROUP_BASE_CONCRETE_PLACEMENT_ONLY",
      scope_class: "HIGH_LOAD_ZONE",
      source_id: ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID,
      norm_id: ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID,
      exact_locator: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA.exact_locator,
      quantity_basis: "PROJECT_VOLUME_WITH_VISIBLE_ORDER_RESERVE_AND_SELECTED_PROFILE",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_SUPPLIER_EQUIPMENT_AND_QA_DATA",
      universal_productivity_claimed: false,
    },
  },
  locator: {
    key: "anchor-group-concrete-placement-high-load-preliminary-profile-r2-ancillary-orders-s27-31",
    payload: {
      ancillaryOrderRowIds: ["anchor-group-pour:material:curing-sheet", "anchor-group-pour:joint:waterstop"],
      expectedResourceIds: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES.map(row => row.row_id),
      expectedFormulaIds: ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS.map(row => row.formula_id),
      sourcePackSha256: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA.definition_hash,
      kind: "COMPOSITE_TECHNOLOGY_PROFILE",
      exactLocator: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA.exact_locator,
      formula:
        "project volume -> concrete order, curing area, pump/vibrator hours, mixer trips and QA lots",
      visibleAssumptions: Object.keys(ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_INPUT),
    },
  },
  search: {
    primaryUom: "м³",
    canonicalNameRu: TARGET.titleRu,
    aliases: [
      "бетонирование основания анкерной группы 20 м3",
      "бетонирование основания анкерной группы 20 m3",
      "заливка основания анкеров в зоне высокой нагрузки",
      "anchor group base concrete placement high load",
    ],
    shortScopeRu:
      "Отдельное бетонирование подготовленного основания анкерной группы: бетон, насос, укладка, виброуплотнение, отделка, уход, доставка, контроль и документы; без грунта, арматуры, анкеров и опалубки.",
    keyDistinguishingParameters: ["plan_dimension_concrete_volume_m3"],
    clarificationFields: [],
    includedBoundaries: [
      "бетон, укладка, уплотнение, уход, техника, логистика, контроль и документы",
      "расчётные количества из объёма и видимых заменяемых параметров профиля",
    ],
    excludedBoundaries: [
      "земляные работы, арматура, анкерные детали, закладные изделия и опалубка",
      "зимний прогрев и рабочий шов без явного выбора",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "бетон бетонирование заливка основание анкерная группа высокая нагрузка насос миксер вибратор уход лаборатория образцы прочность",
    sourceProvenance: {
      reusedVerifiedConcretePlacementCore: true,
      firstEstimateFromVolumeAndVisibleProfile: true,
      noMandatoryProfessionalQuestionnaire: true,
      runtimeProfileReplaceableByProjectData: true,
      independentCompletenessMap: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:котлован|транше|выемк|грунт)|(?:excavation|soil)/iu,
    /(?:арматур|армирован)|(?:reinforc)/iu,
    /(?:анкерн(?:ые|ых)\s+(?:болт|детал)|закладн)/iu,
    /(?:опалуб)|(?:formwork)/iu,
  ],
  owner: "S27_14_ANCHOR_GROUP_CONCRETE_PLACEMENT_PROFILE_R2_SUCCESSOR",
  receiptFileStem: "S27_14_ANCHOR_GROUP_CONCRETE_PLACEMENT_PROFILE_R2",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
