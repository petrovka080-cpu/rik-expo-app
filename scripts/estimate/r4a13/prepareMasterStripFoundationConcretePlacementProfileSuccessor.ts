import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileCanonicalEstimateCore } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { assertCanonicalPurchaseReadinessV1 } from "../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";

import {
  STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS,
  STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  STRIP_POUR_PROFILE_ACCEPTANCE_INPUT,
  STRIP_POUR_PROFILE_CATALOG_ID,
  STRIP_POUR_PROFILE_FORMULAS,
  STRIP_POUR_PROFILE_NORM_ID,
  STRIP_POUR_PROFILE_PARAMETERS,
  STRIP_POUR_PROFILE_RESOURCES,
  STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION,
  STRIP_POUR_PROFILE_RUNTIME_INPUT,
  STRIP_POUR_PROFILE_RUNTIME_SOURCE_IDS,
  STRIP_POUR_PROFILE_SHORT_INPUT,
  STRIP_POUR_PROFILE_SOURCE_ID,
  STRIP_POUR_PROFILE_SOURCE_METADATA,
  STRIP_POUR_SOURCE_PACK_SHA256,
  compileStripFoundationConcretePlacementPreliminaryProfileR1,
  stripPourMissingRequiredRows,
} from "../../../src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as Json;

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
    ...STRIP_POUR_PROFILE_SHORT_INPUT,
  });
  const historicalDraft = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
    placement_method: "pump",
    placement_location: "Ленточный фундамент; большой участок; захватка SF-POUR-LARGE-AREA",
    product_profile_id: "method-profile:nrmca-cip31:ready-mix-order:v1",
    mixture_designation: "B25 W6 F150 P4",
    producer_order_confirmation: "RMC-SF-POUR-LARGE-AREA-CONFIRMED",
    estimator_approval_reference: "EST-SF-POUR-LARGE-AREA-REV-A",
    selected_contingency_percent: 8,
    plan_dimension_concrete_volume_m3: 240,
    plan_volume_calculation_reference: "SF-POUR-LARGE-AREA-VOLUME-REV-A",
    contingency_selection_justification: "Резерв подтверждён сметчиком для захватки SF-POUR-LARGE-AREA",
    delivery_schedule_and_truck_capacity: "График SF-POUR-LARGE-AREA; автобетоносмесители 8 м³",
    mix_design_or_project_specification_reference: "SF-POUR-LARGE-AREA-MIX-B25-REV-A",
  });
  const refined = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
    ...STRIP_POUR_PROFILE_SHORT_INPUT,
    selected_contingency_percent: 10,
    pump_site_utilization_factor: 0.25,
    mixer_capacity_m3: 9,
    qa_lot_volume_m3: 40,
  });
  const rows = new Map(firstEstimate.rows.map((row) => [row.row_id, row]));
  const completeRows = new Set(firstEstimate.rows.map((row) => row.row_id));
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && firstEstimate.rows.length === STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS.length
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0)
    && stripPourMissingRequiredRows(completeRows).length === 0
    && rows.get("strip-pour:material:ready-mix")?.quantity === "259.2"
    && rows.get("strip-pour:equipment:pump")?.quantity === "7.5"
    && rows.get("strip-pour:equipment:vibrator")?.quantity === "63.84"
    && rows.get("strip-pour:delivery:mixer-trips")?.quantity === "33"
    && rows.get("strip-pour:quality:slump")?.quantity === "5")) {
    throw new Error("STOP_MASTER_STRIP_POUR_FIRST_ESTIMATE");
  }
  if (!(historicalDraft.preliminaryNeeds.length === 0
    && historicalDraft.rows.length === firstEstimate.rows.length
    && historicalDraft.rows.every((row) => Number(row.quantity) > 0))) {
    throw new Error("STOP_MASTER_STRIP_POUR_HISTORICAL_DRAFT_RECALCULATION");
  }
  if (!(refined.preliminaryNeeds.length === 0
    && refined.rows.find((row) => row.row_id === "strip-pour:material:ready-mix")?.quantity === "264"
    && refined.rows.find((row) => row.row_id === "strip-pour:equipment:pump")?.quantity === "6"
    && refined.rows.find((row) => row.row_id === "strip-pour:delivery:mixer-trips")?.quantity === "30"
    && refined.rows.find((row) => row.row_id === "strip-pour:quality:slump")?.quantity === "6")) {
    throw new Error("STOP_MASTER_STRIP_POUR_REFINEMENT");
  }
  for (const requiredRowId of STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS) {
    const mutated = new Set(completeRows);
    mutated.delete(requiredRowId);
    if (!stripPourMissingRequiredRows(mutated).includes(requiredRowId)) {
      throw new Error(`STOP_MASTER_STRIP_POUR_REMOVAL_MUTATION:${requiredRowId}`);
    }
  }
  if (firstEstimate.rows.some((row) =>
    /excavation|reinforc(?:ement|ing)|formwork/iu.test(`${row.row_id} ${row.title_ru}`))) {
    throw new Error("STOP_MASTER_STRIP_POUR_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ firstEstimate, historicalDraft, refined });
  const payableRowIds = firstEstimate.rows.filter((row) =>
    row.included_in_estimate).map((row) => row.row_id);
  const orderCases = [];
  for (const [acceptedOrder, loads, excess, deficit] of [["280.125", "36", "20.925", "0"], ["250", "32", "0", "9.2"]]) {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s27-31-concrete-order-publication-control",
      catalogId: STRIP_POUR_PROFILE_CATALOG_ID, primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
      parameterDefinitions: [...STRIP_POUR_PROFILE_PARAMETERS], formulaDefinitions: [...STRIP_POUR_PROFILE_FORMULAS],
      resourceDefinitions: [...STRIP_POUR_PROFILE_RESOURCES], submittedParameters: { ...STRIP_POUR_PROFILE_SHORT_INPUT },
      confirmedParameters: STRIP_POUR_PROFILE_RUNTIME_INPUT, priceItems: [], currencyCode: "KGS",
      rowOverrides: { "strip-pour:material:ready-mix": { quantity: acceptedOrder, includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE selected order; no engineering approval" } } },
      maximumResourceRows: STRIP_POUR_PROFILE_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    const row = (id: string) => result.rows.find(value => value.row_id === `strip-pour:${id}`)!;
    const balance = (row("material:ready-mix").calculation_trace as Json).purchaseBalance as Json;
    if (result.preliminaryNeeds.length || row("material:ready-mix").quantity !== acceptedOrder
      || row("material:ready-mix").included_in_procurement !== (deficit === "0")
      || balance.plannedConsumption !== "240" || balance.requiredSelectedOrder !== "259.2"
      || balance.consumptionShortage !== deficit || balance.excessOrderAboveRequiredConsumption !== excess
      || ["delivery:mixer-trips", "quality:delivery-acceptance", "document:delivery-tickets"].some(id => row(id).quantity !== loads)
      || row("work:place").quantity !== "240" || row("quality:slump").quantity !== "5") throw new Error("STOP_S2731_CONCRETE_ORDER_CONTROL");
    if (deficit !== "0") {
      let code: unknown;
      try { assertCanonicalPurchaseReadinessV1(result.rows); } catch(error) { code = (error as {code?: unknown}).code; }
      if (code !== "PROCUREMENT_MATERIAL_SHORTAGE") throw new Error("STOP_S2731_CONCRETE_SHORTAGE_READINESS");
    }
    orderCases.push({ acceptedOrder, loads, balance });
  }
  return {
    orderCases,
    status: "GREEN_MASTER_STRIP_FOUNDATION_CONCRETE_PLACEMENT_PROFILE_CORE",
    firstEstimate: {
      input: STRIP_POUR_PROFILE_SHORT_INPUT,
      rowCount: firstEstimate.rows.length,
      rowCountsByCategory: Object.fromEntries(
        ["material", "construction_work", "equipment", "service"].map((category) => [
          category,
          firstEstimate.rows.filter((row) => row.category === category).length,
        ]),
      ),
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      independentRequiredCount: STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS.length,
      missingIndependentComponents: stripPourMissingRequiredRows(completeRows),
      calculatedPayableRowIds: payableRowIds,
      unknownPriceRowCount: firstEstimate.rows.filter((row) =>
        row.included_in_estimate && row.unit_price == null).length,
    },
    historicalDraft: {
      rowCount: historicalDraft.rows.length,
      preliminaryNeedCount: historicalDraft.preliminaryNeeds.length,
      concreteOrderM3: historicalDraft.rows.find((row) =>
        row.row_id === "strip-pour:material:ready-mix")?.quantity,
    },
    refinement: {
      rowCount: refined.rows.length,
      preliminaryNeedCount: refined.preliminaryNeeds.length,
      pumpMachineH: refined.rows.find((row) =>
        row.row_id === "strip-pour:equipment:pump")?.quantity,
    },
    sourcePackSha256: STRIP_POUR_SOURCE_PACK_SHA256,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-31.strip-foundation-concrete-accepted-order-successor.v1",
  stopCode: "MASTER_STRIP_POUR_PROFILE",
  applicationName: "s27-31-strip-foundation-concrete-accepted-order-successor",
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
    ?? ".release-runtime/r568/s27-31/strip-foundation-concrete-accepted-order-successor-v1"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json",
    "src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1.ts",
    "src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts",
    "src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "scripts/estimate/r4a13/readbackS2731ConcreteAcceptedOrderIndependent.ts",
    "tests/estimateNorms/stripFoundationConcretePlacementPreliminaryProfileR1.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterStripFoundationConcretePlacementProfileSuccessor.ts",
  ],
  catalogId: STRIP_POUR_PROFILE_CATALOG_ID,
  sourceId: STRIP_POUR_PROFILE_SOURCE_ID,
  normId: STRIP_POUR_PROFILE_NORM_ID,
  sourceMetadata: STRIP_POUR_PROFILE_SOURCE_METADATA,
  parameterDefinitions: STRIP_POUR_PROFILE_PARAMETERS,
  formulaDefinitions: STRIP_POUR_PROFILE_FORMULAS,
  resourceDefinitions: STRIP_POUR_PROFILE_RESOURCES,
  shortInput: STRIP_POUR_PROFILE_SHORT_INPUT,
  acceptanceInput: STRIP_POUR_PROFILE_ACCEPTANCE_INPUT,
  runtimeProfileInput: STRIP_POUR_PROFILE_RUNTIME_INPUT,
  runtimeProfileClassification: STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: STRIP_POUR_PROFILE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [25, 16, 38],
  benchmarkOrdinal: 0,
  validationScenario: "S26_4_SEPARATE_STRIP_FOUNDATION_CONCRETE_PLACEMENT_150_M_COMPLETE_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Бетонирование ленточного фундамента на большой захватке",
    workKey: "concrete_foundation_interior_strip_foundation_pour_large_area",
    physicalResultRu: "Подготовленная ленточная конструкция забетонирована товарной смесью с подачей насосом, виброуплотнением, отделкой открытой поверхности, уходом и подтверждённым контролем качества",
    includedScopeRu: [
      "заказ товарного бетона по проектному объёму и видимому выбранному резерву",
      "приём, подача, укладка, распределение и послойное виброуплотнение бетонной смеси",
      "отделка открытой поверхности, укрытие, поддержание и снятие выбранной защиты для ухода",
      "автобетононасос, бетоновод, оператор, основной и резервный глубинные вибраторы без двойного счёта включённых компонентов",
      "рейсы миксеров, мобилизация техники, развёртывание насоса, промывка и безопасная рабочая зона",
      "приёмка каждого миксера, отбор проб, осадка конуса, температура, образцы, их хранение и испытание прочности",
      "операционный контроль укладки и уплотнения, приёмка поверхности, журнал, талоны, протоколы и исполнительный комплект",
      "гидрошпонка и её монтаж только при явном выборе рабочего шва в границе заказа",
    ],
    excludedScopeRu: [
      "разработка грунта, вывоз, основание и обратная засыпка",
      "поставка, изготовление и монтаж арматуры",
      "поставка, монтаж и снятие опалубки",
      "неподтверждённые цены; отсутствие цены не блокирует количественную смету",
    ],
    independentCompletenessMap: STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "STRIP_FOUNDATION_CONCRETE_PLACEMENT_ONLY",
    scopeClass: "LARGE_AREA_150_M_SCENARIO",
    constructionState: "FORMWORK_AND_REINFORCEMENT_READY_BY_ADJACENT_SCOPE",
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
    geometryParameters: ["plan_dimension_concrete_volume_m3"],
    selectedPreliminaryProfile: STRIP_POUR_PROFILE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
    noUniversalLaborProductivityClaim: true,
    adjacentFoundationScopeExcluded: true,
    acceptedOrderBalanceScope: "new_order_vs_required_consumption",
    requirementBasis: "selected_order_including_contingency",
    freshConcreteInventoryCredited: false,
  },
  binding: {
    rowId: "strip-pour:material:ready-mix",
    applicability: {
      technology_class: "READY_MIX_PUMPED_STRIP_FOUNDATION_POUR",
      operation_class: "STRIP_FOUNDATION_CONCRETE_PLACEMENT_ONLY",
      scope_class: "LARGE_AREA",
      source_id: STRIP_POUR_PROFILE_SOURCE_ID,
      norm_id: STRIP_POUR_PROFILE_NORM_ID,
      exact_locator: STRIP_POUR_PROFILE_SOURCE_METADATA.exact_locator,
      quantity_basis: "PROJECT_VOLUME_WITH_VISIBLE_ORDER_RESERVE_AND_SELECTED_PROFILE",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_PPR_SUPPLIER_EQUIPMENT_AND_QA_DATA",
      universal_productivity_claimed: false,
    },
  },
  locator: {
    key: "strip-foundation-concrete-accepted-order-s27-31",
    payload: {
      kind: "COMPOSITE_TECHNOLOGY_PROFILE",
      sourcePackSha256: STRIP_POUR_SOURCE_PACK_SHA256,
      expectedResourceIds: STRIP_POUR_PROFILE_RESOURCES.map(row => row.row_id),
      expectedFormulaIds: STRIP_POUR_PROFILE_FORMULAS.map(row => row.formula_id),
      primaryOrderingSource: { officialUrl: "https://www.nrmca.org/wp-content/uploads/2021/01/31pr.pdf",
        locator: "CIP 31 (2023), page 2: Quantity of concrete; Scheduling delivery; delivery-ticket responsibilities",
        useRestriction: "Ordering/delivery boundary only; selected contingency remains explicit and replaceable. No supplier quantum, stock suitability, new rates, project or engineering approval is inferred." },
      exactLocator: STRIP_POUR_PROFILE_SOURCE_METADATA.exact_locator,
      formula: "project volume -> concrete order, curing area, pump/vibrator hours, mixer trips and QA lots",
      normativeInputs: [
        "product_profile_id",
        "pump_rated_output_m3_h",
        "vibrator_machine_h_per_m3",
      ],
      visibleAssumptions: [
        "selected_contingency_percent",
        "curing_method",
        "exposed_curing_surface_ratio_m2_m3",
        "curing_sheet_overlap_factor",
        "pump_site_utilization_factor",
        "mixer_capacity_m3",
        "qa_lot_volume_m3",
      ],
    },
  },
  search: {
    primaryUom: "м³",
    canonicalNameRu: "бетонирование ленточного фундамента на большой захватке",
    aliases: [
      "бетонирование ленточного фундамента 150 м",
      "заливка ленточного фундамента бетоном",
      "отдельно заказать бетон и заливку ленты",
      "strip foundation concrete placement large area",
    ],
    shortScopeRu: "Отдельное бетонирование подготовленной ленточной конструкции: бетон, насос, виброуплотнение, отделка, уход, доставка, лабораторный контроль и документы; без грунта, арматуры и опалубки.",
    keyDistinguishingParameters: ["plan_dimension_concrete_volume_m3"],
    clarificationFields: [],
    includedBoundaries: [
      "бетон, укладка, уплотнение, открытая поверхность, уход, техника, доставка, контроль, документы и условный рабочий шов",
      "автоматические количества от проектного объёма и видимых значений предварительного профиля",
    ],
    excludedBoundaries: [
      "земляные работы, арматура и опалубка",
      "скрытая универсальная производительность или неподтверждённая цена",
    ],
    extraSearchTermsRu: "бетон бетонирование заливка лента ленточный фундамент насос миксер вибратор уход плёнка лаборатория образцы прочность 150 метров",
    sourceProvenance: {
      sourcePackSha256: STRIP_POUR_SOURCE_PACK_SHA256,
      firstEstimateFromVolumeAndVisibleProfile: true,
      noMandatoryProfessionalQuestionnaire: true,
      runtimeProfileReplaceableByProjectData: true,
      independentCompletenessMap: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:котлован|транше|выемк|грунт)|(?:excavation|soil)/iu,
    /(?:арматур|армирован)|(?:reinforc)/iu,
    /(?:опалуб)|(?:formwork)/iu,
  ],
  owner: "S26_4_STRIP_FOUNDATION_CONCRETE_PLACEMENT_COMPLETE_SUCCESSOR",
  receiptFileStem: "S26_4_STRIP_FOUNDATION_CONCRETE_PLACEMENT_COMPLETE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
