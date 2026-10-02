import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
  RESERVOIR_CLEAN_WATER_CATALOG_ID,
  RESERVOIR_CLEAN_WATER_FORMULAS,
  RESERVOIR_CLEAN_WATER_KNOWN_SCOPE_PARAMETERS,
  RESERVOIR_CLEAN_WATER_NORM_ID,
  RESERVOIR_CLEAN_WATER_PARAMETERS,
  RESERVOIR_CLEAN_WATER_RESOURCES,
  RESERVOIR_CLEAN_WATER_RUNTIME_CLASSIFICATION,
  RESERVOIR_CLEAN_WATER_RUNTIME_INPUT,
  RESERVOIR_CLEAN_WATER_RUNTIME_SOURCE_IDS,
  RESERVOIR_CLEAN_WATER_SHORT_INPUT,
  RESERVOIR_CLEAN_WATER_SOURCE_ID,
  RESERVOIR_CLEAN_WATER_SOURCE_METADATA,
  compileReservoirCleanWaterR1,
} from "../../../src/lib/estimate/v4/reservoirCleanWaterR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileReservoirCleanWaterR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  rcw_shoring_mode: "REQUIRED",
  rcw_shoring_designation: "STEEL-SHEET-PILE",
  rcw_dewatering_mode: "REQUIRED",
  rcw_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
  rcw_dewatering_duration_h: 40,
  rcw_dewatering_flow_m3_h: 12,
});

async function verifyCore(): Promise<Json> {
  const first = await compileReservoirCleanWaterR1({
    ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
  });
  const changedGeometry = await compileReservoirCleanWaterR1({
    ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
    rcw_internal_length_m: 25,
    rcw_internal_width_m: 12,
    rcw_operating_water_depth_m: 6,
  });
  const changedProcurement = await compileReservoirCleanWaterR1({
    ...RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
    rcw_rebar_available_stock_kg: 10000,
    rcw_rebar_retained_spare_kg: 1000,
    rcw_rebar_supplier_lot_kg: 2000,
    rcw_waterstop_available_stock_m: 100,
    rcw_waterstop_retained_spare_m: 20,
    rcw_waterstop_supplier_roll_m: 50,
  });
  const conditional = await compileReservoirCleanWaterR1({
    ...RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 77 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc14:rcw_useful_capacity") === "2000"
    && quantity(first, "rc14:rcw_excavation") === "4015.116"
    && quantity(first, "rc14:rcw_structural_concrete_installed") === "518.608"
    && quantity(first, "rc14:rcw_rebar_installed") === "72605.12"
    && quantity(first, "rc14:rcw_waterstop_installed") === "232.8")) {
    throw new Error("STOP_S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(quantity(changedGeometry, "rc14:rcw_useful_capacity") === "3600"
    && quantity(changedGeometry, "rc14:rcw_excavation") === "6487.656"
    && quantity(changedGeometry, "rc14:rcw_structural_concrete_installed") === "768.248"
    && quantity(changedGeometry, "rc14:rcw_rebar_order") === "112000"
    && quantity(changedGeometry, "rc14:rcw_waterstop_order") === "325")) {
    throw new Error("STOP_S27_26_RESERVOIR_CLEAN_WATER_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc14:rcw_rebar_total_need") === "75783.2736"
    && quantity(changedProcurement, "rc14:rcw_rebar_net_need") === "65783.2736"
    && quantity(changedProcurement, "rc14:rcw_rebar_lot_count") === "33"
    && quantity(changedProcurement, "rc14:rcw_rebar_order") === "66000"
    && quantity(changedProcurement, "rc14:rcw_rebar_surplus") === "216.7264"
    && quantity(changedProcurement, "rc14:rcw_waterstop_net_need") === "164.44"
    && quantity(changedProcurement, "rc14:rcw_waterstop_roll_count") === "4"
    && quantity(changedProcurement, "rc14:rcw_waterstop_order") === "200"
    && quantity(changedProcurement, "rc14:rcw_waterstop_surplus") === "35.56")) {
    throw new Error("STOP_S27_26_RESERVOIR_CLEAN_WATER_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 82 && conditional.preliminaryNeeds.length === 0
    && quantity(conditional, "rc14:rcw_shoring") === "992.64"
    && quantity(conditional, "rc14:rcw_dewatering_volume") === "480")) {
    throw new Error("STOP_S27_26_RESERVOIR_CLEAN_WATER_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc14:rcw_excavation", "rc14:rcw_blinding_order",
    "rc14:rcw_structural_concrete_order", "rc14:rcw_rebar_order",
    "rc14:rcw_formwork", "rc14:rcw_external_waterproofing_order",
    "rc14:rcw_internal_coating_order", "rc14:rcw_waterstop_order",
    "rc14:rcw_native_backfill", "rc14:rcw_imported_backfill",
    "rc14:rcw_binding_wire", "rc14:rcw_spacers",
    "rc14:rcw_formwork_consumables", "rc14:rcw_curing_compound",
    "rc14:rcw_appurtenance_kits", "rc14:rcw_penetration_seals",
    "rc14:rcw_access_hatches", "rc14:rcw_ladders", "rc14:rcw_vents",
    "rc14:rcw_hydrostatic_fill_water", "rc14:rcw_disinfectant",
    "rc14:labor:rcw-survey", "rc14:labor:rcw-excavation",
    "rc14:labor:rcw-rebar", "rc14:labor:rcw-formwork",
    "rc14:labor:rcw-concrete", "rc14:labor:rcw-surfaces",
    "rc14:labor:rcw-appurtenances", "rc14:labor:rcw-commissioning",
    "rc14:equipment:rcw-excavator", "rc14:equipment:rcw-compactor",
    "rc14:equipment:rcw-concrete-pump", "rc14:equipment:rcw-crane",
    "rc14:logistics:rcw-soil-removal", "rc14:logistics:rcw-concrete-delivery",
    "rc14:rcw_hidden_works", "rc14:rcw_concrete_quality", "rc14:rcw_asbuilt",
  ]) {
    if (!RESERVOIR_CLEAN_WATER_RESOURCES.some((resource) =>
      resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_RESERVOIR_CLEAN_WATER_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/villageWaterSupplyCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(RESERVOIR_CLEAN_WATER_FORMULAS))) {
    throw new Error("STOP_S27_26_RESERVOIR_CLEAN_WATER_LEGACY_COEFFICIENT");
  }
  const serialized = JSON.stringify({
    first, changedGeometry, changedProcurement, conditional,
  });
  return {
    status: "GREEN_S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(RESERVOIR_CLEAN_WATER_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(RESERVOIR_CLEAN_WATER_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: 0 },
    automaticGeometry: {
      baselineCapacityM3: quantity(first, "rc14:rcw_useful_capacity"),
      changedCapacityM3: quantity(changedGeometry, "rc14:rcw_useful_capacity"),
      baselineExcavationM3: quantity(first, "rc14:rcw_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc14:rcw_excavation"),
      baselineConcreteM3: quantity(first, "rc14:rcw_structural_concrete_installed"),
      changedConcreteM3: quantity(changedGeometry, "rc14:rcw_structural_concrete_installed"),
    },
    procurement: {
      rebarNetNeedKg: quantity(changedProcurement, "rc14:rcw_rebar_net_need"),
      rebarOrderKg: quantity(changedProcurement, "rc14:rcw_rebar_order"),
      rebarSurplusKg: quantity(changedProcurement, "rc14:rcw_rebar_surplus"),
      waterstopNetNeedM: quantity(changedProcurement, "rc14:rcw_waterstop_net_need"),
      waterstopOrderM: quantity(changedProcurement, "rc14:rcw_waterstop_order"),
      waterstopSurplusM: quantity(changedProcurement, "rc14:rcw_waterstop_surplus"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.reservoir-clean-water-automatic-successor.v1",
  stopCode: "S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC",
  applicationName: "s27-26-reservoir-clean-water-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "a5b6e3de-8701-5ed7-bfce-0055a0422acf",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "014b5a86-40b4-5503-b30c-d1ae4c698a56",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/reservoir-clean-water-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/reservoir-clean-water-rc-geometric-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/reservoirCleanWaterR1.ts",
    "tests/estimateNorms/reservoirCleanWaterR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726ReservoirCleanWaterAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726ReservoirCleanWaterAutomaticIndependent.ts",
  ],
  catalogId: RESERVOIR_CLEAN_WATER_CATALOG_ID,
  sourceId: RESERVOIR_CLEAN_WATER_SOURCE_ID,
  normId: RESERVOIR_CLEAN_WATER_NORM_ID,
  sourceMetadata: RESERVOIR_CLEAN_WATER_SOURCE_METADATA,
  parameterDefinitions: RESERVOIR_CLEAN_WATER_PARAMETERS,
  formulaDefinitions: RESERVOIR_CLEAN_WATER_FORMULAS,
  resourceDefinitions: RESERVOIR_CLEAN_WATER_RESOURCES,
  shortInput: RESERVOIR_CLEAN_WATER_SHORT_INPUT,
  acceptanceInput: RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
  runtimeProfileInput: RESERVOIR_CLEAN_WATER_RUNTIME_INPUT,
  runtimeProfileClassification: RESERVOIR_CLEAN_WATER_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: RESERVOIR_CLEAN_WATER_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 71,
  validationScenario: "Q5_RESERVOIR_CLEAN_WATER_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Строительство подземного монолитного ЖБ резервуара чистой воды",
    workKey: "reservoir_clean_water",
    physicalResultRu: "Подземные монолитные ЖБ резервуары построены, гидроизолированы, оснащены, испытаны, продезинфицированы и оформлены исполнительной документацией",
    includedScopeRu: [
      "геодезия, котлован, бетонная подготовка, несущие ЖБ конструкции и обратная засыпка",
      "арматура, опалубка, гидрошпонки, наружная гидроизоляция и внутреннее покрытие",
      "закладные, внутренние трубопроводные комплекты, люки, лестницы, вентиляция и герметизация вводов",
      "расходники, труд, механизмы, логистика, гидроиспытание, дезинфекция, контроль и документы",
      "крепление котлована и водоотлив только по выбранным условным ветвям",
    ],
    excludedScopeRu: [
      "параллельный legacy-профиль water_reservoir для того же физического объекта",
      "внешние сети, насосные и станции водоподготовки, отдельные камеры и колодцы",
      "дороги, скальные работы, сваи и постоянное водопонижение",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "BURIED_RC_CLEAN_WATER_RESERVOIR_CONSTRUCTION",
    executionAssembly: "CAST_IN_PLACE_RECTANGULAR_MULTI_CELL",
    primaryMeasureParameterId: "rcw_reservoir_count",
    knownScopeParameters: [...RESERVOIR_CLEAN_WATER_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(RESERVOIR_CLEAN_WATER_SHORT_INPUT).length,
    automaticGeometryMaterialsLaborEquipmentLogisticsAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visibleRebarAndWaterstopProcurementBalances: true,
    conditionalShoringAndDewateringFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    legacyWaterReservoirMutuallyExclusive: true,
  },
  binding: {
    rowId: "rc14:rcw_acceptance",
    applicability: {
      technology_class: "BURIED_CAST_IN_PLACE_RC",
      operation_class: "CLEAN_WATER_RESERVOIR_CONSTRUCTION",
      execution_assembly: "RECTANGULAR_MULTI_CELL_GEOMETRIC_OWNER",
      scope_mode: "SEVEN_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: RESERVOIR_CLEAN_WATER_SOURCE_ID,
      norm_id: RESERVOIR_CLEAN_WATER_NORM_ID,
      exact_locator: RESERVOIR_CLEAN_WATER_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_INTERNAL_GEOMETRY_PLUS_VISIBLE_EDITABLE_STRUCTURAL_AND_PROCUREMENT_PROFILE",
    },
  },
  locator: {
    key: "reservoir-clean-water-rc-geometric-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: RESERVOIR_CLEAN_WATER_SOURCE_METADATA.exact_locator,
      sourcePackSha256: RESERVOIR_CLEAN_WATER_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(RESERVOIR_CLEAN_WATER_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(RESERVOIR_CLEAN_WATER_RUNTIME_INPUT),
      automaticFormulaIds: RESERVOIR_CLEAN_WATER_FORMULAS.map((formula) =>
        formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
      mutuallyExclusiveCatalogId: "canonical-work:expanded:water_reservoir",
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство подземного монолитного ЖБ резервуара чистой воды",
    aliases: [
      "строительство резервуара чистой воды",
      "монолитный железобетонный резервуар РЧВ",
      "buried reinforced concrete clean water reservoir construction",
    ],
    shortScopeRu: "Строительство двух подземных монолитных ЖБ резервуаров чистой воды по 1000 м³ с земляными и бетонными работами, арматурой, гидроизоляцией, оснащением, испытанием и закупочными балансами.",
    keyDistinguishingParameters: [...RESERVOIR_CLEAN_WATER_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "котлован, подготовка, монолитные конструкции, арматура, опалубка и обратная засыпка",
      "гидрошпонки, наружная гидроизоляция, внутреннее покрытие и оснащение резервуара",
      "расходники, труд, механизмы, логистика, испытание, дезинфекция и документация",
    ],
    excludedBoundaries: [
      "legacy water_reservoir для того же объекта, внешние сети и отдельные камеры",
      "насосные и водоподготовка, дороги, скальные работы, сваи и постоянное водопонижение",
    ],
    extraSearchTermsRu: "резервуар чистой воды РЧВ железобетонный монолитный подземный гидроизоляция гидрошпонка",
    sourceProvenance: {
      exactReservoirConstructionOwner: true,
      sevenPrimaryFactIngress: true,
      automaticGeometryMaterialsLaborEquipmentLogisticsAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
      legacyApprovedBoqOwnerMutuallyExclusive: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /external[_. -]?pipeline|внешн\p{L}*\s+сет/iu,
    /pump[_. -]?station|treatment[_. -]?station|насосн\p{L}*\s+станц|водоподготов/iu,
    /road[_. -]?restoration|rock[_. -]?excavation|pile|восстановлен\p{L}*\s+дорог|скальн\p{L}*|свайн/iu,
  ],
  owner: "S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_RESERVOIR_CLEAN_WATER_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
